import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

    const body = await req.json();
    const { paymentMethod, formData, amount, customerEmail, customerName, planName, bookingGroupId } = body;

    const externalRef = `consultation|${bookingGroupId}|${customerEmail}|${encodeURIComponent(customerName || "")}|${encodeURIComponent(planName || "")}`;

    let paymentBody: Record<string, unknown>;

    if (paymentMethod === "pix") {
      const nameParts = (customerName || "Cliente").trim().split(" ");
      paymentBody = {
        transaction_amount: Number(amount),
        payment_method_id: "pix",
        description: planName,
        external_reference: externalRef,
        notification_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
        payer: {
          email: customerEmail,
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(" ") || "Cliente",
          identification: { type: "CPF", number: "00000000000" },
        },
      };
    } else {
      // Credit/debit card via Payment Brick token
      paymentBody = {
        transaction_amount: Number(amount),
        token: formData.token,
        description: planName,
        installments: Number(formData.installments) || 1,
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id,
        external_reference: externalRef,
        notification_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
        payer: {
          email: formData.payer?.email || customerEmail,
          identification: formData.payer?.identification,
        },
      };
    }

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `consult-${bookingGroupId}-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("MP error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: data.message || "Erro no pagamento" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For Pix: return QR code data
    if (paymentMethod === "pix") {
      const txData = data.point_of_interaction?.transaction_data;
      return new Response(JSON.stringify({
        payment_id: data.id,
        status: data.status,
        qr_code: txData?.qr_code || "",
        qr_code_base64: txData?.qr_code_base64 || "",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // For card: return status
    return new Response(JSON.stringify({
      payment_id: data.id,
      status: data.status,
      status_detail: data.status_detail,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
