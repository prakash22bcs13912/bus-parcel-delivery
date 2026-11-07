/*
# Secure booking creation and driver/location access

1. Booking creation
- Adds `create_booking` as the only authenticated write path for new bookings.
- The function derives the owner from the signed-in session, validates the route and stops, validates parcel weight, recalculates the fare from stored stop coordinates, and always starts bookings with status `booked` and payment status `pending`.
- The function also creates the initial status history, pending payment record, and booking notification in the same database operation.

2. Payment and booking protection
- Removes direct authenticated and anonymous INSERT, UPDATE, and DELETE privileges from bookings, payments, booking history, and notifications.
- Existing authenticated SELECT policies remain available for users to view their own records.
- The Razorpay verification function remains the privileged path for changing a booking to paid.

3. Driver and location access
- Removes anonymous access to driver records and bus location history.
- Authenticated users may read only their own driver assignment.
- Bus location writes remain server-side only and are checked by the edge function against the active driver assignment.

4. Security
- The booking function is SECURITY DEFINER with a fixed search path.
- Anonymous callers cannot execute it.
- No tables or columns are dropped or renamed.
*/

CREATE OR REPLACE FUNCTION public.create_booking(
  p_booking_code text,
  p_route_id uuid,
  p_bus_id uuid,
  p_boarding_stop_id uuid,
  p_destination_stop_id uuid,
  p_travel_date date,
  p_parcel_type text,
  p_weight_kg numeric,
  p_sender_name text,
  p_sender_phone text,
  p_receiver_name text,
  p_receiver_phone text,
  p_instructions text,
  p_payment_method text
)
RETURNS TABLE (booking_id uuid, booking_code text, estimated_price numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_route record;
  v_boarding record;
  v_destination record;
  v_distance_km numeric;
  v_distance_charge numeric;
  v_weight_charge numeric;
  v_price numeric;
  v_booking_id uuid;
  v_booking_code text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_weight_kg IS NULL OR p_weight_kg <= 0 OR p_weight_kg > 100 THEN
    RAISE EXCEPTION 'Invalid parcel weight';
  END IF;

  IF p_payment_method NOT IN ('cash', 'upi', 'card', 'netbanking') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT id, bus_id INTO v_route
  FROM routes
  WHERE id = p_route_id AND is_active = true;

  IF NOT FOUND OR v_route.bus_id <> p_bus_id THEN
    RAISE EXCEPTION 'Invalid route';
  END IF;

  SELECT id, route_id, latitude, longitude INTO v_boarding
  FROM route_stops
  WHERE id = p_boarding_stop_id AND route_id = p_route_id AND is_boarding = true;

  SELECT id, route_id, latitude, longitude INTO v_destination
  FROM route_stops
  WHERE id = p_destination_stop_id AND route_id = p_route_id AND is_unloading = true;

  IF NOT FOUND OR v_boarding.id IS NULL OR v_destination.id IS NULL THEN
    RAISE EXCEPTION 'Invalid boarding or destination stop';
  END IF;

  IF v_boarding.latitude IS NULL OR v_boarding.longitude IS NULL
     OR v_destination.latitude IS NULL OR v_destination.longitude IS NULL THEN
    RAISE EXCEPTION 'Stops do not have coordinates';
  END IF;

  v_distance_km := 6371 * 2 * asin(sqrt(
    sin(radians(v_destination.latitude - v_boarding.latitude) / 2) ^ 2
    + cos(radians(v_boarding.latitude)) * cos(radians(v_destination.latitude))
    * sin(radians(v_destination.longitude - v_boarding.longitude) / 2) ^ 2
  ));

  v_distance_charge := CASE
    WHEN v_distance_km > 200 THEN (v_distance_km - 200) * 0.5 + 150 + 100 + 50
    WHEN v_distance_km > 100 THEN (v_distance_km - 100) * 1 + 150 + 100
    WHEN v_distance_km > 50 THEN (v_distance_km - 50) * 2 + 150
    ELSE v_distance_km * 3
  END;

  v_weight_charge := CASE
    WHEN p_weight_kg <= 5 THEN 10
    WHEN p_weight_kg <= 10 THEN 15
    WHEN p_weight_kg <= 15 THEN 20
    WHEN p_weight_kg <= 20 THEN 25
    WHEN p_weight_kg <= 25 THEN 30
    WHEN p_weight_kg <= 30 THEN 35
    WHEN p_weight_kg <= 35 THEN 40
    WHEN p_weight_kg <= 40 THEN 45
    WHEN p_weight_kg <= 45 THEN 50
    ELSE 55
  END;

  v_price := round(greatest(40, v_distance_charge + v_weight_charge));
  v_booking_code := p_booking_code;

  INSERT INTO bookings (
    booking_code, user_id, route_id, bus_id, boarding_stop_id, destination_stop_id,
    travel_date, parcel_type, weight_kg, sender_name, sender_phone, receiver_name,
    receiver_phone, instructions, estimated_price, status, payment_method, payment_status
  ) VALUES (
    v_booking_code, v_user_id, p_route_id, p_bus_id, p_boarding_stop_id, p_destination_stop_id,
    p_travel_date, p_parcel_type, p_weight_kg, p_sender_name, p_sender_phone, p_receiver_name,
    p_receiver_phone, NULLIF(p_instructions, ''), v_price, 'booked', p_payment_method, 'pending'
  )
  RETURNING id, bookings.booking_code, bookings.estimated_price
  INTO v_booking_id, v_booking_code, v_price;

  INSERT INTO booking_status_history (booking_id, status, notes)
  VALUES (v_booking_id, 'booked', 'Booking created by customer');

  INSERT INTO payments (booking_id, payment_method, payment_status, amount)
  VALUES (v_booking_id, p_payment_method, 'pending', v_price);

  INSERT INTO notifications (user_id, booking_id, title, message, type)
  VALUES (v_user_id, v_booking_id, 'Booking Created', 'Your parcel booking is ready for payment or boarding.', 'booking');

  RETURN QUERY SELECT v_booking_id, v_booking_code, v_price;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_booking(text, uuid, uuid, uuid, uuid, date, text, numeric, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(text, uuid, uuid, uuid, uuid, date, text, numeric, text, text, text, text, text, text) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON bookings, payments, booking_status_history, notifications FROM anon, authenticated;
REVOKE SELECT ON drivers, bus_locations FROM anon;
GRANT SELECT ON drivers TO authenticated;
GRANT SELECT ON bus_locations TO authenticated;
DROP POLICY IF EXISTS "public_read_drivers" ON drivers;
CREATE POLICY "select_own_driver_assignment" ON drivers FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "public_read_locations" ON bus_locations;
CREATE POLICY "authenticated_read_locations" ON bus_locations FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON bus_operators FROM anon;
GRANT SELECT ON bus_operators TO authenticated;
