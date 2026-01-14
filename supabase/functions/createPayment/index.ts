// Deno Edge Function - runs in Deno runtime
/// <reference path="../deno.d.ts" />
// @ts-ignore - Deno imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM imports are resolved at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configurações do Mercado Pago (apenas da plataforma)
const SPONSOR_ID_LOJA = Deno.env.get("MP_SPONSOR_ID_LOJA")!;
const URL_WEBHOOK = Deno.env.get("MP_WEBHOOK_URL") || "";

// URL e Service Role Key do Supabase
// O Supabase injeta automaticamente essas variáveis nas Edge Functions
// Formato: https://<project-ref>.supabase.co
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || 
                     Deno.env.get("SUPABASE_PROJECT_URL") || 
                     "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
    if (!SPONSOR_ID_LOJA) {
      return new Response(
        JSON.stringify({ error: "Configuração do Mercado Pago incompleta: MP_SPONSOR_ID_LOJA não configurado" }),
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

    // Criar cliente Supabase para buscar dados do negócio
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
    const application_fee = Math.round(valor * (COMISSAO_PERCENTUAL / 100) * 100) / 100;

    // Monta payload da API Mercado Pago
    const dados_pagamento: any = {
      transaction_amount: valor,
      description: `Pagamento ${business.name || "BelezaHub"} - ${business_id}`,
      payment_method_id: metodo_pagamento === "pix" ? "pix" : undefined,
      application_fee,
      sponsor_id: SPONSOR_ID_LOJA,
      external_reference: referencia_externa,
    };

    // Adiciona webhook URL se configurado
    if (URL_WEBHOOK) {
      dados_pagamento.notification_url = URL_WEBHOOK;
    }

    if (metodo_pagamento === "pix") {
      dados_pagamento.payer = { email: email_cliente };
      dados_pagamento.binary_mode = true;
      dados_pagamento.additional_info = {
        items: [
          {
            id: "1",
            title: "Pagamento PIX",
            description: "Pagamento PIX via BelezaHub",
            quantity: 1,
            unit_price: valor,
          },
        ],
      };
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
      dados_pagamento.token = token_cartao;
      dados_pagamento.installments = 1;
      dados_pagamento.payer = {
        email: email_cliente,
        identification: { type: "CPF", number: "12345678900" },
      };
    } else {
      return new Response(
        JSON.stringify({ error: "Método de pagamento inválido. Use 'pix' ou 'credit_card'" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Chamada para API do Mercado Pago
    const mp_response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN_VENDEDOR}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados_pagamento),
    });

    const mp_result = await mp_response.json();

    if (!mp_response.ok) {
      return new Response(
        JSON.stringify({ 
          error: mp_result.message || "Erro ao processar pagamento no Mercado Pago",
          details: mp_result 
        }), 
        {
          status: mp_response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Salvar transação no banco de dados
    const partner_net = valor - application_fee;
    const transactionStatus = mp_result.status === "approved" ? "PAID" : 
                            mp_result.status === "pending" ? "PENDING" : 
                            mp_result.status === "rejected" ? "PENDING" : "PENDING";

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        business_id: business_id,
        amount: valor,
        admin_fee: application_fee,
        partner_net: partner_net,
        date: new Date().toISOString(),
        status: transactionStatus,
        gateway: "MERCADO_PAGO",
        payment_id: mp_result.id.toString(),
        payment_method: metodo_pagamento === "pix" ? "pix" : "credit_card",
        customer_email: email_cliente,
        external_reference: referencia_externa,
      });

    if (transactionError) {
      console.error("Erro ao salvar transação:", transactionError);
      // Não falhar o pagamento por erro ao salvar transação, apenas logar
    }

    // Retorna QR Code PIX ou resultado do cartão
    if (metodo_pagamento === "pix") {
      const qrCode = mp_result.point_of_interaction?.transaction_data?.qr_code_base64;
      const qrCodeBase64 = mp_result.point_of_interaction?.transaction_data?.qr_code;
      
      return new Response(
        JSON.stringify({
          success: true,
          qr_code_base64: qrCode || qrCodeBase64,
          qr_code: mp_result.point_of_interaction?.transaction_data?.qr_code,
          txid: mp_result.id.toString(),
          payment_id: mp_result.id,
          status: mp_result.status,
          application_fee,
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Retorno para cartão de crédito
    return new Response(
      JSON.stringify({
        success: mp_result.status === "approved",
        payment_id: mp_result.id,
        status: mp_result.status,
        status_detail: mp_result.status_detail,
        application_fee,
        transaction_amount: mp_result.transaction_amount,
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
