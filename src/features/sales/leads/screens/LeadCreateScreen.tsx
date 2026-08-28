import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { leadsApi } from '@/services/api/leads.api';
import { picklistsApi } from '@/services/api/picklists.api';
import {
  checkLocationPermission,
  requestLocationPermission,
  getCurrentLocation,
  openLocationSettings,
  LocationPermissionStatus,
  LocationCoords,
} from '@/services/location';

const PRIMARY = '#3B4ECC';

// `source` is required by the backend (validated against active
// PicklistOption(LEAD_SOURCE) codes) — omitting it makes every submission
// fail with a 400. `role`/`estimatedValue` were removed: Lead has neither
// field (a contact's job title isn't stored anywhere, and a deal value only
// exists on an Opportunity, created later via qualify) — collecting them
// here just discarded the input silently.
const schema = z.object({
  contactName: z.string().min(1, 'Full name is required'),
  companyName: z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  source: z.string().min(1, 'Source is required'),
  notes: z.string().optional(),
  address: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <AppText style={styles.fieldLabel} color={theme.colors.text}>{label}</AppText>
      {children}
      {error && <AppText style={styles.fieldError}>{error}</AppText>}
    </View>
  );
}

export function LeadCreateScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [locationStatus, setLocationStatus] = useState<LocationPermissionStatus>('checking');
  const [coords, setCoords] = useState<LocationCoords | null>(null);

  const queryClient = useQueryClient();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { contactName: '', companyName: '', contactEmail: '', contactPhone: '', source: '', notes: '', address: '' },
  });

  const { data: sourceOptions } = useQuery({
    queryKey: ['picklists', 'LEAD_SOURCE'],
    queryFn: () => picklistsApi.list('LEAD_SOURCE').then(r => r.data),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    (async () => {
      const status = await checkLocationPermission();
      if (status === 'granted') {
        setLocationStatus('granted');
        try { setCoords(await getCurrentLocation(10000)); } catch { setLocationStatus('unavailable'); }
      } else if (status === 'denied') {
        const req = await requestLocationPermission();
        setLocationStatus(req);
        if (req === 'granted') {
          try { setCoords(await getCurrentLocation(10000)); } catch { setLocationStatus('unavailable'); }
        }
      } else {
        setLocationStatus(status);
      }
    })();
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      const res = await leadsApi.create({
        contactName: data.contactName,
        companyName: data.companyName || undefined,
        contactPhone: data.contactPhone || undefined,
        contactEmail: data.contactEmail || undefined,
        address: data.address || undefined,
        notes: data.notes || undefined,
        source: data.source,
        gpsLatitude: coords?.latitude,
        gpsLongitude: coords?.longitude,
      } as any);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['lead-dashboard-summary'] });
      if (res.data.duplicateWarning?.length) {
        Alert.alert('Possible duplicate', `Similar lead(s) already exist: ${res.data.duplicateWarning.join(', ')}`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        navigation.goBack();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not create lead. Please try again.');
    }
  };

  const inputStyle = [styles.input, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, borderColor: theme.colors.border }];

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.colors.surfaceAlt }]}>
              <AppText style={{ fontSize: 18, color: theme.colors.text }}>←</AppText>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <AppText style={styles.pageTitle} color={theme.colors.text}>New lead</AppText>
              <AppText style={styles.pageSub} color={theme.colors.textMuted}>Capture the next opportunity</AppText>
            </View>
          </View>

          {/* Form fields */}
          <View style={styles.form}>
            <FormField label="Full name" error={errors.contactName?.message}>
              <Controller control={control} name="contactName" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Anika Patel"
                  placeholderTextColor={theme.colors.textMuted}
                  style={inputStyle}
                  returnKeyType="next"
                />
              )} />
            </FormField>

            <FormField label="Company">
              <Controller control={control} name="companyName" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Northstar Labs"
                  placeholderTextColor={theme.colors.textMuted}
                  style={inputStyle}
                  returnKeyType="next"
                />
              )} />
            </FormField>

            <FormField label="Source" error={errors.source?.message}>
              <Controller control={control} name="source" render={({ field: { onChange, value } }) => (
                <View style={styles.chipRow}>
                  {(sourceOptions ?? []).map(option => {
                    const active = value === option.code;
                    return (
                      <TouchableOpacity
                        key={option.code}
                        onPress={() => onChange(option.code)}
                        style={[styles.sourceChip, { backgroundColor: active ? PRIMARY : theme.colors.surfaceAlt, borderColor: active ? PRIMARY : theme.colors.border }]}
                      >
                        <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: active ? '#FFF' : theme.colors.textSecondary }}>
                          {option.label}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )} />
            </FormField>

            <FormField label="Work email" error={errors.contactEmail?.message}>
              <Controller control={control} name="contactEmail" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="name@company.com"
                  placeholderTextColor={theme.colors.textMuted}
                  style={inputStyle}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              )} />
            </FormField>

            <FormField label="Phone">
              <Controller control={control} name="contactPhone" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={theme.colors.textMuted}
                  style={inputStyle}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              )} />
            </FormField>

            {/* GPS status row */}
            {locationStatus !== 'checking' && (
              <View style={[styles.gpsRow, { backgroundColor: theme.colors.surfaceAlt, borderRadius: 10 }]}>
                <AppText style={{ fontSize: 13, color: locationStatus === 'granted' && coords ? '#059669' : theme.colors.textMuted }}>
                  {locationStatus === 'granted' && coords
                    ? `📍 GPS captured`
                    : locationStatus === 'blocked'
                    ? '🔒 Location blocked'
                    : '⚠ Location unavailable — submitting without GPS'}
                </AppText>
                {locationStatus === 'blocked' && (
                  <TouchableOpacity onPress={openLocationSettings}>
                    <AppText style={{ fontSize: 12, color: PRIMARY, fontFamily: 'Inter-Medium' }}>Open Settings</AppText>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Submit button */}
          <TouchableOpacity
            onPress={() => { void handleSubmit(onSubmit)(); }}
            style={[styles.submitBtn, { backgroundColor: PRIMARY, opacity: isSubmitting ? 0.7 : 1 }]}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <AppText style={styles.submitBtnText}>{'✓  Create lead'}</AppText>
          </TouchableOpacity>

          {/* Cancel link */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelLink} activeOpacity={0.7}>
            <AppText style={styles.cancelText} color={theme.colors.textMuted}>Cancel</AppText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 26, fontFamily: 'Inter-Bold', lineHeight: 32 },
  pageSub: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  form: { gap: 18 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  input: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
  },
  fieldError: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#DC2626' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sourceChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  gpsRow: { padding: 12, gap: 4 },
  submitBtn: {
    marginTop: 28,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#FFF' },
  cancelLink: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 15, fontFamily: 'Inter-Medium' },
});
