import React from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { customersApi } from '@/services/api/customers.api';

const PRIMARY = '#3B4ECC';
const CUSTOMER_TYPES = ['Individual', 'Business'] as const;

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(CUSTOMER_TYPES, { message: 'Select a type' }),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  revenue: z.string().optional(),
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

export function CustomerCreateScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', type: 'Business', contactName: '', contactPhone: '', contactEmail: '',
      addressLine1: '', city: '', state: '', pincode: '', revenue: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await customersApi.create({
        name: data.name,
        type: data.type,
        revenue: data.revenue ? Number(data.revenue) : undefined,
        contacts: data.contactName
          ? [{ name: data.contactName, phone: data.contactPhone || undefined, email: data.contactEmail || undefined }]
          : undefined,
        addresses: data.addressLine1
          ? [{ line1: data.addressLine1, city: data.city || undefined, state: data.state || undefined, pincode: data.pincode || undefined }]
          : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['customers-summary'] });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not create customer. Please try again.');
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
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.colors.surfaceAlt }]}>
              <AppText style={{ fontSize: 18, color: theme.colors.text }}>←</AppText>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <AppText style={styles.pageTitle} color={theme.colors.text}>New customer</AppText>
              <AppText style={styles.pageSub} color={theme.colors.textMuted}>Add an account to your book</AppText>
            </View>
          </View>

          <View style={styles.form}>
            <FormField label="Customer name" error={errors.name?.message}>
              <Controller control={control} name="name" render={({ field: { onChange, onBlur, value } }) => (
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

            <FormField label="Type" error={errors.type?.message}>
              <Controller control={control} name="type" render={({ field: { onChange, value } }) => (
                <View style={styles.chipRow}>
                  {CUSTOMER_TYPES.map(t => {
                    const active = value === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => onChange(t)}
                        style={[styles.chip, { backgroundColor: active ? PRIMARY : theme.colors.surfaceAlt, borderColor: active ? PRIMARY : theme.colors.border }]}
                      >
                        <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: active ? '#FFF' : theme.colors.textSecondary }}>
                          {t}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )} />
            </FormField>

            <FormField label="Annual revenue (optional)">
              <Controller control={control} name="revenue" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. 1200000"
                  placeholderTextColor={theme.colors.textMuted}
                  style={inputStyle}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              )} />
            </FormField>

            <AppText style={styles.sectionLabel} color={theme.colors.textMuted}>PRIMARY CONTACT</AppText>

            <FormField label="Contact name">
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

            <FormField label="Email" error={errors.contactEmail?.message}>
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

            <AppText style={styles.sectionLabel} color={theme.colors.textMuted}>ADDRESS (OPTIONAL)</AppText>

            <FormField label="Address line">
              <Controller control={control} name="addressLine1" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Street, area"
                  placeholderTextColor={theme.colors.textMuted}
                  style={inputStyle}
                  returnKeyType="next"
                />
              )} />
            </FormField>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <FormField label="City">
                  <Controller control={control} name="city" render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholderTextColor={theme.colors.textMuted}
                      style={inputStyle}
                      returnKeyType="next"
                    />
                  )} />
                </FormField>
              </View>
              <View style={styles.rowItem}>
                <FormField label="State">
                  <Controller control={control} name="state" render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholderTextColor={theme.colors.textMuted}
                      style={inputStyle}
                      returnKeyType="next"
                    />
                  )} />
                </FormField>
              </View>
            </View>

            <FormField label="Pincode">
              <Controller control={control} name="pincode" render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholderTextColor={theme.colors.textMuted}
                  style={inputStyle}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              )} />
            </FormField>
          </View>

          <TouchableOpacity
            onPress={() => { void handleSubmit(onSubmit)(); }}
            style={[styles.submitBtn, { backgroundColor: PRIMARY, opacity: isSubmitting ? 0.7 : 1 }]}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <AppText style={styles.submitBtnText}>{'✓  Create customer'}</AppText>
          </TouchableOpacity>

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
  sectionLabel: { fontSize: 11, fontFamily: 'Inter-SemiBold', letterSpacing: 1, marginTop: 4 },
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
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
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
