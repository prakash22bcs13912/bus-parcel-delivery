import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(`${orderId}|${paymentId}`));
  const expected = new Uint8Array(signed);
  const provided = Uint8Array.from(atob(signature), (value) => value.charCodeAt(0));
  if (expected.length !== provided.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ provided[index];
  return difference === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = await req.json();
    if (!authHeader || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId) {
      return new Response(JSON.stringify({ error: "Missing payment verification data", verified: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Online payments are not configured", verified: false }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Authentication required", verified: false }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select("id, user_id, estimated_price, payment_status")
      .eq("id", bookingId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (bookingError || !booking || booking.payment_status !== "pending") {
      return new Response(JSON.stringify({ error: "Booking is not available for payment", verified: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const razorpayAuth = btoa(`${keyId}:${keySecret}`);
    const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpayOrderId)}`, {
      headers: { Authorization: `Basic ${razorpayAuth}` },
    });
    if (!orderResponse.ok) throw new Error("Could not verify payment order");
    const order = await orderResponse.json();
    if (order.id !== razorpayOrderId || Number(order.amount) !== Math.round(Number(booking.estimated_price) * 100)) {
      return new Response(JSON.stringify({ error: "Payment amount does not match the booking", verified: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!(await verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, keySecret))) {
      return new Response(JSON.stringify({ error: "Payment verification failed", verified: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pendingPayment, error: paymentLookupError } = await adminClient
      .from("payments")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("payment_status", "pending")
      .maybeSingle();
    if (paymentLookupError) throw paymentLookupError;

    if (pendingPayment) {
      const { error } = await adminClient.from("payments").update({ payment_status: "paid", transaction_id: razorpayPaymentId, amount: booking.estimated_price }).eq("id", pendingPayment.id);
      if (error) throw error;
    } else {
      const { error } = await adminClient.from("payments").insert({ booking_id: bookingId, payment_method: "online", payment_status: "paid", transaction_id: razorpayPaymentId, amount: booking.estimated_price });
      if (error) throw error;
    }

    const { error: bookingUpdateError } = await adminClient.from("bookings").update({ payment_status: "paid" }).eq("id", bookingId).eq("user_id", userData.user.id);
    if (bookingUpdateError) throw bookingUpdateError;

    const { error: notificationError } = await adminClient.from("notifications").insert({
      user_id: userData.user.id,
      booking_id: bookingId,
      title: "Payment Successful",
      message: `Your payment of ₹${booking.estimated_price} has been verified successfully.`,
      type: "payment",
    });
    if (notificationError) throw notificationError;

    return new Response(JSON.stringify({ verified: true, transactionId: razorpayPaymentId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Payment verification failed", verified: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
