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
    // Log para debug - verificar todos os headers recebidos
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const apikeyHeader = req.headers.get("apikey") || "";
    
    console.log("getMpOauthUrl chamada:", {
      method: req.method,
      url: req.url,
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader.length,
      hasApikey: !!apikeyHeader,
      hasMPClientId: !!MP_CLIENT_ID,
      hasMPRedirectUri: !!MP_REDIRECT_URI,
      hasSupabaseUrl: !!SUPABASE_URL,
      hasSupabaseAnonKey: !!SUPABASE_ANON_KEY,
      allHeaders: Object.fromEntries(req.headers.entries()),
    });

    // Verificar autenticação
    if (!authHeader) {
      console.error("❌ Authorization header ausente");
      return new Response(
        JSON.stringify({ 
          error: "Authorization header ausente",
          hint: "Certifique-se de que está autenticado e que o token está sendo enviado"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar token com Supabase
    // O Supabase injeta automaticamente SUPABASE_URL e SUPABASE_ANON_KEY
    // Mas vamos verificar se estão disponíveis
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("❌ Configuração do Supabase incompleta:", {
        hasUrl: !!SUPABASE_URL,
        hasAnonKey: !!SUPABASE_ANON_KEY,
        envKeys: Object.keys(Deno.env.toObject()).filter(k => k.includes("SUPABASE")),
      });
      return new Response(
        JSON.stringify({ 
          error: "Configuração do Supabase incompleta",
          hint: "SUPABASE_URL e SUPABASE_ANON_KEY devem estar disponíveis. Verifique se a função está configurada corretamente."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🔍 Validando token com Supabase...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("❌ Erro ao validar usuário:", {
        error: userError,
        message: userError?.message,
        status: userError?.status,
        hasUser: !!userData?.user,
      });
      return new Response(
        JSON.stringify({ 
          error: "Usuário inválido ou não autenticado", 
          details: userError?.message,
          hint: "O token pode estar expirado. Tente fazer login novamente."
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Usuário autenticado:", userData.user.id);

    if (!MP_CLIENT_ID) {
      return new Response(
        JSON.stringify({ 
          error: "MP_CLIENT_ID não configurado nos secrets da função",
          hint: "Configure o secret MP_CLIENT_ID no Supabase Dashboard: Edge Functions → Settings → Secrets"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { business_id, redirect_uri } = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: "business_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Usar redirect_uri do body (dinâmico do frontend) ou fallback para secret
    // Isso permite funcionar em dev (localhost) e produção (vercel) sem reconfigurar secrets
    const finalRedirectUri = redirect_uri || MP_REDIRECT_URI;
    
    if (!finalRedirectUri) {
      return new Response(
        JSON.stringify({ 
          error: "redirect_uri não fornecido e MP_REDIRECT_URI não configurado",
          hint: "Configure o secret MP_REDIRECT_URI no Supabase Dashboard OU passe redirect_uri no body da requisição"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Usando redirect_uri:", finalRedirectUri);

    // Construir URL de OAuth do Mercado Pago
    const oauthUrl = `https://auth.mercadopago.com/authorization?response_type=code&client_id=${encodeURIComponent(MP_CLIENT_ID)}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&state=${encodeURIComponent(business_id)}&platform_id=mp&prompt=login`;

    return new Response(
      JSON.stringify({
        success: true,
        oauth_url: oauthUrl,
        redirect_uri: finalRedirectUri
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
