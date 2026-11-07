import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Bus,
  MapPin,
  ChevronRight,
  IndianRupee,
  Search,
  Package,
  Clock,
  CircleCheck,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useBooking } from '@/lib/booking-context';
import { RouteWithBus } from '@/lib/types';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';

type SortOption = 'departure' | 'price';

export default function SelectBusScreen() {
  const params = useLocalSearchParams();
  const { setSelectedRoute, setFromCity, setToCity, setTravelDate } = useBooking();
  const [routes, setRoutes] = useState<RouteWithBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('departure');
  const [stopCounts, setStopCounts] = useState<Record<string, number>>({});

  const from = (params.from as string) || '';
  const to = (params.to as string) || '';
  const date = (params.date as string) || '';

  useEffect(() => {
    setFromCity(from);
    setToCity(to);
    setTravelDate(date);
  }, [from, to, date]);

  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('routes')
      .select(`
        *,
        buses (
          id,
          bus_number,
          bus_type,
          operator_id,
          capacity_kg,
          bus_operators ( name )
        )
      `)
      .ilike('origin_city', `%${from}%`)
      .ilike('destination_city', `%${to}%`)
      .eq('is_active', true)
      .order('departure_time', { ascending: true });

    setLoading(false);
    setRefreshing(false);

    if (queryError) {
      setError('Could not load buses. Please try again.');
      return;
    }
    const routeData = (data as RouteWithBus[]) || [];
    setRoutes(routeData);

    if (routeData.length > 0) {
      const routeIds = routeData.map((r) => r.id);
      const { data: stopsData } = await supabase
        .from('route_stops')
        .select('route_id')
        .in('route_id', routeIds);
      if (stopsData) {
        const counts: Record<string, number> = {};
        stopsData.forEach((s: any) => {
          counts[s.route_id] = (counts[s.route_id] || 0) + 1;
        });
        setStopCounts(counts);
      }
    }
  }, [from, to]);

  useFocusEffect(
    useCallback(() => {
      fetchRoutes();
    }, [fetchRoutes])
  );

  const handleSelectBus = (route: RouteWithBus) => {
    setSelectedRoute(route);
    router.push('/booking/select-stops');
  };

  const sortedRoutes = [...routes].sort((a, b) => {
    if (sortBy === 'price') {
      return a.base_fare - b.base_fare;
    }
    return a.departure_time.localeCompare(b.departure_time);
  });

  const renderRoute = ({ item }: { item: RouteWithBus }) => {
    const bus = item.buses;
    const operator = bus?.bus_operators;
    const stopCount = stopCounts[item.id] || 0;
    const capacity = (bus as any)?.capacity_kg || 100;
    const isAvailable = item.is_active;

    return (
      <TouchableOpacity
        style={styles.busCard}
        onPress={() => handleSelectBus(item)}
        activeOpacity={0.8}
      >
        <View style={styles.busCardHeader}>
          <View style={styles.busInfo}>
            <View style={styles.busIconContainer}>
              <Bus size={20} color={Colors.primary[600]} strokeWidth={2} />
            </View>
            <View style={styles.busInfoText}>
              <Text style={styles.operatorName}>{operator?.name || 'Operator'}</Text>
              <Text style={styles.busNumber}>{bus?.bus_number} · {bus?.bus_type}</Text>
            </View>
          </View>
          <View style={styles.priceContainer}>
            <IndianRupee size={14} color={Colors.primary[600]} strokeWidth={2.2} />
            <Text style={styles.priceText}>{item.base_fare}</Text>
            <Text style={styles.priceSuffix}>+ /kg</Text>
          </View>
        </View>

        <View style={styles.routeLine}>
          <View style={styles.routePoint}>
            <View style={styles.routeDot} />
            <View style={styles.routeContent}>
              <Text style={styles.routeCity}>{item.origin_city}</Text>
              <Text style={styles.routeTime}>Dep: {item.departure_time}</Text>
            </View>
          </View>
          <View style={styles.routeDashes} />
          <View style={styles.routePoint}>
            <View style={styles.routeSquare} />
            <View style={styles.routeContent}>
              <Text style={styles.routeCity}>{item.destination_city}</Text>
              <Text style={styles.routeTime}>
                Arr: {item.arrival_time || 'TBD'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.busCardInfoRow}>
          <View style={styles.infoPill}>
            <MapPin size={13} color={Colors.primary[600]} strokeWidth={2} />
            <Text style={styles.infoPillText}>{stopCount} stops</Text>
          </View>
          <View style={styles.infoPill}>
            <Package size={13} color={Colors.secondary[600]} strokeWidth={2} />
            <Text style={styles.infoPillText}>{capacity}kg capacity</Text>
          </View>
          <View style={[styles.infoPill, styles.infoPillGreen]}>
            <CircleCheck size={13} color={Colors.success[600]} strokeWidth={2} />
            <Text style={styles.infoPillTextGreen}>Available</Text>
          </View>
        </View>

        <View style={styles.busCardFooter}>
          <View style={styles.fareBadge}>
            <Text style={styles.fareBadgeText}>
              ₹{item.fare_per_kg}/kg · Base ₹{item.base_fare}
            </Text>
          </View>
          <View style={styles.selectRow}>
            <Text style={styles.selectText}>Select Bus</Text>
            <ChevronRight size={18} color={Colors.primary[600]} strokeWidth={2} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={22} color={Colors.neutral[0]} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Available Buses</Text>
          <Text style={styles.headerRoute}>{from} → {to}</Text>
        </View>
      </View>

      {!loading && !error && routes.length > 0 && (
        <View style={styles.sortBar}>
          <Text style={styles.sortBarCount}>{routes.length} bus{routes.length > 1 ? 'es' : ''} found</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll}>
            <TouchableOpacity
              style={[styles.sortChip, sortBy === 'departure' && styles.sortChipActive]}
              onPress={() => setSortBy('departure')}
              activeOpacity={0.7}
            >
              <Clock size={14} color={sortBy === 'departure' ? Colors.neutral[0] : Colors.neutral[500]} strokeWidth={2} />
              <Text style={[styles.sortChipText, sortBy === 'departure' && styles.sortChipTextActive]}>Departure</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortChip, sortBy === 'price' && styles.sortChipActive]}
              onPress={() => setSortBy('price')}
              activeOpacity={0.7}
            >
              <IndianRupee size={14} color={sortBy === 'price' ? Colors.neutral[0] : Colors.neutral[500]} strokeWidth={2} />
              <Text style={[styles.sortChipText, sortBy === 'price' && styles.sortChipTextActive]}>Price</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
          <Text style={styles.loadingText}>Finding buses on this route...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRoutes}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : routes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Search size={32} color={Colors.neutral[300]} strokeWidth={2} />
          </View>
          <Text style={styles.emptyTitle}>No buses available</Text>
          <Text style={styles.emptyDesc}>
            No buses currently operate between {from} and {to}. Try different cities.
          </Text>
          <TouchableOpacity style={styles.changeButton} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.changeButtonText}>Change Search</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedRoutes}
          keyExtractor={(item) => item.id}
          renderItem={renderRoute}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchRoutes();
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
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary[900],
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg + 8, paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 40, height: 40, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: { marginLeft: Spacing.md },
  headerTitle: { fontSize: 20, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[0] },
  headerRoute: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.primary[200], marginTop: 2 },
  sortBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.neutral[0], paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 0,
  },
  sortBarCount: { fontSize: 14, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[700] },
  sortScroll: { flexDirection: 'row' },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.full,
    backgroundColor: Colors.neutral[100], marginLeft: Spacing.sm,
  },
  sortChipActive: { backgroundColor: Colors.primary[600] },
  sortChipText: { fontSize: 13, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[600], marginLeft: 4 },
  sortChipTextActive: { color: Colors.neutral[0] },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  loadingText: { fontSize: 15, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: Spacing.md },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  errorText: { fontSize: 16, fontFamily: Typography.fontFamilyRegular, color: Colors.error[600], textAlign: 'center' },
  retryButton: {
    marginTop: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md, backgroundColor: Colors.primary[600],
  },
  retryText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0] },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  emptyIconContainer: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: 20, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[800], marginBottom: Spacing.xs + 2 },
  emptyDesc: { fontSize: 15, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], textAlign: 'center', lineHeight: 22 },
  changeButton: {
    marginTop: Spacing.lg, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md, backgroundColor: Colors.primary[600],
  },
  changeButtonText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0] },
  listContent: { padding: Spacing.lg },
  busCard: {
    backgroundColor: Colors.neutral[0], borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.md,
  },
  busCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  busInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  busIconContainer: {
    width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.primary[50],
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm + 2,
  },
  busInfoText: { flex: 1 },
  operatorName: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900] },
  busNumber: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: 2 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  priceText: { fontSize: 22, fontFamily: Typography.fontFamilyBold, color: Colors.primary[600] },
  priceSuffix: { fontSize: 12, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400] },
  routeLine: {
    flexDirection: 'row', paddingVertical: Spacing.sm,
    borderTopWidth: 0, borderBottomWidth: 0,
  },
  routePoint: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary[500], marginRight: Spacing.sm },
  routeSquare: { width: 10, height: 10, borderRadius: 3, backgroundColor: Colors.secondary[500], marginRight: Spacing.sm },
  routeContent: { flex: 1 },
  routeCity: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[800] },
  routeTime: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: 2 },
  routeDashes: {
    width: 24, height: 2, borderBottomWidth: 2, borderBottomColor: Colors.neutral[300],
    borderStyle: 'dashed', marginHorizontal: Spacing.xs, marginTop: 12,
  },
  busCardInfoRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    gap: Spacing.sm, marginTop: Spacing.md,
  },
  infoPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 1,
  },
  infoPillGreen: { backgroundColor: Colors.success[50] },
  infoPillText: { fontSize: 12, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[600], marginLeft: 4 },
  infoPillTextGreen: { fontSize: 12, fontFamily: Typography.fontFamilyMedium, color: Colors.success[700], marginLeft: 4 },
  busCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  fareBadge: {
    backgroundColor: Colors.primary[50], paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.full,
  },
  fareBadgeText: { fontSize: 12, fontFamily: Typography.fontFamilyMedium, color: Colors.primary[700] },
  selectRow: { flexDirection: 'row', alignItems: 'center' },
  selectText: { fontSize: 14, fontFamily: Typography.fontFamilySemiBold, color: Colors.primary[600], marginRight: Spacing.xs },
});
