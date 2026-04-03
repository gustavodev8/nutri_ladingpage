import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Attachment {
  filename: string;
  content: string; // base64, sem prefixo data:
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { to, client_name, subject, body, attachments } = await req.json() as {
      to: string;
      client_name?: string;
      subject: string;
      body: string;
      attachments?: Attachment[];
    };

    if (!to || !subject) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: to, subject" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey  = Deno.env.get("RESEND_API_KEY");
    const fromEmail  = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@nutrivida.com.br";
    const brandName  = Deno.env.get("BRAND_NAME") || "NutriVida";

    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── HTML template ──────────────────────────────────────────────────────────
    // Converte quebras de linha em <br> para o corpo da mensagem
    const bodyHtml = body
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 24px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

        <tr><td style="height:4px;background:#2d5a27;"></td></tr>

        <tr><td style="padding:32px 40px 0;">
          <p style="margin:0;font-size:15px;font-weight:700;color:#2d5a27;letter-spacing:-0.3px;">${brandName}</p>
        </td></tr>

        <tr><td style="padding:20px 40px 0;">
          <div style="height:1px;background:#f0f0f0;"></div>
        </td></tr>

        <tr><td style="padding:32px 40px;">
          ${client_name
            ? `<p style="margin:0 0 20px;font-size:14px;color:#374151;">Olá, <strong>${client_name}</strong>!</p>`
            : ""}
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.75;">${bodyHtml}</p>
        </td></tr>

        ${attachments && attachments.length > 0 ? `
        <tr><td style="padding:0 40px 24px;">
          <div style="background:#f9fafb;border-radius:8px;padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">
              Arquivos em anexo
            </p>
            ${attachments.map(a =>
              `<p style="margin:0 0 4px;font-size:13px;color:#374151;">📎 ${a.filename}</p>`
            ).join("")}
          </div>
        </td></tr>
        ` : ""}

        <tr><td style="padding:0 40px 32px;">
          <div style="height:1px;background:#f0f0f0;margin-bottom:20px;"></div>
          <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">
            ${brandName} &nbsp;·&nbsp; Dúvidas? Responda este email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // ── Payload para Resend ────────────────────────────────────────────────────
    const payload: Record<string, unknown> = {
      from: fromEmail,
      to,
      subject,
      html,
    };

    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map(a => ({
        filename: a.filename,
        content: a.content, // base64 string
      }));
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend error:", JSON.stringify(data));
      throw new Error(data.message || "Falha ao enviar email via Resend.");
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("send-material error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
