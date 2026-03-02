import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    // Find workshops with expired trials
    const { data: expiredTrials } = await supabase
      .from("workshops")
      .select("id, name, email, whatsapp, trial_ends_at")
      .eq("subscription_status", "trial")
      .lt("trial_ends_at", now);

    // Find workshops with expired paid subscriptions
    const { data: expiredSubs } = await supabase
      .from("workshops")
      .select("id, name, email, whatsapp, subscription_ends_at")
      .eq("subscription_status", "active")
      .lt("subscription_ends_at", now);

    const allExpired = [...(expiredTrials || []), ...(expiredSubs || [])];

    for (const ws of allExpired) {
      // Mark as expired
      await supabase.from("workshops").update({
        subscription_status: "expired",
        is_active: false,
      }).eq("id", ws.id);

      // Notify via Telegram
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
      if (botToken && chatId) {
        const expiredAt = ws.trial_ends_at || ws.subscription_ends_at || "N/A";
        const message = `⚠️ <b>Suscripción expirada</b>\n\n` +
          `🏪 Taller: <b>${ws.name}</b>\n` +
          `📧 Email: ${ws.email || "N/A"}\n` +
          `📱 WhatsApp: ${ws.whatsapp || "N/A"}\n` +
          `📅 Expiró: ${new Date(expiredAt).toLocaleDateString("es-NI")}`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, expired_count: allExpired.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
