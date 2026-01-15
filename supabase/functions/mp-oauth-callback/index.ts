// Deno Edge Function - Callback OAuth do Mercado Pago
// Recebe o code do OAuth, troca por access/refresh token e salva no Supabase

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET || !MP_REDIRECT_URI) {
      return new Response(
        JSON.stringify({ error: "MP_CLIENT_ID/MP_CLIENT_SECRET/MP_REDIRECT_URI não configurados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { code, state } = await req.json();

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: "Parâmetros code e state são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // state carrega o business_id para associar tokens
    const businessId = state;

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
        redirect_uri: MP_REDIRECT_URI,
      }),
    });

    const tokenResult = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Erro ao trocar code por token:", tokenResult);
      return new Response(
        JSON.stringify({ error: "Erro ao trocar code por token", details: tokenResult }),
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
      console.error("Erro ao salvar tokens no banco:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar tokens", details: updateError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
