import React from 'react';
import { Text, TextStyle } from 'react-native';
import { useTheme } from '@/design-system';
import { typography } from '@/design-system/tokens';

type VariantKey = keyof Omit<typeof typography, 'fontFamily'>;

function interFamily(weight: string | undefined): string {
  if (weight === '700') return 'Inter-Bold';
  if (weight === '600') return 'Inter-SemiBold';
  if (weight === '500') return 'Inter-Medium';
  return 'Inter-Regular';
}

interface AppTextProps {
  variant?: VariantKey;
  color?: string;
  align?: TextStyle['textAlign'];
  children: React.ReactNode;
  numberOfLines?: number;
  style?: TextStyle;
}

export function AppText({
  variant = 'bodyMd',
  color,
  align,
  children,
  numberOfLines,
  style,
}: AppTextProps) {
  const theme = useTheme();
  const variantStyle = theme.typography[variant];

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        variantStyle,
        {
          color: color ?? theme.colors.text,
          textAlign: align,
          fontFamily: interFamily(variantStyle.fontWeight as string),
          fontWeight: undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
