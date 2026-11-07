import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle2,
  Package,
  MapPin,
  ArrowRight,
  Home,
  Search,
} from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';

export default function ConfirmationScreen() {
  const params = useLocalSearchParams();
  const bookingCode = (params.code as string) || 'FST-XXXXXX';
  const bookingId = (params.id as string) || '';
  const [scaleAnim] = useState(new Animated.Value(0));

  useState(() => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.back(1.5)),
      useNativeDriver: true,
    }).start();
  });

  return (
    <View style={styles.container}>
      {/* Success header */}
      <View style={styles.headerSection}>
        <Animated.View
          style={[
            styles.checkContainer,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <CheckCircle2 size={56} color={Colors.neutral[0]} strokeWidth={2} />
        </Animated.View>
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successSubtitle}>
          Your parcel has been booked successfully
        </Text>
      </View>

      {/* Booking code card */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your Booking ID</Text>
        <Text style={styles.codeValue}>{bookingCode}</Text>
        <Text style={styles.codeHint}>
          Save this ID to track your parcel status
        </Text>
      </View>

      {/* Next steps */}
      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>What happens next?</Text>
        <View style={styles.stepItem}>
          <View style={[styles.stepIcon, { backgroundColor: Colors.primary[50] }]}>
            <Package size={18} color={Colors.primary[600]} strokeWidth={2} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Hand over parcel to bus staff</Text>
            <Text style={styles.stepDesc}>
              Bring your parcel to the boarding point at the scheduled departure time.
            </Text>
          </View>
        </View>
        <View style={styles.stepItem}>
          <View style={[styles.stepIcon, { backgroundColor: Colors.secondary[50] }]}>
            <ArrowRight size={18} color={Colors.secondary[600]} strokeWidth={2} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Parcel travels by bus</Text>
            <Text style={styles.stepDesc}>
              Track your parcel status as it moves toward the destination.
            </Text>
          </View>
        </View>
        <View style={styles.stepItem}>
          <View style={[styles.stepIcon, { backgroundColor: Colors.success[50] }]}>
            <MapPin size={18} color={Colors.success[600]} strokeWidth={2} />
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Receiver collects the parcel</Text>
            <Text style={styles.stepDesc}>
              The receiver picks up the parcel at the destination point.
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.trackButton}
          onPress={() =>
            router.replace({
              pathname: '/track',
              params: { code: bookingCode, id: bookingId },
            })
          }
          activeOpacity={0.85}
        >
          <Search size={20} color={Colors.neutral[0]} strokeWidth={2} />
          <Text style={styles.trackButtonText}>Track This Parcel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.85}
        >
          <Home size={18} color={Colors.primary[600]} strokeWidth={2} />
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  headerSection: {
    backgroundColor: Colors.primary[900],
    paddingTop: Spacing.xxl + 16,
    paddingBottom: Spacing.xl + 8,
    alignItems: 'center',
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  checkContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: { fontSize: 24, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[0] },
  successSubtitle: { fontSize: 15, fontFamily: Typography.fontFamilyRegular, color: Colors.primary[200], marginTop: Spacing.xs },
  codeCard: {
    backgroundColor: Colors.neutral[0], marginHorizontal: Spacing.lg, marginTop: -Spacing.lg,
    borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center', ...Shadow.lg,
  },
  codeLabel: { fontSize: 14, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[500] },
  codeValue: {
    fontSize: 32, fontFamily: Typography.fontFamilyBold, color: Colors.primary[600],
    marginTop: Spacing.sm, letterSpacing: 1,
  },
  codeHint: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400], marginTop: Spacing.xs + 2 },
  stepsCard: {
    backgroundColor: Colors.neutral[0], marginHorizontal: Spacing.lg, marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadow.sm,
  },
  stepsTitle: { fontSize: 17, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], marginBottom: Spacing.md },
  stepItem: { flexDirection: 'row', marginBottom: Spacing.md },
  stepIcon: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[800], marginBottom: 2 },
  stepDesc: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], lineHeight: 19 },
  actionsContainer: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  trackButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md, marginBottom: Spacing.md,
  },
  trackButtonText: { fontSize: 17, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0], marginLeft: Spacing.sm },
  homeButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.neutral[100],
  },
  homeButtonText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.primary[600], marginLeft: Spacing.sm },
});
