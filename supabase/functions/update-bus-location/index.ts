import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { busId, routeId, latitude, longitude, status } = await req.json();
    if (!authHeader || !busId || typeof latitude !== "number" || typeof longitude !== "number" || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(JSON.stringify({ error: "Invalid location request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Supabase configuration is missing");

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: assignment, error: assignmentError } = await adminClient.from("drivers").select("id").eq("user_id", userData.user.id).eq("bus_id", busId).eq("is_active", true).maybeSingle();
    if (assignmentError || !assignment) return new Response(JSON.stringify({ error: "Driver is not assigned to this bus" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data, error } = await adminClient.from("bus_locations").insert({ bus_id: busId, route_id: routeId || null, latitude, longitude, status: status || "on_time" }).select("id, recorded_at").single();
    if (error || !data) throw new Error("Location could not be saved");

    return new Response(JSON.stringify({ success: true, id: data.id, recordedAt: data.recorded_at }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Location could not be saved" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
