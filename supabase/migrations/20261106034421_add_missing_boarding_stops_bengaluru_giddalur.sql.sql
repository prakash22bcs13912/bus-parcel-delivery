/*
# Add missing boarding stops to Bengaluru → Giddalur route

1. Changes
- Adds 4 boarding stops missing from the Bengaluru → Giddalur route (route e1111111-1111-1111-1111-111111111111):
  - Battarahalli (stop_order 17)
  - TC Palya Signal (stop_order 18)
  - KR Puram (stop_order 19)
  - ITO Gate / Duravani Nagar (stop_order 20)
- All 4 are boarding-only stops (is_boarding = true, is_unloading = false)
- Each has accurate latitude/longitude for GPS distance calculation
- Departure times are estimated based on route progression
2. Security
- No new tables; only INSERT into existing route_stops table
- RLS already configured on route_stops from prior migrations
3. Notes
- Giddalur remains the final unloading stop (stop_order 17 → will be shifted)
- These stops are added after Hoskote (current stop_order 16) and before Giddalur
- To avoid stop_order collision, we insert with stop_order 17-20 for the new stops
  and shift Giddalur from 17 to 21
*/

-- Shift Giddalur from stop_order 17 to 21 to make room
UPDATE route_stops
SET stop_order = 21
WHERE route_id = 'e1111111-1111-1111-1111-111111111111'
  AND name = 'Giddalur'
  AND stop_order = 17;

-- Insert the 4 missing boarding stops
INSERT INTO route_stops (route_id, name, stop_order, departure_time, latitude, longitude, is_boarding, is_unloading)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'Battarahalli', 17, '10:20 PM', 13.050, 77.790, true, false),
  ('e1111111-1111-1111-1111-111111111111', 'TC Palya Signal', 18, '10:25 PM', 13.033, 77.688, true, false),
  ('e1111111-1111-1111-1111-111111111111', 'KR Puram', 19, '10:35 PM', 13.005, 77.690, true, false),
  ('e1111111-1111-1111-1111-111111111111', 'ITO Gate / Duravani Nagar', 20, '10:45 PM', 12.975, 77.650, true, false)
ON CONFLICT DO NOTHING;
