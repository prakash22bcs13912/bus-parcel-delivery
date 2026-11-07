import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Package,
  MapPin,
  Bus,
  Calendar,
  Phone,
  User as UserIcon,
  IndianRupee,
  CheckCircle2,
  Circle,
  Clock,
  Navigation,
  Radar,
  CircleAlert,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { BookingWithDetails, BookingStatus, BookingStatusHistory, BusLocation } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';

const STATUS_FLOW: { key: BookingStatus; label: string; icon: typeof CheckCircle2 }[] = [
  { key: 'booked', label: 'Booking Confirmed', icon: CheckCircle2 },
  { key: 'handed_over', label: 'Parcel Accepted', icon: Package },
  { key: 'waiting_for_bus', label: 'Waiting for Bus', icon: Clock },
  { key: 'in_transit', label: 'In Transit', icon: Bus },
  { key: 'reached', label: 'Reached Destination City', icon: MapPin },
  { key: 'out_for_collection', label: 'Out for Collection', icon: ArrowLeft },
  { key: 'collected', label: 'Delivered', icon: CheckCircle2 },
];

const STATUS_ORDER: BookingStatus[] = ['booked', 'handed_over', 'waiting_for_bus', 'in_transit', 'reached', 'out_for_collection', 'collected'];

export default function TrackScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [searchCode, setSearchCode] = useState((params.code as string) || '');
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [history, setHistory] = useState<BookingStatusHistory[]>([]);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBooking = useCallback(
    async (code?: string) => {
      const codeToSearch = code || searchCode;
      if (!codeToSearch.trim() || !user) return;
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('bookings')
        .select(`
          *,
          routes ( id, origin_city, destination_city, departure_time, arrival_time ),
          buses ( bus_number, bus_type ),
          boarding_stop:route_stops!boarding_stop_id ( name, departure_time ),
          destination_stop:route_stops!destination_stop_id ( name, departure_time )
        `)
        .eq('booking_code', codeToSearch.trim().toUpperCase())
        .eq('user_id', user.id)
        .maybeSingle();

      setLoading(false);

      if (queryError) {
        setError('Could not find booking. Please check the code.');
        setBooking(null);
        return;
      }
      if (!data) {
        setError('No booking found with this code. Double-check the Booking ID.');
        setBooking(null);
        return;
      }

      setBooking(data as BookingWithDetails);

      const { data: histData } = await supabase
        .from('booking_status_history')
        .select('*')
        .eq('booking_id', data.id)
        .order('created_at', { ascending: true });
      setHistory((histData as BookingStatusHistory[]) || []);

      const { data: locData } = await supabase
        .from('bus_locations')
        .select('*')
        .eq('bus_id', data.bus_id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setBusLocation((locData as BusLocation) || null);
    },
    [searchCode, user]
  );

  useFocusEffect(
    useCallback(() => {
      if (params.code) {
        setSearchCode(params.code as string);
        fetchBooking(params.code as string);
      }
    }, [params.code])
  );

  const currentStatusIndex = booking
    ? STATUS_ORDER.indexOf(booking.status)
    : -1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={22} color={Colors.neutral[0]} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Track Parcel</Text>
          <Text style={styles.headerSubtitle}>Enter your Booking ID to track</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Search size={18} color={Colors.neutral[400]} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. FST-AB1234"
              value={searchCode}
              onChangeText={setSearchCode}
              placeholderTextColor={Colors.neutral[400]}
              autoCapitalize="characters"
            />
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => fetchBooking()}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.neutral[0]} size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Track</Text>
            )}
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {booking && (
          <>
            {/* Booking info card */}
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <Text style={styles.bookingCode}>{booking.booking_code}</Text>
                <StatusBadge status={booking.status} />
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.routeRow}>
                <View style={styles.routePoint}>
                  <View style={styles.dotGreen} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeCity}>{booking.routes?.origin_city}</Text>
                    <Text style={styles.routeStop}>{booking.boarding_stop?.name}</Text>
                  </View>
                </View>
                <View style={styles.routeArrow}>
                  <Bus size={16} color={Colors.neutral[400]} strokeWidth={2} />
                </View>
                <View style={styles.routePoint}>
                  <View style={styles.dotOrange} />
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeCity}>{booking.routes?.destination_city}</Text>
                    <Text style={styles.routeStop}>{booking.destination_stop?.name}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Status timeline */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Parcel Status</Text>
              <View style={styles.timeline}>
                {STATUS_FLOW.map((step, index) => {
                  const isCompleted = index <= currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const isLast = index === STATUS_FLOW.length - 1;
                  const StepIcon = step.icon;
                  return (
                    <View key={step.key} style={styles.timelineItem}>
                      <View style={styles.timelineLeft}>
                        <View
                          style={[
                            styles.timelineIcon,
                            isCompleted && styles.timelineIconCompleted,
                            isCurrent && styles.timelineIconCurrent,
                          ]}
                        >
                          <StepIcon
                            size={16}
                            color={isCompleted ? Colors.neutral[0] : Colors.neutral[400]}
                            strokeWidth={2}
                          />
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              styles.timelineLine,
                              index < currentStatusIndex && styles.timelineLineCompleted,
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.timelineContent}>
                        <Text
                          style={[
                            styles.timelineLabel,
                            isCompleted && styles.timelineLabelCompleted,
                            isCurrent && styles.timelineLabelCurrent,
                          ]}
                        >
                          {step.label}
                        </Text>
                        {history
                          .filter((h) => h.status === step.key)
                          .map((h) => (
                            <Text key={h.id} style={styles.timelineTime}>
                              {new Date(h.created_at).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          ))}
                      </View>
                    </View>
                  );
                })}
              </View>
              {booking.status === 'cancelled' && (
                <View style={styles.cancelledBox}>
                  <Text style={styles.cancelledText}>This booking was cancelled.</Text>
                </View>
              )}
            </View>

            {/* Booking details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Booking Details</Text>
              <View style={styles.cardDivider} />
              <View style={styles.detailRow}>
                <Calendar size={16} color={Colors.neutral[400]} strokeWidth={2} />
                <Text style={styles.detailLabel}>Travel Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(booking.travel_date).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Package size={16} color={Colors.neutral[400]} strokeWidth={2} />
                <Text style={styles.detailLabel}>Parcel</Text>
                <Text style={styles.detailValue}>
                  {booking.parcel_type} · {booking.weight_kg} kg
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Bus size={16} color={Colors.neutral[400]} strokeWidth={2} />
                <Text style={styles.detailLabel}>Bus</Text>
                <Text style={styles.detailValue}>
                  {booking.buses?.bus_number} · {booking.buses?.bus_type}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <IndianRupee size={16} color={Colors.primary[600]} strokeWidth={2.2} />
                <Text style={styles.detailLabel}>Fare</Text>
                <Text style={styles.detailValue}>₹{booking.estimated_price}</Text>
              </View>
            </View>

            {/* Live bus location */}
            {booking && (
              <View style={styles.card}>
                <View style={styles.liveHeader}>
                  <Radar size={18} color={Colors.primary[600]} strokeWidth={2} />
                  <Text style={styles.cardTitle}>Live Bus Location</Text>
                </View>
                <View style={styles.cardDivider} />
                {busLocation ? (
                  <>
                    <View style={styles.locationRow}>
                      <Navigation size={16} color={Colors.primary[600]} strokeWidth={2} />
                      <Text style={styles.locationLabel}>Coordinates</Text>
                      <Text style={styles.locationValue}>
                        {busLocation.latitude.toFixed(4)}, {busLocation.longitude.toFixed(4)}
                      </Text>
                    </View>
                    <View style={styles.locationRow}>
                      <Clock size={16} color={Colors.neutral[400]} strokeWidth={2} />
                      <Text style={styles.locationLabel}>Last Updated</Text>
                      <Text style={styles.locationValue}>
                        {new Date(busLocation.recorded_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.locationRow}>
                      <Circle size={16} color={busLocation.status === 'on_time' ? Colors.success[600] : busLocation.status === 'delayed' ? Colors.warning[600] : Colors.neutral[400]} strokeWidth={2} />
                      <Text style={styles.locationLabel}>Bus Status</Text>
                      <Text style={[styles.locationValue, { color: busLocation.status === 'on_time' ? Colors.success[600] : busLocation.status === 'delayed' ? Colors.warning[600] : Colors.neutral[700] }]}>
                        {busLocation.status === 'on_time' ? 'On Time' : busLocation.status === 'delayed' ? 'Delayed' : busLocation.status === 'arrived' ? 'Arrived' : 'Stopped'}
                      </Text>
                    </View>
                    <View style={styles.liveMapPlaceholder}>
                      <Bus size={28} color={Colors.primary[400]} strokeWidth={2} />
                      <Text style={styles.liveMapText}>Bus {booking.buses?.bus_number}</Text>
                      <Text style={styles.liveMapCoords}>
                        {busLocation.latitude.toFixed(4)}, {busLocation.longitude.toFixed(4)}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.noLocationBox}>
                    <CircleAlert size={20} color={Colors.neutral[400]} strokeWidth={2} />
                    <Text style={styles.noLocationTitle}>Live tracking not available</Text>
                    <Text style={styles.noLocationDesc}>
                      The driver has not started GPS sharing yet. Location will appear here once the trip begins.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Contact info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contact Information</Text>
              <View style={styles.cardDivider} />
              <View style={styles.contactSection}>
                <Text style={styles.contactSubLabel}>Sender</Text>
                <View style={styles.contactRow}>
                  <UserIcon size={14} color={Colors.neutral[400]} strokeWidth={2} />
                  <Text style={styles.contactName}>{booking.sender_name}</Text>
                  <Phone size={13} color={Colors.neutral[400]} strokeWidth={2} />
                  <Text style={styles.contactPhone}>{booking.sender_phone}</Text>
                </View>
              </View>
              <View style={styles.contactSection}>
                <Text style={styles.contactSubLabel}>Receiver</Text>
                <View style={styles.contactRow}>
                  <UserIcon size={14} color={Colors.neutral[400]} strokeWidth={2} />
                  <Text style={styles.contactName}>{booking.receiver_name}</Text>
                  <Phone size={13} color={Colors.neutral[400]} strokeWidth={2} />
                  <Text style={styles.contactPhone}>{booking.receiver_phone}</Text>
                </View>
              </View>
              {booking.instructions && (
                <View style={styles.instructionsBox}>
                  <Text style={styles.instructionsLabel}>Instructions</Text>
                  <Text style={styles.instructionsText}>{booking.instructions}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {!booking && !loading && !error && (
          <View style={styles.placeholderContainer}>
            <View style={styles.placeholderIcon}>
              <Search size={36} color={Colors.neutral[300]} strokeWidth={2} />
            </View>
            <Text style={styles.placeholderTitle}>Track Your Parcel</Text>
            <Text style={styles.placeholderDesc}>
              Enter your Booking ID above to see real-time status and delivery updates.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary[900],
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg + 8, paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: { marginLeft: Spacing.md },
  headerTitle: { fontSize: 20, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[0] },
  headerSubtitle: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.primary[200], marginTop: 2 },
  scrollView: { flex: 1 },
  scrollViewContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 16 },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  searchInputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 0,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[0], paddingHorizontal: Spacing.md, ...Shadow.xs,
  },
  searchInput: {
    flex: 1, paddingVertical: Spacing.sm + 2, fontSize: 16,
    fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[900], marginLeft: Spacing.sm,
  },
  searchButton: {
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg, alignItems: 'center', justifyContent: 'center',
  },
  searchButtonText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0] },
  errorBox: {
    backgroundColor: Colors.error[50], borderWidth: 0,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md,
  },
  errorText: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.error[700] },
  card: {
    backgroundColor: Colors.neutral[0], borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingCode: { fontSize: 18, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[900] },
  cardDivider: { height: 1, backgroundColor: Colors.neutral[100], marginVertical: Spacing.md },
  cardTitle: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900] },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routePoint: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary[500], marginRight: Spacing.sm },
  dotOrange: { width: 10, height: 10, borderRadius: 3, backgroundColor: Colors.secondary[500], marginRight: Spacing.sm },
  routeInfo: { flex: 1 },
  routeCity: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[800] },
  routeStop: { fontSize: 12, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: 1 },
  routeArrow: { paddingHorizontal: Spacing.sm },
  timeline: { marginTop: Spacing.md },
  timelineItem: { flexDirection: 'row', minHeight: 56 },
  timelineLeft: { alignItems: 'center', marginRight: Spacing.md },
  timelineIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center',
  },
  timelineIconCompleted: { backgroundColor: Colors.primary[600] },
  timelineIconCurrent: { backgroundColor: Colors.primary[600], borderWidth: 3, borderColor: Colors.primary[200] },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.neutral[200], marginTop: 4, minHeight: 24 },
  timelineLineCompleted: { backgroundColor: Colors.primary[500] },
  timelineContent: { flex: 1, paddingBottom: Spacing.md },
  timelineLabel: { fontSize: 14, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[400] },
  timelineLabelCompleted: { color: Colors.neutral[700] },
  timelineLabelCurrent: { color: Colors.primary[700], fontFamily: Typography.fontFamilyBold },
  timelineTime: { fontSize: 12, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400], marginTop: 2 },
  cancelledBox: {
    backgroundColor: Colors.error[50], borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  cancelledText: { fontSize: 14, fontFamily: Typography.fontFamilyMedium, color: Colors.error[700], textAlign: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs + 2 },
  detailLabel: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginLeft: Spacing.sm, flex: 1 },
  detailValue: { fontSize: 14, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900] },
  contactSection: { marginBottom: Spacing.md },
  contactSubLabel: { fontSize: 13, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[500], marginBottom: Spacing.xs + 2 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs + 2 },
  contactName: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], marginRight: Spacing.sm },
  contactPhone: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[600], marginLeft: 4 },
  instructionsBox: {
    backgroundColor: Colors.neutral[50], borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.xs,
  },
  instructionsLabel: { fontSize: 13, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[500], marginBottom: 4 },
  instructionsText: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[700] },
  liveHeader: { flexDirection: 'row', alignItems: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs + 2 },
  locationLabel: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginLeft: Spacing.sm, flex: 1 },
  locationValue: { fontSize: 14, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900] },
  liveMapPlaceholder: {
    marginTop: Spacing.md, backgroundColor: Colors.neutral[50], borderRadius: BorderRadius.md,
    borderWidth: 0, padding: Spacing.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  liveMapText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[700], marginTop: Spacing.sm },
  liveMapCoords: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400], marginTop: 2 },
  noLocationBox: { alignItems: 'center', paddingVertical: Spacing.lg },
  noLocationTitle: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[600], marginTop: Spacing.sm },
  noLocationDesc: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400], textAlign: 'center', marginTop: Spacing.xs, lineHeight: 19 },
  placeholderContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.xxl },
  placeholderIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  placeholderTitle: { fontSize: 20, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[700], marginBottom: Spacing.xs + 2 },
  placeholderDesc: { fontSize: 15, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], textAlign: 'center', lineHeight: 22 },
});
