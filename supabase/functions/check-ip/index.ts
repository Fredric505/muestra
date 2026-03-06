import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, user_id, workshop_id, ip_address, record_id, blocked_reason } = await req.json();

    if (action === "get_ip") {
      // Return the caller's IP from headers
      const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";
      return new Response(JSON.stringify({ ip: clientIp }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "register_ip") {
      // Get IP from request headers
      const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        "unknown";

      // Check if this IP is blocked
      const { data: blocked } = await supabaseAdmin
        .from("registration_ips")
        .select("id, is_blocked")
        .eq("ip_address", clientIp)
        .eq("is_blocked", true)
        .limit(1);

      if (blocked && blocked.length > 0) {
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: "Esta dirección IP ha sido bloqueada. Contacta al soporte.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Count how many accounts were created from this IP
      const { count } = await supabaseAdmin
        .from("registration_ips")
        .select("id", { count: "exact", head: true })
        .eq("ip_address", clientIp);

      const MAX_ACCOUNTS_PER_IP = 2;

      if ((count || 0) >= MAX_ACCOUNTS_PER_IP) {
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: "Se ha alcanzado el límite de cuentas permitidas desde esta ubicación.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Record the IP
      await supabaseAdmin.from("registration_ips").insert({
        ip_address: clientIp,
        user_id: user_id || "00000000-0000-0000-0000-000000000000",
        workshop_id: workshop_id || null,
      });

      return new Response(
        JSON.stringify({ allowed: true, ip: clientIp }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "block_ip") {
      const { error } = await supabaseAdmin
        .from("registration_ips")
        .update({
          is_blocked: true,
          blocked_reason: blocked_reason || "Bloqueado por Super Admin",
          blocked_at: new Date().toISOString(),
          unblocked_at: null,
        })
        .eq("id", record_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unblock_ip") {
      const { error } = await supabaseAdmin
        .from("registration_ips")
        .update({
          is_blocked: false,
          unblocked_at: new Date().toISOString(),
        })
        .eq("id", record_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block ALL records for a given IP address
    if (action === "block_all_by_ip") {
      const { error } = await supabaseAdmin
        .from("registration_ips")
        .update({
          is_blocked: true,
          blocked_reason: blocked_reason || "Bloqueado por Super Admin",
          blocked_at: new Date().toISOString(),
          unblocked_at: null,
        })
        .eq("ip_address", ip_address);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unblock_all_by_ip") {
      const { error } = await supabaseAdmin
        .from("registration_ips")
        .update({
          is_blocked: false,
          unblocked_at: new Date().toISOString(),
        })
        .eq("ip_address", ip_address);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
