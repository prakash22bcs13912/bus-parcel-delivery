/*
# Fastest Parcel Delivery System — Core Schema

## Summary
Creates the complete database for a bus-route-based parcel booking system.
Customers search for buses traveling between two cities, select a boarding
and destination stop along the bus route, enter parcel details, and book.

## New Tables

1. **bus_operators** — companies that operate buses and accept parcels
   - id (uuid, PK)
   - name (text) — operator display name
   - phone (text) — contact number
   - created_at (timestamptz)

2. **buses** — individual buses
   - id (uuid, PK)
   - operator_id (uuid, FK → bus_operators)
   - bus_number (text) — display number/plate
   - bus_type (text) — e.g. "AC Sleeper", "Non-AC Seater"
   - capacity_kg (numeric) — max parcel weight capacity
   - created_at (timestamptz)

3. **routes** — a bus route between two cities
   - id (uuid, PK)
   - bus_id (uuid, FK → buses)
   - origin_city (text)
   - destination_city (text)
   - departure_time (time) — scheduled departure from origin
   - arrival_time (text) — estimated arrival (text for flexibility)
   - travel_date (date, nullable) — specific date; null means runs daily
   - fare_per_kg (numeric) — parcel price per kg on this route
   - base_fare (numeric) — minimum charge
   - is_active (boolean, default true)
   - created_at (timestamptz)

4. **route_stops** — boarding/unloading points along a route, in order
   - id (uuid, PK)
   - route_id (uuid, FK → routes)
   - name (text) — stop name e.g. "Silk Board Junction"
   - stop_order (int) — sequence from origin
   - departure_time (text) — time bus reaches this stop (e.g. "7:30 PM")
   - latitude (double precision, nullable) — for GPS proximity
   - longitude (double precision, nullable)
   - is_boarding (boolean, default true) — can parcels be handed over here
   - is_unloading (boolean, default true) — can parcels be collected here

5. **bookings** — a parcel booking made by a customer
   - id (uuid, PK)
   - booking_code (text, unique) — customer-facing tracking ID e.g. FST-AB1234
   - user_id (uuid, FK → auth.users, DEFAULT auth.uid())
   - route_id (uuid, FK → routes)
   - bus_id (uuid, FK → buses)
   - boarding_stop_id (uuid, FK → route_stops)
   - destination_stop_id (uuid, FK → route_stops)
   - travel_date (date)
   - parcel_type (text) — Document / Clothes / Box / Other
   - weight_kg (numeric)
   - sender_name (text)
   - sender_phone (text)
   - receiver_name (text)
   - receiver_phone (text)
   - instructions (text, nullable)
   - estimated_price (numeric)
   - status (text) — booked / handed_over / in_transit / reached / collected / cancelled
   - created_at (timestamptz)

6. **booking_status_history** — log of status changes per booking
   - id (uuid, PK)
   - booking_id (uuid, FK → bookings)
   - status (text)
   - notes (text, nullable)
   - created_at (timestamptz)

## Security
- RLS enabled on all tables.
- bus_operators, buses, routes, route_stops: public read (anon + authenticated), no writes from client.
- bookings: authenticated users can CRUD only their own bookings (user_id ownership).
- booking_status_history: authenticated users can read/insert only for their own bookings.
- All owner columns default to auth.uid() so client inserts succeed.
*/

-- ============ bus_operators ============
CREATE TABLE IF NOT EXISTS bus_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bus_operators ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON bus_operators TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_operators" ON bus_operators;
CREATE POLICY "public_read_operators" ON bus_operators
  FOR SELECT TO anon, authenticated USING (true);

-- ============ buses ============
CREATE TABLE IF NOT EXISTS buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES bus_operators(id) ON DELETE CASCADE,
  bus_number text NOT NULL,
  bus_type text NOT NULL DEFAULT 'Non-AC Seater',
  capacity_kg numeric NOT NULL DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE buses ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON buses TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_buses" ON buses;
CREATE POLICY "public_read_buses" ON buses
  FOR SELECT TO anon, authenticated USING (true);

-- ============ routes ============
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  origin_city text NOT NULL,
  destination_city text NOT NULL,
  departure_time text NOT NULL,
  arrival_time text,
  travel_date date,
  fare_per_kg numeric NOT NULL DEFAULT 15,
  base_fare numeric NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON routes TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_routes" ON routes;
CREATE POLICY "public_read_routes" ON routes
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_routes_origin_dest ON routes (origin_city, destination_city);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes (is_active);

-- ============ route_stops ============
CREATE TABLE IF NOT EXISTS route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  name text NOT NULL,
  stop_order int NOT NULL,
  departure_time text,
  latitude double precision,
  longitude double precision,
  is_boarding boolean NOT NULL DEFAULT true,
  is_unloading boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON route_stops TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_stops" ON route_stops;
CREATE POLICY "public_read_stops" ON route_stops
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_stops_route ON route_stops (route_id, stop_order);

-- ============ bookings ============
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text UNIQUE NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  bus_id uuid NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  boarding_stop_id uuid NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE,
  destination_stop_id uuid NOT NULL REFERENCES route_stops(id) ON DELETE CASCADE,
  travel_date date NOT NULL,
  parcel_type text NOT NULL,
  weight_kg numeric NOT NULL,
  sender_name text NOT NULL,
  sender_phone text NOT NULL,
  receiver_name text NOT NULL,
  receiver_phone text NOT NULL,
  instructions text,
  estimated_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'booked',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON bookings TO authenticated;

DROP POLICY IF EXISTS "select_own_bookings" ON bookings;
CREATE POLICY "select_own_bookings" ON bookings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_bookings" ON bookings;
CREATE POLICY "insert_own_bookings" ON bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_bookings" ON bookings;
CREATE POLICY "update_own_bookings" ON bookings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_bookings" ON bookings;
CREATE POLICY "delete_own_bookings" ON bookings
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings (booking_code);

-- ============ booking_status_history ============
CREATE TABLE IF NOT EXISTS booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON booking_status_history TO authenticated;

DROP POLICY IF EXISTS "select_own_history" ON booking_status_history;
CREATE POLICY "select_own_history" ON booking_status_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_status_history.booking_id AND bookings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_history" ON booking_status_history;
CREATE POLICY "insert_own_history" ON booking_status_history
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_status_history.booking_id AND bookings.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_history_booking ON booking_status_history (booking_id);