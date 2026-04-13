import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cpf } = await req.json();

    if (!cpf || typeof cpf !== "string") {
      return new Response(JSON.stringify({ error: "CPF inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) {
      return new Response(JSON.stringify({ error: "CPF inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      // If not configured, allow by default
      return new Response(JSON.stringify({ eligible: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this CPF already received a free consultation via an ebook purchase
    const checkUrl = `${SUPABASE_URL}/rest/v1/payment_logs?customer_cpf=eq.${encodeURIComponent(digits)}&product_index=not.is.null&status=eq.approved&select=id&limit=1`;
    const res = await fetch(checkUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });

    if (!res.ok) {
      // On DB error, allow by default (don't block the purchase)
      return new Response(JSON.stringify({ eligible: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const eligible = !Array.isArray(data) || data.length === 0;

    return new Response(JSON.stringify({ eligible }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-cpf-eligible error:", e);
    // On unexpected error, allow by default
    return new Response(JSON.stringify({ eligible: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
