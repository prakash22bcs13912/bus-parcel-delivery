/*
# Add Payments, Notifications, Drivers tables + expand booking statuses

## Summary
Adds payment tracking, in-app notifications, and driver records to support
the upgraded booking flow. Also adds payment_method and payment_status
columns to the bookings table.

## New Tables

1. **payments** — records each payment for a booking
   - id (uuid, PK)
   - booking_id (uuid, FK → bookings)
   - payment_method (text) — cash / upi / card / netbanking
   - payment_status (text) — pending / paid / failed / refunded
   - transaction_id (text, nullable) — gateway transaction reference
   - amount (numeric)
   - created_at (timestamptz)

2. **notifications** — in-app notifications for the user
   - id (uuid, PK)
   - user_id (uuid, FK → auth.users, DEFAULT auth.uid())
   - booking_id (uuid, nullable, FK → bookings)
   - title (text)
   - message (text)
   - type (text) — booking / payment / transit / delivery
   - is_read (boolean, default false)
   - created_at (timestamptz)

3. **drivers** — bus driver profiles (linked to auth users)
   - id (uuid, PK)
   - user_id (uuid, FK → auth.users)
   - bus_id (uuid, nullable, FK → buses)
   - license_number (text)
   - phone (text)
   - is_active (boolean, default true)
   - created_at (timestamptz)

4. **bus_locations** — real-time GPS pings from driver devices
   - id (uuid, PK)
   - bus_id (uuid, FK → buses)
   - route_id (uuid, nullable, FK → routes)
   - latitude (double precision)
   - longitude (double precision)
   - status (text) — on_time / delayed / arrived / stopped
   - recorded_at (timestamptz)

## Modified Tables

### bookings
- ADD COLUMN payment_method (text, nullable) — cash / upi / card / netbanking
- ADD COLUMN payment_status (text, not null, default 'pending')

## Security
- payments: authenticated users CRUD only their own (via booking ownership)
- notifications: authenticated users CRUD only their own (user_id ownership)
- drivers: public read (anon + authenticated), no client writes
- bus_locations: public read, no client writes (driver app writes via service role)
*/

-- ============ Add columns to bookings ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_method') THEN
    ALTER TABLE bookings ADD COLUMN payment_method text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
    ALTER TABLE bookings ADD COLUMN payment_status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- ============ payments ============
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_status text NOT NULL DEFAULT 'pending',
  transaction_id text,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO authenticated;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id);

-- ============ notifications ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'booking',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);

-- ============ drivers ============
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bus_id uuid REFERENCES buses(id) ON DELETE SET NULL,
  license_number text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON drivers TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_drivers" ON drivers;
CREATE POLICY "public_read_drivers" ON drivers
  FOR SELECT TO anon, authenticated USING (true);

-- ============ bus_locations ============
CREATE TABLE IF NOT EXISTS bus_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  route_id uuid REFERENCES routes(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  status text NOT NULL DEFAULT 'on_time',
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE bus_locations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON bus_locations TO anon, authenticated;

DROP POLICY IF EXISTS "public_read_locations" ON bus_locations;
CREATE POLICY "public_read_locations" ON bus_locations
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_locations_bus ON bus_locations (bus_id, recorded_at DESC);
