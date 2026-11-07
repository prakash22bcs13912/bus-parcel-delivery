export interface BusOperator {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface Bus {
  id: string;
  operator_id: string;
  bus_number: string;
  bus_type: string;
  capacity_kg: number;
  created_at: string;
}

export interface Route {
  id: string;
  bus_id: string;
  origin_city: string;
  destination_city: string;
  departure_time: string;
  arrival_time: string | null;
  travel_date: string | null;
  fare_per_kg: number;
  base_fare: number;
  is_active: boolean;
  created_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  name: string;
  stop_order: number;
  departure_time: string | null;
  latitude: number | null;
  longitude: number | null;
  is_boarding: boolean;
  is_unloading: boolean;
  created_at: string;
}

export type BookingStatus =
  | 'booked'
  | 'handed_over'
  | 'waiting_for_bus'
  | 'in_transit'
  | 'reached'
  | 'out_for_collection'
  | 'collected'
  | 'cancelled';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'netbanking';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Booking {
  id: string;
  booking_code: string;
  user_id: string;
  route_id: string;
  bus_id: string;
  boarding_stop_id: string;
  destination_stop_id: string;
  travel_date: string;
  parcel_type: string;
  weight_kg: number;
  sender_name: string;
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  instructions: string | null;
  estimated_price: number;
  status: BookingStatus;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
}

// Joined types for queries
export interface RouteWithBus extends Route {
  buses: {
    bus_number: string;
    bus_type: string;
    operator_id: string;
    bus_operators: { name: string };
  };
}

export interface BookingWithDetails extends Booking {
  routes: Route;
  buses: { bus_number: string; bus_type: string };
  boarding_stop: { name: string; departure_time: string | null };
  destination_stop: { name: string; departure_time: string | null };
}

export interface Payment {
  id: string;
  booking_id: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_id: string | null;
  amount: number;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  booking_id: string | null;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'transit' | 'delivery';
  is_read: boolean;
  created_at: string;
}

export interface BusLocation {
  id: string;
  bus_id: string;
  route_id: string | null;
  latitude: number;
  longitude: number;
  status: 'on_time' | 'delayed' | 'arrived' | 'stopped';
  recorded_at: string;
}
