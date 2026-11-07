import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '@/lib/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  containerStyle,
  leftIcon,
  style,
  ...props
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithIcon : null, style]}
          placeholderTextColor={Colors.neutral[400]}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyMedium,
    color: Colors.neutral[600],
    marginBottom: Spacing.xs + 2,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[50],
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.sm + 4,
    fontSize: 16,
    fontFamily: Typography.fontFamilyRegular,
    color: Colors.neutral[900],
  },
  inputWithIcon: {
    paddingLeft: Spacing.sm,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: Colors.error[500],
    backgroundColor: Colors.error[50],
  },
  iconContainer: {
    marginRight: Spacing.xs,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Typography.fontFamilyRegular,
    color: Colors.error[600],
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});
