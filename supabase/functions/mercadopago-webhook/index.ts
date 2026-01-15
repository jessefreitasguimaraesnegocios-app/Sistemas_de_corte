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
      let { data: transaction, error: transError } = await supabase
        .from("transactions")
        .select("business_id, payment_id, external_reference")
        .eq("payment_id", resourceId.toString())
        .single();

      // Se não encontrar pelo payment_id, tentar buscar pelo external_reference
      // (pode ser que o payment_id salvo seja o order_id)
      if (transError || !transaction) {
        console.log("⚠️ Transação não encontrada para payment_id:", resourceId);
        console.log("🔍 Tentando buscar pelo external_reference...");
        
        // Buscar payment no Mercado Pago para obter o external_reference (order_id)
        // Mas precisamos do access token... Vamos tentar buscar em todos os businesses
        const { data: allBusinesses } = await supabase
          .from("businesses")
          .select("id, mp_access_token")
          .not("mp_access_token", "is", null);
        
        if (allBusinesses && allBusinesses.length > 0) {
          // Tentar buscar o payment em cada business até encontrar
          for (const biz of allBusinesses) {
            try {
              const mp_response = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
                method: "GET",
                headers: {
                  "Authorization": `Bearer ${biz.mp_access_token}`,
                  "Content-Type": "application/json",
                },
              });

              if (mp_response.ok) {
                const paymentData = await mp_response.json();
                const externalRef = paymentData.external_reference || paymentData.order?.id;
                
                if (externalRef) {
                  // Buscar transação pelo external_reference
                  const { data: transByRef, error: refError } = await supabase
                    .from("transactions")
                    .select("business_id, payment_id, external_reference")
                    .eq("external_reference", externalRef)
                    .single();
                  
                  if (!refError && transByRef) {
                    transaction = transByRef;
                    transError = null;
                    console.log("✅ Transação encontrada pelo external_reference:", externalRef);
                    break;
                  }
                }
              }
            } catch (e) {
              // Continuar tentando com próximo business
              continue;
            }
          }
        }
      }

      if (transError || !transaction) {
        console.log("⚠️ Transação não encontrada para payment_id:", resourceId);
        return new Response(
          JSON.stringify({ 
            message: "Webhook recebido, mas transação não encontrada no banco",
            payment_id: resourceId,
            note: "A transação pode não ter sido criada ainda ou o payment_id não corresponde"
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
      let updateError = null;
      try {
        const { error: rpcError } = await supabase.rpc("process_mercado_pago_webhook", {
          payment_id_param: resourceId.toString(),
          status_param: status,
          status_detail_param: statusDetail || null,
        });
        updateError = rpcError;
      } catch (rpcException) {
        console.error("❌ Exceção ao chamar RPC:", rpcException);
        updateError = rpcException;
      }

      // Se a função RPC falhar, tentar atualizar diretamente
      if (updateError) {
        console.warn("⚠️ Função RPC falhou, tentando atualizar diretamente:", updateError);
        
        const statusToUpdate = status === "approved" ? "PAID" :
                              status === "pending" ? "PENDING" :
                              status === "rejected" || status === "cancelled" ? "PENDING" :
                              status === "refunded" ? "REFUNDED" : "PENDING";

        const { error: directUpdateError } = await supabase
          .from("transactions")
          .update({
            status: statusToUpdate,
            updated_at: new Date().toISOString()
          })
          .eq("payment_id", resourceId.toString());

        if (directUpdateError) {
          console.error("❌ Erro ao atualizar transação diretamente:", directUpdateError);
          // Se ainda não encontrar pelo payment_id, tentar pelo external_reference
          // (pode ser que o payment_id salvo seja diferente)
          if (transaction.external_reference) {
            const { error: refUpdateError } = await supabase
              .from("transactions")
              .update({
                status: statusToUpdate,
                payment_id: resourceId.toString(), // Atualizar o payment_id também
                updated_at: new Date().toISOString()
              })
              .eq("external_reference", transaction.external_reference);

            if (refUpdateError) {
              console.error("❌ Erro ao atualizar transação pelo external_reference:", refUpdateError);
              return new Response(
                JSON.stringify({ 
                  error: "Erro ao atualizar transação", 
                  details: refUpdateError,
                  payment_id: resourceId,
                  note: "Tentativas de atualização falharam"
                }),
                {
                  status: 500,
                  headers: { ...corsHeaders, "Content-Type": "application/json" }
                }
              );
            } else {
              console.log("✅ Transação atualizada pelo external_reference");
            }
          } else {
            return new Response(
              JSON.stringify({ error: "Erro ao atualizar transação", details: directUpdateError }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              }
            );
          }
        } else {
          console.log("✅ Transação atualizada diretamente");
        }
      } else {
        console.log("✅ Transação atualizada via função RPC");
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
      console.log("📦 Webhook de Order recebido:", resourceId);
      
      // Buscar transação pelo external_reference (que contém o order_id)
      const { data: transaction, error: transError } = await supabase
        .from("transactions")
        .select("business_id, payment_id, external_reference")
        .eq("external_reference", resourceId.toString())
        .single();

      if (transError || !transaction) {
        console.log("⚠️ Transação não encontrada para order_id:", resourceId);
        return new Response(
          JSON.stringify({ 
            message: "Webhook de Order recebido, mas transação não encontrada",
            order_id: resourceId 
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Buscar business para obter access token
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

      // Buscar order no Mercado Pago para obter os payments dentro dela
      const order_response = await fetch(`https://api.mercadopago.com/merchant_orders/${resourceId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${business.mp_access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!order_response.ok) {
        console.error("❌ Erro ao buscar order no Mercado Pago:", await order_response.text());
        return new Response(
          JSON.stringify({ error: "Erro ao buscar order no Mercado Pago" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      const orderData = await order_response.json();
      const payments = orderData.payments || [];
      
      // Atualizar status baseado no status da order
      // Se algum payment está approved, a order está aprovada
      const hasApprovedPayment = payments.some((p: any) => p.status === "approved");
      const hasRejectedPayment = payments.every((p: any) => p.status === "rejected" || p.status === "cancelled");
      
      let status = "pending";
      if (hasApprovedPayment) {
        status = "approved";
      } else if (hasRejectedPayment && payments.length > 0) {
        status = "rejected";
      }

      console.log(`✅ Atualizando transação da order ${resourceId} para status: ${status}`);

      // Atualizar payment_id se ainda não estiver salvo (usar o primeiro payment aprovado)
      const approvedPayment = payments.find((p: any) => p.status === "approved");
      const paymentIdToUpdate = approvedPayment?.id?.toString() || payments[0]?.id?.toString();

      // Chamar função SQL para atualizar status
      if (paymentIdToUpdate) {
        const { error: updateError } = await supabase.rpc("process_mercado_pago_webhook", {
          payment_id_param: paymentIdToUpdate,
          status_param: status,
          status_detail_param: null,
        });

        if (updateError) {
          console.error("❌ Erro ao atualizar transação:", updateError);
          // Tentar atualizar diretamente pelo external_reference
          const { error: directUpdateError } = await supabase
            .from("transactions")
            .update({
              status: status === "approved" ? "PAID" : "PENDING",
              payment_id: paymentIdToUpdate,
              updated_at: new Date().toISOString()
            })
            .eq("external_reference", resourceId.toString());

          if (directUpdateError) {
            console.error("❌ Erro ao atualizar transação diretamente:", directUpdateError);
            return new Response(
              JSON.stringify({ error: "Erro ao atualizar transação", details: directUpdateError }),
              {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              }
            );
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Webhook de Order processado com sucesso",
          order_id: resourceId,
          status: status,
          payments_count: payments.length
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
