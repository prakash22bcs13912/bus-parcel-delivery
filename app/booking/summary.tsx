import { useState } from 'react';
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
  MapPin,
  Package,
  User as UserIcon,
  Phone,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Wallet,
} from 'lucide-react-native';
import { useBooking } from '@/lib/booking-context';
import { useAuth } from '@/lib/auth-context';
import { calculateFare } from '@/lib/fare';
import { supabase } from '@/lib/supabase';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';

function generateBookingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '0123456789';
  let code = 'FST-';
  for (let i = 0; i < 2; i++) code += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 4; i++) code += nums[Math.floor(Math.random() * nums.length)];
  return code;
}

export default function SummaryScreen() {
  const {
    selectedRoute,
    boardingStop,
    destinationStop,
    travelDate,
    parcelType,
    weightKg,
    senderName,
    senderPhone,
    receiverName,
    receiverPhone,
    instructions,
    estimatedPrice,
    paymentMethod,
    bookingId,
    bookingCode,
    setBookingReference,
    reset,
  } = useBooking();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fare = calculateFare(boardingStop, destinationStop, weightKg);
  const finalAmount = fare.total || estimatedPrice;

  const handleConfirm = async () => {
    if (!selectedRoute || !boardingStop || !destinationStop) {
      setError('Missing route information. Please start again.');
      return;
    }
    if (!user) {
      setError('Please log in to confirm your booking.');
      return;
    }
    if (fare.error) {
      setError(fare.error);
      return;
    }
    setSubmitting(true);
    setError(null);

    let createdBookingId = bookingId;
    let createdBookingCode = bookingCode;

    if (!createdBookingId || !createdBookingCode) {
      const generatedCode = generateBookingCode();
      const { data, error: createError } = await supabase.rpc('create_booking', {
        p_booking_code: generatedCode,
        p_route_id: selectedRoute.id,
        p_bus_id: selectedRoute.bus_id,
        p_boarding_stop_id: boardingStop.id,
        p_destination_stop_id: destinationStop.id,
        p_travel_date: travelDate || null,
        p_parcel_type: parcelType,
        p_weight_kg: parseFloat(weightKg),
        p_sender_name: senderName,
        p_sender_phone: senderPhone,
        p_receiver_name: receiverName,
        p_receiver_phone: receiverPhone,
        p_instructions: instructions || '',
        p_payment_method: paymentMethod,
      });
      const created = Array.isArray(data) ? data[0] : data;

      if (createError || !created?.booking_id || !created?.booking_code) {
        setSubmitting(false);
        setError('Booking could not be created. Please check your details and try again.');
        return;
      }

      const newBookingId: string = created.booking_id;
      const newBookingCode: string = created.booking_code;
      createdBookingId = newBookingId;
      createdBookingCode = newBookingCode;
      setBookingReference(newBookingId, newBookingCode);
    }

    if (!createdBookingId || !createdBookingCode) {
      setSubmitting(false);
      setError('Booking confirmation is incomplete. Please try again.');
      return;
    }

    setSubmitting(false);
    reset();
    router.replace({
      pathname: '/booking/confirmation',
      params: { code: createdBookingCode, id: createdBookingId },
    });
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

  const formattedDate = travelDate
    ? new Date(travelDate).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      })
    : 'Today';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={22} color={Colors.neutral[0]} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Review Your Booking</Text>
          <Text style={styles.headerSubtitle}>Check all details before confirming</Text>
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

        {/* Bus & route */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Bus size={18} color={Colors.primary[600]} strokeWidth={2} />
            <Text style={styles.cardTitle}>Bus & Route</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Operator</Text>
            <Text style={styles.detailValue}>{selectedRoute.buses?.bus_operators?.name || 'Operator'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bus</Text>
            <Text style={styles.detailValue}>
              {selectedRoute.buses?.bus_number} · {selectedRoute.buses?.bus_type}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Route</Text>
            <Text style={styles.detailValue}>
              {selectedRoute.origin_city} → {selectedRoute.destination_city}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Departure</Text>
            <Text style={styles.detailValue}>{selectedRoute.departure_time}</Text>
          </View>
        </View>

        {/* Stops */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={18} color={Colors.primary[600]} strokeWidth={2} />
            <Text style={styles.cardTitle}>Boarding & Destination</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.stopRow}>
            <View style={styles.stopDotGreen} />
            <View style={styles.stopInfo}>
              <Text style={styles.stopLabel}>Boarding Point</Text>
              <Text style={styles.stopName}>{boardingStop.name}</Text>
              {boardingStop.departure_time && (
                <Text style={styles.stopTime}>Bus arrives at {boardingStop.departure_time}</Text>
              )}
            </View>
          </View>
          <View style={styles.stopConnector} />
          <View style={styles.stopRow}>
            <View style={styles.stopDotOrange} />
            <View style={styles.stopInfo}>
              <Text style={styles.stopLabel}>Destination</Text>
              <Text style={styles.stopName}>{destinationStop.name}</Text>
              {destinationStop.departure_time && (
                <Text style={styles.stopTime}>Bus arrives at {destinationStop.departure_time}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Travel date */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={18} color={Colors.primary[600]} strokeWidth={2} />
            <Text style={styles.cardTitle}>Travel Date</Text>
          </View>
          <View style={styles.cardDivider} />
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        {/* Parcel info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={18} color={Colors.primary[600]} strokeWidth={2} />
            <Text style={styles.cardTitle}>Parcel Details</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{parcelType}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Weight</Text>
            <Text style={styles.detailValue}>{weightKg} kg</Text>
          </View>
          {instructions ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Instructions</Text>
              <Text style={styles.detailValue}>{instructions}</Text>
            </View>
          ) : null}
        </View>

        {/* Contact info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <UserIcon size={18} color={Colors.primary[600]} strokeWidth={2} />
            <Text style={styles.cardTitle}>Contact Information</Text>
          </View>
          <View style={styles.cardDivider} />
          <Text style={styles.contactSubLabel}>Sender</Text>
          <View style={styles.contactRow}>
            <Text style={styles.contactName}>{senderName}</Text>
            <View style={styles.contactPhoneRow}>
              <Phone size={13} color={Colors.neutral[400]} strokeWidth={2} />
              <Text style={styles.contactPhone}>{senderPhone}</Text>
            </View>
          </View>
          <Text style={styles.contactSubLabel}>Receiver</Text>
          <View style={styles.contactRow}>
            <Text style={styles.contactName}>{receiverName}</Text>
            <View style={styles.contactPhoneRow}>
              <Phone size={13} color={Colors.neutral[400]} strokeWidth={2} />
              <Text style={styles.contactPhone}>{receiverPhone}</Text>
            </View>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceCard}>
          <View style={styles.priceHeaderRow}>
            <Text style={styles.priceHeader}>Fare Summary</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Distance ({fare.distanceKm} km)</Text>
            <Text style={styles.priceValue}>₹{fare.distanceCharge}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Weight charge ({weightKg} kg)</Text>
            <Text style={styles.priceValue}>₹{fare.weightCharge}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceTotalRow}>
            <Text style={styles.priceTotalLabel}>Total Payable</Text>
            <View style={styles.priceTotalAmountRow}>
              <IndianRupee size={20} color={Colors.primary[600]} strokeWidth={2.2} />
              <Text style={styles.priceTotalValue}>{finalAmount}</Text>
            </View>
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Wallet size={18} color={Colors.primary[600]} strokeWidth={2} />
            <Text style={styles.cardTitle}>Payment Method</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Method</Text>
            <Text style={styles.detailValue}>
              {paymentMethod === 'cash' ? 'Cash at Boarding' :
               paymentMethod === 'upi' ? 'UPI' :
               paymentMethod === 'card' ? 'Card' : 'Net Banking'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[styles.detailValue, { color: paymentMethod === 'cash' ? Colors.warning[700] : Colors.success[700] }]}>
              {paymentMethod === 'cash' ? 'Pay at boarding' : 'Paid online'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.neutral[0]} size="small" />
          ) : (
            <>
              <CheckCircle2 size={20} color={Colors.neutral[0]} strokeWidth={2.2} />
              <Text style={styles.confirmButtonText}>Confirm Booking</Text>
            </>
          )}
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
  headerSubtitle: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.primary[200], marginTop: 2 },
  scrollView: { flex: 1 },
  scrollViewContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl + 16 },
  errorBox: {
    backgroundColor: Colors.error[50], borderWidth: 0,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md,
  },
  errorText: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.error[700] },
  card: {
    backgroundColor: Colors.neutral[0], borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.md, ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], marginLeft: Spacing.sm + 2 },
  cardDivider: { height: 1, backgroundColor: Colors.neutral[100], marginVertical: Spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs + 2 },
  detailLabel: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500] },
  detailValue: { fontSize: 14, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], flex: 1, textAlign: 'right' },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stopDotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary[500], marginTop: 4, marginRight: Spacing.md },
  stopDotOrange: { width: 12, height: 12, borderRadius: 3, backgroundColor: Colors.secondary[500], marginTop: 4, marginRight: Spacing.md },
  stopInfo: { flex: 1 },
  stopLabel: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500] },
  stopName: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], marginTop: 2 },
  stopTime: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: 2 },
  stopConnector: { width: 2, height: 20, marginLeft: 5, borderLeftWidth: 2, borderLeftColor: Colors.neutral[300], marginVertical: Spacing.xs },
  dateText: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[800] },
  contactSubLabel: { fontSize: 13, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[500], marginTop: Spacing.sm, marginBottom: Spacing.xs },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs },
  contactName: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900] },
  contactPhoneRow: { flexDirection: 'row', alignItems: 'center' },
  contactPhone: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[600], marginLeft: Spacing.xs },
  priceCard: {
    backgroundColor: Colors.primary[50], borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginTop: Spacing.sm,
  },
  priceHeaderRow: { marginBottom: Spacing.md },
  priceHeader: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.primary[800] },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs + 1 },
  priceLabel: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[600] },
  priceValue: { fontSize: 14, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[800] },
  priceDivider: { height: 1, backgroundColor: Colors.primary[200], marginVertical: Spacing.sm },
  priceTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceTotalLabel: { fontSize: 16, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[900] },
  priceTotalAmountRow: { flexDirection: 'row', alignItems: 'center' },
  priceTotalValue: { fontSize: 24, fontFamily: Typography.fontFamilyBold, color: Colors.primary[600] },
  footer: { backgroundColor: Colors.neutral[0], paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 0 },
  confirmButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.md, paddingVertical: Spacing.md,
  },
  confirmButtonText: { fontSize: 17, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0], marginLeft: Spacing.sm },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.neutral[50], paddingHorizontal: Spacing.xl },
  emptyText: { fontSize: 16, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], textAlign: 'center', marginBottom: Spacing.md },
  emptyButton: { backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md },
  emptyButtonText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0] },
});
