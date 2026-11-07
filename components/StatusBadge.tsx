import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '@/lib/theme';
import { BookingStatus } from '@/lib/types';

const statusConfig: Record<BookingStatus, { label: string; bg: string; text: string; dot: string }> = {
  booked: { label: 'Booking Confirmed', bg: Colors.accent[50], text: Colors.accent[700], dot: Colors.accent[500] },
  handed_over: { label: 'Parcel Accepted', bg: Colors.warning[50], text: Colors.warning[700], dot: Colors.warning[500] },
  waiting_for_bus: { label: 'Waiting for Bus', bg: Colors.warning[50], text: Colors.warning[700], dot: Colors.warning[500] },
  in_transit: { label: 'In Transit', bg: Colors.secondary[50], text: Colors.secondary[700], dot: Colors.secondary[500] },
  reached: { label: 'Reached Destination', bg: Colors.success[50], text: Colors.success[700], dot: Colors.success[500] },
  out_for_collection: { label: 'Out for Collection', bg: Colors.accent[50], text: Colors.accent[700], dot: Colors.accent[500] },
  collected: { label: 'Delivered', bg: Colors.primary[50], text: Colors.primary[700], dot: Colors.primary[500] },
  cancelled: { label: 'Cancelled', bg: Colors.error[50], text: Colors.error[700], dot: Colors.error[500] },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const config = statusConfig[status] || statusConfig.booked;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  text: {
    fontSize: 12,
    fontFamily: Typography.fontFamilySemiBold,
    letterSpacing: 0.2,
  },
});
