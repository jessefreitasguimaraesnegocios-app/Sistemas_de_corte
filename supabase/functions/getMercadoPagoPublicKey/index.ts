// Deno Edge Function - Retorna a public key do Mercado Pago para um business
/// <reference path="../deno.d.ts" />
// @ts-ignore - Deno imports are resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM imports are resolved at runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || 
                     Deno.env.get("SUPABASE_PROJECT_URL") || 
                     "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { business_id } = body;

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: "business_id é obrigatório" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar access token do business
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("mp_access_token, mp_public_key")
      .eq("id", business_id)
      .single();

    if (businessError || !business) {
      return new Response(
        JSON.stringify({ error: "Business não encontrado" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Se já tem public key armazenada, retornar
    if (business.mp_public_key) {
      return new Response(
        JSON.stringify({ public_key: business.mp_public_key }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Se não tem public key, tentar obter via API do Mercado Pago
    // NOTA: A public key geralmente está no painel do desenvolvedor
    // Por enquanto, vamos retornar um erro pedindo para configurar
    return new Response(
      JSON.stringify({ 
        error: "Public key não configurada",
        hint: "Configure a public key do Mercado Pago no painel do desenvolvedor e salve no campo mp_public_key da tabela businesses"
      }),
      { 
        status: 400, 
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
