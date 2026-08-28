import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '@/design-system';

interface AppCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export function AppCard({ children, style, padding }: AppCardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.md,
          borderColor: theme.colors.border,
          padding: padding ?? theme.spacing[4],
          ...theme.shadows.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
});
