import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendTelegram(botToken: string, chatId: string, message: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML",
    }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error("Telegram error:", data);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      return new Response(
        JSON.stringify({ error: "Telegram credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { event, data } = await req.json();

    let message = "";

    switch (event) {
      case "workshop_registered":
        message = `🏪 <b>Nuevo taller registrado</b>\n\n` +
          `📋 Nombre: <b>${data.name}</b>\n` +
          `📧 Email: ${data.email || "N/A"}\n` +
          `📱 WhatsApp: ${data.whatsapp || "N/A"}\n` +
          `📦 Plan: ${data.plan_name || "Sin plan"}\n` +
          `📅 Fecha: ${new Date().toLocaleDateString("es-NI")}`;
        break;

      case "payment_received":
        message = `💰 <b>Nuevo pago recibido</b>\n\n` +
          `🏪 Taller: <b>${data.workshop_name}</b>\n` +
          `📧 Email: ${data.workshop_email || "N/A"}\n` +
          `📱 WhatsApp: ${data.workshop_whatsapp || "N/A"}\n` +
          `💵 Monto: ${data.currency} ${data.amount}\n` +
          `📦 Plan: ${data.plan_name || "N/A"}\n` +
          `📅 Periodo: ${data.billing_period || "N/A"}\n` +
          `🧾 Comprobante: ${data.has_receipt ? "✅ Adjunto" : "❌ Sin comprobante"}\n` +
          `📅 Fecha: ${new Date().toLocaleDateString("es-NI")}`;
        break;

      case "subscription_expired":
        message = `⚠️ <b>Suscripción expirada</b>\n\n` +
          `🏪 Taller: <b>${data.workshop_name}</b>\n` +
          `📧 Email: ${data.email || "N/A"}\n` +
          `📱 WhatsApp: ${data.whatsapp || "N/A"}\n` +
          `📅 Expiró: ${data.expired_at || "N/A"}`;
        break;

      default:
        message = `📢 Evento: ${event}\n${JSON.stringify(data, null, 2)}`;
    }

    await sendTelegram(botToken, chatId, message);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
