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

    console.log("🔍 Verificando status do pagamento:", payment_id);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // ✅ Buscar status diretamente do banco (atualizado pelo webhook)
    // O payment_id da API Orders é uma string como "PAY01KF9VF7N5RRBF1FCC6KS40X6E"
    const { data: transaction, error: transError } = await supabase
      .from("transactions")
      .select("status, payment_id")
      .eq("payment_id", payment_id.toString())
      .single();

    if (transError || !transaction) {
      console.warn("⚠️ Transação não encontrada para payment_id:", payment_id);
      // Retornar pending se não encontrar (pode estar sendo processado)
      return new Response(
        JSON.stringify({ 
          status: "pending",
          approved: false,
          payment_id: payment_id,
          message: "Aguardando confirmação do pagamento"
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("✅ Transação encontrada:", transaction);

    // Mapear status do banco para status do Mercado Pago
    // No banco: PENDING, PAID, CANCELLED, etc.
    // No MP: pending, approved, rejected, etc.
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'PAID': 'approved',
      'APPROVED': 'approved',
      'CANCELLED': 'cancelled',
      'REJECTED': 'rejected',
      'REFUNDED': 'refunded',
    };

    const mpStatus = statusMap[transaction.status?.toUpperCase()] || transaction.status?.toLowerCase() || 'pending';
    const isApproved = mpStatus === 'approved' || transaction.status?.toUpperCase() === 'PAID';

    console.log("📊 Status final:", { dbStatus: transaction.status, mpStatus, isApproved });

    return new Response(
      JSON.stringify({
        status: mpStatus,
        approved: isApproved,
        payment_id: transaction.payment_id,
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
