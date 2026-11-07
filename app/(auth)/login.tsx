import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Link, router } from 'expo-router';
import { Mail, Lock, Package } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors, Typography, Spacing, BorderRadius, Shadow } from '@/lib/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      setError(signInError);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Package size={36} color={Colors.neutral[0]} strokeWidth={2.2} />
        </View>
        <Text style={styles.appName}>Fastest</Text>
        <Text style={styles.tagline}>Your Parcel, On Its Way</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to book and track your parcels</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Input
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<Mail size={20} color={Colors.neutral[400]} strokeWidth={2} />}
        />

        <Input
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon={<Lock size={20} color={Colors.neutral[400]} strokeWidth={2} />}
        />

        <Button title="Sign In" onPress={handleLogin} loading={loading} size="lg" style={styles.loginButton} />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don&apos;t have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: Colors.primary[900],
    paddingTop: Spacing.xxl + 16,
    paddingBottom: Spacing.xl + 8,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    alignItems: 'center',
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: 28,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.neutral[0],
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: Typography.fontFamilyRegular,
    color: Colors.primary[200],
    marginTop: Spacing.xs,
  },
  form: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontFamily: Typography.fontFamilyBold,
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyRegular,
    color: Colors.neutral[500],
    marginBottom: Spacing.xl,
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
  loginButton: {
    marginTop: Spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  footerText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilyRegular,
    color: Colors.neutral[600],
  },
  linkText: {
    fontSize: 15,
    fontFamily: Typography.fontFamilySemiBold,
    color: Colors.primary[600],
  },
});
