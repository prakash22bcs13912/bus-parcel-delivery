import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  Shirt,
  Box,
  Package,
  ChevronRight,
  User as UserIcon,
  Phone,
  Scale,
  MessageSquare,
  IndianRupee,
} from 'lucide-react-native';
import { useBooking } from '@/lib/booking-context';
import { useAuth } from '@/lib/auth-context';
import { calculateFare } from '@/lib/fare';
import { Input } from '@/components/Input';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';

const PARCEL_TYPES = [
  { label: 'Document', icon: FileText },
  { label: 'Clothes', icon: Shirt },
  { label: 'Box', icon: Box },
  { label: 'Other', icon: Package },
];

export default function ParcelDetailsScreen() {
  const {
    selectedRoute,
    boardingStop,
    destinationStop,
    parcelType,
    setParcelType,
    weightKg,
    setWeightKg,
    senderName,
    setSenderName,
    senderPhone,
    setSenderPhone,
    receiverName,
    setReceiverName,
    receiverPhone,
    setReceiverPhone,
    instructions,
    setInstructions,
    setEstimatedPrice,
  } = useBooking();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const fare = calculateFare(boardingStop, destinationStop, weightKg);

  const handleContinue = () => {
    setError(null);
    if (!weightKg || parseFloat(weightKg) <= 0) {
      setError('Please enter a valid parcel weight.');
      return;
    }
    if (!senderName.trim() || !senderPhone.trim()) {
      setError('Please enter sender name and phone.');
      return;
    }
    if (!receiverName.trim() || !receiverPhone.trim()) {
      setError('Please enter receiver name and phone.');
      return;
    }
    if (senderPhone.trim().length < 10) {
      setError('Sender phone number must be at least 10 digits.');
      return;
    }
    if (receiverPhone.trim().length < 10) {
      setError('Receiver phone number must be at least 10 digits.');
      return;
    }
    if (fare.error) {
      setError(fare.error);
      return;
    }
    setEstimatedPrice(fare.total);
    router.push('/booking/payment');
  };

  if (!selectedRoute || !boardingStop || !destinationStop) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Missing booking details. Please start again.</Text>
        <TouchableOpacity style={styles.emptyButton} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.emptyButtonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={22} color={Colors.neutral[0]} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Parcel Details</Text>
          <Text style={styles.headerRoute}>
            {selectedRoute.origin_city} → {selectedRoute.destination_city}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Route summary card */}
        <View style={styles.routeSummaryCard}>
          <View style={styles.routeSummaryRow}>
            <View style={styles.routeSummaryLeft}>
              <View style={styles.dotGreen} />
              <Text style={styles.routeSummaryText}>{boardingStop.name}</Text>
            </View>
            <Text style={styles.routeSummaryTime}>{boardingStop.departure_time || ''}</Text>
          </View>
          <View style={styles.routeSummaryDashes} />
          <View style={styles.routeSummaryRow}>
            <View style={styles.routeSummaryLeft}>
              <View style={styles.dotOrange} />
              <Text style={styles.routeSummaryText}>{destinationStop.name}</Text>
            </View>
            <Text style={styles.routeSummaryTime}>{destinationStop.departure_time || ''}</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Parcel type */}
        <Text style={styles.sectionTitle}>Parcel Type</Text>
        <View style={styles.typeGrid}>
          {PARCEL_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = parcelType === type.label;
            return (
              <TouchableOpacity
                key={type.label}
                style={[styles.typeCard, isSelected && styles.typeCardSelected]}
                onPress={() => setParcelType(type.label)}
                activeOpacity={0.7}
              >
                <Icon
                  size={24}
                  color={isSelected ? Colors.primary[600] : Colors.neutral[400]}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    isSelected && styles.typeLabelSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Weight */}
        <Input
          label="Parcel Weight (kg)"
          placeholder="e.g. 2.5"
          value={weightKg}
          onChangeText={setWeightKg}
          keyboardType="decimal-pad"
          leftIcon={<Scale size={20} color={Colors.neutral[400]} strokeWidth={2} />}
        />

        {/* Sender details */}
        <View style={styles.sectionDivider}>
          <View style={styles.sectionDividerLine} />
          <Text style={styles.sectionDividerText}>Sender Details</Text>
          <View style={styles.sectionDividerLine} />
        </View>

        <Input
          label="Sender Name"
          placeholder="Full name"
          value={senderName}
          onChangeText={setSenderName}
          leftIcon={<UserIcon size={20} color={Colors.neutral[400]} strokeWidth={2} />}
        />

        <Input
          label="Sender Phone"
          placeholder="10-digit mobile number"
          value={senderPhone}
          onChangeText={setSenderPhone}
          keyboardType="phone-pad"
          leftIcon={<Phone size={20} color={Colors.neutral[400]} strokeWidth={2} />}
        />

        {/* Receiver details */}
        <View style={styles.sectionDivider}>
          <View style={styles.sectionDividerLine} />
          <Text style={styles.sectionDividerText}>Receiver Details</Text>
          <View style={styles.sectionDividerLine} />
        </View>

        <Input
          label="Receiver Name"
          placeholder="Full name"
          value={receiverName}
          onChangeText={setReceiverName}
          leftIcon={<UserIcon size={20} color={Colors.neutral[400]} strokeWidth={2} />}
        />

        <Input
          label="Receiver Phone"
          placeholder="10-digit mobile number"
          value={receiverPhone}
          onChangeText={setReceiverPhone}
          keyboardType="phone-pad"
          leftIcon={<Phone size={20} color={Colors.neutral[400]} strokeWidth={2} />}
        />

        {/* Instructions */}
        <Input
          label="Parcel Instructions (Optional)"
          placeholder="e.g. Handle with care, fragile item"
          value={instructions}
          onChangeText={setInstructions}
          multiline
          numberOfLines={2}
          leftIcon={<MessageSquare size={20} color={Colors.neutral[400]} strokeWidth={2} />}
          containerStyle={styles.instructionsInput}
        />

        {/* Price estimate */}
        {fare.error ? (
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Fare estimate</Text>
              <Text style={[styles.priceValue, { color: Colors.error[600] }]}>{fare.error}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Distance ({fare.distanceKm} km)</Text>
              <Text style={styles.priceValue}>₹{fare.distanceCharge}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Weight charge ({weightKg || '0'} kg)</Text>
              <Text style={styles.priceValue}>₹{fare.weightCharge}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.priceTotalLabel}>Estimated Total</Text>
              <View style={styles.priceTotalRow}>
                <IndianRupee size={18} color={Colors.primary[600]} strokeWidth={2.2} />
                <Text style={styles.priceTotalValue}>{fare.total}</Text>
              </View>
            </View>
            <Text style={styles.minFareNote}>Minimum fare ₹40 applies</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Review Booking</Text>
          <ChevronRight size={20} color={Colors.neutral[0]} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary[900],
    paddingHorizontal: Spacing.md, paddingTop: Spacing.lg + 8, paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: { marginLeft: Spacing.md },
  headerTitle: { fontSize: 20, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[0] },
  headerRoute: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.primary[200], marginTop: 2 },
  scrollView: { flex: 1 },
  scrollViewContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 16 },
  routeSummaryCard: {
    backgroundColor: Colors.primary[50], borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  routeSummaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 1,
  },
  routeSummaryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary[500], marginRight: Spacing.sm },
  dotOrange: { width: 10, height: 10, borderRadius: 3, backgroundColor: Colors.secondary[500], marginRight: Spacing.sm },
  routeSummaryText: { fontSize: 14, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[800], flexShrink: 1 },
  routeSummaryTime: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500] },
  routeSummaryDashes: {
    width: 2, height: 16, marginLeft: 4,
    borderLeftWidth: 2, borderLeftColor: Colors.neutral[300], borderStyle: 'dashed',
  },
  errorBox: {
    backgroundColor: Colors.error[50], borderWidth: 0,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md,
  },
  errorText: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.error[700] },
  sectionTitle: { fontSize: 17, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], marginBottom: Spacing.md },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeCard: {
    width: '48%', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderWidth: 0, borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[50],
  },
  typeCardSelected: { backgroundColor: Colors.primary[50] },
  typeLabel: { fontSize: 14, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[600], marginLeft: Spacing.sm + 2 },
  typeLabelSelected: { color: Colors.primary[700] },
  sectionDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: Colors.neutral[200] },
  sectionDividerText: { fontSize: 13, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[500], marginHorizontal: Spacing.sm },
  instructionsInput: { marginBottom: Spacing.lg },
  priceCard: {
    backgroundColor: Colors.neutral[0], borderRadius: BorderRadius.lg,
    padding: Spacing.lg, ...Shadow.md,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs + 1 },
  priceLabel: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[600] },
  priceValue: { fontSize: 14, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[800] },
  priceDivider: { height: 1, backgroundColor: Colors.neutral[200], marginVertical: Spacing.sm },
  priceTotalLabel: { fontSize: 16, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[900] },
  priceTotalRow: { flexDirection: 'row', alignItems: 'center' },
  priceTotalValue: { fontSize: 22, fontFamily: Typography.fontFamilyBold, color: Colors.primary[600] },
  minFareNote: { fontSize: 12, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400], marginTop: Spacing.xs },
  footer: { backgroundColor: Colors.neutral[0], paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 0 },
  continueButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.md, paddingVertical: Spacing.md,
  },
  continueButtonText: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0], marginRight: Spacing.xs },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.neutral[50], paddingHorizontal: Spacing.xl },
  emptyText: { fontSize: 16, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], textAlign: 'center', marginBottom: Spacing.md },
  emptyButton: { backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md },
  emptyButtonText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0] },
});
