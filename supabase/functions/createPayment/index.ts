import { serve } from "https://deno.land/x/sift/mod.ts";
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

serve(async (req) => {
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

    // Validação de parâmetros obrigatórios
    if (!valor || !metodo_pagamento || !email_cliente || !business_id) {
      return new Response(
        JSON.stringify({ error: "Parâmetros obrigatórios ausentes: valor, metodo_pagamento, email_cliente e business_id são obrigatórios" }),
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
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, mp_access_token, revenue_split, status")
      .eq("id", business_id)
      .single();

    if (businessError || !business) {
      return new Response(
        JSON.stringify({ error: "Negócio não encontrado", details: businessError?.message }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

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
