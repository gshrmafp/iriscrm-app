import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/design-system';
import { AppText } from '@/components/common/AppText';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
}

export function AppInput({
  label,
  error,
  hint,
  containerStyle,
  rightIcon,
  leftIcon,
  ...props
}: AppInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.error
    : focused
    ? theme.colors.primary
    : theme.colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <AppText variant="labelSm" color={theme.colors.textSecondary} style={styles.label}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.inputRow,
          {
            borderColor,
            borderRadius: theme.radii.sm,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          {...props}
          placeholderTextColor={theme.colors.textMuted}
          onFocus={e => { setFocused(true); props.onFocus?.(e); }}
          onBlur={e => { setFocused(false); props.onBlur?.(e); }}
          style={[
            styles.input,
            {
              color: theme.colors.text,
              fontFamily: 'Inter-Regular',
              fontSize: 14,
            },
            leftIcon ? styles.inputWithLeft : undefined,
            rightIcon ? styles.inputWithRight : undefined,
          ]}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {error ? (
        <AppText variant="caption" color={theme.colors.error} style={styles.hint}>{error}</AppText>
      ) : hint ? (
        <AppText variant="caption" color={theme.colors.textMuted} style={styles.hint}>{hint}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
  label: { marginBottom: 6 },
  inputRow: {
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  inputWithLeft: { paddingLeft: 6 },
  inputWithRight: { paddingRight: 6 },
  iconLeft: { paddingLeft: 12 },
  iconRight: { paddingRight: 12 },
  hint: { marginTop: 4 },
});
