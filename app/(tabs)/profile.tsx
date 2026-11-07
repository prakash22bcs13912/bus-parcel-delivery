import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  User as UserIcon,
  Mail,
  LogOut,
  ChevronRight,
  Info,
  Shield,
  HelpCircle,
  Package,
  Bus,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const userName = user?.user_metadata?.name || 'Customer';
  const userEmail = user?.email || '';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await signOut();
          setSigningOut(false);
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.userEmail}>{userEmail}</Text>
      </View>

      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.cardItem}>
            <View style={[styles.cardIconLeft, { backgroundColor: Colors.primary[50] }]}>
              <UserIcon size={18} color={Colors.primary[600]} strokeWidth={2} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Full Name</Text>
              <Text style={styles.cardValue}>{userName}</Text>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardItem}>
            <View style={[styles.cardIconLeft, { backgroundColor: Colors.accent[50] }]}>
              <Mail size={18} color={Colors.accent[600]} strokeWidth={2} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Email</Text>
              <Text style={styles.cardValue}>{userEmail}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => router.push('/(tabs)/bookings')}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIconLeft, { backgroundColor: Colors.primary[50] }]}>
              <Package size={18} color={Colors.primary[600]} strokeWidth={2} />
            </View>
            <Text style={styles.cardActionText}>My Bookings</Text>
            <ChevronRight size={18} color={Colors.neutral[300]} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.cardDivider} />
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => router.push('/track')}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIconLeft, { backgroundColor: Colors.secondary[50] }]}>
              <Package size={18} color={Colors.secondary[600]} strokeWidth={2} />
            </View>
            <Text style={styles.cardActionText}>Track a Parcel</Text>
            <ChevronRight size={18} color={Colors.neutral[300]} strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.cardDivider} />
          <TouchableOpacity
            style={styles.cardItem}
            onPress={() => router.push('/driver')}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIconLeft, { backgroundColor: Colors.accent[50] }]}>
              <Bus size={18} color={Colors.accent[600]} strokeWidth={2} />
            </View>
            <Text style={styles.cardActionText}>Driver Dashboard</Text>
            <ChevronRight size={18} color={Colors.neutral[300]} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* About section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.cardItem}>
            <View style={[styles.cardIconLeft, { backgroundColor: Colors.neutral[100] }]}>
              <Info size={18} color={Colors.neutral[500]} strokeWidth={2} />
            </View>
            <Text style={styles.cardActionText}>App Version</Text>
            <Text style={styles.cardStaticValue}>1.0.0</Text>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardItem}>
            <View style={[styles.cardIconLeft, { backgroundColor: Colors.neutral[100] }]}>
              <Shield size={18} color={Colors.neutral[500]} strokeWidth={2} />
            </View>
            <Text style={styles.cardActionText}>Privacy & Security</Text>
            <ChevronRight size={18} color={Colors.neutral[300]} strokeWidth={2} />
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.cardItem}>
            <View style={[styles.cardIconLeft, { backgroundColor: Colors.neutral[100] }]}>
              <HelpCircle size={18} color={Colors.neutral[500]} strokeWidth={2} />
            </View>
            <Text style={styles.cardActionText}>Help & Support</Text>
            <ChevronRight size={18} color={Colors.neutral[300]} strokeWidth={2} />
          </View>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        disabled={signingOut}
        activeOpacity={0.8}
      >
        <LogOut size={18} color={Colors.error[600]} strokeWidth={2} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>Fastest Parcel Delivery System v1.0</Text>
      <Text style={styles.footerSubtext}>Your Parcel, On Its Way</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  contentContainer: { paddingBottom: Spacing.xxl + 16 },
  profileHeader: {
    backgroundColor: Colors.primary[900], alignItems: 'center',
    paddingTop: Spacing.xl + 8, paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  avatarText: { fontSize: 36, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[0] },
  userName: { fontSize: 22, fontFamily: Typography.fontFamilyBold, color: Colors.neutral[0] },
  userEmail: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.primary[200], marginTop: Spacing.xs },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { fontSize: 14, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[500], marginBottom: Spacing.sm + 2, marginLeft: Spacing.xs, letterSpacing: 0.3 },
  card: {
    backgroundColor: Colors.neutral[0], borderRadius: BorderRadius.lg,
    overflow: 'hidden', ...Shadow.sm,
  },
  cardItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
  cardIconLeft: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  cardContent: { flex: 1 },
  cardLabel: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[500] },
  cardValue: { fontSize: 15, fontFamily: Typography.fontFamilySemiBold, color: Colors.neutral[900], marginTop: 2 },
  cardActionText: { flex: 1, fontSize: 15, fontFamily: Typography.fontFamilyMedium, color: Colors.neutral[800] },
  cardStaticValue: { fontSize: 14, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400] },
  cardDivider: { height: 1, backgroundColor: Colors.neutral[100], marginLeft: Spacing.md + 36 },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: Spacing.lg, marginTop: Spacing.xl,
    paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.error[50], borderWidth: 0,
  },
  signOutText: { fontSize: 16, fontFamily: Typography.fontFamilySemiBold, color: Colors.error[600], marginLeft: Spacing.sm },
  footerText: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400], textAlign: 'center', marginTop: Spacing.lg },
  footerSubtext: { fontSize: 13, fontFamily: Typography.fontFamilyRegular, color: Colors.neutral[400], textAlign: 'center', marginTop: 4 },
});
