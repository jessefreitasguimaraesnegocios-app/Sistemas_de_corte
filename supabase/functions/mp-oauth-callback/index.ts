// Deno Edge Function - Callback OAuth do Mercado Pago
// Recebe o code do OAuth, troca por access/refresh token e salva no Supabase

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_PROJECT_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Credenciais do app do Mercado Pago (configure como secrets na função)
const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID") || "";
const MP_CLIENT_SECRET = Deno.env.get("MP_CLIENT_SECRET") || "";
const MP_REDIRECT_URI = Deno.env.get("MP_REDIRECT_URI") || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase URL/Service Role não configurados nos secrets da função");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Aceitar parâmetros tanto do body (JSON) quanto da query string (URL)
    // O Mercado Pago pode enviar via query string, mas o frontend também pode enviar via body
    let code: string | null = null;
    let state: string | null = null;
    let redirect_uri: string | null = null;

    // Tentar ler da query string primeiro (formato do Mercado Pago)
    const url = new URL(req.url);
    code = url.searchParams.get('code') || null;
    state = url.searchParams.get('state') || null;

    // Se não encontrou na query string, tentar ler do body (formato do frontend)
    if (!code || !state) {
      try {
        const body = await req.json();
        code = body.code || code;
        state = body.state || state;
        redirect_uri = body.redirect_uri || null;
      } catch (e) {
        // Body não é JSON válido, usar apenas query string
        console.log('⚠️ Body não é JSON, usando apenas query string');
      }
    } else {
      // Se veio da query string, tentar ler redirect_uri do body se existir
      try {
        const body = await req.json();
        redirect_uri = body.redirect_uri || null;
      } catch (e) {
        // Ignorar se body não for JSON
      }
    }

    console.log('🔍 Parâmetros recebidos:', { 
      hasCode: !!code, 
      hasState: !!state, 
      hasRedirectUri: !!redirect_uri 
    });

    if (!code || !state) {
      console.error('❌ Parâmetros obrigatórios ausentes:', { hasCode: !!code, hasState: !!state });
      return new Response(
        JSON.stringify({ error: "Parâmetros code e state são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // state carrega o business_id para associar tokens
    const businessId = state;

    // Validar secrets obrigatórios APÓS ler parâmetros
    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ 
          error: "MP_CLIENT_ID ou MP_CLIENT_SECRET não configurados nos secrets",
          hint: "Configure os secrets MP_CLIENT_ID e MP_CLIENT_SECRET no Supabase Dashboard"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Usar redirect_uri do body (mesmo usado na autorização) ou fallback para secret
    // IMPORTANTE: O redirect_uri deve ser EXATAMENTE o mesmo usado na URL de autorização
    const finalRedirectUri = redirect_uri || MP_REDIRECT_URI;
    
    // redirect_uri é obrigatório, mas pode vir do body OU do secret
    if (!finalRedirectUri) {
      return new Response(
        JSON.stringify({ 
          error: "redirect_uri é obrigatório",
          hint: "Passe redirect_uri no body OU configure o secret MP_REDIRECT_URI no Supabase Dashboard"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🔄 Trocando code por token com redirect_uri:", finalRedirectUri);

    // Trocar code por tokens no Mercado Pago
    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_secret: MP_CLIENT_SECRET,
        client_id: MP_CLIENT_ID,
        code,
        grant_type: "authorization_code",
        redirect_uri: finalRedirectUri, // Usar o mesmo redirect_uri da autorização
      }),
    });

    // Ler resposta do Mercado Pago
    const responseText = await tokenResponse.text();
    let tokenResult;
    
    try {
      tokenResult = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("❌ Erro ao parsear resposta do Mercado Pago:", jsonError);
      console.error("Resposta do MP (texto):", responseText.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          error: "Erro ao processar resposta do Mercado Pago", 
          details: responseText.substring(0, 200),
          hint: "Verifique se as credenciais do Mercado Pago estão corretas"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokenResponse.ok) {
      console.error("❌ Erro ao trocar code por token:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        result: tokenResult
      });
      return new Response(
        JSON.stringify({ 
          error: "Erro ao trocar code por token", 
          details: tokenResult,
          status: tokenResponse.status
        }),
        { status: tokenResponse.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar que temos os dados necessários
    if (!tokenResult || !tokenResult.access_token) {
      console.error("❌ Resposta do Mercado Pago não contém access_token:", tokenResult);
      return new Response(
        JSON.stringify({ 
          error: "Resposta inválida do Mercado Pago", 
          details: "access_token não encontrado na resposta"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      access_token,
      refresh_token,
      public_key,
      user_id,
      live_mode,
      expires_in,
    } = tokenResult;

    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : null;

    console.log("💾 Salvando tokens no banco para business:", businessId);

    // Salvar no Supabase (tabela businesses)
    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        mp_access_token: access_token,
        mp_refresh_token: refresh_token || null,
        mp_public_key: public_key || null,
        mp_user_id: user_id ? String(user_id) : null,
        mp_live_mode: live_mode ?? null,
        mp_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", businessId);

    if (updateError) {
      console.error("❌ Erro ao salvar tokens no banco:", updateError);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao salvar tokens no banco de dados", 
          details: updateError.message,
          code: updateError.code
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Tokens salvos com sucesso para business:", businessId);

    return new Response(
      JSON.stringify({
        success: true,
        business_id: businessId,
        live_mode,
        has_refresh_token: !!refresh_token,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro no callback OAuth:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
