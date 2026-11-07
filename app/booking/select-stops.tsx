import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  MapPin,
  Clock,
  ChevronRight,
  Check,
  Navigation2,
  LocateFixed,
  Loader2,
  Navigation,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useBooking } from '@/lib/booking-context';
import { RouteStop } from '@/lib/types';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';

type BoardingStopWithDistance = RouteStop & { distanceKm: number | null };

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SelectStopsScreen() {
  const {
    selectedRoute,
    boardingStop,
    destinationStop,
    setBoardingStop,
    setDestinationStop,
  } = useBooking();
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchStops = useCallback(async () => {
    if (!selectedRoute) {
      router.replace('/(tabs)');
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('route_stops')
      .select('*')
      .eq('route_id', selectedRoute.id)
      .order('stop_order', { ascending: true });

    setLoading(false);
    if (queryError) {
      setError('Could not load stops. Please try again.');
      return;
    }
    setStops((data as RouteStop[]) || []);
  }, [selectedRoute]);

  useFocusEffect(
    useCallback(() => {
      fetchStops();
    }, [fetchStops]),
  );

  const handleDetectLocation = () => {
    if (Platform.OS !== 'web' || !navigator?.geolocation) {
      setGpsError('Location detection is not available on this device.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location permission denied. You can still pick a boarding point manually.');
        } else {
          setGpsError('Could not get your location. You can still pick a boarding point manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  if (!selectedRoute) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No route selected. Go back and search again.</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.emptyButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const boardingStops: BoardingStopWithDistance[] = stops
    .filter((s) => s.is_boarding)
    .map((s) => ({
      ...s,
      distanceKm:
        userCoords && s.latitude != null && s.longitude != null
          ? haversineKm(userCoords.lat, userCoords.lng, s.latitude, s.longitude)
          : null,
    }));

  const sortedBoarding = [...boardingStops].sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    return a.stop_order - b.stop_order;
  });

  const nearestStop = sortedBoarding[0];
  const NEAR_THRESHOLD_KM = 5;
  const nearbyStops = sortedBoarding.filter((s) => s.distanceKm != null && s.distanceKm <= NEAR_THRESHOLD_KM);
  const otherStops = sortedBoarding.filter((s) => s.distanceKm == null || s.distanceKm > NEAR_THRESHOLD_KM);

  const unloadingStops = stops.filter((s) => s.is_unloading);

  const canContinue = boardingStop && destinationStop;

  const handleContinue = () => {
    if (!canContinue) return;
    router.push('/booking/parcel-details');
  };

  const renderBoardingStop = (stop: BoardingStopWithDistance, isNearest: boolean) => {
    const isSelected = boardingStop?.id === stop.id;
    const isFirst = stop.stop_order === 1;
    return (
      <TouchableOpacity
        key={stop.id}
        style={[styles.stopCard, isSelected && styles.stopCardSelected]}
        onPress={() => setBoardingStop(stop)}
        activeOpacity={0.7}
      >
        <View style={[styles.stopNumberContainer, isNearest && styles.stopNumberNearest]}>
          {isNearest ? (
            <Navigation size={16} color={Colors.primary[600]} strokeWidth={2.2} />
          ) : (
            <Text style={[styles.stopNumber, isSelected && styles.stopNumberSelected]}>
              {stop.stop_order}
            </Text>
          )}
        </View>
        <View style={styles.stopInfo}>
          <View style={styles.stopNameRow}>
            <Text style={styles.stopName}>{stop.name}</Text>
            {isFirst && (
              <View style={styles.startingBadge}>
                <Text style={styles.startingBadgeText}>Starting Point</Text>
              </View>
            )}
            {isNearest && (
              <View style={styles.nearestBadge}>
                <Text style={styles.nearestBadgeText}>Nearest</Text>
              </View>
            )}
          </View>
          {stop.departure_time && (
            <Text style={styles.stopTime}>Bus arrives at {stop.departure_time}</Text>
          )}
          {stop.distanceKm != null && (
            <Text style={styles.distanceText}>
              {stop.distanceKm < 1
                ? `${Math.round(stop.distanceKm * 1000)} m away`
                : `${stop.distanceKm.toFixed(1)} km away`}
            </Text>
          )}
        </View>
        {isSelected ? (
          <View style={styles.checkIcon}>
            <Check size={18} color={Colors.neutral[0]} strokeWidth={2.5} />
          </View>
        ) : (
          <View style={styles.unselectedCircle} />
        )}
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
          <Text style={styles.headerTitle}>Select Stops</Text>
          <Text style={styles.headerRoute}>
            {selectedRoute.origin_city} → {selectedRoute.destination_city}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
          <Text style={styles.loadingText}>Loading boarding points...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStops}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Bus info */}
          <View style={styles.busInfoCard}>
            <View style={styles.busInfoRow}>
              <View style={styles.busInfoLeft}>
                <Clock size={16} color={Colors.primary[600]} strokeWidth={2} />
                <Text style={styles.busInfoText}>
                  Departs at {selectedRoute.departure_time} from {selectedRoute.origin_city}
                </Text>
              </View>
            </View>
            <View style={styles.busInfoRow}>
              <View style={styles.busInfoLeft}>
                <Navigation2 size={16} color={Colors.secondary[500]} strokeWidth={2} />
                <Text style={styles.busInfoText}>
                  Arrives at {selectedRoute.arrival_time || 'TBD'} at {selectedRoute.destination_city}
                </Text>
              </View>
            </View>
          </View>

          {/* Boarding section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>1. Choose Your Boarding Point</Text>
                <Text style={styles.sectionSubtitle}>
                  {userCoords
                    ? `${boardingStops.length} stops · sorted by distance from you`
                    : `${boardingStops.length} boarding points on this route`}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.gpsButton, userCoords && styles.gpsButtonActive]}
                onPress={handleDetectLocation}
                disabled={gpsLoading}
                activeOpacity={0.7}
              >
                {gpsLoading ? (
                  <Loader2 size={14} color={Colors.primary[600]} strokeWidth={2} />
                ) : (
                  <LocateFixed size={14} color={userCoords ? Colors.neutral[0] : Colors.primary[600]} strokeWidth={2} />
                )}
                <Text style={[styles.gpsButtonText, userCoords && styles.gpsButtonTextActive]}>
                  {userCoords ? 'Located' : 'Find Nearest'}
                </Text>
              </TouchableOpacity>
            </View>

            {gpsError && (
              <View style={styles.gpsErrorBox}>
                <Text style={styles.gpsErrorText}>{gpsError}</Text>
              </View>
            )}

            {userCoords && nearbyStops.length > 0 && (
              <View style={styles.nearbySection}>
                <Text style={styles.nearbyLabel}>Nearest to you</Text>
                <View style={styles.stopsList}>
                  {nearbyStops.map((stop) => renderBoardingStop(stop, stop.id === nearestStop?.id))}
                </View>
              </View>
            )}

            {userCoords && otherStops.length > 0 && (
              <View style={styles.otherSection}>
                <Text style={styles.otherLabel}>All boarding points</Text>
                <View style={styles.stopsList}>
                  {otherStops.map((stop) => renderBoardingStop(stop, false))}
                </View>
              </View>
            )}

            {!userCoords && (
              <View style={styles.stopsList}>
                {sortedBoarding.map((stop) => renderBoardingStop(stop, false))}
              </View>
            )}
          </View>

          {/* Destination section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>2. Choose Your Destination</Text>
                <Text style={styles.sectionSubtitle}>
                  Select an unloading point for this bus
                </Text>
              </View>
            </View>

            <View style={styles.stopsList}>
              {unloadingStops.map((stop) => {
                const isSelected = destinationStop?.id === stop.id;
                return (
                  <TouchableOpacity
                    key={stop.id}
                    style={[styles.stopCard, isSelected && styles.stopCardSelected]}
                    onPress={() => setDestinationStop(stop)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stopNumberContainer}>
                      <MapPin
                        size={16}
                        color={isSelected ? Colors.primary[600] : Colors.secondary[500]}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopName}>{stop.name}</Text>
                      {stop.departure_time && (
                        <Text style={styles.stopTime}>Bus arrives at {stop.departure_time}</Text>
                      )}
                    </View>
                    {isSelected ? (
                      <View style={styles.checkIcon}>
                        <Check size={18} color={Colors.neutral[0]} strokeWidth={2.5} />
                      </View>
                    ) : (
                      <View style={styles.unselectedCircle} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Summary */}
          {(boardingStop || destinationStop) && (
            <View style={styles.selectionSummary}>
              <Text style={styles.summaryTitle}>Your Selection</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Boarding Point</Text>
                <Text style={styles.summaryValue}>
                  {boardingStop?.name || 'Not selected'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Destination</Text>
                <Text style={styles.summaryValue}>
                  {destinationStop?.name || 'Not selected'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Continue button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Continue to Parcel Details</Text>
          <ChevronRight size={20} color={canContinue ? Colors.neutral[0] : Colors.neutral[400]} strokeWidth={2} />
        </TouchableOpacity>
      </View>
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 15, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: Spacing.md },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  errorText: { fontSize: 16, fontFamily: Typography.fontFamilyRegular, color: Colors.error[600], textAlign: 'center' },
  retryButton: {
    marginTop: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md, backgroundColor: Colors.primary[600],
  },
  retryText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0] },
  scrollView: { flex: 1 },
  scrollViewContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 16 },
  busInfoCard: {
    backgroundColor: Colors.primary[50], borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  busInfoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs + 1 },
  busInfoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  busInfoText: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[700], marginLeft: Spacing.sm },
  section: { marginBottom: Spacing.lg },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.md },
  sectionHeaderLeft: { flex: 1, marginRight: Spacing.sm },
  sectionHeader: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: 17, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900] },
  sectionSubtitle: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: 2 },
  gpsButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary[50],
    borderWidth: 0, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2,
  },
  gpsButtonActive: { backgroundColor: Colors.primary[600] },
  gpsButtonText: { fontSize: 12, fontFamily: Typography.fontFamilySemiBold, color: Colors.primary[600], marginLeft: 4 },
  gpsButtonTextActive: { color: Colors.neutral[0] },
  gpsErrorBox: {
    backgroundColor: Colors.warning[50], borderWidth: 0,
    borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md,
  },
  gpsErrorText: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.warning[700] },
  nearbySection: { marginBottom: Spacing.lg },
  nearbyLabel: {
    fontSize: 13, fontFamily: Typography.fontFamilySemiBold, color: Colors.primary[700],
    marginBottom: Spacing.sm, marginLeft: Spacing.xs,
  },
  otherSection: { marginBottom: Spacing.md },
  otherLabel: {
    fontSize: 13, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[500],
    marginBottom: Spacing.sm, marginLeft: Spacing.xs,
  },
  stopsList: {
    backgroundColor: Colors.neutral[0], borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadow.sm,
  },
  stopCard: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100],
  },
  stopCardSelected: { backgroundColor: Colors.primary[50] },
  stopNumberContainer: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm + 2,
  },
  stopNumberNearest: { backgroundColor: Colors.primary[100] },
  stopNumber: { fontSize: 14, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[600] },
  stopNumberSelected: { color: Colors.primary[700] },
  stopInfo: { flex: 1 },
  stopNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.xs },
  stopName: { fontSize: 15, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[900] },
  startingBadge: {
    backgroundColor: Colors.secondary[100], paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2, borderRadius: BorderRadius.sm,
  },
  startingBadgeText: { fontSize: 10, fontFamily: Typography.fontFamilySemiBold, color: Colors.secondary[700] },
  nearestBadge: {
    backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2, borderRadius: BorderRadius.sm,
  },
  nearestBadgeText: { fontSize: 10, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0] },
  stopTime: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: 2 },
  distanceText: { fontSize: 12, fontFamily: Typography.fontFamilyMedium, color: Colors.primary[600], marginTop: 2 },
  checkIcon: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary[600],
    alignItems: 'center', justifyContent: 'center',
  },
  unselectedCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.neutral[300] },
  selectionSummary: {
    backgroundColor: Colors.neutral[0], borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadow.md,
  },
  summaryTitle: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], marginBottom: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs + 2 },
  summaryLabel: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500] },
  summaryValue: { fontSize: 14, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], flex: 1, textAlign: 'right' },
  footer: {
    backgroundColor: Colors.neutral[0], paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderTopWidth: 0,
  },
  continueButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.md, paddingVertical: Spacing.md,
  },
  continueButtonDisabled: { backgroundColor: Colors.neutral[200] },
  continueButtonText: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0], marginRight: Spacing.xs },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.neutral[50], paddingHorizontal: Spacing.xl },
  emptyText: { fontSize: 16, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], textAlign: 'center', marginBottom: Spacing.md },
  emptyButton: { backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md },
  emptyButtonText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0] },
});
