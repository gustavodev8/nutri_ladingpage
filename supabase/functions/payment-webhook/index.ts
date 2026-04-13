import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sanitize a string for safe embedding into HTML to prevent XSS */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Verify Mercado Pago HMAC-SHA256 webhook signature.
 * MP sends x-signature: "ts=...,v1=..." and x-request-id headers.
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
async function verifyMpSignature(
  req: Request,
  rawBody: string,
  secret: string,
): Promise<boolean> {
  try {
    const xSignature = req.headers.get("x-signature") ?? "";
    const xRequestId = req.headers.get("x-request-id") ?? "";

    if (!xSignature || !xRequestId) return false;

    // Parse ts and v1 from x-signature header
    const parts = xSignature.split(",");
    let ts = "";
    let v1 = "";
    for (const part of parts) {
      const [k, val] = part.split("=");
      if (k?.trim() === "ts") ts = val?.trim() ?? "";
      if (k?.trim() === "v1") v1 = val?.trim() ?? "";
    }
    if (!ts || !v1) return false;

    // Extract data_id from URL query string
    const url = new URL(req.url);
    const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";

    // Build the signed manifest: id;request-id;ts
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(manifest);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const expected = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return expected === v1;
  } catch {
    return false;
  }
}

// ── Webhook handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET"); // Set in Supabase secrets
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@nutrivida.com.br";

    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // ── Signature verification (skip if secret not configured yet) ────────────
    if (MP_WEBHOOK_SECRET) {
      const valid = await verifyMpSignature(req, rawBody, MP_WEBHOOK_SECRET);
      if (!valid) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // MP sends type=payment for payment events
    if (body.type !== "payment") {
      return new Response("ok", { status: 200 });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return new Response("ok", { status: 200 });

    // Fetch payment details from MP API (source of truth — can't be faked)
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    if (!paymentRes.ok) return new Response("ok", { status: 200 });
    const payment = await paymentRes.json();

    if (payment.status !== "approved") {
      return new Response("ok", { status: 200 });
    }

    // Parse external_reference to determine payment type
    const parts = (payment.external_reference || "").split("|");
    if (parts.length < 2) return new Response("ok", { status: 200 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // ── Consultation payment ──────────────────────────────────────────────────
    if (parts[0] === "consultation") {
      const bookingGroupId = parts[1];
      const customerEmail = parts[2] ? parts[2].trim() : "";
      const customerName = parts[3] ? escapeHtml(decodeURIComponent(parts[3])) : "";
      const planName = parts[4] ? escapeHtml(decodeURIComponent(parts[4])) : "Consulta";

      // Update booking status to confirmed
      if (supabaseUrl && supabaseServiceKey) {
        const patchRes = await fetch(`${supabaseUrl}/rest/v1/bookings?booking_group_id=eq.${encodeURIComponent(bookingGroupId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Prefer": "return=representation",
          },
          body: JSON.stringify({ status: "confirmed" }),
        });
        const patched = await patchRes.json().catch(() => []);

        if (!Array.isArray(patched) || patched.length === 0) {
          await fetch(`${supabaseUrl}/rest/v1/bookings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseServiceKey,
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              booking_group_id: bookingGroupId,
              session_number: 1,
              total_sessions: 1,
              client_name: customerName,
              client_email: customerEmail,
              plan_name: planName,
              appointment_date: new Date().toISOString().split("T")[0],
              appointment_time: "00:00",
              type: "online",
              status: "confirmed",
              notes: JSON.stringify({ _fallback: true }),
            }),
          });
        }
      }

      // Send confirmation email
      const confirmationHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 24px;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                <tr><td style="height:4px;background:#2d5a27;"></td></tr>
                <tr><td style="padding:32px 40px 0;text-align:left;">
                  <p style="margin:0;font-size:15px;font-weight:700;color:#2d5a27;">NutriVida</p>
                </td></tr>
                <tr><td style="padding:20px 40px 0;"><div style="height:1px;background:#f0f0f0;"></div></td></tr>
                <tr><td style="padding:32px 40px;">
                  <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Consulta confirmada</h2>
                  <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Pagamento aprovado — obrigado, ${customerName || "cliente"}!</p>
                  <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:500;">Plano contratado</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${planName}</p>
                  </div>
                  <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
                    Seu agendamento foi confirmado. Em breve entraremos em contato para confirmar todos os detalhes.
                  </p>
                  <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">Dúvidas? Responda este email ou entre em contato pelo WhatsApp.</p>
                </td></tr>
                <tr><td style="padding:0 40px 32px;">
                  <div style="height:1px;background:#f0f0f0;margin-bottom:20px;"></div>
                  <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">NutriVida &nbsp;·&nbsp; Este é um email automático</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `;

      if (RESEND_API_KEY && customerEmail) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: customerEmail,
            subject: `Consulta confirmada — ${planName}`,
            html: confirmationHtml,
          }),
        });
      }

      if (supabaseUrl && supabaseServiceKey) {
        await fetch(`${supabaseUrl}/rest/v1/payment_logs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            payment_id: String(payment.id),
            customer_name: customerName,
            customer_email: customerEmail,
            product_name: planName,
            amount: payment.transaction_amount,
            status: "approved",
          }),
        });
      }

      return new Response("ok", { status: 200 });
    }

    // ── Ebook payment ─────────────────────────────────────────────────────────
    const customerEmail = parts[1] ? parts[1].trim() : "";
    const pdfUrl = parts[2] ? decodeURIComponent(parts[2]) : "";
    const customerCpf = parts[4] ? parts[4].replace(/\D/g, "") : null;
    const productName = escapeHtml(
      payment.additional_info?.items?.[0]?.title || payment.description || "E-book"
    );

    if (!customerEmail || !RESEND_API_KEY) {
      return new Response("ok", { status: 200 });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 24px;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
              <tr><td style="height:4px;background:#2d5a27;"></td></tr>
              <tr><td style="padding:32px 40px 0;"><p style="margin:0;font-size:15px;font-weight:700;color:#2d5a27;">NutriVida</p></td></tr>
              <tr><td style="padding:20px 40px 0;"><div style="height:1px;background:#f0f0f0;"></div></td></tr>
              <tr><td style="padding:32px 40px;">
                <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Seu e-book está pronto</h2>
                <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Pagamento confirmado — obrigado pela sua compra!</p>
                <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:500;">Material adquirido</p>
                  <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${productName}</p>
                </div>
                ${pdfUrl ? `
                <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr><td style="background:#2d5a27;border-radius:8px;padding:14px 28px;">
                    <a href="${escapeHtml(pdfUrl)}" style="color:#fff;font-size:14px;font-weight:600;text-decoration:none;">Baixar e-book</a>
                  </td></tr>
                </table>
                <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Link direto:</p>
                <p style="margin:0 0 24px;font-size:12px;color:#2d5a27;word-break:break-all;line-height:1.5;">${escapeHtml(pdfUrl)}</p>
                ` : `
                <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">Em breve você receberá o link de acesso. Qualquer dúvida, responda este email.</p>
                </div>
                `}
                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">Dúvidas? Responda este email ou entre em contato pelo WhatsApp.</p>
              </td></tr>
              <tr><td style="padding:0 40px 32px;">
                <div style="height:1px;background:#f0f0f0;margin-bottom:20px;"></div>
                <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">NutriVida &nbsp;·&nbsp; Este é um email automático</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: `Seu e-book "${productName}" está aqui!`,
        html: emailHtml,
      }),
    });

    const customerName = parts[3] ? escapeHtml(decodeURIComponent(parts[3])) : "";

    if (supabaseUrl && supabaseServiceKey) {
      await fetch(`${supabaseUrl}/rest/v1/payment_logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          payment_id: String(payment.id),
          customer_name: customerName,
          customer_email: customerEmail,
          customer_cpf: customerCpf,
          product_name: productName,
          product_index: Number(parts[0]),
          amount: payment.transaction_amount,
          status: "approved",
          pdf_url: pdfUrl,
        }),
      });
    }

    return new Response("ok", { status: 200 });
  } catch {
    return new Response("ok", { status: 200 }); // Always 200 to MP
  }
});
