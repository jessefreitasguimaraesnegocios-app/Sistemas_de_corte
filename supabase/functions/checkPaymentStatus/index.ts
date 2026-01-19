// Deno Edge Function - runs in Deno runtime
/// <reference path="../deno.d.ts" />
// @ts-ignore - Deno imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM imports are resolved at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || 
                     Deno.env.get("SUPABASE_PROJECT_URL") || 
                     "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { payment_id, business_id } = body;

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: "payment_id é obrigatório" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("🔍 Verificando status do pagamento:", payment_id);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // ✅ Buscar transação no banco
    const { data: transaction, error: transError } = await supabase
      .from("transactions")
      .select("status, payment_id, business_id")
      .eq("payment_id", payment_id.toString())
      .single();

    if (transError || !transaction) {
      console.warn("⚠️ Transação não encontrada para payment_id:", payment_id);
      return new Response(
        JSON.stringify({ 
          status: "pending",
          approved: false,
          payment_id: payment_id,
          message: "Aguardando confirmação do pagamento"
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("✅ Transação encontrada no banco:", transaction);

    // Se já está PAID no banco, retornar aprovado
    if (transaction.status?.toUpperCase() === "PAID") {
      console.log("✅ Pagamento já está PAID no banco");
      return new Response(
        JSON.stringify({
          status: "approved",
          approved: true,
          payment_id: transaction.payment_id,
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 🔄 FALLBACK: Se status é PENDING, consultar API do Mercado Pago diretamente
    console.log("⏳ Status PENDING no banco. Consultando API do Mercado Pago...");

    // Buscar access_token do business
    const businessIdToUse = transaction.business_id || business_id;
    if (!businessIdToUse) {
      console.warn("⚠️ business_id não disponível para consulta na API do MP");
      return new Response(
        JSON.stringify({
          status: "pending",
          approved: false,
          payment_id: transaction.payment_id,
          message: "Aguardando webhook do Mercado Pago"
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .select("mp_access_token")
      .eq("id", businessIdToUse)
      .single();

    if (businessError || !businessData?.mp_access_token) {
      console.warn("⚠️ Access token do business não encontrado");
      return new Response(
        JSON.stringify({
          status: "pending",
          approved: false,
          payment_id: transaction.payment_id,
          message: "Aguardando webhook do Mercado Pago"
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Consultar API do Mercado Pago
    // O payment_id pode ser um ID de Payment (numérico) ou de Order (PAY...)
    let mpStatus = "pending";
    let isApproved = false;

    try {
      // Tentar como Payment ID primeiro (se for numérico)
      const isNumeric = /^\d+$/.test(payment_id.toString());
      
      if (isNumeric) {
        // API de Payments (ID numérico)
        const mpResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${payment_id}`,
          {
            headers: {
              "Authorization": `Bearer ${businessData.mp_access_token}`,
            },
          }
        );

        if (mpResponse.ok) {
          const mpData = await mpResponse.json();
          console.log("📊 Resposta da API Payments:", { status: mpData.status, status_detail: mpData.status_detail });
          mpStatus = mpData.status || "pending";
          isApproved = mpStatus === "approved";
        }
      } else {
        // API de Orders (ID alfanumérico como PAY01KFA1YJB6MF5GH523T2HYY07M)
        // Tentar buscar pela referência externa ou pelo ID do payment
        // A API Orders não permite buscar por payment_id diretamente
        // Vamos manter o status do banco
        console.log("⚠️ Payment ID alfanumérico - mantendo status do banco");
      }
    } catch (mpError) {
      console.error("❌ Erro ao consultar API do Mercado Pago:", mpError);
    }

    // Se o status mudou para approved, atualizar o banco
    if (isApproved && transaction.status?.toUpperCase() !== "PAID") {
      console.log("🔄 Atualizando banco para PAID (detectado via API)");
      
      const { error: updateError } = await supabase
        .from("transactions")
        .update({ status: "PAID" })
        .eq("payment_id", payment_id.toString());

      if (updateError) {
        console.error("❌ Erro ao atualizar banco:", updateError);
      } else {
        console.log("✅ Banco atualizado para PAID");
      }
    }

    // Mapear status
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'PAID': 'approved',
      'APPROVED': 'approved',
      'CANCELLED': 'cancelled',
      'REJECTED': 'rejected',
      'REFUNDED': 'refunded',
      'pending': 'pending',
      'approved': 'approved',
      'rejected': 'rejected',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
    };

    const finalStatus = isApproved ? 'approved' : (statusMap[mpStatus] || statusMap[transaction.status?.toUpperCase()] || 'pending');

    console.log("📊 Status final:", { dbStatus: transaction.status, mpStatus, finalStatus, isApproved });

    return new Response(
      JSON.stringify({
        status: finalStatus,
        approved: isApproved,
        payment_id: transaction.payment_id,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Erro na Edge Function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro interno do servidor",
        status: "error"
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
