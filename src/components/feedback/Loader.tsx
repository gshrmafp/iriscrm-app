import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTheme } from '@/design-system';
import { AppText } from '@/components/common/AppText';

interface LoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loader({ message, fullScreen = false }: LoaderProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message && (
        <AppText variant="bodyMd" color={theme.colors.textSecondary} style={styles.msg}>
          {message}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  fullScreen: { flex: 1 },
  msg: { marginTop: 12 },
});
