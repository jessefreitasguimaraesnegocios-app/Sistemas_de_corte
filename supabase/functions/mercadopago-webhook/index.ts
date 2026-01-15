// Deno Edge Function - Webhook do Mercado Pago
/// <reference path="../deno.d.ts" />
// @ts-ignore - Deno imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM imports are resolved at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ||
                     Deno.env.get("SUPABASE_PROJECT_URL") ||
                     "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
// Secret key para validar assinatura do webhook (obtido no painel do Mercado Pago)
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET") || "";

// Função para verificar assinatura do webhook do Mercado Pago
async function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secret: string
): Promise<boolean> {
  if (!xSignature || !xRequestId || !secret) {
    console.warn("⚠️ Dados de assinatura incompletos para validação");
    return false;
  }

  try {
    // Parse x-signature: ts=<timestamp>,v1=<signature>
    const parts = xSignature.split(",");
    let ts = "";
    let v1 = "";
    
    parts.forEach(part => {
      const [key, value] = part.split("=");
      if (key.trim() === "ts") ts = value.trim();
      else if (key.trim() === "v1") v1 = value.trim();
    });

    if (!ts || !v1) {
      console.error("❌ Formato de assinatura inválido");
      return false;
    }

    // Construir manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
    // data.id deve estar em lowercase se for alfanumérico
    const dataIdLower = dataId.toLowerCase();
    const manifest = `id:${dataIdLower};request-id:${xRequestId};ts:${ts};`;

    // Calcular HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(manifest);
    
    // Usar Web Crypto API para HMAC
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    
    const isValid = hashHex === v1;
    if (!isValid) {
      console.error("❌ Assinatura inválida:", { computed: hashHex, received: v1 });
    }
    return isValid;
  } catch (error) {
    console.error("❌ Erro ao verificar assinatura:", error);
    return false;
  }
}

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Mercado Pago pode enviar como application/x-www-form-urlencoded ou application/json
    const contentType = req.headers.get("content-type") || "";
    let webhookData: any = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      const data = formData.get("data");
      if (data) {
        webhookData = JSON.parse(data as string);
      }
    } else {
      webhookData = await req.json();
    }

    // Extrair headers de autenticação
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");
    
    console.log("📥 Webhook recebido do Mercado Pago");
    console.log("- x-signature:", xSignature ? "Presente" : "Ausente");
    console.log("- x-request-id:", xRequestId || "Ausente");
    console.log("- Body:", JSON.stringify(webhookData, null, 2));

    // Estrutura do webhook do Mercado Pago:
    // { type: "payment", data: { id: "123456789" } }
    // ou para Orders API: { type: "order", data: { id: "123456789" } }
    const webhookType = webhookData.type;
    const resourceId = webhookData.data?.id;

    // Validar assinatura se secret estiver configurado
    if (MP_WEBHOOK_SECRET && resourceId) {
      const isValid = await verifyWebhookSignature(
        xSignature,
        xRequestId,
        resourceId.toString(),
        MP_WEBHOOK_SECRET
      );
      
      if (!isValid) {
        console.error("❌ Assinatura do webhook inválida - possível tentativa de fraude");
        return new Response(
          JSON.stringify({ error: "Assinatura inválida" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      console.log("✅ Assinatura do webhook validada com sucesso");
    } else if (!MP_WEBHOOK_SECRET) {
      console.warn("⚠️ MP_WEBHOOK_SECRET não configurado - webhook aceito sem validação");
    }

    if (!resourceId) {
      console.error("❌ Webhook sem ID de recurso:", webhookData);
      return new Response(
        JSON.stringify({ error: "Webhook sem ID de recurso" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Se for um webhook de payment, buscar o payment diretamente
    if (webhookType === "payment") {
      // Buscar transação pelo payment_id
      const { data: transaction, error: transError } = await supabase
        .from("transactions")
        .select("business_id, payment_id")
        .eq("payment_id", resourceId.toString())
        .single();

      if (transError || !transaction) {
        console.log("⚠️ Transação não encontrada para payment_id:", resourceId);
        // Buscar status no Mercado Pago (precisa do access token do business)
        // Por enquanto, apenas logar
        return new Response(
          JSON.stringify({ 
            message: "Webhook recebido, mas transação não encontrada no banco",
            payment_id: resourceId 
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Buscar business para obter access token e buscar status atualizado
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("mp_access_token")
        .eq("id", transaction.business_id)
        .single();

      if (businessError || !business?.mp_access_token) {
        console.error("❌ Business não encontrado ou sem token:", businessError);
        return new Response(
          JSON.stringify({ error: "Business não encontrado" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Buscar status atualizado no Mercado Pago
      const mp_response = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${business.mp_access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!mp_response.ok) {
        console.error("❌ Erro ao buscar payment no Mercado Pago:", await mp_response.text());
        return new Response(
          JSON.stringify({ error: "Erro ao buscar status do pagamento" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      const paymentData = await mp_response.json();
      const status = paymentData.status; // approved, pending, rejected, cancelled, refunded
      const statusDetail = paymentData.status_detail;

      console.log(`✅ Atualizando transação ${resourceId} para status: ${status}`);

      // Chamar função SQL para atualizar status
      const { error: updateError } = await supabase.rpc("process_mercado_pago_webhook", {
        payment_id_param: resourceId.toString(),
        status_param: status,
        status_detail_param: statusDetail || null,
      });

      if (updateError) {
        console.error("❌ Erro ao atualizar transação:", updateError);
        return new Response(
          JSON.stringify({ error: "Erro ao atualizar transação", details: updateError }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Webhook processado com sucesso",
          payment_id: resourceId,
          status: status
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Se for um webhook de order (Orders API)
    if (webhookType === "order") {
      // Para Orders API, precisamos buscar a order e depois os payments dentro dela
      // Por enquanto, vamos buscar a transação pelo order_id ou payment_id
      // O order_id pode estar no external_reference ou precisamos buscar de outra forma
      
      console.log("📦 Webhook de Order recebido:", resourceId);
      
      // Buscar transação pelo external_reference (que pode conter o order_id)
      // Ou buscar payments dentro da order
      // Por enquanto, vamos retornar sucesso e logar
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Webhook de Order recebido",
          order_id: resourceId,
          note: "Processamento de Order webhook - implementação futura"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Webhook de tipo desconhecido
    console.log("⚠️ Tipo de webhook desconhecido:", webhookType);
    return new Response(
      JSON.stringify({ 
        message: "Webhook recebido mas tipo não processado",
        type: webhookType,
        resource_id: resourceId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("❌ Erro ao processar webhook:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro interno do servidor",
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
