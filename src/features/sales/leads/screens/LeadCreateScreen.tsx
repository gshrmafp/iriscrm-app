import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Lock, AlertTriangle, ChevronLeft, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { AppInput } from '@/components/forms/AppInput';
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
        Alert.alert(
          'Lead created',
          `Similar lead(s) already exist: ${res.data.duplicateWarning.join(', ')}`,
          [{ text: 'Done', onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert('Lead created', '', [{ text: 'Done', onPress: () => navigation.goBack() }]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not create lead. Please try again.');
    }
  };

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
              <ChevronLeft size={20} color={theme.colors.text} strokeWidth={2} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <AppText style={styles.pageTitle} color={theme.colors.text}>New lead</AppText>
              <AppText style={styles.pageSub} color={theme.colors.textMuted}>Capture the next opportunity</AppText>
            </View>
          </View>

          {/* Form fields */}
          <View style={styles.form}>
            <Controller control={control} name="contactName" render={({ field }) => (
              <AppInput
                label="Full name"
                placeholder="e.g. Anika Patel"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.contactName?.message}
                autoFocus
                returnKeyType="next"
              />
            )} />

            <Controller control={control} name="companyName" render={({ field }) => (
              <AppInput
                label="Company"
                placeholder="e.g. Northstar Labs"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                returnKeyType="next"
              />
            )} />

            {/* Source chip selector */}
            <View style={styles.fieldWrap}>
              <AppText style={styles.fieldLabel} color={theme.colors.textSecondary}>Source</AppText>
              <Controller control={control} name="source" render={({ field }) => (
                <View style={styles.chipRow}>
                  {(sourceOptions ?? []).map(option => {
                    const active = field.value === option.code;
                    return (
                      <TouchableOpacity
                        key={option.code}
                        onPress={() => field.onChange(option.code)}
                        style={[styles.sourceChip, { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt, borderColor: active ? theme.colors.primary : theme.colors.border }]}
                      >
                        <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: active ? '#FFF' : theme.colors.textSecondary }}>
                          {option.label}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )} />
              {errors.source && <AppText style={styles.fieldError}>{errors.source.message}</AppText>}
            </View>

            <Controller control={control} name="contactEmail" render={({ field }) => (
              <AppInput
                label="Work email"
                placeholder="name@company.com"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.contactEmail?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            )} />

            <Controller control={control} name="contactPhone" render={({ field }) => (
              <AppInput
                label="Phone"
                placeholder="+91 98765 43210"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            )} />

            <Controller control={control} name="address" render={({ field }) => (
              <AppInput
                label="Address"
                placeholder="Street, city"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                returnKeyType="next"
              />
            )} />

            <Controller control={control} name="notes" render={({ field }) => (
              <AppInput
                label="Notes"
                placeholder="Any relevant context…"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                multiline
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
            )} />

            {/* GPS status row */}
            {locationStatus !== 'checking' && (
              <View style={[styles.gpsRow, { backgroundColor: theme.colors.surfaceAlt, borderRadius: 10 }]}>
                {locationStatus === 'granted' && coords ? (
                  <>
                    <CheckCircle size={14} color="#059669" strokeWidth={2} />
                    <AppText style={{ fontSize: 13, color: '#059669', flex: 1 }}>GPS captured</AppText>
                  </>
                ) : locationStatus === 'blocked' ? (
                  <>
                    <Lock size={14} color={theme.colors.textMuted} strokeWidth={2} />
                    <AppText style={{ fontSize: 13, color: theme.colors.textMuted, flex: 1 }}>Location blocked</AppText>
                    <TouchableOpacity onPress={openLocationSettings}>
                      <AppText style={{ fontSize: 12, color: theme.colors.primary, fontFamily: 'Inter-Medium' }}>Open Settings</AppText>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} color={theme.colors.textMuted} strokeWidth={2} />
                    <AppText style={{ fontSize: 13, color: theme.colors.textMuted, flex: 1 }}>Location unavailable — submitting without GPS</AppText>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Submit button */}
          <TouchableOpacity
            onPress={() => { void handleSubmit(onSubmit)(); }}
            style={[styles.submitBtn, { backgroundColor: theme.colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <AppText style={styles.submitBtnText}>Create lead</AppText>
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
  form: { gap: 4 },
  fieldWrap: { gap: 6, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter-SemiBold', marginBottom: 6 },
  fieldError: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#DC2626' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sourceChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  gpsRow: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
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
