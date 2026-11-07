import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Bus,
  Play,
  Square,
  Navigation,
  Clock,
  CircleCheck,
  CircleAlert,
  Radar,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';

interface BusWithOperator {
  id: string;
  bus_number: string;
  bus_type: string;
  operator_id: string;
  bus_operators: { name: string }[];
}

interface DriverRoute {
  id: string;
  origin_city: string;
  destination_city: string;
  departure_time: string;
  arrival_time: string | null;
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const [buses, setBuses] = useState<BusWithOperator[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<DriverRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const fetchBuses = async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('buses')
      .select(`
        id,
        bus_number,
        bus_type,
        operator_id,
        bus_operators ( name )
      `)
      .order('bus_number', { ascending: true });

    setLoading(false);
    if (queryError) {
      setError('Could not load buses. Please try again.');
      return;
    }
    setBuses((data as BusWithOperator[]) || []);
  };

  const fetchRoutes = async (busId: string) => {
    const { data } = await supabase
      .from('routes')
      .select('id, origin_city, destination_city, departure_time, arrival_time')
      .eq('bus_id', busId)
      .eq('is_active', true)
      .order('departure_time', { ascending: true });
    setRoutes((data as DriverRoute[]) || []);
    setSelectedRouteId(null);
  };

  const sendLocation = async (lat: number, lng: number) => {
    if (!selectedBusId) return;
    setSendError(null);
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/update-bus-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          busId: selectedBusId,
          routeId: selectedRouteId,
          latitude: lat,
          longitude: lng,
          status: 'on_time',
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setSendError(err.error || 'Failed to send location');
        return;
      }

      setCurrentCoords({ lat, lng });
      setLastSent(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      setSendError('Network error sending location');
    }
  };

  const startTracking = () => {
    if (Platform.OS !== 'web' || !navigator?.geolocation) {
      setSendError('GPS is not available on this device.');
      return;
    }
    if (!selectedBusId) {
      setSendError('Please select a bus first.');
      return;
    }
    setTracking(true);
    setSendError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setSendError(err.code === err.PERMISSION_DENIED ? 'Location permission denied.' : 'Could not get GPS location.');
        setTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setSendError('GPS tracking error: ' + err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null && navigator?.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  };

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      void fetchBuses();
    }, 0);
    return () => {
      clearTimeout(loadTimer);
      if (watchIdRef.current !== null && navigator?.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  if (!user) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Please sign in to access the driver dashboard.</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.emptyButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={22} color={Colors.neutral[0]} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Driver Dashboard</Text>
          <Text style={styles.headerSubtitle}>Share bus GPS location</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary[600]} />
            <Text style={styles.loadingText}>Loading buses...</Text>
          </View>
        ) : buses.length === 0 ? (
          <View style={styles.emptyBox}>
            <Bus size={32} color={Colors.neutral[300]} strokeWidth={2} />
            <Text style={styles.emptyTitle}>No buses available</Text>
            <Text style={styles.emptyDesc}>Contact admin to assign a bus to your account.</Text>
          </View>
        ) : (
          <>
            {/* Bus selection */}
            <Text style={styles.sectionTitle}>Select Your Bus</Text>
            {buses.map((bus) => {
              const isSelected = selectedBusId === bus.id;
              return (
                <TouchableOpacity
                  key={bus.id}
                  style={[styles.busCard, isSelected && styles.busCardSelected]}
                  onPress={() => {
                    setSelectedBusId(bus.id);
                    fetchRoutes(bus.id);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.busIconBox}>
                    <Bus size={20} color={isSelected ? Colors.primary[600] : Colors.neutral[400]} strokeWidth={2} />
                  </View>
                  <View style={styles.busInfo}>
                    <Text style={[styles.busOperator, isSelected && styles.busOperatorSelected]}>
                      {bus.bus_operators?.[0]?.name || 'Operator'}
                    </Text>
                    <Text style={styles.busNumber}>{bus.bus_number} · {bus.bus_type}</Text>
                  </View>
                  {isSelected && <CircleCheck size={22} color={Colors.primary[600]} strokeWidth={2} />}
                </TouchableOpacity>
              );
            })}

            {/* Route selection */}
            {selectedBusId && routes.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Select Route</Text>
                {routes.map((route) => {
                  const isSelected = selectedRouteId === route.id;
                  return (
                    <TouchableOpacity
                      key={route.id}
                      style={[styles.routeCard, isSelected && styles.routeCardSelected]}
                      onPress={() => setSelectedRouteId(route.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.routeInfoCol}>
                        <Text style={styles.routeCity}>{route.origin_city} → {route.destination_city}</Text>
                        <Text style={styles.routeTime}>Dep: {route.departure_time} · Arr: {route.arrival_time || 'TBD'}</Text>
                      </View>
                      {isSelected && <CircleCheck size={20} color={Colors.primary[600]} strokeWidth={2} />}
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* Tracking controls */}
            {selectedBusId && (
              <View style={styles.trackingCard}>
                <View style={styles.trackingHeader}>
                  <Radar size={20} color={Colors.primary[600]} strokeWidth={2} />
                  <Text style={styles.trackingTitle}>GPS Tracking</Text>
                </View>

                {tracking ? (
                  <View style={styles.trackingActive}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live tracking active</Text>
                  </View>
                ) : (
                  <Text style={styles.trackingStatus}>Tracking is stopped</Text>
                )}

                {currentCoords && (
                  <View style={styles.coordsBox}>
                    <Navigation size={14} color={Colors.primary[600]} strokeWidth={2} />
                    <Text style={styles.coordsText}>
                      {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
                    </Text>
                  </View>
                )}

                {lastSent && (
                  <View style={styles.lastSentRow}>
                    <Clock size={13} color={Colors.neutral[400]} strokeWidth={2} />
                    <Text style={styles.lastSentText}>Last sent: {lastSent}</Text>
                  </View>
                )}

                {sendError && (
                  <View style={styles.sendErrorBox}>
                    <CircleAlert size={14} color={Colors.error[600]} strokeWidth={2} />
                    <Text style={styles.sendErrorText}>{sendError}</Text>
                  </View>
                )}

                <View style={styles.trackingButtons}>
                  <TouchableOpacity
                    style={[styles.startButton, tracking && styles.buttonDisabled]}
                    onPress={startTracking}
                    disabled={tracking}
                    activeOpacity={0.85}
                  >
                    <Play size={18} color={Colors.neutral[0]} strokeWidth={2.2} />
                    <Text style={styles.startButtonText}>Start Trip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stopButton, !tracking && styles.buttonDisabled]}
                    onPress={stopTracking}
                    disabled={!tracking}
                    activeOpacity={0.85}
                  >
                    <Square size={18} color={Colors.neutral[0]} strokeWidth={2.2} />
                    <Text style={styles.stopButtonText}>Stop Trip</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Info note */}
            <View style={styles.infoNote}>
              <Text style={styles.infoNoteText}>
                When you start a trip, your device GPS coordinates are sent to the backend every few seconds.
                Users tracking parcels on this bus will see the live location. Keep this page open while tracking.
              </Text>
            </View>
          </>
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
  errorBox: {
    backgroundColor: Colors.error[50], borderWidth: 0,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md,
  },
  errorText: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.error[700] },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl },
  loadingText: { fontSize: 15, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: Spacing.md },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyTitle: { fontSize: 18, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[700], marginTop: Spacing.md },
  emptyDesc: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], textAlign: 'center', marginTop: Spacing.xs, lineHeight: 20 },
  sectionTitle: { fontSize: 17, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], marginBottom: Spacing.md, marginTop: Spacing.md },
  busCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 0, ...Shadow.sm,
  },
  busCardSelected: { backgroundColor: Colors.primary[50] },
  busIconBox: {
    width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  busInfo: { flex: 1 },
  busOperator: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900] },
  busOperatorSelected: { color: Colors.primary[700] },
  busNumber: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: 2 },
  routeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.neutral[0], borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.sm, borderWidth: 0, ...Shadow.sm,
  },
  routeCardSelected: { backgroundColor: Colors.primary[50] },
  routeInfoCol: { flex: 1 },
  routeCity: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[800] },
  routeTime: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: 2 },
  trackingCard: {
    backgroundColor: Colors.neutral[0], borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginTop: Spacing.lg, ...Shadow.md,
  },
  trackingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  trackingTitle: { fontSize: 17, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], marginLeft: Spacing.sm },
  trackingActive: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success[500], marginRight: Spacing.sm },
  liveText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.success[700] },
  trackingStatus: { fontSize: 15, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginBottom: Spacing.md },
  coordsBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm,
  },
  coordsText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.primary[700], marginLeft: Spacing.sm },
  lastSentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  lastSentText: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400], marginLeft: 4 },
  sendErrorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error[50],
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sendErrorText: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.error[700], marginLeft: Spacing.xs, flex: 1 },
  trackingButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  startButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.md, paddingVertical: Spacing.md,
  },
  stopButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.error[600], borderRadius: BorderRadius.md, paddingVertical: Spacing.md,
  },
  buttonDisabled: { opacity: 0.5 },
  startButtonText: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0], marginLeft: Spacing.xs },
  stopButtonText: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0], marginLeft: Spacing.xs },
  infoNote: {
    backgroundColor: Colors.accent[50], borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.lg,
  },
  infoNoteText: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.accent[700], lineHeight: 19 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.neutral[50], paddingHorizontal: Spacing.xl },
  emptyText: { fontSize: 16, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], textAlign: 'center', marginBottom: Spacing.md },
  emptyButton: { backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md },
  emptyButtonText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0] },
});
