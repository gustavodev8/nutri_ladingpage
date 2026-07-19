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

    // ── Signature verification — always enforce in production ─────────────────
    if (MP_WEBHOOK_SECRET) {
      const valid = await verifyMpSignature(req, rawBody, MP_WEBHOOK_SECRET);
      if (!valid) {
        console.error("payment-webhook: invalid MP signature — possible fake webhook attempt");
        return new Response("Unauthorized", { status: 401 });
      }
    } else {
      // No secret configured — log a loud warning but still process (allows initial setup)
      // ACTION REQUIRED: set MP_WEBHOOK_SECRET in Supabase Secrets to enforce validation
      console.error("payment-webhook: WARNING — MP_WEBHOOK_SECRET not set. Webhook signature NOT verified. Set this secret immediately.");
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

    // ── Idempotency: skip if already processed ────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseServiceKey) {
      const existsRes = await fetch(
        `${supabaseUrl}/rest/v1/payment_logs?payment_id=eq.${encodeURIComponent(String(payment.id))}&status=eq.approved&select=id&limit=1`,
        { headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` } }
      );
      if (existsRes.ok) {
        const existing = await existsRes.json().catch(() => []);
        if (Array.isArray(existing) && existing.length > 0) {
          return new Response("ok", { status: 200 }); // already processed
        }
      }
    }

    // Parse external_reference to determine payment type
    const parts = (payment.external_reference || "").split("|");
    if (parts.length < 2) return new Response("ok", { status: 200 });

    // ── Consultation payment ──────────────────────────────────────────────────
    if (parts[0] === "consultation") {
      const bookingGroupId = parts[1];
      const customerEmail = parts[2] ? parts[2].trim() : "";
      const customerName = parts[3] ? escapeHtml(decodeURIComponent(parts[3])) : "";
      const planName = parts[4] ? escapeHtml(decodeURIComponent(parts[4])) : "Consulta";

      // Update booking status to confirmed — check HTTP status, not response body
      // (PATCH returns 204 No Content on success, so .json() would throw and give false negative)
      if (supabaseUrl && supabaseServiceKey) {
        await fetch(`${supabaseUrl}/rest/v1/bookings?booking_group_id=eq.${encodeURIComponent(bookingGroupId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            status: "confirmed",
            payment_status: "paid",
            payment_method: payment.payment_method_id === "pix" ? "pix" : "card",
          }),
        });
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
    const fallbackPdfUrl = parts[2] ? decodeURIComponent(parts[2]) : "";
    const cpfHash = parts[4] ? parts[4].trim() : null; // already SHA-256 hashed
    const productIndex = Number(parts[0]);
    const productName = escapeHtml(
      payment.additional_info?.items?.[0]?.title || payment.description || "E-book"
    );

    if (!customerEmail || !RESEND_API_KEY) {
      return new Response("ok", { status: 200 });
    }

    // Fetch pdfFiles from site_content by productIndex
    type PdfFile = { url: string; label: string };
    let pdfFiles: PdfFile[] = [];
    let primaryPdfUrl = fallbackPdfUrl;

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const scRes = await fetch(
          `${supabaseUrl}/rest/v1/site_content?id=eq.1&select=content`,
          { headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` } }
        );
        if (scRes.ok) {
          const scData = await scRes.json();
          const item = scData?.[0]?.content?.produtosDigitais?.items?.[productIndex];
          if (item) {
            if (Array.isArray(item.pdfFiles) && item.pdfFiles.length > 0) {
              pdfFiles = item.pdfFiles as PdfFile[];
            } else if (item.pdfUrl) {
              primaryPdfUrl = item.pdfUrl;
            }
          }
        }
      } catch { /* fall through to fallback */ }
    }

    // Build PDF links block for email
    const isCombo = pdfFiles.length > 1;
    const pdfsBlock = pdfFiles.length > 0
      ? pdfFiles.map((pf, idx) => {
          const label = escapeHtml(pf.label || `E-book ${idx + 1}`);
          const url = escapeHtml(pf.url);
          return `
            <div style="margin-bottom:12px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#374151;">${label}</p>
              <table cellpadding="0" cellspacing="0">
                <tr><td style="background:#2d5a27;border-radius:8px;padding:12px 24px;">
                  <a href="${url}" style="color:#fff;font-size:14px;font-weight:600;text-decoration:none;">Baixar PDF</a>
                </td></tr>
              </table>
              <p style="margin:6px 0 0;font-size:11px;color:#2d5a27;word-break:break-all;line-height:1.5;">${url}</p>
            </div>
          `;
        }).join("")
      : primaryPdfUrl
        ? `
          <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="background:#2d5a27;border-radius:8px;padding:14px 28px;">
              <a href="${escapeHtml(primaryPdfUrl)}" style="color:#fff;font-size:14px;font-weight:600;text-decoration:none;">Baixar e-book</a>
            </td></tr>
          </table>
          <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Link direto:</p>
          <p style="margin:0 0 24px;font-size:12px;color:#2d5a27;word-break:break-all;line-height:1.5;">${escapeHtml(primaryPdfUrl)}</p>
        `
        : `
          <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">Em breve você receberá o link de acesso. Qualquer dúvida, responda este email.</p>
          </div>
        `;

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
                <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
                  ${isCombo ? "Seu combo está pronto" : "Seu e-book está pronto"}
                </h2>
                <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Pagamento confirmado — obrigado pela sua compra!</p>
                <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:500;">Material adquirido</p>
                  <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${productName}</p>
                </div>
                ${isCombo ? `<p style="margin:0 0 16px;font-size:14px;color:#374151;font-weight:600;">Seus ${pdfFiles.length} e-books:</p>` : ""}
                ${pdfsBlock}
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

    const customerName = parts[3] ? escapeHtml(decodeURIComponent(parts[3])) : "";

    // ── Save Log First ───────────────────────────────────────────────────────
    if (supabaseUrl && supabaseServiceKey) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/payment_logs`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": "Bearer " + supabaseServiceKey,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            payment_id: String(payment.id),
            customer_name: customerName,
            customer_email: customerEmail,
            customer_cpf_hash: cpfHash,
            product_name: productName,
            product_index: productIndex,
            amount: payment.transaction_amount,
            status: "approved",
            pdf_url: pdfFiles.length > 0 ? pdfFiles[0].url : primaryPdfUrl,
          }),
        });
      } catch (err) {
        console.error("Database log error:", err);
      }
    }

    // ── Send Email Second ────────────────────────────────────────────────────
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: isCombo ? `Seu combo "${productName}" está aqui!` : `Seu e-book "${productName}" está aqui!`,
        html: emailHtml,
      }),
    });

    return new Response("ok", { status: 200 });
  } catch {
    return new Response("ok", { status: 200 }); // Always 200 to MP
  }
});
