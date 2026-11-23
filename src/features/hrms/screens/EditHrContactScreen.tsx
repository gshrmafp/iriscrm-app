import React, { useEffect, useState } from 'react';
import {
  ScrollView, View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextStyle, KeyboardTypeOptions,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Save } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { hrmsApi, apiErrorMessage, Employee, UpdateMyEmployeeBody } from '@/services/api/hrms.api';
import { MY_EMPLOYEE_QUERY_KEY } from './MyHrProfileScreen';

type Values = Required<{ [K in keyof UpdateMyEmployeeBody]: string }>;

const FIELDS: { key: keyof Values; label: string; placeholder: string; keyboardType?: KeyboardTypeOptions; multiline?: boolean }[] = [
  { key: 'phone', label: 'Phone', placeholder: '10-digit mobile number', keyboardType: 'phone-pad' },
  { key: 'personalEmail', label: 'Personal email', placeholder: 'name@example.com', keyboardType: 'email-address' },
  { key: 'currentAddress', label: 'Current address', placeholder: 'House, street, city, PIN', multiline: true },
  { key: 'permanentAddress', label: 'Permanent address', placeholder: 'House, street, city, PIN', multiline: true },
  { key: 'emergencyContactName', label: 'Emergency contact name', placeholder: 'Full name' },
  { key: 'emergencyContactRel', label: 'Relationship', placeholder: 'e.g. Spouse, Parent' },
  { key: 'emergencyContactPhone', label: 'Emergency contact phone', placeholder: '10-digit mobile number', keyboardType: 'phone-pad' },
];

function toValues(e?: Employee): Values {
  return {
    phone: e?.phone ?? '',
    personalEmail: e?.personalEmail ?? '',
    currentAddress: e?.currentAddress ?? '',
    permanentAddress: e?.permanentAddress ?? '',
    emergencyContactName: e?.emergencyContactName ?? '',
    emergencyContactRel: e?.emergencyContactRel ?? '',
    emergencyContactPhone: e?.emergencyContactPhone ?? '',
  };
}

export function EditHrContactScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: employee } = useQuery({
    queryKey: MY_EMPLOYEE_QUERY_KEY,
    queryFn: () => hrmsApi.getMyEmployee().then(r => r.data),
  });

  const [values, setValues] = useState<Values>(() => toValues(employee));
  useEffect(() => {
    if (employee) setValues(toValues(employee));
  }, [employee]);

  const original = toValues(employee);
  const changed = (Object.keys(values) as (keyof Values)[]).filter(k => values[k].trim() !== original[k]);

  const mutation = useMutation({
    mutationFn: (body: UpdateMyEmployeeBody) => hrmsApi.updateMyEmployee(body).then(r => r.data),
    onSuccess: updated => {
      queryClient.setQueryData(MY_EMPLOYEE_QUERY_KEY, updated);
      Alert.alert('Saved', 'Your contact details were updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: err => Alert.alert('Could not save', apiErrorMessage(err, 'Failed to update details')),
  });

  const handleSave = () => {
    // Send only changed fields; a cleared field is sent as null to remove it.
    const body: UpdateMyEmployeeBody = {};
    for (const key of changed) {
      const v = values[key].trim();
      body[key] = v === '' ? null : v;
    }
    mutation.mutate(body);
  };

  const canSave = !!employee && changed.length > 0 && !mutation.isPending;

  return (
    <Screen edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7} accessibilityLabel="Back">
          <ArrowLeft size={22} color={theme.colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} color={theme.colors.text}>Contact details</AppText>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          style={[styles.saveBtn, { backgroundColor: canSave ? theme.colors.primary : theme.colors.surfaceAlt }]}
          activeOpacity={0.75}
          accessibilityLabel="Save"
        >
          {mutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Save size={18} color={canSave ? '#FFF' : theme.colors.textMuted} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {FIELDS.map(field => (
            <View key={field.key}>
              <AppText style={styles.label} color={theme.colors.textMuted}>{field.label}</AppText>
              <TextInput
                value={values[field.key]}
                onChangeText={text => setValues(prev => ({ ...prev, [field.key]: text }))}
                placeholder={field.placeholder}
                placeholderTextColor={theme.colors.textMuted}
                keyboardType={field.keyboardType}
                autoCapitalize={field.keyboardType === 'email-address' ? 'none' : 'sentences'}
                multiline={field.multiline}
                style={{
                  ...styles.input,
                  ...(field.multiline ? styles.inputMultiline : null),
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                } as TextStyle}
              />
            </View>
          ))}
          <AppText style={styles.hint} color={theme.colors.textMuted}>
            Name, designation, department and manager are managed by HR.
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Inter-SemiBold' },
  saveBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 12, marginBottom: 4, marginLeft: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 15, fontFamily: 'Inter-Regular' },
  inputMultiline: { height: 84, paddingTop: 12, textAlignVertical: 'top' },
  hint: { fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 12, marginLeft: 4 },
});
