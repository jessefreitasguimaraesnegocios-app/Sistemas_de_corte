// Deno Edge Function - runs in Deno runtime
/// <reference path="../deno.d.ts" />
// @ts-ignore - Deno imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM imports are resolved at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configurações do Mercado Pago
// ⚠️ MP_SPONSOR_ID_LOJA NÃO deve ser secret - vem do banco (business.mp_user_id)
const URL_WEBHOOK = Deno.env.get("MP_WEBHOOK_URL") || "";

// ✅ Configurações do Supabase - OBRIGATÓRIAS
// GARANTIR que esses dois existem em: Supabase → Edge Functions → Secrets
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 🔥 LOG CRÍTICO - Se aparecer nos logs do Supabase, a função ESTÁ sendo executada
  console.log("🔥🔥🔥 createPayment EXECUTADA - Se você vê isso, o gateway NÃO bloqueou");
  console.log("🔥🔥🔥 Timestamp:", new Date().toISOString());
  console.log("🔥🔥🔥 Method:", req.method);
  console.log("🔥🔥🔥 URL:", req.url);

  try {
    // #region agent log
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      allHeaders[key] = key.toLowerCase().includes('authorization') || key.toLowerCase() === 'apikey' 
        ? `${value.substring(0, 20)}...` 
        : value;
    });
    await fetch('http://127.0.0.1:7242/ingest/ea370a6f-3bf4-49b1-acb3-6c775b154e3a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'createPayment/index.ts:19',message:'HYP-D: Função EXECUTADA - headers recebidos',data:{method:req.method,url:req.url,headers:allHeaders,hasApikey:req.headers.has('apikey'),hasAuthorization:req.headers.has('authorization')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    // 🔥 FUNÇÃO PÚBLICA - CHECKOUT NÃO REQUER AUTENTICAÇÃO DE USUÁRIO
    // ✅ REGRA DE OURO: Pagamento pode ser feito por cliente anônimo
    // - PIX pode ser gerado sem login (QR Code público, link, mesa, PWA)
    // - Cartão pode ser processado sem login (checkout transparente)
    // 
    // 🔐 SEGURANÇA REAL acontece em:
    // 1. OAuth Mercado Pago (access_token do vendedor é validado)
    // 2. Webhook assinado (MP_WEBHOOK_SECRET valida notificações)
    // 3. Validação de valores no backend (não no frontend)
    // 4. Idempotency key (evita duplicação)
    // 
    // ❌ NUNCA validar usuário logado em checkout/pagamento
    
    console.log("🔥 createPayment chamada (pública - sem auth de usuário)");
    console.log("📋 Método:", req.method);
    console.log("📋 URL:", req.url);
    console.log("📋 Headers recebidos:", Object.fromEntries(req.headers.entries()));
    console.log("📋 Has apikey header:", req.headers.has('apikey'));
    console.log("📋 Has authorization header:", req.headers.has('authorization'));

    // #region agent log
    await fetch('http://127.0.0.1:7242/ingest/ea370a6f-3bf4-49b1-acb3-6c775b154e3a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'createPayment/index.ts:50',message:'HYP-A: Verificando configs do Supabase',data:{hasSupabaseUrl:!!SUPABASE_URL,hasServiceKey:!!SUPABASE_SERVICE_ROLE_KEY,urlLength:SUPABASE_URL?.length,serviceKeyLength:SUPABASE_SERVICE_ROLE_KEY?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // ✅ VALIDAR CONFIGURAÇÕES DO SUPABASE
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ Configuração do Supabase incompleta", {
        hasUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      });
      return new Response(
        JSON.stringify({ 
          error: "Configuração do servidor incompleta. Contate o suporte.",
          details: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados"
        }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }

    // ✅ LER BODY DA REQUISIÇÃO
    let body: any;
    try {
      const bodyText = await req.text();
      console.log("📦 Body RAW recebido:", bodyText.substring(0, 500));
      body = JSON.parse(bodyText);
    } catch (parseError: any) {
      console.error("❌ Erro ao parsear body:", parseError);
      return new Response(
        JSON.stringify({ 
          error: "Body inválido. JSON malformado.",
          details: parseError.message 
        }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    const {
      valor,
      metodo_pagamento,
      email_cliente,
      referencia_externa = `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      token_cartao,
      business_id,
    } = body;

    console.log("📦 Dados recebidos (parseados):", {
      valor,
      metodo_pagamento,
      email_cliente,
      business_id,
      hasTokenCartao: !!token_cartao,
      valorType: typeof valor,
      businessIdType: typeof business_id,
    });

    // ✅ VALIDAR PARÂMETROS
    console.log("🔍 Validando parâmetros:", {
      valor,
      valorType: typeof valor,
      valorIsNumber: typeof valor === 'number',
      email_cliente,
      emailType: typeof email_cliente,
      business_id,
      businessIdType: typeof business_id,
      metodo_pagamento,
    });
    
    if (!valor || valor <= 0) {
      console.error("❌ Validação falhou: valor inválido", { valor, valorType: typeof valor });
      return new Response(
        JSON.stringify({ error: "Valor inválido. O valor deve ser maior que zero.", details: `Recebido: ${valor} (tipo: ${typeof valor})` }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!email_cliente || !email_cliente.includes("@")) {
      console.error("❌ Validação falhou: email inválido", { email_cliente, emailType: typeof email_cliente });
      return new Response(
        JSON.stringify({ error: "Email do cliente inválido.", details: `Recebido: ${email_cliente}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!business_id) {
      console.error("❌ Validação falhou: business_id ausente", { business_id, businessIdType: typeof business_id });
      return new Response(
        JSON.stringify({ error: "ID do estabelecimento é obrigatório.", details: `Recebido: ${business_id}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (metodo_pagamento !== "pix" && metodo_pagamento !== "credit_card") {
      return new Response(
        JSON.stringify({ error: "Método de pagamento inválido. Use 'pix' ou 'credit_card'." }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (metodo_pagamento === "credit_card" && !token_cartao) {
      return new Response(
        JSON.stringify({ error: "Token do cartão é obrigatório para pagamento com cartão." }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ BUSCAR BUSINESS NO BANCO
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    console.log("🔍 Buscando business:", business_id);
    // ✅ BUSCAR BUSINESS COM CAMPOS NECESSÁRIOS DO MERCADO PAGO
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, name, mp_access_token, mp_user_id, revenue_split")
      .eq("id", business_id)
      .single();

    if (businessError || !business) {
      console.error("❌ Erro ao buscar business:", businessError);
      return new Response(
        JSON.stringify({ 
          error: "Estabelecimento não encontrado.",
          details: businessError?.message 
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    console.log("✅ Business encontrado:", business.name);

    // ✅ VERIFICAR SE BUSINESS TEM MP_ACCESS_TOKEN
    if (!business.mp_access_token) {
      return new Response(
        JSON.stringify({ 
          error: "Estabelecimento não possui Access Token do Mercado Pago configurado.",
          hint: "Configure o token antes de processar pagamentos."
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ USAR ACCESS TOKEN DO BUSINESS
    const ACCESS_TOKEN_VENDEDOR = business.mp_access_token;
    const COMISSAO_PERCENTUAL = business.revenue_split || 10;
    const marketplace_fee = Math.round(valor * (COMISSAO_PERCENTUAL / 100) * 100) / 100;

    // ✅ OBTER SPONSOR_ID DO BANCO (mp_user_id do business)
    // Cada business tem seu próprio mp_user_id (obtido via OAuth)
    // NÃO usar secret global - isso quebraria o marketplace
    const SPONSOR_ID_BUSINESS = business.mp_user_id;
    
    if (!SPONSOR_ID_BUSINESS) {
      return new Response(
        JSON.stringify({ 
          error: "Estabelecimento não possui User ID do Mercado Pago configurado.",
          hint: "Conecte o estabelecimento ao Mercado Pago via OAuth primeiro."
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ PREPARAR PAYLOAD PARA MERCADO PAGO
    const idempotencyKey = `${referencia_externa}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const orderData: any = {
      type: "online",
      total_amount: valor.toFixed(2),
      external_reference: referencia_externa,
      processing_mode: "automatic",
      payer: {
        email: email_cliente,
      },
      transactions: {
        payments: []
      },
      integration_data: {
        sponsor: {
          id: String(SPONSOR_ID_BUSINESS) // mp_user_id do business (obtido via OAuth)
        }
      }
    };

    if (marketplace_fee > 0) {
      orderData.marketplace_fee = marketplace_fee.toFixed(2);
    }

    // ✅ CONFIGURAR PAGAMENTO BASEADO NO MÉTODO
    if (metodo_pagamento === "pix") {
      orderData.transactions.payments.push({
        amount: valor.toFixed(2),
        payment_method: {
          id: "pix",
          type: "bank_transfer"
        },
        expiration_time: "P1D"
      });
    } else if (metodo_pagamento === "credit_card") {
      orderData.transactions.payments.push({
        amount: valor.toFixed(2),
        payment_method: {
          id: "credit_card",
          type: "credit_card"
        },
        token: token_cartao,
        installments: 1
      });
    }

    console.log("📤 Chamando API Mercado Pago...");
    console.log("💰 Split:", {
      valorTotal: valor,
      comissaoPercentual: COMISSAO_PERCENTUAL,
      marketplaceFee: marketplace_fee,
      sponsorId: SPONSOR_ID_BUSINESS,
      businessId: business_id,
    });
    console.log("📦 OrderData sendo enviado ao MP:", JSON.stringify(orderData, null, 2));
    console.log("🔑 Access Token (preview):", ACCESS_TOKEN_VENDEDOR ? `${ACCESS_TOKEN_VENDEDOR.substring(0, 20)}...` : 'MISSING');

    // ✅ CHAMAR API MERCADO PAGO
    let mpResponse: Response;
    let mpResponseText: string;
    let mpData: any;
    
    try {
      mpResponse = await fetch("https://api.mercadopago.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN_VENDEDOR}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(orderData),
      });

      mpResponseText = await mpResponse.text();
      console.log("📥 Resposta RAW do Mercado Pago:", mpResponseText.substring(0, 500));
      
      try {
        mpData = JSON.parse(mpResponseText);
      } catch (e) {
        console.error("❌ Erro ao parsear resposta do Mercado Pago:", mpResponseText);
        return new Response(
          JSON.stringify({ 
            error: "Erro ao processar resposta do Mercado Pago.",
            details: mpResponseText.substring(0, 200)
          }),
          { status: 500, headers: corsHeaders }
        );
      }

      console.log("📥 Resposta Mercado Pago (parseada):", {
        status: mpResponse.status,
        statusText: mpResponse.statusText,
        hasData: !!mpData,
        mpDataKeys: Object.keys(mpData || {}),
        mpError: mpData?.error,
        mpMessage: mpData?.message,
      });

      if (!mpResponse.ok) {
        console.error("❌ Erro na API Mercado Pago:", {
          status: mpResponse.status,
          statusText: mpResponse.statusText,
          mpData: mpData,
          mpError: mpData?.error,
          mpMessage: mpData?.message,
          mpCause: mpData?.cause,
        });
        return new Response(
          JSON.stringify({ 
            error: "Erro ao processar pagamento no Mercado Pago.",
            details: mpData?.message || mpData?.error || mpData?.cause?.[0]?.description || "Erro desconhecido",
            mpStatus: mpResponse.status,
            mpData: mpData
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    } catch (fetchError: any) {
      console.error("❌ Erro ao fazer fetch para Mercado Pago:", fetchError);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao conectar com Mercado Pago.",
          details: fetchError.message || fetchError.toString()
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // ✅ PROCESSAR RESPOSTA DO MERCADO PAGO
    const payment = mpData.transactions?.[0]?.payments?.[0];
    
    if (!payment) {
      console.error("❌ Resposta do Mercado Pago sem payment:", mpData);
      return new Response(
        JSON.stringify({ 
          error: "Resposta inválida do Mercado Pago.",
          details: "Payment não encontrado na resposta"
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    const paymentId = payment.id;
    const paymentStatus = payment.status;
    const paymentStatusDetail = payment.status_detail || "";

    // ✅ PREPARAR RESPOSTA
    let responseData: any = {
      success: true,
      payment_id: paymentId,
      status: paymentStatus,
      status_detail: paymentStatusDetail,
      application_fee: marketplace_fee,
    };

    // ✅ ADICIONAR QR CODE SE FOR PIX
    if (metodo_pagamento === "pix") {
      const qrCode = payment.point_of_interaction?.transaction_data?.qr_code;
      const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64;
      
      if (qrCode) {
        responseData.qr_code = qrCode;
      }
      if (qrCodeBase64) {
        responseData.qr_code_base64 = qrCodeBase64;
      }
      
      responseData.txid = payment.point_of_interaction?.transaction_data?.transaction_id || "";
    }

    // ✅ SALVAR TRANSAÇÃO NO BANCO
    const partnerNet = valor - marketplace_fee;
    
    const { error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert({
        business_id: business_id,
        amount: valor,
        admin_fee: marketplace_fee,
        partner_net: partnerNet,
        status: paymentStatus === "approved" ? "PAID" : "PENDING",
        gateway: "MERCADO_PAGO",
        payment_id: String(paymentId),
        payment_method: metodo_pagamento,
        customer_email: email_cliente,
        external_reference: referencia_externa,
      });

    if (transactionError) {
      console.error("⚠️ Erro ao salvar transação (não crítico):", transactionError);
      // Não falhar o pagamento por causa disso
    } else {
      console.log("✅ Transação salva no banco");
    }

    console.log("✅ Pagamento criado com sucesso:", {
      paymentId,
      status: paymentStatus,
      method: metodo_pagamento,
    });

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("❌ ERRO GERAL na Edge Function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno ao processar pagamento.",
        details: error.message || error.toString()
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
