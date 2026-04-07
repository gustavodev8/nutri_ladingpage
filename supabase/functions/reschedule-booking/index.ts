import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      booking_id,
      new_date,
      new_time,
      client_email,
      client_name,
      plan_name,
      message,
    } = await req.json();

    if (!booking_id || !new_date || !new_time || !client_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey   = Deno.env.get("RESEND_API_KEY");
    const fromEmail   = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@nutrivida.com.br";
    const brandName   = Deno.env.get("BRAND_NAME") || "NutriVida";

    // 1. Update booking in DB
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${booking_id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        appointment_date: new_date,
        appointment_time: new_time,
      }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`DB update failed: ${err}`);
    }

    // 2. Format date for email
    const dateObj = new Date(new_date + "T12:00:00");
    const formattedDate = dateObj.toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });
    const formattedTime = new_time.substring(0, 5);

    // 3. Send email via Resend
    if (resendKey) {
      const html = `
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
                  <p style="margin:0;font-size:15px;font-weight:700;color:#2d5a27;letter-spacing:-0.3px;">${brandName}</p>
                </td></tr>

                <!-- Divider -->
                <tr><td style="padding:20px 40px 0;"><div style="height:1px;background:#f0f0f0;"></div></td></tr>

                <!-- Content -->
                <tr><td style="padding:32px 40px;">
                  <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.5px;">Consulta reagendada</h2>
                  <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Olá, ${client_name || "cliente"} — sua data foi alterada.</p>

                  <!-- Plan info box -->
                  <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:16px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:500;">Consulta</p>
                    <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${plan_name || "Consulta"}</p>
                  </div>

                  <!-- Date/time box -->
                  <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:500;">Nova data</p>
                    <p style="margin:0 0 2px;font-size:16px;font-weight:600;color:#111827;">${formattedDate}</p>
                    <p style="margin:0;font-size:14px;color:#6b7280;">às ${formattedTime}</p>
                  </div>

                  ${message ? `
                  <!-- Team message -->
                  <div style="background:#f9fafb;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.6px;font-weight:500;">Mensagem da equipe</p>
                    <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${message}</p>
                  </div>
                  ` : ""}

                  <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                    Dúvidas? Responda este email ou entre em contato pelo WhatsApp.
                  </p>
                </td></tr>

                <!-- Footer -->
                <tr><td style="padding:0 40px 32px;">
                  <div style="height:1px;background:#f0f0f0;margin-bottom:20px;"></div>
                  <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;">${brandName} &nbsp;·&nbsp; Este é um email automático</p>
                </td></tr>

              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: client_email,
          subject: `Consulta reagendada — ${formattedDate} às ${formattedTime}`,
          html,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("reschedule-booking error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
