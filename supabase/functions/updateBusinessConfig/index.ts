// Deno Edge Function - updateBusinessConfig (ADMIN)
/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ||
  Deno.env.get("SUPABASE_PROJECT_URL") ||
  "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "Configuração do Supabase incompleta. SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY devem estar configuradas.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Client com JWT do usuário para identificar quem está chamando
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Usuário inválido ou não autenticado", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Client admin (service role) para bypass RLS
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Validar SUPER_ADMIN via user_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({
          error: "Erro ao verificar permissões do usuário",
          details: profileError.message,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (profile?.role !== "SUPER_ADMIN") {
      return new Response(
        JSON.stringify({ error: "Permissão negada: apenas SUPER_ADMIN pode atualizar este campo" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { business_id, update } = body ?? {};

    if (!business_id || typeof business_id !== "string") {
      return new Response(
        JSON.stringify({ error: "business_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!update || typeof update !== "object") {
      return new Response(
        JSON.stringify({ error: "update é obrigatório (objeto)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Whitelist de campos permitidos
    const allowedKeys = new Set([
      "name",
      "type",
      "revenue_split",
      "monthly_fee",
      "status",
      "description",
      "address",
      "mp_access_token",
    ]);

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(update)) {
      if (!allowedKeys.has(key)) continue;
      sanitized[key] = value;
    }

    // Normalizar mp_access_token (string vazia => null)
    if ("mp_access_token" in sanitized) {
      const v = sanitized.mp_access_token;
      if (typeof v === "string") {
        const trimmed = v.trim();
        sanitized.mp_access_token = trimmed ? trimmed : null;
      } else if (v === undefined) {
        delete sanitized.mp_access_token;
      }
    }

    // Debug sem vazar token
    const tokenLen = typeof sanitized.mp_access_token === "string" ? sanitized.mp_access_token.length : 0;
    console.log("updateBusinessConfig:", {
      business_id,
      user_id: userData.user.id,
      keys: Object.keys(sanitized),
      has_token: !!sanitized.mp_access_token,
      token_len: tokenLen,
    });

    const { data: updated, error: updError } = await supabaseAdmin
      .from("businesses")
      .update(sanitized)
      .eq("id", business_id)
      .select("id, name, status, mp_access_token")
      .single();

    if (updError) {
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar business", details: updError.message, code: updError.code }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        business: {
          id: updated.id,
          name: updated.name,
          status: updated.status,
          has_token: !!updated.mp_access_token,
          token_length: updated.mp_access_token ? updated.mp_access_token.length : 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Erro updateBusinessConfig:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

