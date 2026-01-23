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
    // O Mercado Pago envia via query string, mas o frontend também pode enviar via body
    let code: string | null = null;
    let state: string | null = null;

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
        // ❌ SEGURANÇA: NÃO ler redirect_uri do body - sempre usar do secret
      } catch (e) {
        // Body não é JSON válido, usar apenas query string
        console.log('⚠️ Body não é JSON, usando apenas query string');
      }
    }

    console.log('🔍 Parâmetros recebidos:', { 
      hasCode: !!code, 
      hasState: !!state
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

    // ✅ SEGURANÇA: Validar se o business existe antes de processar
    console.log('🔍 Validando business_id:', businessId);
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      console.error('❌ Business inválido no state:', { businessId, error: businessError });
      const errorUrl = `${MP_REDIRECT_URI?.replace('/oauth/callback', '') || 'https://sistemas-de-corte.vercel.app'}/dashboard?mp=error&reason=invalid_business`;
      return Response.redirect(errorUrl, 302);
    }

    console.log('✅ Business validado:', business.name);

    // Validar secrets obrigatórios
    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
      console.error('❌ Secrets do Mercado Pago não configurados');
      const errorUrl = `${MP_REDIRECT_URI?.replace('/oauth/callback', '') || 'https://sistemas-de-corte.vercel.app'}/dashboard?mp=error&reason=missing_secrets`;
      return Response.redirect(errorUrl, 302);
    }

    // ✅ SEGURANÇA: SEMPRE usar redirect_uri do secret, NUNCA do body
    // O redirect_uri deve ser EXATAMENTE o mesmo usado na URL de autorização
    const finalRedirectUri = MP_REDIRECT_URI;
    
    if (!finalRedirectUri) {
      console.error('❌ MP_REDIRECT_URI não configurado');
      const errorUrl = `${MP_REDIRECT_URI?.replace('/oauth/callback', '') || 'https://sistemas-de-corte.vercel.app'}/dashboard?mp=error&reason=missing_redirect_uri`;
      return Response.redirect(errorUrl, 302);
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
      const errorUrl = `${MP_REDIRECT_URI?.replace('/oauth/callback', '') || 'https://sistemas-de-corte.vercel.app'}/dashboard?mp=error&reason=token_exchange_failed`;
      return Response.redirect(errorUrl, 302);
    }

    // Validar que temos os dados necessários
    if (!tokenResult || !tokenResult.access_token) {
      console.error("❌ Resposta do Mercado Pago não contém access_token:", tokenResult);
      const errorUrl = `${MP_REDIRECT_URI?.replace('/oauth/callback', '') || 'https://sistemas-de-corte.vercel.app'}/dashboard?mp=error&reason=invalid_token_response`;
      return Response.redirect(errorUrl, 302);
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
      const errorUrl = `${MP_REDIRECT_URI?.replace('/oauth/callback', '') || 'https://sistemas-de-corte.vercel.app'}/dashboard?mp=error&reason=save_failed`;
      return Response.redirect(errorUrl, 302);
    }

    console.log("✅ Tokens salvos com sucesso para business:", businessId);

    // ✅ UX: Redirecionar o usuário para o dashboard com sucesso
    const successUrl = `${MP_REDIRECT_URI?.replace('/oauth/callback', '') || 'https://sistemas-de-corte.vercel.app'}/dashboard?mp=connected&business_id=${businessId}`;
    return Response.redirect(successUrl, 302);
  } catch (error: any) {
    console.error("❌ Erro no callback OAuth:", error);
    const errorUrl = `${MP_REDIRECT_URI?.replace('/oauth/callback', '') || 'https://sistemas-de-corte.vercel.app'}/dashboard?mp=error&reason=internal_error`;
    return Response.redirect(errorUrl, 302);
  }
});
