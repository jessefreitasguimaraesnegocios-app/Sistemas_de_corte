// Deno Edge Function - runs in Deno runtime
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
    const { payment_id } = body;

    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: "payment_id é obrigatório" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Buscar business para obter o access token
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Buscar transação no banco para obter o business_id
    const { data: transaction, error: transError } = await supabase
      .from("transactions")
      .select("business_id")
      .eq("payment_id", payment_id.toString())
      .single();

    if (transError || !transaction) {
      // Se não encontrar no banco, tentar buscar diretamente no MP (requer access token)
      // Por enquanto, retornar erro
      return new Response(
        JSON.stringify({ error: "Transação não encontrada" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Buscar business para obter access token
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("mp_access_token")
      .eq("id", transaction.business_id)
      .single();

    if (businessError || !business?.mp_access_token) {
      return new Response(
        JSON.stringify({ error: "Business não encontrado ou sem token configurado" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Verificar status no Mercado Pago
    const mp_response = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${business.mp_access_token}`,
        "Content-Type": "application/json",
      },
    });

    const mp_result = await mp_response.json();

    if (!mp_response.ok) {
      return new Response(
        JSON.stringify({ 
          error: mp_result.message || "Erro ao verificar status no Mercado Pago",
          status: "error"
        }), 
        {
          status: mp_response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        status: mp_result.status,
        approved: mp_result.status === "approved",
        payment_id: mp_result.id,
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
        status: "error"
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
