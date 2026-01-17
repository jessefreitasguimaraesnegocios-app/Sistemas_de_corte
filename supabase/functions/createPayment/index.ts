// Deno Edge Function - runs in Deno runtime
/// <reference path="../deno.d.ts" />
// @ts-ignore - Deno imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM imports are resolved at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configurações do Mercado Pago (apenas da plataforma)
const SPONSOR_ID_LOJA_STR = Deno.env.get("MP_SPONSOR_ID_LOJA") || "";
// Converter para número, pois a API do Mercado Pago requer sponsor_id numérico
const SPONSOR_ID_LOJA = SPONSOR_ID_LOJA_STR ? Number(SPONSOR_ID_LOJA_STR) : null;
const URL_WEBHOOK = Deno.env.get("MP_WEBHOOK_URL") || "";

// URL e Service Role Key do Supabase
// O Supabase injeta automaticamente essas variáveis nas Edge Functions
// Formato: https://<project-ref>.supabase.co
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || 
                     Deno.env.get("SUPABASE_PROJECT_URL") || 
                     "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // TESTE MÍNIMO - Descomente para testar se a função está sendo chamada
  // console.log("✅ FUNÇÃO createPayment CHAMADA - TESTE MÍNIMO");
  // return new Response(
  //   JSON.stringify({ ok: true, message: "Função funcionando!" }),
  //   { status: 200, headers: corsHeaders }
  // );

  try {
    // ✅ TESTE DEFINITIVO: Log de headers no topo
    console.log("📋 HEADERS recebidos:", Object.fromEntries(req.headers.entries()));
    
    // Validar autenticação do usuário
    const authHeader = req.headers.get("authorization") || 
                      req.headers.get("Authorization") || 
                      req.headers.get("AUTHORIZATION") || 
                      "";
    
    console.log("🔍 Debug createPayment:", {
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader.length,
      authHeaderPreview: authHeader ? `${authHeader.substring(0, 30)}...` : "null",
      hasSupabaseUrl: !!SUPABASE_URL,
      hasAnonKey: !!SUPABASE_ANON_KEY,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
    });
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("❌ Authorization header ausente ou inválido");
      return new Response(
        JSON.stringify({ 
          error: "Não autorizado. Token de autenticação não fornecido.",
          hint: "Esta função requer autenticação. Certifique-se de estar logado."
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validar credenciais do Supabase antes de criar cliente
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("❌ Configuração do Supabase incompleta - ANON_KEY é obrigatória para validar JWT");
      return new Response(
        JSON.stringify({ 
          error: "Configuração do Supabase incompleta. As variáveis SUPABASE_URL e SUPABASE_ANON_KEY devem estar configuradas." 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // ✅ FORMA CORRETA (OBRIGATÓRIA): Criar cliente com ANON_KEY e repassar Authorization
    // ❌ NUNCA usar SERVICE_ROLE_KEY para validar usuário logado
    // ✅ SEMPRE repassar o header Authorization para o client
    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY, // ✅ OBRIGATÓRIO: usar ANON_KEY, não SERVICE_ROLE_KEY
      {
        global: {
          headers: {
            Authorization: authHeader, // ✅ OBRIGATÓRIO: repassar header Authorization
          },
        },
        auth: {
          persistSession: false,
        },
      }
    );

    console.log("🔐 Tentando validar usuário com token...");
    
    // Verificar se o usuário está autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    // ✅ TESTE DEFINITIVO: Log após getUser()
    console.log("👤 USER:", user ? { id: user.id, email: user.email } : null);
    console.log("❌ AUTH ERROR:", userError ? {
      message: userError.message,
      name: userError.name,
      status: userError.status,
    } : null);
    
    console.log("👤 Resultado da validação:", {
      hasUser: !!user,
      userId: user?.id,
      userError: userError ? {
        message: userError.message,
        name: userError.name,
        status: userError.status,
      } : null,
    });
    
    if (userError || !user) {
      console.error("❌ Erro ao validar usuário:", userError);
      return new Response(
        JSON.stringify({ 
          error: "Não autorizado. Token inválido ou expirado.",
          hint: "Faça login novamente ou renove sua sessão.",
          details: userError?.message || "Token não pôde ser validado"
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 🔥 SE CHEGOU AQUI, AUTH ESTÁ OK
    console.log("✅ Usuário autenticado:", user.id);

    const body = await req.json();
    const {
      valor,
      metodo_pagamento,
      email_cliente,
      referencia_externa = new Date().getTime().toString(),
      token_cartao,
      business_id,
    } = body;

    // Log para debug (remover em produção se necessário)
    console.log("Recebido na Edge Function:", {
      valor,
      metodo_pagamento,
      email_cliente,
      business_id,
      has_token_cartao: !!token_cartao,
    });

    // Validação de parâmetros obrigatórios com mensagens específicas
    if (!valor || valor <= 0) {
      return new Response(
        JSON.stringify({ error: "Valor inválido. O valor deve ser maior que zero." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!metodo_pagamento) {
      return new Response(
        JSON.stringify({ error: "Método de pagamento não especificado. Use 'pix' ou 'credit_card'." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!email_cliente || !email_cliente.includes('@')) {
      return new Response(
        JSON.stringify({ error: "Email do cliente inválido ou não fornecido." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: "ID do estabelecimento (business_id) é obrigatório e não foi fornecido." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validação de variáveis de ambiente da plataforma
    if (!SPONSOR_ID_LOJA || isNaN(SPONSOR_ID_LOJA)) {
      return new Response(
        JSON.stringify({ 
          error: "Configuração do Mercado Pago incompleta: MP_SPONSOR_ID_LOJA não configurado ou inválido",
          hint: "MP_SPONSOR_ID_LOJA deve ser um número válido"
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validar credenciais do Supabase
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "Configuração do Supabase incompleta. As variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configuradas." 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Criar cliente Supabase com Service Role para buscar dados do negócio
    // (já validamos o usuário acima, agora usamos Service Role para acessar dados)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar informações do negócio, incluindo o Access Token do Mercado Pago
    console.log("Buscando business com ID:", business_id);
    console.log("SUPABASE_URL:", SUPABASE_URL ? "Configurado" : "NÃO CONFIGURADO");
    console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "Configurado" : "NÃO CONFIGURADO");
    
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, mp_access_token, revenue_split, status")
      .eq("id", business_id)
      .single();

    if (businessError) {
      console.error("Erro ao buscar business:", businessError);
      console.error("Detalhes do erro:", JSON.stringify(businessError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: "Erro ao buscar negócio no banco de dados", 
          details: businessError.message,
          code: businessError.code,
          hint: businessError.hint,
          business_id: business_id 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!business) {
      console.error("Business não encontrado com ID:", business_id);
      // Tentar buscar sem .single() para ver se existe
      const { data: allBusinesses } = await supabase
        .from("businesses")
        .select("id, name, status")
        .limit(5);
      console.log("Businesses disponíveis (primeiros 5):", allBusinesses);
      
      return new Response(
        JSON.stringify({ 
          error: "Negócio não encontrado no banco de dados", 
          business_id: business_id,
          hint: "Verifique se o ID do negócio está correto e se o negócio existe na tabela businesses"
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Business encontrado:", { 
      id: business.id, 
      name: business.name, 
      status: business.status, 
      has_token: !!business.mp_access_token,
      token_length: business.mp_access_token ? business.mp_access_token.length : 0,
      token_preview: business.mp_access_token ? business.mp_access_token.substring(0, 20) + "..." : "null"
    });

    // Verificar se o negócio está ativo
    if (business.status !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: "Negócio não está ativo" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Verificar se o negócio tem Access Token configurado
    if (!business.mp_access_token) {
      return new Response(
        JSON.stringify({ error: "Negócio não possui Access Token do Mercado Pago configurado. Configure o token antes de processar pagamentos." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Usar o Access Token específico do negócio
    const ACCESS_TOKEN_VENDEDOR = business.mp_access_token;
    
    // Usar o revenue_split do negócio ou padrão de 10%
    const COMISSAO_PERCENTUAL = business.revenue_split || 10;

    // Calcula split usando a porcentagem configurada no negócio
    // O valor da comissão em reais (marketplace_fee)
    const marketplace_fee = Math.round(valor * (COMISSAO_PERCENTUAL / 100) * 100) / 100;
    const application_fee = marketplace_fee; // Para compatibilidade

    // Validar SPONSOR_ID_LOJA (necessário para split)
    if (!SPONSOR_ID_LOJA || isNaN(SPONSOR_ID_LOJA)) {
      return new Response(
        JSON.stringify({ 
          error: "Configuração de split incompleta: MP_SPONSOR_ID_LOJA não configurado ou inválido",
          hint: "Configure MP_SPONSOR_ID_LOJA nas variáveis de ambiente da Edge Function"
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Gerar X-Idempotency-Key único para esta requisição
    const idempotencyKey = `${referencia_externa}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Usar API de Orders para suportar split tanto em PIX quanto em cartão
    // A API de Orders suporta marketplace_fee que funciona para ambos os métodos
    // marketplace_fee deve estar no nível raiz da ordem, não dentro de marketplace
    // IMPORTANTE: Para o split funcionar, é necessário incluir integration_data com sponsor.id
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
      // Integration data com sponsor ID é OBRIGATÓRIO para split funcionar
      // O sponsor.id deve ser uma string com o User ID da conta da plataforma
      integration_data: {
        sponsor: {
          id: String(SPONSOR_ID_LOJA)
        }
      }
    };

    // Adicionar marketplace_fee no nível raiz da ordem para split
    if (marketplace_fee > 0) {
      orderData.marketplace_fee = marketplace_fee.toFixed(2);
    }

    // Configurar pagamento baseado no método
    if (metodo_pagamento === "pix") {
      orderData.transactions.payments.push({
        amount: valor.toFixed(2),
        payment_method: {
          id: "pix",
          type: "bank_transfer"
        },
        expiration_time: "P1D" // 24 horas para PIX
      });
    } else if (metodo_pagamento === "credit_card") {
      if (!token_cartao) {
        return new Response(
          JSON.stringify({ error: "Token do cartão é obrigatório para pagamento com cartão" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      orderData.transactions.payments.push({
        amount: valor.toFixed(2),
        payment_method: {
          id: "credit_card",
          type: "credit_card"
        },
        token: token_cartao,
        installments: 1
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Método de pagamento inválido. Use 'pix' ou 'credit_card'" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Log do payload completo para debug
    console.log("=== DEBUG SPLIT PAYMENT ===");
    console.log("Valor total:", valor);
    console.log("Comissão percentual:", COMISSAO_PERCENTUAL + "%");
    console.log("Marketplace fee calculado:", marketplace_fee);
    console.log("Sponsor ID (string):", String(SPONSOR_ID_LOJA));
    console.log("Payload completo:", JSON.stringify(orderData, null, 2));
    console.log("===========================");
    
    // Chamada para API de Orders do Mercado Pago (suporta split nativamente)
    const mp_response = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN_VENDEDOR}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(orderData),
    });

    const mp_result = await mp_response.json();

    if (!mp_response.ok) {
      console.error("❌ Erro na API de Orders do Mercado Pago:", JSON.stringify(mp_result, null, 2));
      return new Response(
        JSON.stringify({ 
          error: mp_result.message || "Erro ao processar pagamento no Mercado Pago",
          details: mp_result,
          hint: mp_result.cause ? JSON.stringify(mp_result.cause) : undefined
        }), 
        {
          status: mp_response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log da resposta do Mercado Pago para verificar split
    console.log("✅ Resposta do Mercado Pago (Orders API):");
    console.log("- Order ID:", mp_result.id);
    console.log("- Marketplace fee enviado:", marketplace_fee);
    console.log("- Sponsor ID enviado:", String(SPONSOR_ID_LOJA));
    console.log("- Resposta completa:", JSON.stringify(mp_result, null, 2));

    // A API de Orders retorna estrutura diferente
    // Extrair informações do pagamento da resposta
    const payment = mp_result.transactions?.payments?.[0];
    if (!payment) {
      return new Response(
        JSON.stringify({ 
          error: "Resposta inválida do Mercado Pago: pagamento não encontrado na ordem",
          details: mp_result
        }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Salvar transação no banco de dados
    const partner_net = valor - marketplace_fee;
    const transactionStatus = payment.status === "approved" ? "PAID" : 
                            payment.status === "pending" ? "PENDING" : 
                            payment.status === "action_required" ? "PENDING" :
                            payment.status === "rejected" ? "PENDING" : "PENDING";

    // IMPORTANTE: Salvar o payment.id (não o order.id) para que o webhook possa encontrar a transação
    // O external_reference contém a referência externa (que pode ser usada para buscar pelo order_id)
    const paymentIdToSave = payment.id?.toString() || "";
    const orderId = mp_result.id?.toString() || "";

    console.log("💾 Salvando transação:", {
      payment_id: paymentIdToSave,
      order_id: orderId,
      external_reference: referencia_externa,
      status: transactionStatus
    });

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        business_id: business_id,
        amount: valor,
        admin_fee: marketplace_fee,
        partner_net: partner_net,
        date: new Date().toISOString(),
        status: transactionStatus,
        gateway: "MERCADO_PAGO",
        payment_id: paymentIdToSave, // Sempre salvar o payment.id (não o order.id)
        payment_method: metodo_pagamento === "pix" ? "pix" : "credit_card",
        customer_email: email_cliente,
        external_reference: referencia_externa, // Contém a referência externa (pode ser usado para buscar order)
      });

    if (transactionError) {
      console.error("Erro ao salvar transação:", transactionError);
      // Não falhar o pagamento por erro ao salvar transação, apenas logar
    }

    // Retorna QR Code PIX ou resultado do cartão
    if (metodo_pagamento === "pix") {
      // Para PIX via Orders API, o QR code está em payment_method
      const qrCodeBase64 = payment.payment_method?.qr_code_base64;
      const qrCode = payment.payment_method?.qr_code;
      const ticketUrl = payment.payment_method?.ticket_url;
      
      return new Response(
        JSON.stringify({
          success: true,
          qr_code_base64: qrCodeBase64,
          qr_code: qrCode,
          ticket_url: ticketUrl,
          txid: payment.id?.toString() || mp_result.id?.toString() || "",
          payment_id: payment.id || mp_result.id,
          status: payment.status,
          application_fee: marketplace_fee,
          order_id: mp_result.id,
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Retorno para cartão de crédito
    return new Response(
      JSON.stringify({
        success: payment.status === "approved",
        payment_id: payment.id || mp_result.id,
        status: payment.status,
        status_detail: payment.status_detail,
        application_fee: marketplace_fee,
        transaction_amount: payment.amount || valor,
        order_id: mp_result.id,
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
        details: error.toString() 
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
