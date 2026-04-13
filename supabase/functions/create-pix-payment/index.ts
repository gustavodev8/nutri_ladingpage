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
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "MP_ACCESS_TOKEN not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { productIndex, productName, priceAmount, customerEmail, pdfUrl, customerName, customerCpf } = await req.json();

    const cpfDigits = (customerCpf || "").replace(/\D/g, "") || "00000000000";
    const externalRef = `${productIndex}|${customerEmail}|${encodeURIComponent(pdfUrl || "")}|${encodeURIComponent(customerName || "")}|${cpfDigits}`;

    const nameParts = (customerName || "Cliente").trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "NutriVida";

    const paymentBody = {
      transaction_amount: Number(priceAmount),
      payment_method_id: "pix",
      description: productName,
      external_reference: externalRef,
      notification_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
      payer: {
        email: customerEmail,
        first_name: firstName,
        last_name: lastName,
        identification: { type: "CPF", number: cpfDigits },
      },
    };

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `${productIndex}-${customerEmail}-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("MP error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: data.message || data.cause?.[0]?.description || "Erro ao criar pagamento Pix" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txData = data.point_of_interaction?.transaction_data;

    return new Response(JSON.stringify({
      payment_id: data.id,
      qr_code: txData?.qr_code || "",
      qr_code_base64: txData?.qr_code_base64 || "",
      status: data.status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
