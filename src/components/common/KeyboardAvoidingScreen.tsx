import React from 'react';
import { KeyboardAvoidingView, ScrollView, Platform, StyleSheet } from 'react-native';
import { Screen, ScreenProps } from '@/components/common/Screen';

interface KeyboardAvoidingScreenProps extends ScreenProps {
  scrollable?: boolean;
  children: React.ReactNode;
}

export function KeyboardAvoidingScreen({ children, scrollable = true, ...screenProps }: KeyboardAvoidingScreenProps) {
  return (
    <Screen {...screenProps}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {scrollable ? (
          <ScrollView
            style={styles.flex}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : children}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
