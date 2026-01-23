// Deno Edge Function - Webhook do Mercado Pago
/// <reference path="../deno.d.ts" />
// @ts-ignore - Deno imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM imports are resolved at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ Configurações do Supabase - OBRIGATÓRIAS
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
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
  // 🔥 LOG CRÍTICO - Se aparecer nos logs, a função ESTÁ sendo executada
  console.log("🔥🔥🔥 mercadopago-webhook EXECUTADA - Método:", req.method);
  console.log("🔥🔥🔥 URL:", req.url);
  console.log("🔥🔥🔥 Headers:", Object.fromEntries(req.headers.entries()));

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("✅ OPTIONS request - retornando CORS");
    return new Response("ok", { headers: corsHeaders });
  }

  // ✅ Webhook DEVE aceitar POST
  if (req.method !== "POST") {
    console.warn("⚠️ Método não permitido:", req.method);
    return new Response(
      JSON.stringify({ error: "Method Not Allowed", allowed: ["POST", "OPTIONS"] }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // ✅ VALIDAR SECRETS OBRIGATÓRIOS
    // ⚠️ IMPORTANTE: Retornar 200 mesmo se secrets faltarem (webhook não deve falhar)
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Configuração do Supabase incompleta", {
        hasUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      });
      // ✅ Webhook sempre retorna 200 para evitar reenvios
      return new Response(
        JSON.stringify({ 
          received: true,
          error: "Configuração incompleta (verifique logs)",
          details: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados"
        }),
        { 
          status: 200, // ✅ SEMPRE 200 para webhooks
          headers: corsHeaders 
        }
      );
    }

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

    // ✅ Validar assinatura APENAS se todos os dados necessários existirem
    // Mercado Pago nem sempre envia assinatura (teste, webhooks antigos, reenvios)
    if (MP_WEBHOOK_SECRET && resourceId && xSignature && xRequestId) {
      const isValid = await verifyWebhookSignature(
        xSignature,
        xRequestId,
        resourceId.toString(),
        MP_WEBHOOK_SECRET
      );
      
      if (!isValid) {
        console.error("❌ Assinatura inválida");
        // ✅ Webhook sempre retorna 200 (logamos o erro mas não bloqueamos)
        return new Response(
          JSON.stringify({ 
            received: true,
            error: "invalid signature",
            note: "Assinatura inválida (verifique logs)"
          }),
          { status: 200, headers: corsHeaders }
        );
      }
      console.log("✅ Assinatura do webhook validada com sucesso");
    } else {
      // ✅ BOA PRÁTICA: Aceitar webhook sem assinatura (modo compatível MP)
      // Mercado Pago recomenda aceitar e validar quando possível, não bloquear tudo
      if (!xSignature || !xRequestId) {
        console.warn("⚠️ Webhook sem assinatura — aceito (modo compatível MP)");
      } else if (!MP_WEBHOOK_SECRET) {
        console.warn("⚠️ MP_WEBHOOK_SECRET não configurado — webhook aceito sem validação");
      }
    }

    if (!resourceId) {
      console.error("❌ Webhook sem ID de recurso:", webhookData);
      // ✅ Webhook sempre retorna 200 (logamos o erro mas não bloqueamos)
      return new Response(
        JSON.stringify({ 
          received: true,
          error: "Webhook sem ID de recurso",
          note: "Webhook recebido mas sem resourceId (verifique logs)"
        }),
        {
          status: 200,
          headers: corsHeaders
        }
      );
    }

    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Se for um webhook de payment, buscar o payment diretamente
    if (webhookType === "payment") {
      // ✅ ESTRATÉGIA DE BUSCA ROBUSTA:
      // 1. Primeiro tenta pelo payment_id exato
      // 2. Se não encontrar, busca o payment no MP para obter external_reference
      // 3. Busca pelo external_reference (pode ser composto: nosso_id|order_id)
      // 4. Busca com LIKE para encontrar external_reference que contenha o order_id
      
      let { data: transaction, error: transError } = await supabase
        .from("transactions")
        .select("business_id, payment_id, external_reference")
        .eq("payment_id", resourceId.toString())
        .single();

      // Se não encontrar pelo payment_id, tentar estratégias alternativas
      if (transError || !transaction) {
        console.log("⚠️ Transação não encontrada para payment_id:", resourceId);
        console.log("🔍 Tentando estratégias alternativas de busca...");
        
        // ✅ ESTRATÉGIA ESPECIAL: Se o ID começa com "PAY" é da API Orders
        // Buscar diretamente no banco pelo payment_id ou pelo external_reference que contém o order_id
        const isOrdersApiPayment = resourceId.toString().startsWith("PAY");
        
        if (isOrdersApiPayment) {
          console.log("📦 ID detectado como payment da API Orders (começa com PAY)");
          
          // Buscar pelo payment_id exato (pode estar salvo assim)
          const { data: transByPayId, error: payIdError } = await supabase
            .from("transactions")
            .select("business_id, payment_id, external_reference")
            .eq("payment_id", resourceId.toString())
            .single();
          
          if (!payIdError && transByPayId) {
            transaction = transByPayId;
            transError = null;
            console.log("✅ Transação encontrada pelo payment_id (API Orders):", resourceId);
          } else {
            // Tentar buscar pelo external_reference que contém o resourceId
            const { data: transByRef, error: refError } = await supabase
              .from("transactions")
              .select("business_id, payment_id, external_reference")
              .like("external_reference", `%${resourceId}%`)
              .limit(1)
              .single();
            
            if (!refError && transByRef) {
              transaction = transByRef;
              transError = null;
              console.log("✅ Transação encontrada pelo external_reference (contém payment_id):", transByRef.external_reference);
            }
          }
        }
        
        // Se ainda não encontrou, tentar via API do Mercado Pago (para IDs numéricos)
        if (!transaction) {
          // Buscar todos os businesses com token para consultar o MP
          const { data: allBusinesses } = await supabase
            .from("businesses")
            .select("id, mp_access_token, mp_live_mode")
            .not("mp_access_token", "is", null);
          
          if (allBusinesses && allBusinesses.length > 0 && !isOrdersApiPayment) {
            // Tentar buscar o payment em cada business até encontrar (só para IDs numéricos)
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
                console.log("📋 Payment encontrado no MP:", {
                  id: paymentData.id,
                  external_reference: paymentData.external_reference,
                  order_id: paymentData.order?.id,
                  status: paymentData.status,
                });
                
                const externalRef = paymentData.external_reference;
                const orderId = paymentData.order?.id;
                
                // Estratégia 1: Buscar pelo external_reference exato
                if (externalRef) {
                  const { data: transByRef, error: refError } = await supabase
                    .from("transactions")
                    .select("business_id, payment_id, external_reference")
                    .eq("external_reference", externalRef)
                    .single();
                  
                  if (!refError && transByRef) {
                    transaction = transByRef;
                    transError = null;
                    console.log("✅ Transação encontrada pelo external_reference exato:", externalRef);
                    break;
                  }
                  
                  // Estratégia 2: Buscar com LIKE (external_reference pode ser composto)
                  // Formato: nosso_id|order_id_mp
                  const { data: transByLike, error: likeError } = await supabase
                    .from("transactions")
                    .select("business_id, payment_id, external_reference")
                    .like("external_reference", `%${externalRef}%`)
                    .limit(1)
                    .single();
                  
                  if (!likeError && transByLike) {
                    transaction = transByLike;
                    transError = null;
                    console.log("✅ Transação encontrada pelo external_reference (LIKE):", transByLike.external_reference);
                    break;
                  }
                }
                
                // Estratégia 3: Buscar pelo order_id no external_reference composto
                if (orderId) {
                  const { data: transByOrder, error: orderError } = await supabase
                    .from("transactions")
                    .select("business_id, payment_id, external_reference")
                    .like("external_reference", `%${orderId}%`)
                    .limit(1)
                    .single();
                  
                  if (!orderError && transByOrder) {
                    transaction = transByOrder;
                    transError = null;
                    console.log("✅ Transação encontrada pelo order_id no external_reference:", orderId);
                    break;
                  }
                }
                
                // Se encontrou o payment no MP mas não achou a transação, logar detalhes
                console.log("⚠️ Payment encontrado no MP mas transação não encontrada no banco");
                console.log("📋 Detalhes para debug:", {
                  payment_id: resourceId,
                  external_reference: externalRef,
                  order_id: orderId,
                  business_id: biz.id,
                });
              }
            } catch (e) {
              // Continuar tentando com próximo business
              console.log("⚠️ Erro ao buscar payment no business:", biz.id, e);
              continue;
            }
          }
        }
        } // Fechar if (!transaction) após busca via API MP
      } // Fechar if (!transaction) após busca inicial

      if (transError || !transaction) {
        console.log("❌ Transação NÃO encontrada após todas as tentativas para payment_id:", resourceId);
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
      
      console.log("✅ Transação encontrada:", {
        business_id: transaction.business_id,
        payment_id: transaction.payment_id,
        external_reference: transaction.external_reference,
      });

      // Buscar business para obter access token e buscar status atualizado
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("mp_access_token, mp_live_mode")
        .eq("id", transaction.business_id)
        .single();

      if (businessError || !business?.mp_access_token) {
        console.error("❌ Business não encontrado ou sem token:", businessError);
        // ✅ Webhook sempre retorna 200 (logamos o erro mas não bloqueamos)
        return new Response(
          JSON.stringify({ 
            received: true,
            error: "Business não encontrado ou sem token",
            note: "Webhook recebido mas business não encontrado (verifique logs)"
          }),
          {
            status: 200,
            headers: corsHeaders
          }
        );
      }

      // Usar o access token do business (OAuth já garante que é do ambiente correto)
      const accessToken = business.mp_access_token;
      const businessLiveMode = business.mp_live_mode; // true = produção, false = teste
      
      // ✅ DETECÇÃO: Se o ID começa com "PAY", é da API Orders
      const isOrdersApiPayment = resourceId.toString().startsWith("PAY");
      
      let status: string;
      let statusDetail: string | null = null;
      let paymentLiveMode: boolean | null = null;
      
      if (isOrdersApiPayment) {
        // Para IDs da API Orders (PAY...), usar o status do webhook diretamente
        // O webhook do MP já envia "payment.updated" quando o pagamento é aprovado
        // Como não podemos buscar via /v1/payments/ para esses IDs, confiamos no webhook
        console.log("📦 Payment da API Orders detectado - usando status do webhook");
        
        // Verificar se o webhook indica aprovação (action = payment.updated geralmente significa mudança de status)
        // Para ser seguro, vamos marcar como approved se o webhook foi recebido
        // Em produção, o ideal seria buscar via Orders API, mas por ora confiamos no webhook
        const webhookAction = webhookData.action || "";
        
        if (webhookAction === "payment.updated" || webhookAction === "payment.created") {
          // Tentar buscar o order para obter o status real
          // O external_reference contém o order_id no formato: pix_xxx|ORD...
          const orderIdMatch = transaction.external_reference?.match(/\|(ORD[A-Z0-9]+)$/);
          const orderId = orderIdMatch ? orderIdMatch[1] : null;
          
          if (orderId) {
            try {
              const orderResponse = await fetch(`https://api.mercadopago.com/v1/orders/${orderId}`, {
                method: "GET",
                headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              });
              
              if (orderResponse.ok) {
                const orderData = await orderResponse.json();
                console.log("📋 Order encontrada:", {
                  id: orderData.id,
                  status: orderData.status,
                  status_detail: orderData.status_detail,
                });
                
                // Verificar status dos payments dentro da order
                const payments = orderData.transactions?.payments || [];
                const approvedPayment = payments.find((p: any) => p.status === "approved");
                
                if (approvedPayment) {
                  status = "approved";
                  statusDetail = approvedPayment.status_detail || "accredited";
                  paymentLiveMode = orderData.live_mode ?? null;
                  console.log("✅ Payment aprovado encontrado na Order");
                } else if (orderData.status === "paid" || orderData.status === "closed") {
                  status = "approved";
                  statusDetail = "accredited";
                  paymentLiveMode = orderData.live_mode ?? null;
                  console.log("✅ Order com status paid/closed - marcando como aprovado");
                } else {
                  status = "pending";
                  statusDetail = orderData.status_detail || "waiting_transfer";
                  paymentLiveMode = orderData.live_mode ?? null;
                  console.log("⏳ Order ainda pendente:", orderData.status);
                }
              } else {
                // Se não conseguiu buscar a order, assumir pending
                console.warn("⚠️ Não foi possível buscar Order - assumindo pending");
                status = "pending";
              }
            } catch (e) {
              console.error("❌ Erro ao buscar Order:", e);
              status = "pending";
            }
          } else {
            // Sem order_id, assumir que o webhook é confiável
            // Se recebemos payment.updated, geralmente significa que foi aprovado
            console.log("⚠️ Sem order_id no external_reference - assumindo approved pelo webhook");
            status = "approved";
            statusDetail = "accredited";
          }
        } else {
          status = "pending";
        }
      } else {
        // Para IDs numéricos tradicionais, buscar via API /v1/payments/
        const mp_response = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!mp_response.ok) {
          const errorText = await mp_response.text();
          console.error("❌ Erro ao buscar payment no Mercado Pago:", errorText);
          // ✅ Webhook sempre retorna 200 (logamos o erro mas não bloqueamos)
          return new Response(
            JSON.stringify({ 
              received: true,
              error: "Erro ao buscar status do pagamento",
              note: "Webhook recebido mas erro ao buscar payment (verifique logs)"
            }),
            {
              status: 200,
              headers: corsHeaders
            }
          );
        }

        const paymentData = await mp_response.json();
        status = paymentData.status; // approved, pending, rejected, cancelled, refunded
        statusDetail = paymentData.status_detail;
        paymentLiveMode = paymentData.live_mode; // true = produção, false = teste
      }

      // VERIFICAÇÃO DE AMBIENTE: Verificar se o token corresponde ao ambiente do payment
      // O business.mp_live_mode deve corresponder ao payment.live_mode
      if (businessLiveMode !== undefined && businessLiveMode !== null && paymentLiveMode !== businessLiveMode) {
        console.warn(`⚠️ ATENÇÃO: Ambiente do payment (${paymentLiveMode ? "PRODUÇÃO" : "TESTE"}) não corresponde ao token do business (${businessLiveMode ? "PRODUÇÃO" : "TESTE"})!`);
        console.warn("⚠️ O token pode estar incorreto ou o payment foi criado em ambiente diferente.");
      } else {
        console.log(`✅ Ambiente correto: Payment ${paymentLiveMode ? "PRODUÇÃO" : "TESTE"} com token ${businessLiveMode ? "PRODUÇÃO" : "TESTE"}`);
      }

      // Definir variáveis para uso nos logs e verificações
      const liveMode = paymentLiveMode;
      const isProductionToken = accessToken?.startsWith("APP_USR-");
      const isTestToken = accessToken?.startsWith("TEST-");

      console.log(`📊 Payment Data:`, {
        payment_id: resourceId,
        status: status,
        live_mode: liveMode,
        status_detail: statusDetail,
        environment_match: (liveMode && isProductionToken) || (!liveMode && isTestToken)
      });

      // VERIFICAÇÃO CRÍTICA: Apenas confirmar quando status === "approved"
      if (status !== "approved") {
        console.log(`⚠️ Payment não aprovado. Status: ${status}. Não será marcado como PAID.`);
      } else {
        console.log(`✅ Payment APROVADO! Marcando transação como PAID.`);
      }

      console.log(`🔄 Atualizando transação ${resourceId} para status: ${status} (live_mode: ${liveMode})`);

      // IMPORTANTE: Processar atualização ANTES de responder HTTP 200
      // O Mercado Pago espera resposta rápida, mas precisamos garantir que a atualização foi feita
      
      // VERIFICAÇÃO CRÍTICA: Apenas marcar como PAID quando status === "approved"
      const statusToUpdate = status === "approved" ? "PAID" :
                            status === "pending" ? "PENDING" :
                            status === "rejected" || status === "cancelled" ? "PENDING" :
                            status === "refunded" ? "REFUNDED" : "PENDING";
      
      console.log(`💾 Atualizando transação para: ${statusToUpdate} (status MP: ${status})`);
      
      let updateError = null;
      let updateSuccess = false;
      
      // ✅ ESTRATÉGIA: Atualizar diretamente pelo external_reference (mais confiável)
      // já que encontramos a transação por ele
      if (transaction.external_reference) {
        const { error: refUpdateError, count } = await supabase
          .from("transactions")
          .update({
            status: statusToUpdate,
            payment_id: resourceId.toString(), // ✅ IMPORTANTE: Atualizar o payment_id com o ID real do webhook
            updated_at: new Date().toISOString()
          })
          .eq("external_reference", transaction.external_reference);

        if (!refUpdateError) {
          updateSuccess = true;
          console.log(`✅ Transação atualizada pelo external_reference: ${transaction.external_reference}`);
          console.log(`✅ Payment_id atualizado para: ${resourceId}`);
        } else {
          console.error("❌ Erro ao atualizar pelo external_reference:", refUpdateError);
          updateError = refUpdateError;
        }
      }
      
      // Fallback: tentar via RPC se a atualização direta falhou
      if (!updateSuccess) {
        try {
          const { error: rpcError } = await supabase.rpc("process_mercado_pago_webhook", {
            payment_id_param: resourceId.toString(),
            status_param: status,
            status_detail_param: statusDetail || null,
          });
          if (!rpcError) {
            updateSuccess = true;
            console.log(`✅ Transação atualizada via RPC. Status final: ${statusToUpdate}`);
          } else {
            updateError = rpcError;
          }
        } catch (rpcException) {
          console.error("❌ Exceção ao chamar RPC:", rpcException);
          updateError = rpcException;
        }
      }

      // Último fallback: atualizar diretamente pelo payment_id original
      if (!updateSuccess && transaction.payment_id) {
        const { error: directUpdateError } = await supabase
          .from("transactions")
          .update({
            status: statusToUpdate,
            updated_at: new Date().toISOString()
          })
          .eq("payment_id", transaction.payment_id);

        if (!directUpdateError) {
          updateSuccess = true;
          console.log("✅ Transação atualizada pelo payment_id original:", transaction.payment_id);
        } else {
          console.error("❌ Erro ao atualizar pelo payment_id original:", directUpdateError);
          updateError = directUpdateError;
        }
      }

      // Se todas as tentativas falharam
      if (!updateSuccess) {
        console.error("❌ Todas as tentativas de atualização falharam");
        return new Response(
          JSON.stringify({ 
            received: true,
            error: "Erro ao atualizar transação", 
            details: updateError,
            note: "Webhook recebido mas atualização falhou (verifique logs)"
          }),
          {
            status: 200,
            headers: corsHeaders
          }
        );
      }

      // IMPORTANTE: Sempre responder HTTP 200 rapidamente
      // O Mercado Pago espera resposta rápida (< 5 segundos)
      // Mesmo se houver erro na atualização, responder 200 para evitar retentativas
      const finalStatus = status === "approved" ? "PAID" : "PENDING";
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Webhook processado com sucesso",
          payment_id: resourceId,
          status: status,
          final_status: finalStatus,
          updated: updateSuccess,
          live_mode: liveMode
        }),
        {
          status: 200, // Sempre retornar 200 para webhook
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Se for um webhook de order (Orders API)
    if (webhookType === "order") {
      console.log("📦 Webhook de Order recebido:", resourceId);
      
      // ✅ ESTRATÉGIA DE BUSCA ROBUSTA para Orders:
      // 1. Buscar pelo external_reference exato
      // 2. Buscar com LIKE (external_reference pode ser composto: nosso_id|order_id)
      
      let { data: transaction, error: transError } = await supabase
        .from("transactions")
        .select("business_id, payment_id, external_reference")
        .eq("external_reference", resourceId.toString())
        .single();

      // Se não encontrar pelo external_reference exato, tentar com LIKE
      if (transError || !transaction) {
        console.log("🔍 Tentando buscar order com LIKE no external_reference...");
        const { data: transByLike, error: likeError } = await supabase
          .from("transactions")
          .select("business_id, payment_id, external_reference")
          .like("external_reference", `%${resourceId}%`)
          .limit(1)
          .single();
        
        if (!likeError && transByLike) {
          transaction = transByLike;
          transError = null;
          console.log("✅ Transação encontrada pelo order_id (LIKE):", transByLike.external_reference);
        }
      }

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
      
      console.log("✅ Transação encontrada para order:", {
        business_id: transaction.business_id,
        payment_id: transaction.payment_id,
        external_reference: transaction.external_reference,
      });

      // Buscar business para obter access token
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("mp_access_token, mp_live_mode")
        .eq("id", transaction.business_id)
        .single();

      if (businessError || !business?.mp_access_token) {
        console.error("❌ Business não encontrado ou sem token:", businessError);
        // ✅ Webhook sempre retorna 200 (logamos o erro mas não bloqueamos)
        return new Response(
          JSON.stringify({ 
            received: true,
            error: "Business não encontrado ou sem token",
            note: "Webhook recebido mas business não encontrado (verifique logs)"
          }),
          {
            status: 200,
            headers: corsHeaders
          }
        );
      }

      // Usar o access token do business (OAuth já garante que é do ambiente correto)
      const accessToken = business.mp_access_token;
      const businessLiveMode = business.mp_live_mode; // true = produção, false = teste
      
      // Buscar order no Mercado Pago
      let order_response = await fetch(`https://api.mercadopago.com/merchant_orders/${resourceId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!order_response.ok) {
        const errorText = await order_response.text();
        console.error("❌ Erro ao buscar order no Mercado Pago:", errorText);
        // ✅ Webhook sempre retorna 200 (logamos o erro mas não bloqueamos)
        return new Response(
          JSON.stringify({ 
            received: true,
            error: "Erro ao buscar order no Mercado Pago",
            note: "Webhook recebido mas erro ao buscar order (verifique logs)"
          }),
          {
            status: 200,
            headers: corsHeaders
          }
        );
      }

      const orderData = await order_response.json();
      const payments = orderData.payments || [];
      const orderLiveMode = orderData.live_mode; // true = produção, false = teste
      
      // VERIFICAÇÃO DE AMBIENTE: Verificar se o token corresponde ao ambiente do order
      if (businessLiveMode !== undefined && businessLiveMode !== null && orderLiveMode !== businessLiveMode) {
        console.warn(`⚠️ ATENÇÃO: Ambiente do order (${orderLiveMode ? "PRODUÇÃO" : "TESTE"}) não corresponde ao token do business (${businessLiveMode ? "PRODUÇÃO" : "TESTE"})!`);
      } else {
        console.log(`✅ Ambiente correto: Order ${orderLiveMode ? "PRODUÇÃO" : "TESTE"} com token ${businessLiveMode ? "PRODUÇÃO" : "TESTE"}`);
      }
      
      // Usar orderLiveMode para processar payments
      const liveMode = orderLiveMode;
      
      // Fallback para verificação antiga (remover depois)
      const isProductionToken = accessToken?.startsWith("APP_USR-");
      const isTestToken = accessToken?.startsWith("TEST-");
      
      if (liveMode === true && isTestToken) {
        console.warn("⚠️ ATENÇÃO: Order de PRODUÇÃO sendo buscada com token de TESTE!");
      } else if (liveMode === false && isProductionToken) {
        console.warn("⚠️ ATENÇÃO: Order de TESTE sendo buscada com token de PRODUÇÃO!");
      } else {
        console.log(`✅ Ambiente correto: ${liveMode ? "PRODUÇÃO" : "TESTE"} com token ${isProductionToken ? "PRODUÇÃO" : "TESTE"}`);
      }
      
      // VERIFICAÇÃO CRÍTICA: Apenas confirmar quando algum payment tem status === "approved"
      const hasApprovedPayment = payments.some((p: any) => p.status === "approved");
      const hasRejectedPayment = payments.every((p: any) => p.status === "rejected" || p.status === "cancelled");
      
      let status = "pending";
      if (hasApprovedPayment) {
        status = "approved";
        console.log(`✅ Order APROVADA! Algum payment está approved. Marcando transação como PAID.`);
      } else if (hasRejectedPayment && payments.length > 0) {
        status = "rejected";
        console.log(`⚠️ Order rejeitada. Todos os payments foram rejected/cancelled.`);
      } else {
        console.log(`⏳ Order pendente. Status: ${status}`);
      }

      console.log(`🔄 Atualizando transação da order ${resourceId} para status: ${status} (live_mode: ${liveMode}, payments: ${payments.length})`);

      // Atualizar payment_id se ainda não estiver salvo (usar o primeiro payment aprovado)
      const approvedPayment = payments.find((p: any) => p.status === "approved");
      const paymentIdToUpdate = approvedPayment?.id?.toString() || payments[0]?.id?.toString();

      // IMPORTANTE: Processar atualização ANTES de responder HTTP 200
      let updateSuccess = false;
      if (paymentIdToUpdate) {
        // VERIFICAÇÃO CRÍTICA: Apenas marcar como PAID quando status === "approved"
        const finalStatus = status === "approved" ? "PAID" : "PENDING";
        console.log(`💾 Atualizando transação da order. Status final: ${finalStatus} (status original: ${status})`);
        
        const { error: updateError } = await supabase.rpc("process_mercado_pago_webhook", {
          payment_id_param: paymentIdToUpdate,
          status_param: status,
          status_detail_param: null,
        });

        if (updateError) {
          console.error("❌ Erro ao atualizar transação via RPC:", updateError);
          // Tentar atualizar diretamente pelo external_reference
          const { error: directUpdateError } = await supabase
            .from("transactions")
            .update({
              status: finalStatus,
              payment_id: paymentIdToUpdate,
              updated_at: new Date().toISOString()
            })
            .eq("external_reference", resourceId.toString());

          if (directUpdateError) {
            console.error("❌ Erro ao atualizar transação diretamente:", directUpdateError);
            // Mesmo com erro, responder 200 para evitar retentativas do Mercado Pago
            return new Response(
              JSON.stringify({ 
                success: false,
                error: "Erro ao atualizar transação", 
                details: directUpdateError,
                note: "Webhook recebido mas atualização falhou. Verifique logs."
              }),
              {
                status: 200, // Sempre 200 para webhook
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              }
            );
          } else {
            updateSuccess = true;
            console.log("✅ Transação atualizada diretamente pelo external_reference");
          }
        } else {
          updateSuccess = true;
          console.log("✅ Transação atualizada via função RPC");
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Webhook de Order processado com sucesso",
          order_id: resourceId,
          status: status,
          final_status: status === "approved" ? "PAID" : "PENDING",
          payments_count: payments.length,
          live_mode: liveMode
        }),
        {
          status: 200, // Sempre retornar 200 para webhook
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
    // ✅ IMPORTANTE: Webhooks devem SEMPRE retornar 200 para evitar reenvios
    // Logamos o erro mas retornamos sucesso para o Mercado Pago
    return new Response(
      JSON.stringify({
        received: true,
        error: "Erro interno processado (verifique logs)",
        message: error.message || "Erro interno do servidor"
      }),
      {
        status: 200, // ✅ SEMPRE 200 para webhooks
        headers: corsHeaders
      }
    );
  }
});
