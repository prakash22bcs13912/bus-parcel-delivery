import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  Package,
  MapPin,
  Calendar,
  ChevronRight,
  Bus,
  IndianRupee,
  Search,
  CreditCard,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { BookingWithDetails, BookingStatus } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';

type FilterTab = 'all' | 'upcoming' | 'in_transit' | 'delivered' | 'cancelled';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const UPCOMING_STATUSES: BookingStatus[] = ['booked', 'handed_over', 'waiting_for_bus'];
const TRANSIT_STATUSES: BookingStatus[] = ['in_transit', 'reached', 'out_for_collection'];

function matchesFilter(status: BookingStatus, tab: FilterTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'upcoming') return UPCOMING_STATUSES.includes(status);
  if (tab === 'in_transit') return TRANSIT_STATUSES.includes(status);
  if (tab === 'delivered') return status === 'collected';
  if (tab === 'cancelled') return status === 'cancelled';
  return true;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
};

export default function BookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const fetchBookings = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: queryError } = await supabase
      .from('bookings')
      .select(`
        *,
        routes ( id, origin_city, destination_city, departure_time ),
        buses ( bus_number, bus_type ),
        boarding_stop:route_stops!boarding_stop_id ( name, departure_time ),
        destination_stop:route_stops!destination_stop_id ( name, departure_time )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setLoading(false);
    setRefreshing(false);

    if (queryError) {
      setError('Could not load bookings. Pull to refresh.');
      return;
    }
    setBookings((data as BookingWithDetails[]) || []);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const handleTrack = (booking: BookingWithDetails) => {
    router.push({
      pathname: '/track',
      params: { code: booking.booking_code, id: booking.id },
    });
  };

  const filteredBookings = bookings.filter((b) => matchesFilter(b.status, activeTab));

  const renderBooking = ({ item }: { item: BookingWithDetails }) => {
    const route = item.routes;
    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => handleTrack(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.bookingCode}>{item.booking_code}</Text>
            <StatusBadge status={item.status} />
          </View>
          <ChevronRight size={20} color={Colors.neutral[300]} strokeWidth={2} />
        </View>

        <View style={styles.cardRoute}>
          <View style={styles.routePoint}>
            <View style={styles.dotGreen} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeCity} numberOfLines={1}>{route?.origin_city}</Text>
              <Text style={styles.routeStop} numberOfLines={1}>{item.boarding_stop?.name}</Text>
            </View>
          </View>
          <View style={styles.routeArrow}>
            <Bus size={16} color={Colors.neutral[400]} strokeWidth={2} />
          </View>
          <View style={styles.routePoint}>
            <View style={styles.dotOrange} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeCity} numberOfLines={1}>{route?.destination_city}</Text>
              <Text style={styles.routeStop} numberOfLines={1}>{item.destination_stop?.name}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.bottomItem}>
            <Calendar size={13} color={Colors.neutral[400]} strokeWidth={2} />
            <Text style={styles.bottomText}>
              {new Date(item.travel_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
          <View style={styles.bottomItem}>
            <Package size={13} color={Colors.neutral[400]} strokeWidth={2} />
            <Text style={styles.bottomText}>{item.parcel_type} · {item.weight_kg}kg</Text>
          </View>
          <View style={styles.bottomItem}>
            <IndianRupee size={13} color={Colors.primary[600]} strokeWidth={2.2} />
            <Text style={styles.bottomPrice}>{item.estimated_price}</Text>
          </View>
          {item.payment_method && (
            <View style={styles.bottomItem}>
              <CreditCard size={13} color={Colors.neutral[400]} strokeWidth={2} />
              <Text style={styles.bottomText}>
                {PAYMENT_LABELS[item.payment_method] || item.payment_method}
              </Text>
            </View>
          )}
        </View>

        {item.payment_status === 'pending' && item.payment_method !== 'cash' && (
          <View style={styles.paymentPendingBadge}>
            <Text style={styles.paymentPendingText}>Payment Pending</Text>
          </View>
        )}
        {item.payment_status === 'paid' && (
          <View style={styles.paymentPaidBadge}>
            <Text style={styles.paymentPaidText}>Paid</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerSubtitle}>
          {bookings.length > 0 ? `${bookings.length} booking${bookings.length > 1 ? 's' : ''}` : 'Your parcel history'}
        </Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = bookings.filter((b) => matchesFilter(b.status, tab.key)).length;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookings}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Package size={36} color={Colors.neutral[300]} strokeWidth={2} />
          </View>
          <Text style={styles.emptyTitle}>
            {activeTab === 'all' ? 'No bookings yet' : `No ${activeTab.replace('_', ' ')} bookings`}
          </Text>
          <Text style={styles.emptyDesc}>
            {activeTab === 'all'
              ? 'Search for a bus route and book your first parcel delivery.'
              : 'Bookings in this category will appear here.'}
          </Text>
          {activeTab === 'all' && (
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => router.replace('/(tabs)')}
            >
              <Search size={18} color={Colors.neutral[0]} strokeWidth={2} />
              <Text style={styles.bookButtonText}>Book a Parcel</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchBookings();
              }}
              colors={[Colors.primary[600]]}
              tintColor={Colors.primary[600]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: {
    backgroundColor: Colors.primary[900], paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl + 8, paddingBottom: Spacing.lg,
  },
  headerTitle: { fontSize: 24, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[0] },
  headerSubtitle: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.primary[200], marginTop: 2 },
  tabsContainer: {
    backgroundColor: Colors.neutral[0], borderBottomWidth: 0,
  },
  tabsScroll: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  tab: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[100], marginRight: Spacing.sm,
  },
  tabActive: { backgroundColor: Colors.primary[600] },
  tabText: { fontSize: 13, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[600] },
  tabTextActive: { color: Colors.neutral[0] },
  tabBadge: {
    marginLeft: Spacing.xs, backgroundColor: Colors.neutral[200],
    borderRadius: BorderRadius.full, paddingHorizontal: 6, paddingVertical: 1,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 11, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[600] },
  tabBadgeTextActive: { color: Colors.neutral[0] },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 15, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: Spacing.md },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  errorText: { fontSize: 16, fontFamily: Typography.fontFamilyRegular, color: Colors.error[600], textAlign: 'center' },
  retryButton: {
    marginTop: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md, backgroundColor: Colors.primary[600],
  },
  retryText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0] },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: 20, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[800], marginBottom: Spacing.xs + 2 },
  emptyDesc: { fontSize: 15, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], textAlign: 'center', lineHeight: 22 },
  bookButton: {
    flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md, backgroundColor: Colors.primary[600],
  },
  bookButtonText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0], marginLeft: Spacing.sm },
  listContent: { padding: Spacing.lg },
  bookingCard: {
    backgroundColor: Colors.neutral[0], borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm },
  bookingCode: { fontSize: 16, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[900] },
  cardRoute: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm,
    borderTopWidth: 0, borderBottomWidth: 0,
  },
  routePoint: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary[500], marginRight: Spacing.sm },
  dotOrange: { width: 10, height: 10, borderRadius: 2, backgroundColor: Colors.secondary[500], marginRight: Spacing.sm },
  routeInfo: { flex: 1 },
  routeCity: { fontSize: 14, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[800] },
  routeStop: { fontSize: 12, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: 1 },
  routeArrow: { paddingHorizontal: Spacing.sm },
  cardBottom: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md, flexWrap: 'wrap', gap: Spacing.md },
  bottomItem: { flexDirection: 'row', alignItems: 'center' },
  bottomText: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginLeft: 4 },
  bottomPrice: { fontSize: 14, fontFamily: Typography.fontFamilySemiBold, color: Colors.primary[600], marginLeft: 2 },
  paymentPendingBadge: {
    alignSelf: 'flex-start', marginTop: Spacing.sm,
    backgroundColor: Colors.warning[50], borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
  },
  paymentPendingText: { fontSize: 12, fontFamily: Typography.fontFamilySemiBold, color: Colors.warning[700] },
  paymentPaidBadge: {
    alignSelf: 'flex-start', marginTop: Spacing.sm,
    backgroundColor: Colors.success[50], borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
  },
  paymentPaidText: { fontSize: 12, fontFamily: Typography.fontFamilySemiBold, color: Colors.success[700] },
});
