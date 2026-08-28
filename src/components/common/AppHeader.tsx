import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/design-system';
import { AppText } from './AppText';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}

export function AppHeader({ title, showBack = false, right, onBack }: AppHeaderProps) {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) onBack();
    else navigation.goBack();
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.inner}>
        {showBack ? (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <AppText variant="label" color={theme.colors.primary}>{'← Back'}</AppText>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        <AppText variant="h3" align="center">{title}</AppText>
        <View style={styles.right}>{right ?? <View style={styles.placeholder} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { minWidth: 60 },
  right: { minWidth: 60, alignItems: 'flex-end' },
  placeholder: { minWidth: 60 },
});
