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
    const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:8080";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "MP_ACCESS_TOKEN not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { productIndex, productName, priceAmount, customerEmail, pdfUrl } = await req.json();

    // external_reference encodes product index, email, pdf url
    const externalRef = `${productIndex}|${customerEmail}|${encodeURIComponent(pdfUrl || "")}`;

    // auto_return requires HTTPS back_urls — only enable in production
    const isProduction = SITE_URL.startsWith("https://");

    const preference: Record<string, unknown> = {
      items: [{
        title: productName,
        quantity: 1,
        unit_price: Number(priceAmount),
        currency_id: "BRL",
      }],
      payer: { email: customerEmail },
      external_reference: externalRef,
      notification_url: `${SUPABASE_URL}/functions/v1/payment-webhook`,
      statement_descriptor: "EBOOK",
    };

    if (isProduction) {
      preference.back_urls = {
        success: `${SITE_URL}/pagamento/sucesso`,
        failure: `${SITE_URL}/pagamento/erro`,
        pending: `${SITE_URL}/pagamento/pendente`,
      };
      preference.auto_return = "approved";
    }

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("MP error:", data);
      return new Response(JSON.stringify({ error: data.message || "MP error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ init_point: data.init_point, sandbox_init_point: data.sandbox_init_point }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
