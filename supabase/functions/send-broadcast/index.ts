import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_URL") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@nutrivida.com.br";

    // ── Auth: require a valid Supabase session (admin must be signed in) ──────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return new Response(JSON.stringify({ error: "Não autorizado." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the token against Supabase Auth
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${token}` },
    });

    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: "Sessão inválida. Faça login novamente." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html, previewText } = await req.json();

    if (!subject?.trim() || !html?.trim()) {
      return new Response(JSON.stringify({ error: "Assunto e mensagem são obrigatórios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect unique emails from payment_logs, bookings and patients
    const headers = { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` };

    const [logsRes, bookingsRes, patientsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/payment_logs?select=customer_email&status=eq.approved`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/bookings?select=client_email&status=neq.cancelled`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/patients?select=email`, { headers }),
    ]);

    const [logs, bookings, patients] = await Promise.all([
      logsRes.ok ? logsRes.json().catch(() => []) : [],
      bookingsRes.ok ? bookingsRes.json().catch(() => []) : [],
      patientsRes.ok ? patientsRes.json().catch(() => []) : [],
    ]);

    const emailSet = new Set<string>();
    for (const r of logs)     if (r.customer_email) emailSet.add(r.customer_email.trim().toLowerCase());
    for (const r of bookings) if (r.client_email)   emailSet.add(r.client_email.trim().toLowerCase());
    for (const r of patients) if (r.email)           emailSet.add(r.email.trim().toLowerCase());

    const emails = [...emailSet].filter(e => e.includes("@"));

    if (emails.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum e-mail encontrado no sistema." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Wrap in branded email template
    const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${previewText ? `<span style="display:none;max-height:0;overflow:hidden;">${previewText}&zwnj;&nbsp;</span>` : ""}
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 24px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <tr><td style="height:4px;background:#2d5a27;"></td></tr>
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0;font-size:15px;font-weight:700;color:#2d5a27;">NutriVida</p>
        </td></tr>
        <tr><td style="padding:16px 40px 0;"><div style="height:1px;background:#f0f0f0;"></div></td></tr>
        <tr><td style="padding:32px 40px;">
          ${html}
        </td></tr>
        <tr><td style="padding:0 40px 28px;">
          <div style="height:1px;background:#f0f0f0;margin-bottom:20px;"></div>
          <p style="margin:0;font-size:11px;color:#d1d5db;text-align:center;">NutriVida &nbsp;·&nbsp; Para descadastrar, responda este email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // Send in batches of 50
    let sent = 0;
    let failed = 0;
    const BATCH = 50;

    for (let i = 0; i < emails.length; i += BATCH) {
      const batch = emails.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(to =>
          fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ from: FROM_EMAIL, to, subject, html: fullHtml }),
          }).then(r => r.ok ? Promise.resolve() : Promise.reject())
        )
      );
      for (const r of results) r.status === "fulfilled" ? sent++ : failed++;
    }

    return new Response(JSON.stringify({ sent, failed, total: emails.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
