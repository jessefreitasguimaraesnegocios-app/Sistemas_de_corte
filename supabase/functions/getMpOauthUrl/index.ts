// Deno Edge Function - Gerar URL de OAuth do Mercado Pago
// Retorna a URL de autorização OAuth para o frontend redirecionar

// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

// Credenciais do app do Mercado Pago (configure como secrets na função)
const MP_CLIENT_ID = Deno.env.get("MP_CLIENT_ID") || "";
const MP_REDIRECT_URI = Deno.env.get("MP_REDIRECT_URI") || "";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ✅ LOG NO TOPO - Verificar se função está sendo chamada
    console.log("✅ FUNÇÃO getMpOauthUrl CHAMADA");
    console.log("📋 Método:", req.method);
    console.log("📋 URL:", req.url);
    
    // ✅ LOG TODOS OS HEADERS (debug completo)
    const allHeaders: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      allHeaders[key] = key.toLowerCase().includes('authorization') 
        ? `${value.substring(0, 30)}...` 
        : value;
    });
    console.log("📋 TODOS OS HEADERS recebidos:", allHeaders);
    
    // Log inicial para debug
    console.log("🚀 getMpOauthUrl chamada:", {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      hasMPClientId: !!MP_CLIENT_ID,
      mpClientIdLength: MP_CLIENT_ID.length,
      hasMPRedirectUri: !!MP_REDIRECT_URI,
    });

    // Ler body primeiro
    const { business_id, redirect_uri } = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: "business_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar MP_CLIENT_ID (única validação obrigatória de secret)
    if (!MP_CLIENT_ID) {
      return new Response(
        JSON.stringify({ 
          error: "MP_CLIENT_ID não configurado nos secrets da função",
          hint: "Configure o secret MP_CLIENT_ID no Supabase Dashboard: Edge Functions → Settings → Secrets"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Usar redirect_uri do body (dinâmico do frontend) ou fallback para secret
    // Isso permite funcionar em dev (localhost) e produção (vercel) sem reconfigurar secrets
    const finalRedirectUri = redirect_uri || MP_REDIRECT_URI;
    
    // redirect_uri é obrigatório, mas pode vir do body OU do secret
    if (!finalRedirectUri) {
      return new Response(
        JSON.stringify({ 
          error: "redirect_uri é obrigatório",
          hint: "Passe redirect_uri no body da requisição OU configure o secret MP_REDIRECT_URI no Supabase Dashboard"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Usando redirect_uri:", finalRedirectUri);

    // Construir URL de OAuth do Mercado Pago
    const oauthUrl = `https://auth.mercadopago.com/authorization?response_type=code&client_id=${encodeURIComponent(MP_CLIENT_ID)}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&state=${encodeURIComponent(business_id)}&platform_id=mp&prompt=login`;

    console.log("✅ URL OAuth gerada com sucesso");

    return new Response(
      JSON.stringify({
        url: oauthUrl, // Retornar como 'url' conforme solicitado
        success: true,
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
