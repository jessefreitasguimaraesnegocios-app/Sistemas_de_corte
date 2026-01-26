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
    
    // ✅ ESTRATÉGIA DE BUSCA ROBUSTA:
    // 1. Buscar pelo payment_id exato
    // 2. Buscar pelo external_reference que contenha o payment_id (formato composto)
    // 3. Buscar com LIKE no external_reference
    
    let { data: transaction, error: transError } = await supabase
      .from("transactions")
      .select("status, payment_id, business_id, external_reference")
      .eq("payment_id", payment_id.toString())
      .single();

    // Se não encontrar pelo payment_id, tentar pelo external_reference
    if (transError || !transaction) {
      console.log("🔍 Tentando buscar pelo external_reference...");
      
      // Tentar busca exata pelo external_reference
      const { data: transByRef, error: refError } = await supabase
        .from("transactions")
        .select("status, payment_id, business_id, external_reference")
        .eq("external_reference", payment_id.toString())
        .single();
      
      if (!refError && transByRef) {
        transaction = transByRef;
        transError = null;
        console.log("✅ Transação encontrada pelo external_reference exato");
      } else {
        // Tentar busca com LIKE (external_reference pode ser composto: nosso_id|order_id)
        const { data: transByLike, error: likeError } = await supabase
          .from("transactions")
          .select("status, payment_id, business_id, external_reference")
          .like("external_reference", `%${payment_id}%`)
          .limit(1)
          .single();
        
        if (!likeError && transByLike) {
          transaction = transByLike;
          transError = null;
          console.log("✅ Transação encontrada pelo external_reference (LIKE):", transByLike.external_reference);
        }
      }
    }

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
    
    console.log("✅ Transação encontrada:", {
      status: transaction.status,
      payment_id: transaction.payment_id,
      external_reference: transaction.external_reference,
    });

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
          // API de Orders (ID alfanumérico como PAY01KFEQG1GVG9AJ3359WVY12A35)
          console.log("📦 Payment ID alfanumérico detectado (Orders API) - tentando buscar via Orders API");
          console.log("🔍 External reference:", transaction.external_reference);
          
          // Extrair order_id do external_reference (formato: pix_xxx|ORD...)
          const orderIdMatch = transaction.external_reference?.match(/\|(ORD[A-Z0-9]+)$/);
          const orderId = orderIdMatch ? orderIdMatch[1] : null;
          
          if (orderId) {
            console.log("🔍 Buscando Order na API do MP:", orderId);
            
            const orderResponse = await fetch(
              `https://api.mercadopago.com/v1/orders/${orderId}`,
              {
                headers: {
                  "Authorization": `Bearer ${businessData.mp_access_token}`,
                },
              }
            );

            if (orderResponse.ok) {
              const orderData = await orderResponse.json();
              console.log("📊 Resposta da API Orders:", { 
                orderId: orderData.id,
                status: orderData.status, 
                status_detail: orderData.status_detail,
                paymentsCount: orderData.transactions?.payments?.length,
                payments: orderData.transactions?.payments?.map((p: any) => ({
                  id: p.id,
                  status: p.status,
                  status_detail: p.status_detail
                }))
              });
              
              // Verificar status dos payments dentro da order
              const payments = orderData.transactions?.payments || [];
              const approvedPayment = payments.find((p: any) => p.status === "approved");
              
              if (approvedPayment) {
                mpStatus = "approved";
                isApproved = true;
                console.log("✅✅✅ Payment APROVADO encontrado na Order! ID:", approvedPayment.id);
              } else if (orderData.status === "paid" || orderData.status === "closed") {
                mpStatus = "approved";
                isApproved = true;
                console.log("✅✅✅ Order com status paid/closed - APROVADO!");
              } else {
                mpStatus = orderData.status || "pending";
                console.log("⏳ Order ainda pendente:", orderData.status);
                console.log("📋 Payments na order:", payments.map((p: any) => `${p.id}: ${p.status}`).join(", "));
              }
            } else {
              const errorText = await orderResponse.text();
              console.error("❌ Erro ao buscar Order:", {
                status: orderResponse.status,
                statusText: orderResponse.statusText,
                error: errorText.substring(0, 200)
              });
              console.log("⚠️ Não foi possível buscar Order - mantendo status do banco");
            }
          } else {
            console.log("⚠️ Order ID não encontrado no external_reference:", transaction.external_reference);
            // Se o status no banco já é PAID, considerar aprovado
            if (transaction.status?.toUpperCase() === "PAID") {
              isApproved = true;
              mpStatus = "approved";
              console.log("✅ Status PAID no banco - considerando aprovado");
            }
          }
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
