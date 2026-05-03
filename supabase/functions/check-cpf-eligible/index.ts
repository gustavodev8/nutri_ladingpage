import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cpf, email } = await req.json();

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
      return new Response(JSON.stringify({ eligible: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash the CPF with SHA-256 before querying — never compare raw CPF
    const msgBuf  = new TextEncoder().encode(digits);
    const hashBuf = await crypto.subtle.digest("SHA-256", msgBuf);
    const cpfHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    const headers = {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    };

    // 1. Check by CPF hash (new records after migration)
    const byCpfUrl = `${SUPABASE_URL}/rest/v1/payment_logs?customer_cpf_hash=eq.${encodeURIComponent(cpfHash)}&product_index=not.is.null&status=eq.approved&select=id&limit=1`;
    const cpfRes = await fetch(byCpfUrl, { headers });

    if (cpfRes.ok) {
      const cpfData = await cpfRes.json();
      if (Array.isArray(cpfData) && cpfData.length > 0) {
        return new Response(JSON.stringify({ eligible: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.error("check-cpf-eligible CPF query error:", cpfRes.status, await cpfRes.text().catch(() => ""));
    }

    // 2. Check by email (covers old records where cpf_hash was not stored yet)
    if (email && typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const byEmailUrl = `${SUPABASE_URL}/rest/v1/payment_logs?customer_email=eq.${encodeURIComponent(email)}&product_index=not.is.null&status=eq.approved&select=id&limit=1`;
      const emailRes = await fetch(byEmailUrl, { headers });

      if (emailRes.ok) {
        const emailData = await emailRes.json();
        if (Array.isArray(emailData) && emailData.length > 0) {
          return new Response(JSON.stringify({ eligible: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        console.error("check-cpf-eligible email query error:", emailRes.status, await emailRes.text().catch(() => ""));
      }
    }

    return new Response(JSON.stringify({ eligible: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("check-cpf-eligible error:", e);
    return new Response(JSON.stringify({ eligible: false, error: "unexpected" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
