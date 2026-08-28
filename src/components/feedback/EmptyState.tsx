import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/design-system';
import { AppText } from '@/components/common/AppText';
import { AppButton } from '@/components/common/AppButton';

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ title, message, actionLabel, onAction, action }: EmptyStateProps) {
  const resolvedAction = action ?? (actionLabel && onAction ? { label: actionLabel, onPress: onAction } : undefined);
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <AppText variant="h3" color={theme.colors.textSecondary} align="center">{title}</AppText>
      {message && (
        <AppText variant="bodyMd" color={theme.colors.textMuted} align="center" style={styles.msg}>
          {message}
        </AppText>
      )}
      {resolvedAction && (
        <AppButton label={resolvedAction.label} onPress={resolvedAction.onPress} style={styles.btn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  msg: { marginTop: 8 },
  btn: { marginTop: 24 },
});
