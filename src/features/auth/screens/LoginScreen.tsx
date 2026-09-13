import React, { useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/design-system';
import { AppText } from '@/components/common/AppText';
import { AppInput } from '@/components/forms/AppInput';
import { AppButton } from '@/components/common/AppButton';
import { useAppDispatch } from '@/app/store/hooks';
import { setSession, AuthUser } from '@/app/store/slices/authSlice';
import { storeTokens } from '@/services/storage/secureStorage';
import { setPreference } from '@/services/storage/preferences';
import { apiClient } from '@/services/api/client';

const LOGO = require('@/assets/images/iris_logo.png');

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormData = z.infer<typeof schema>;

export function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [apiError, setApiError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      const res = await apiClient.post('/auth/login', data);

      const d: Record<string, any> = res.data ?? {};
      const accessToken: string | undefined =
        d.accessToken ?? d.token ?? d.access_token;
      const refreshToken: string | undefined =
        d.refreshToken ?? d.refresh_token;
      const rawUser: Record<string, any> =
        d.user ?? d.account ?? d.profile ?? d;
      const user: AuthUser = {
        id:       String(rawUser.id ?? ''),
        name:     rawUser.name ?? rawUser.fullName ?? rawUser.username ?? data.email,
        email:    rawUser.email ?? data.email,
        role:     rawUser.role ?? rawUser.userRole ?? 'sales-rep',
        regionId: rawUser.regionId ?? rawUser.region_id,
      };

      if (!accessToken) {
        setApiError('Login failed — unexpected server response. Please contact support.');
        return;
      }

      await storeTokens({ accessToken, refreshToken: refreshToken ?? '' });
      await setPreference('iris-cached-user', user);
      dispatch(setSession(user));
    } catch (e: any) {
      setApiError(
        e?.response?.data?.error?.message ??
        e?.response?.data?.message ??
        'Login failed. Please check your credentials.',
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand */}
        <View style={styles.brand}>
          <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
          <AppText variant="bodyMd" color={theme.colors.textSecondary} style={styles.signInLabel}>Sign in to your account</AppText>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.lg, ...theme.shadows.md }]}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Email"
                placeholder="you@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
                containerStyle={styles.field}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppInput
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                containerStyle={styles.field}
              />
            )}
          />
          {apiError && (
            <View style={[styles.errorBox, { backgroundColor: theme.colors.errorLight, borderRadius: theme.radii.sm }]}>
              <AppText variant="bodySm" color={theme.colors.error}>{apiError}</AppText>
            </View>
          )}
          <AppButton
            label="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            fullWidth
            style={styles.submitBtn}
          />
        </View>

        <AppText variant="caption" color={theme.colors.textMuted} align="center" style={styles.footer}>
          © 2025 IRIS CRM. All rights reserved.
        </AppText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoImage: { width: 120, height: 120, borderRadius: 28 },
  signInLabel: { marginTop: 12 },
  card: { borderWidth: 1, padding: 24, marginBottom: 24 },
  field: { marginBottom: 16 },
  errorBox: { padding: 12, marginBottom: 16 },
  submitBtn: { marginTop: 4 },
  footer: { marginTop: 16 },
});
