import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/design-system';
import { AppText } from './AppText';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const theme = useTheme();

  const colors = {
    primary: { bg: theme.colors.primaryLight, text: theme.colors.primary },
    success: { bg: theme.colors.successLight, text: theme.colors.success },
    warning: { bg: theme.colors.warningLight, text: theme.colors.warning },
    error: { bg: theme.colors.errorLight, text: theme.colors.error },
    default: { bg: theme.colors.surfaceAlt, text: theme.colors.textSecondary },
  }[variant];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderRadius: theme.radii.full }]}>
      <AppText variant="labelSm" color={colors.text}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingVertical: 2, paddingHorizontal: 10 },
});
