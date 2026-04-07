import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@nutrivida.com.br";

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // MP sends type=payment for payment events
    if (body.type !== "payment") {
      return new Response("ok", { status: 200 });
    }

    const paymentId = body.data?.id;
    if (!paymentId) return new Response("ok", { status: 200 });

    // Fetch payment details from MP API
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const payment = await paymentRes.json();
    console.log("Payment status:", payment.status, "ref:", payment.external_reference);

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
      const customerEmail = parts[2];
      const customerName = parts[3] ? decodeURIComponent(parts[3]) : "";
      const planName = parts[4] ? decodeURIComponent(parts[4]) : "Consulta";

      // Update booking status to confirmed (if booking was pre-saved client-side)
      if (supabaseUrl && supabaseServiceKey) {
        const patchRes = await fetch(`${supabaseUrl}/rest/v1/bookings?booking_group_id=eq.${bookingGroupId}`, {
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

        // Se nenhum booking foi encontrado (cliente fechou a aba antes de salvar),
        // cria um booking básico com os dados disponíveis no external_reference
        if (!Array.isArray(patched) || patched.length === 0) {
          console.log("No booking found for group", bookingGroupId, "— inserting fallback booking");
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
              notes: JSON.stringify({ _fallback: true, _reason: "Booking criado pelo webhook — paciente pode não ter selecionado data" }),
            }),
          });
        }
      }

      // Send confirmation email
      const confirmationHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
        </head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 24px;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

                <!-- Top accent bar -->
                <tr><td style="height:4px;background:#2d5a27;"></td></tr>

                <!-- Brand -->
                <tr><td style="padding:32px 40px 0;text-align:left;">
                  <p style="margin:0;font-size:15px;font-weight:700;color:#2d5a27;letter-spacing:-0.3px;">NutriVida</p>
                </td></tr>

                <!-- Divider -->
                <tr><td style="padding:20px 40px 0;"><div style="height:1px;background:#f0f0f0;"></div></td></tr>

                <!-- Content -->
                <tr><td style="padding:32px 40px;">
                  <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.5px;">Consulta confirmada</h2>
                  <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Pagamento aprovado com sucesso — obrigado, ${customerName || "cliente"}!</p>

                  <!-- Plan info box -->
                  <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:500;">Plano contratado</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${planName}</p>
                  </div>

                  <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6;">
                    Seu agendamento foi confirmado. Em breve entraremos em contato para confirmar todos os detalhes da sua consulta.
                  </p>

                  <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                    Dúvidas? Responda este email ou entre em contato pelo WhatsApp.
                  </p>
                </td></tr>

                <!-- Footer -->
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
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: customerEmail,
            subject: `Consulta confirmada — ${planName}`,
            html: confirmationHtml,
          }),
        });
      }

      // Log payment
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
    // external_reference format: "productIndex|email|encodedPdfUrl|encodedName"
    const customerEmail = parts[1];
    const pdfUrl = parts[2] ? decodeURIComponent(parts[2]) : "";
    const productName = payment.additional_info?.items?.[0]?.title || payment.description || "E-book";

    if (!customerEmail || !RESEND_API_KEY) {
      console.error("Missing email or RESEND_API_KEY");
      return new Response("ok", { status: 200 });
    }

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
      </head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 24px;">
          <tr><td align="center">
            <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">

              <!-- Top accent bar -->
              <tr><td style="height:4px;background:#2d5a27;"></td></tr>

              <!-- Brand -->
              <tr><td style="padding:32px 40px 0;text-align:left;">
                <p style="margin:0;font-size:15px;font-weight:700;color:#2d5a27;letter-spacing:-0.3px;">NutriVida</p>
              </td></tr>

              <!-- Divider -->
              <tr><td style="padding:20px 40px 0;"><div style="height:1px;background:#f0f0f0;"></div></td></tr>

              <!-- Content -->
              <tr><td style="padding:32px 40px;">
                <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.5px;">Seu e-book está pronto</h2>
                <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Pagamento confirmado — obrigado pela sua compra!</p>

                <!-- Product info box -->
                <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                  <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:500;">Material adquirido</p>
                  <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${productName}</p>
                </div>

                ${pdfUrl ? `
                <!-- Download button -->
                <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr><td style="background:#2d5a27;border-radius:8px;padding:14px 28px;">
                    <a href="${pdfUrl}" style="color:#fff;font-size:14px;font-weight:600;text-decoration:none;">Baixar e-book</a>
                  </td></tr>
                </table>
                <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Se o botão não funcionar, acesse o link diretamente:</p>
                <p style="margin:0 0 24px;font-size:12px;color:#2d5a27;word-break:break-all;line-height:1.5;">${pdfUrl}</p>
                ` : `
                <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">Em breve você receberá o link de acesso ao seu e-book. Qualquer dúvida, responda este email.</p>
                </div>
                `}

                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                  Dúvidas? Responda este email ou entre em contato pelo WhatsApp.
                </p>
              </td></tr>

              <!-- Footer -->
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

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: `📚 Seu e-book "${productName}" está aqui!`,
        html: emailHtml,
      }),
    });

    const emailData = await emailRes.json();
    console.log("Resend response:", JSON.stringify(emailData));

    // Log to payment_logs via Supabase REST API
    const customerName = parts[3] ? decodeURIComponent(parts[3]) : "";

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
          product_name: productName,
          product_index: Number(parts[0]),
          amount: payment.transaction_amount,
          status: "approved",
          pdf_url: pdfUrl,
        }),
      });
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("ok", { status: 200 }); // Always return 200 to MP
  }
});
