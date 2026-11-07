import { useState } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  IndianRupee,
  Wallet,
  Smartphone,
  CreditCard,
  Building2,
  Banknote,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  XCircle,
  Loader2,
} from 'lucide-react-native';
import { useBooking } from '@/lib/booking-context';
import { useAuth } from '@/lib/auth-context';
import { calculateFare } from '@/lib/fare';
import { PaymentMethod } from '@/lib/types';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

const PAYMENT_METHODS: {
  key: PaymentMethod;
  label: string;
  description: string;
  icon: typeof Wallet;
}[] = [
  { key: 'cash', label: 'Cash at Boarding', description: 'Pay cash to bus staff', icon: Banknote },
  { key: 'upi', label: 'UPI', description: 'GPay, PhonePe, Paytm', icon: Smartphone },
  { key: 'card', label: 'Card', description: 'Debit / Credit card', icon: CreditCard },
  { key: 'netbanking', label: 'Net Banking', description: 'All major banks', icon: Building2 },
];

const RAZORPAY_METHOD_MAP: Record<string, string[]> = {
  upi: ['upi'],
  card: ['card'],
  netbanking: ['netbanking'],
};

export default function PaymentScreen() {
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
    setEstimatedPrice,
    paymentMethod,
    setPaymentMethod,
    bookingId,
    bookingCode,
    setBookingReference,
  } = useBooking();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  const fare = calculateFare(boardingStop, destinationStop, weightKg);
  const displayAmount = fare.total || estimatedPrice;

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (Platform.OS !== 'web') {
        resolve(false);
        return;
      }
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const createOrder = async (bookingId: string): Promise<{ orderId: string; keyId: string } | null> => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch(`${supabaseUrl}/functions/v1/create-razorpay-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ bookingId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create payment order');
    }

    const data = await response.json();
    return { orderId: data.orderId, keyId: data.keyId };
  };

  const verifyPayment = async (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    bookingId: string,
    amount: number,
  ): Promise<boolean> => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch(`${supabaseUrl}/functions/v1/verify-razorpay-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        bookingId,
        amount,
      }),
    });

    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.verified === true;
  };

  const openRazorpayCheckout = (
    orderId: string,
    keyId: string,
    amount: number,
    method: string[],
  ): Promise<{ paymentId: string; orderId: string; signature: string } | null> => {
    return new Promise((resolve) => {
      if (Platform.OS !== 'web' || !(window as any).Razorpay) {
        resolve(null);
        return;
      }

      const options: any = {
        key: keyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        order_id: orderId,
        name: 'Fastest Parcel',
        description: `Parcel booking · ${parcelType} · ${weightKg}kg`,
        method: { upi: method.includes('upi'), card: method.includes('card'), netbanking: method.includes('netbanking') },
        handler: (resp: any) => {
          resolve({
            paymentId: resp.razorpay_payment_id,
            orderId: resp.razorpay_order_id,
            signature: resp.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => resolve(null),
        },
        theme: { color: '#ea580c' },
      };

      if (user?.email) options.prefill = { email: user.email };
      if (user?.user_metadata?.name) options.prefill = { ...options.prefill, name: user.user_metadata.name };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => resolve(null));
      rzp.open();
    });
  };

  const handleContinue = async () => {
    if (!selectedRoute || !boardingStop || !destinationStop) {
      setError('Missing booking details. Please start again.');
      return;
    }
    if (fare.error) {
      setError(fare.error);
      return;
    }
    setEstimatedPrice(fare.total);
    setError(null);

    if (paymentMethod === 'cash') {
      router.push('/booking/summary');
      return;
    }

    setProcessing(true);
    setPaymentStatus('idle');

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setError('Payment gateway could not be loaded. Check your connection and try again, or choose Cash at Boarding.');
        setProcessing(false);
        return;
      }

      let activeBookingId = bookingId;
      let activeBookingCode = bookingCode;

      if (!activeBookingId || !activeBookingCode) {
        const generatedCode = `FST-${Date.now().toString().slice(-6)}`;
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
          setError('Booking could not be prepared for payment. Please try again.');
          setPaymentStatus('failed');
          setProcessing(false);
          return;
        }
        const newBookingId: string = created.booking_id;
        const newBookingCode: string = created.booking_code;
        activeBookingId = newBookingId;
        activeBookingCode = newBookingCode;
        setBookingReference(newBookingId, newBookingCode);
      }

      if (!activeBookingId) {
        throw new Error('Booking could not be prepared for payment');
      }
      const order = await createOrder(activeBookingId);
      if (!order) {
        setError('Online payment is not configured yet. Please choose Cash at Boarding, or ask the admin to set up Razorpay credentials.');
        setPaymentStatus('failed');
        setProcessing(false);
        return;
      }

      const methods = RAZORPAY_METHOD_MAP[paymentMethod] || ['upi', 'card', 'netbanking'];
      const result = await openRazorpayCheckout(order.orderId, order.keyId, fare.total, methods);

      if (!result) {
        setError('Payment was cancelled or failed. No charge was made. Try again or choose Cash.');
        setPaymentStatus('failed');
        setProcessing(false);
        return;
      }

      const isVerified = await verifyPayment(result.orderId, result.paymentId, result.signature, activeBookingId, fare.total);

      if (!isVerified) {
        setError('Payment verification failed on the server. If money was deducted, it will be refunded.');
        setPaymentStatus('failed');
        setProcessing(false);
        return;
      }

      setPaymentStatus('success');
      setProcessing(false);
      router.push('/booking/summary');
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again or choose Cash at Boarding.');
      setPaymentStatus('failed');
      setProcessing(false);
    }
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <ArrowLeft size={22} color={Colors.neutral[0]} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Payment Method</Text>
          <Text style={styles.headerSubtitle}>Choose how you want to pay</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={styles.errorBox}>
            <XCircle size={18} color={Colors.error[600]} strokeWidth={2} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {paymentStatus === 'success' && (
          <View style={styles.successBox}>
            <CheckCircle2 size={18} color={Colors.success[600]} strokeWidth={2} />
            <Text style={styles.successText}>Payment verified successfully!</Text>
          </View>
        )}

        {/* Fare summary */}
        <View style={styles.fareCard}>
          <Text style={styles.fareTitle}>Fare Summary</Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Distance ({fare.distanceKm} km)</Text>
            <Text style={styles.fareValue}>₹{fare.distanceCharge}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Weight charge ({weightKg || '0'} kg)</Text>
            <Text style={styles.fareValue}>₹{fare.weightCharge}</Text>
          </View>
          <View style={styles.fareDivider} />
          <View style={styles.fareTotalRow}>
            <Text style={styles.fareTotalLabel}>Total Payable</Text>
            <View style={styles.fareTotalAmountRow}>
              <IndianRupee size={20} color={Colors.primary[600]} strokeWidth={2.2} />
              <Text style={styles.fareTotalValue}>{displayAmount}</Text>
            </View>
          </View>
          <Text style={styles.minFareNote}>Minimum fare ₹40 applies</Text>
        </View>

        {/* Payment methods */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        {PAYMENT_METHODS.map((method) => {
          const Icon = method.icon;
          const isSelected = paymentMethod === method.key;
          return (
            <TouchableOpacity
              key={method.key}
              style={[styles.methodCard, isSelected && styles.methodCardSelected]}
              onPress={() => { setPaymentMethod(method.key); setError(null); setPaymentStatus('idle'); }}
              activeOpacity={0.7}
            >
              <View style={[styles.methodIcon, isSelected && styles.methodIconSelected]}>
                <Icon
                  size={22}
                  color={isSelected ? Colors.primary[600] : Colors.neutral[400]}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.methodInfo}>
                <Text
                  style={[styles.methodLabel, isSelected && styles.methodLabelSelected]}
                >
                  {method.label}
                </Text>
                <Text style={styles.methodDesc}>{method.description}</Text>
              </View>
              {isSelected ? (
                <CheckCircle2 size={22} color={Colors.primary[600]} strokeWidth={2} />
              ) : (
                <View style={styles.radioOuter} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Security note */}
        <View style={styles.securityNote}>
          <ShieldCheck size={16} color={Colors.primary[600]} strokeWidth={2} />
          <Text style={styles.securityText}>
            Payments are processed securely by Razorpay. We never store your card or UPI details.
          </Text>
        </View>

        {paymentMethod !== 'cash' && (
          <View style={styles.gatewayNote}>
            <Text style={styles.gatewayText}>
              You will be redirected to Razorpay&apos;s secure checkout to complete your payment.
              {paymentMethod === 'upi' && ' You can pay via any UPI app (GPay, PhonePe, Paytm, etc.).'}
              {paymentMethod === 'card' && ' Debit and credit cards from all major networks are supported.'}
              {paymentMethod === 'netbanking' && ' Choose from all major Indian banks.'}
            </Text>
            <Text style={styles.gatewaySubText}>
              If online payment is unavailable, choose Cash at Boarding instead.
            </Text>
          </View>
        )}

        {paymentMethod === 'cash' && (
          <View style={styles.cashNote}>
            <Banknote size={16} color={Colors.warning[700]} strokeWidth={2} />
            <Text style={styles.cashNoteText}>
              Pay ₹{displayAmount} in cash to the bus staff at the boarding point.
              Your booking will be created with payment status &quot;Pending&quot;.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, processing && styles.payButtonDisabled]}
          onPress={handleContinue}
          disabled={processing}
          activeOpacity={0.85}
        >
          {processing ? (
            <>
              <Loader2 size={20} color={Colors.neutral[0]} strokeWidth={2} />
              <Text style={styles.payButtonText}>Processing...</Text>
            </>
          ) : (
            <>
              <Text style={styles.payButtonText}>
                {paymentMethod === 'cash'
                  ? 'Continue with Cash'
                  : `Pay ₹${displayAmount} & Continue`}
              </Text>
              <ChevronRight size={20} color={Colors.neutral[0]} strokeWidth={2} />
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
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error[50],
    borderWidth: 0, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  errorText: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.error[700], marginLeft: Spacing.sm, flex: 1 },
  successBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success[50],
    borderWidth: 0, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
  },
  successText: { fontSize: 14, fontFamily: Typography.fontFamilySemiBold, color: Colors.success[700], marginLeft: Spacing.sm },
  fareCard: {
    backgroundColor: Colors.primary[50], borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.lg,
  },
  fareTitle: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.primary[800], marginBottom: Spacing.md },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs + 1 },
  fareLabel: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[600] },
  fareValue: { fontSize: 14, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[800] },
  fareDivider: { height: 1, backgroundColor: Colors.primary[200], marginVertical: Spacing.sm },
  fareTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fareTotalLabel: { fontSize: 16, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[900] },
  fareTotalAmountRow: { flexDirection: 'row', alignItems: 'center' },
  fareTotalValue: { fontSize: 24, fontFamily: Typography.fontFamilyBold, color: Colors.primary[600] },
  minFareNote: { fontSize: 12, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400], marginTop: Spacing.xs },
  sectionTitle: { fontSize: 17, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], marginBottom: Spacing.md },
  methodCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 0, ...Shadow.sm,
  },
  methodCardSelected: { backgroundColor: Colors.primary[50] },
  methodIcon: {
    width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.neutral[100],
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  methodIconSelected: { backgroundColor: Colors.neutral[0] },
  methodInfo: { flex: 1 },
  methodLabel: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[800] },
  methodLabelSelected: { color: Colors.primary[700] },
  methodDesc: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], marginTop: 2 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.neutral[300],
  },
  securityNote: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.md, borderWidth: 0, ...Shadow.xs,
  },
  securityText: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[600], marginLeft: Spacing.sm, flex: 1, lineHeight: 19 },
  gatewayNote: {
    backgroundColor: Colors.accent[50], borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.sm,
  },
  gatewayText: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.accent[700], textAlign: 'center', lineHeight: 19 },
  gatewaySubText: { fontSize: 12, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400], textAlign: 'center', marginTop: Spacing.xs },
  cashNote: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.warning[50],
    borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm,
  },
  cashNoteText: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.warning[700], marginLeft: Spacing.sm, flex: 1, lineHeight: 19 },
  footer: { backgroundColor: Colors.neutral[0], paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 0 },
  payButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary[600], borderRadius: BorderRadius.md, paddingVertical: Spacing.md,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { fontSize: 17, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0], marginRight: Spacing.xs },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.neutral[50], paddingHorizontal: Spacing.xl },
  emptyText: { fontSize: 16, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500], textAlign: 'center', marginBottom: Spacing.md },
  emptyButton: { backgroundColor: Colors.primary[600], paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md },
  emptyButtonText: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[0] },
});
