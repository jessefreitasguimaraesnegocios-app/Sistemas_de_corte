// Deno Edge Function - Gerar URL de OAuth do Mercado Pago
// Retorna a URL de autorização OAuth para o frontend redirecionar

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_PROJECT_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

// Credenciais do app do Mercado Pago (configure como secrets na função)
const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID") || "";
const MP_REDIRECT_URI = Deno.env.get("MP_REDIRECT_URI") || "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Log para debug
    console.log("getMpOauthUrl chamada:", {
      method: req.method,
      hasAuthHeader: !!req.headers.get("authorization"),
      hasMPClientId: !!MP_CLIENT_ID,
      hasMPRedirectUri: !!MP_REDIRECT_URI,
    });

    // Verificar autenticação
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!authHeader) {
      console.error("❌ Authorization header ausente");
      return new Response(
        JSON.stringify({ error: "Authorization header ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar token com Supabase
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("❌ Configuração do Supabase incompleta:", {
        hasUrl: !!SUPABASE_URL,
        hasAnonKey: !!SUPABASE_ANON_KEY,
      });
      return new Response(
        JSON.stringify({ error: "Configuração do Supabase incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("❌ Erro ao validar usuário:", userError);
      return new Response(
        JSON.stringify({ error: "Usuário inválido ou não autenticado", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Usuário autenticado:", userData.user.id);

    if (!MP_CLIENT_ID || !MP_REDIRECT_URI) {
      return new Response(
        JSON.stringify({ 
          error: "MP_CLIENT_ID ou MP_REDIRECT_URI não configurados nos secrets da função",
          hint: "Configure os secrets no Supabase Dashboard: Edge Functions → Settings → Secrets"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { business_id } = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: "business_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construir URL de OAuth do Mercado Pago
    const oauthUrl = `https://auth.mercadopago.com/authorization?response_type=code&client_id=${encodeURIComponent(MP_CLIENT_ID)}&redirect_uri=${encodeURIComponent(MP_REDIRECT_URI)}&state=${encodeURIComponent(business_id)}&platform_id=mp&prompt=login`;

    return new Response(
      JSON.stringify({
        success: true,
        oauth_url: oauthUrl,
        redirect_uri: MP_REDIRECT_URI
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro ao gerar URL OAuth:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
