import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import {
  MapPin,
  Navigation,
  Calendar,
  Search,
  Package,
  ChevronRight,
  Clock,
  Bus,
  TrendingUp,
  LocateFixed,
  Loader2,
  ArrowLeftRight,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { RouteWithBus } from '@/lib/types';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';

const POPULAR_CITIES = [
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Mysuru',
  'Giddalur',
  'Mumbai',
];

export default function HomeScreen() {
  const { user } = useAuth();
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [showFromList, setShowFromList] = useState(false);
  const [showToList, setShowToList] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const today = new Date();
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return {
      value: d.toISOString().split('T')[0],
      label:
        i === 0
          ? 'Today'
          : i === 1
            ? 'Tomorrow'
            : d.toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              }),
    };
  });

  const handleUseLocation = async () => {
    setLocating(true);
    setError(null);
    setLocationDenied(false);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationDenied(true);
        setError('Location permission was blocked. Allow location access and try again.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const places = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const place = places[0];
      const city = place?.city || place?.district || place?.subregion || place?.region || '';

      if (!city) {
        setError('Your location was found, but the city name could not be identified. Please select it manually.');
        return;
      }

      setFromCity(city);
      setShowFromList(false);
    } catch {
      setError('Could not get your location. Check that location services are enabled and try again.');
    } finally {
      setLocating(false);
    }
  };

  const handleSearch = async () => {
    setError(null);
    if (!fromCity.trim() || !toCity.trim()) {
      setError('Please select both pickup and destination cities.');
      return;
    }
    if (fromCity.trim().toLowerCase() === toCity.trim().toLowerCase()) {
      setError('Pickup and destination cannot be the same.');
      return;
    }
    setSearching(true);
    const { data, error: queryError } = await supabase
      .from('routes')
      .select(`
        *,
        buses (
          bus_number,
          bus_type,
          operator_id,
          bus_operators ( name )
        )
      `)
      .ilike('origin_city', `%${fromCity.trim()}%`)
      .ilike('destination_city', `%${toCity.trim()}%`)
      .eq('is_active', true)
      .order('departure_time', { ascending: true });

    setSearching(false);

    if (queryError) {
      setError(`Search error: ${queryError.message}`);
      return;
    }

    const routeCount = (data as RouteWithBus[] | null)?.length ?? 0;
    router.push({
      pathname: '/booking/select-bus',
      params: {
        from: fromCity.trim(),
        to: toCity.trim(),
        date: travelDate || dateOptions[0].value,
        count: String(routeCount),
      },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero header */}
      <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
        <View style={styles.heroContent}>
          <Text style={styles.greeting}>
            Hello{user?.user_metadata?.name ? `, ${user.user_metadata.name}` : ''}!
          </Text>
          <Text style={styles.heroTitle}>Where are you sending your parcel?</Text>
          <Text style={styles.heroSubtitle}>
            Find buses traveling your route and book your parcel in minutes.
          </Text>
        </View>
      </Animated.View>

      {/* Search card */}
      <View style={styles.searchCard}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* From */}
        <View style={styles.fieldLabelRow}>
          <Text style={styles.fieldLabel}>From (Pickup City)</Text>
          <TouchableOpacity style={styles.gpsButton} onPress={handleUseLocation} disabled={locating} activeOpacity={0.7}>
            {locating ? (
              <Loader2 size={14} color={Colors.primary[600]} strokeWidth={2} />
            ) : (
              <LocateFixed size={14} color={Colors.primary[600]} strokeWidth={2} />
            )}
            <Text style={styles.gpsButtonText}>Use My Location</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.fieldButton}
          onPress={() => {
            setShowFromList(!showFromList);
            setShowToList(false);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.fieldIconLeft}>
            <View style={styles.dotIcon} />
          </View>
          <Text
            style={[
              styles.fieldText,
              !fromCity && styles.fieldPlaceholder,
            ]}
            numberOfLines={1}
          >
            {fromCity || 'Select pickup city'}
          </Text>
          <Search size={18} color={Colors.neutral[400]} strokeWidth={2} />
        </TouchableOpacity>

        {showFromList && (
          <View style={styles.dropdown}>
            <FlatList
              data={POPULAR_CITIES.filter(
                (c) => c.toLowerCase() !== toCity.toLowerCase()
              )}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setFromCity(item);
                    setShowFromList(false);
                  }}
                  activeOpacity={0.7}
                >
                  <MapPin size={16} color={Colors.neutral[400]} strokeWidth={2} />
                  <Text style={styles.dropdownText}>{item}</Text>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Connector */}
        <View style={styles.connector}>
          <View style={styles.connectorLine} />
          <TouchableOpacity
            style={styles.swapButton}
            onPress={() => {
              setFromCity(toCity);
              setToCity(fromCity);
            }}
            activeOpacity={0.7}
          >
            <ArrowLeftRight size={16} color={Colors.primary[600]} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* To */}
        <Text style={styles.fieldLabel}>To (Destination City)</Text>
        <TouchableOpacity
          style={styles.fieldButton}
          onPress={() => {
            setShowToList(!showToList);
            setShowFromList(false);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.fieldIconLeft}>
            <View style={styles.squareIcon} />
          </View>
          <Text
            style={[
              styles.fieldText,
              !toCity && styles.fieldPlaceholder,
            ]}
            numberOfLines={1}
          >
            {toCity || 'Select destination city'}
          </Text>
          <Search size={18} color={Colors.neutral[400]} strokeWidth={2} />
        </TouchableOpacity>

        {showToList && (
          <View style={styles.dropdown}>
            <FlatList
              data={POPULAR_CITIES.filter(
                (c) => c.toLowerCase() !== fromCity.toLowerCase()
              )}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setToCity(item);
                    setShowToList(false);
                  }}
                  activeOpacity={0.7}
                >
                  <MapPin size={16} color={Colors.neutral[400]} strokeWidth={2} />
                  <Text style={styles.dropdownText}>{item}</Text>
                </TouchableOpacity>
              )}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Date */}
        <Text style={styles.fieldLabel}>Travel Date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScroll}
        >
          {dateOptions.map((d) => (
            <TouchableOpacity
              key={d.value}
              style={[
                styles.dateChip,
                travelDate === d.value && styles.dateChipActive,
              ]}
              onPress={() => setTravelDate(d.value)}
              activeOpacity={0.8}
            >
              <Calendar
                size={14}
                color={
                  travelDate === d.value
                    ? Colors.neutral[0]
                    : Colors.neutral[400]
                }
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.dateChipText,
                  travelDate === d.value && styles.dateChipTextActive,
                ]}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search button */}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={searching}
          activeOpacity={0.85}
        >
          {searching ? (
            <ActivityIndicator color={Colors.neutral[0]} size="small" />
          ) : (
            <>
              <Search size={20} color={Colors.neutral[0]} strokeWidth={2.2} />
              <Text style={styles.searchButtonText}>Search Buses</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: Colors.primary[50] }]}>
            <Bus size={20} color={Colors.primary[600]} strokeWidth={2} />
          </View>
          <Text style={styles.statNumber}>5+</Text>
          <Text style={styles.statLabel}>Bus Routes</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: Colors.secondary[50] }]}>
            <TrendingUp size={20} color={Colors.secondary[600]} strokeWidth={2} />
          </View>
          <Text style={styles.statNumber}>Fast</Text>
          <Text style={styles.statLabel}>Delivery</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, { backgroundColor: Colors.accent[50] }]}>
            <Clock size={20} color={Colors.accent[600]} strokeWidth={2} />
          </View>
          <Text style={styles.statNumber}>24/7</Text>
          <Text style={styles.statLabel}>Booking</Text>
        </View>
      </View>

      {/* How it works */}
      <View style={styles.howItWorks}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={styles.stepRow}>
          <View style={[styles.stepNumber, { backgroundColor: Colors.primary[600] }]}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Select your route</Text>
            <Text style={styles.stepDesc}>
              Enter pickup and destination cities to find buses traveling that route.
            </Text>
          </View>
        </View>
        <View style={styles.stepRow}>
          <View style={[styles.stepNumber, { backgroundColor: Colors.secondary[500] }]}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Choose boarding point</Text>
            <Text style={styles.stepDesc}>
              Pick the nearest boarding stop and your destination stop on the bus route.
            </Text>
          </View>
        </View>
        <View style={styles.stepRow}>
          <View style={[styles.stepNumber, { backgroundColor: Colors.accent[500] }]}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Enter parcel details</Text>
            <Text style={styles.stepDesc}>
              Add parcel type, weight, sender and receiver info, and get your fare.
            </Text>
          </View>
        </View>
        <View style={styles.stepRow}>
          <View style={[styles.stepNumber, { backgroundColor: Colors.success[500] }]}>
            <Text style={styles.stepNumberText}>4</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Track your parcel</Text>
            <Text style={styles.stepDesc}>
              Follow your parcel from booking to collection with real-time status.
            </Text>
          </View>
        </View>
      </View>

      {/* Quick action */}
      <TouchableOpacity
        style={styles.quickAction}
        onPress={() => router.push('/(tabs)/bookings')}
        activeOpacity={0.8}
      >
        <View style={styles.quickActionLeft}>
          <Package size={20} color={Colors.primary[600]} strokeWidth={2} />
          <Text style={styles.quickActionText}>View My Bookings</Text>
        </View>
        <ChevronRight size={20} color={Colors.neutral[400]} strokeWidth={2} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  contentContainer: {
    paddingBottom: Spacing.xxl + 16,
  },
  hero: {
    backgroundColor: Colors.primary[900],
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl + Spacing.md,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  heroContent: {},
  greeting: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.primary[200],
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.neutral[0],
    lineHeight: 34,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyRegular,
    color: Colors.primary[100],
    lineHeight: 22,
  },
  searchCard: {
    backgroundColor: Colors.neutral[0],
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  errorBox: {
    backgroundColor: Colors.error[50],
    borderWidth: 0,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyRegular,
    color: Colors.error[700],
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs + 2,
    marginTop: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.neutral[600],
    marginBottom: Spacing.xs + 2,
    marginTop: Spacing.sm,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    borderWidth: 0,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
  },
  gpsButtonText: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.primary[600],
    marginLeft: 4,
  },
  fieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.neutral[50],
  },
  fieldIconLeft: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  dotIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary[500],
    borderWidth: 2.5,
    borderColor: Colors.primary[200],
  },
  squareIcon: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: Colors.secondary[500],
    borderWidth: 2.5,
    borderColor: Colors.secondary[200],
  },
  fieldText: {
    flex: 1,
    fontSize: 16,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.neutral[900],
  },
  fieldPlaceholder: {
    color: Colors.neutral[400],
    fontFamily: Typography.fontFamilyRegular,
  },
  dropdown: {
    marginTop: Spacing.xs,
    borderWidth: 0,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[50],
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  dropdownText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyRegular,
    color: Colors.neutral[800],
    marginLeft: Spacing.sm,
  },
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xs,
    height: 32,
  },
  connectorLine: {
    position: 'absolute',
    width: 2,
    height: 28,
    backgroundColor: Colors.neutral[200],
    marginLeft: Spacing.md + 14,
  },
  swapButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.neutral[0],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    ...Shadow.sm,
  },
  dateScroll: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 0,
    backgroundColor: Colors.neutral[50],
    marginRight: Spacing.sm,
  },
  dateChipActive: {
    backgroundColor: Colors.primary[600],
  },
  dateChipText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.neutral[600],
    marginLeft: Spacing.xs + 2,
  },
  dateChipTextActive: {
    color: Colors.neutral[0],
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  searchButtonText: {
    fontSize: 17,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.neutral[0],
    marginLeft: Spacing.sm,
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm + 2,
    alignItems: 'center',
    ...Shadow.sm,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statNumber: {
    fontSize: 18,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.neutral[900],
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Typography.fontFamilyRegular,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  howItWorks: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  stepNumberText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.neutral[0],
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.neutral[800],
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyRegular,
    color: Colors.neutral[500],
    lineHeight: 20,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutral[0],
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 0,
    ...Shadow.sm,
  },
  quickActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.neutral[800],
    marginLeft: Spacing.sm + 2,
  },
});
