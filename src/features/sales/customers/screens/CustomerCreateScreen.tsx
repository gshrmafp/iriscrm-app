import React from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { AppInput } from '@/components/forms/AppInput';
import { customersApi } from '@/services/api/customers.api';

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
      Alert.alert('Customer created', `${data.name} has been added.`, [{ text: 'Done', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not create customer. Please try again.');
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
          <View style={styles.pageHeader}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backBtn, { backgroundColor: theme.colors.surfaceAlt }]}
            >
              <ChevronLeft size={20} color={theme.colors.text} strokeWidth={2} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <AppText style={styles.pageTitle} color={theme.colors.text}>New customer</AppText>
              <AppText style={styles.pageSub} color={theme.colors.textMuted}>Add an account to your book</AppText>
            </View>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <AppInput
                  label="Customer name"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.name?.message}
                  placeholder="e.g. Northstar Labs"
                  returnKeyType="next"
                  autoFocus
                />
              )}
            />

            {/* Type chip selector */}
            <View>
              <AppText style={styles.chipLabel} color={theme.colors.textSecondary}>Type</AppText>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <View style={styles.chipRow}>
                    {CUSTOMER_TYPES.map(t => {
                      const active = field.value === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={() => field.onChange(t)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
                              borderColor: active ? theme.colors.primary : theme.colors.border,
                            },
                          ]}
                        >
                          <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium', color: active ? '#FFF' : theme.colors.textSecondary }}>
                            {t}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
              {errors.type?.message ? (
                <AppText style={styles.chipError} color={theme.colors.error}>{errors.type.message}</AppText>
              ) : null}
            </View>

            <Controller
              control={control}
              name="revenue"
              render={({ field }) => (
                <AppInput
                  label="Annual revenue (optional)"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="e.g. 1200000"
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              )}
            />

            <AppText style={styles.sectionLabel} color={theme.colors.textMuted}>PRIMARY CONTACT</AppText>

            <Controller
              control={control}
              name="contactName"
              render={({ field }) => (
                <AppInput
                  label="Contact name"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="e.g. Anika Patel"
                  returnKeyType="next"
                />
              )}
            />

            <Controller
              control={control}
              name="contactPhone"
              render={({ field }) => (
                <AppInput
                  label="Phone"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              )}
            />

            <Controller
              control={control}
              name="contactEmail"
              render={({ field }) => (
                <AppInput
                  label="Email"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.contactEmail?.message}
                  placeholder="name@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              )}
            />

            <AppText style={styles.sectionLabel} color={theme.colors.textMuted}>ADDRESS (OPTIONAL)</AppText>

            <Controller
              control={control}
              name="addressLine1"
              render={({ field }) => (
                <AppInput
                  label="Address line"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Street, area"
                  returnKeyType="next"
                />
              )}
            />

            <View style={styles.row}>
              <Controller
                control={control}
                name="city"
                render={({ field }) => (
                  <AppInput
                    label="City"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    returnKeyType="next"
                    containerStyle={styles.rowItem}
                  />
                )}
              />
              <Controller
                control={control}
                name="state"
                render={({ field }) => (
                  <AppInput
                    label="State"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    returnKeyType="next"
                    containerStyle={styles.rowItem}
                  />
                )}
              />
            </View>

            <Controller
              control={control}
              name="pincode"
              render={({ field }) => (
                <AppInput
                  label="Pincode"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              )}
            />
          </View>

          <TouchableOpacity
            onPress={() => { void handleSubmit(onSubmit)(); }}
            style={[styles.submitBtn, { backgroundColor: theme.colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <CheckCircle size={18} color="#FFF" strokeWidth={2.5} style={{ marginRight: 8 }} />
            <AppText style={styles.submitBtnText}>Create customer</AppText>
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
  form: { gap: 4 },
  chipLabel: { fontSize: 12, fontFamily: 'Inter-SemiBold', marginBottom: 6, marginTop: 12 },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter-SemiBold', letterSpacing: 1, marginTop: 8, marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  chipError: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  submitBtn: {
    marginTop: 28,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#FFF' },
  cancelLink: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 15, fontFamily: 'Inter-Medium' },
});
