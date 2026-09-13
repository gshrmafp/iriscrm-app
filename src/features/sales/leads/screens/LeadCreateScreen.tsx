import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  AppState,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Lock,
  AlertTriangle,
  ChevronLeft,
  CheckCircle,
  Check,
  Calendar,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { AppInput } from '@/components/forms/AppInput';
import { leadsApi } from '@/services/api/leads.api';
import { apiClient } from '@/services/api/client';
import type { SalesStackParamList } from '@/features/sales/navigation/types';
import {
  checkLocationPermission,
  requestLocationPermission,
  getCurrentLocation,
  openLocationSettings,
  promptEnableLocationServices,
  type LocationPermissionStatus,
  type LocationCoords,
} from '@/services/location';

type Nav = NativeStackNavigationProp<SalesStackParamList>;

// --- Schemas ---

const step1Schema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  remarks: z.string().optional(),
});
type Step1Data = z.infer<typeof step1Schema>;

const step2Schema = z.object({
  contactName: z.string().min(1, 'Customer name is required'),
  contactPhone: z.string()
    .min(1, 'Phone number is required')
    .refine(val => {
      const digits = val.replace(/\D/g, '');
      return digits.length === 10;
    }, { message: 'Enter a valid 10-digit mobile number' }),
  contactEmail: z.string()
    .optional()
    .refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: 'Enter a valid email address' })
    .or(z.literal('')),
  discussionNote: z.string().max(1000, 'Max 1000 characters').optional(),
});
type Step2Data = z.infer<typeof step2Schema>;

// --- Step Indicator ---

function StepIndicator({ current, theme }: { current: number; theme: any }) {
  const steps = ['Site Visit', 'Contact', 'Qualify'];
  return (
    <View style={s.stepRow}>
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const completed = current > stepNum;
        const active = current === stepNum;
        const dotBg = completed ? '#059669' : active ? theme.colors.primary : theme.colors.surfaceAlt;
        const dotColor = completed || active ? '#FFF' : theme.colors.textMuted;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <View style={[s.stepLine, { backgroundColor: completed ? '#059669' : theme.colors.border }]} />
            )}
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View style={[s.stepDot, { backgroundColor: dotBg }]}>
                {completed ? (
                  <Check size={14} color="#FFF" strokeWidth={3} />
                ) : (
                  <AppText style={{ fontSize: 12, fontFamily: 'Inter-Bold', color: dotColor }}>{stepNum}</AppText>
                )}
              </View>
              <AppText style={{ fontSize: 11, fontFamily: active ? 'Inter-SemiBold' : 'Inter-Regular', color: active ? theme.colors.text : theme.colors.textMuted }}>
                {label}
              </AppText>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// --- Locked Step Card ---

function LockedStepCard({ title, fields, theme }: { title: string; fields: { label: string; value: string }[]; theme: any }) {
  return (
    <View style={[s.lockedCard, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
      <View style={s.lockedHeader}>
        <CheckCircle size={16} color="#059669" strokeWidth={2} />
        <AppText style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: theme.colors.text }}>{title}</AppText>
      </View>
      {fields.map(f => (
        <View key={f.label} style={s.lockedRow}>
          <AppText style={s.lockedLabel}>{f.label}</AppText>
          <AppText style={[s.lockedValue, { color: theme.colors.text }]}>{f.value}</AppText>
        </View>
      ))}
    </View>
  );
}

// --- Section Connector ---

function SectionConnector({ theme }: { theme: any }) {
  return (
    <View style={s.connectorWrap}>
      <View style={[s.connectorLine, { backgroundColor: theme.colors.border }]} />
      <View style={[s.connectorDot, { backgroundColor: theme.colors.border }]} />
    </View>
  );
}

// --- Main Screen ---

export function LeadCreateScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<SalesStackParamList, 'LeadCreate'>>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const resumeLeadId = route.params?.resumeLeadId;

  const [step, setStep] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadRefNo, setLeadRefNo] = useState<string | null>(null);
  const [step1Values, setStep1Values] = useState<Step1Data | null>(null);
  const [step2Values, setStep2Values] = useState<Step2Data | null>(null);

  // GPS
  const [locationStatus, setLocationStatus] = useState<LocationPermissionStatus>('checking');
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [visitLocation, setVisitLocation] = useState<string | null>(null);

  // Step 3 state
  const [qualPath, setQualPath] = useState<'QUALIFIED' | 'NOT_QUALIFIED' | null>(null);
  const [qualSubPath, setQualSubPath] = useState<'FUTURE_POTENTIAL' | 'REQUIREMENT_IDENTIFIED' | null>(null);
  const [dealType, setDealType] = useState<'INSTALLATION' | 'AMC' | 'MAINTENANCE' | null>(null);
  const [step3Submitting, setStep3Submitting] = useState(false);

  // Step 3 form fields (manual state since the branching is complex)
  const [notQualRemark, setNotQualRemark] = useState('');
  const [followUpDate, setFollowUpDate] = useState<Date | null>(null);
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false);
  const [followUpRemarks, setFollowUpRemarks] = useState('');
  const [quotationRef, setQuotationRef] = useState('');
  const [quotationDate, setQuotationDate] = useState<Date | null>(null);
  const [showQuotationPicker, setShowQuotationPicker] = useState(false);
  const [quotationAmount, setQuotationAmount] = useState('');

  // Resume: fetch existing lead
  const { data: resumeLead, isLoading: resumeLoading } = useQuery({
    queryKey: ['lead', resumeLeadId],
    queryFn: () => leadsApi.getOne(resumeLeadId!).then(r => r.data),
    enabled: !!resumeLeadId,
  });

  useEffect(() => {
    if (resumeLead) {
      setLeadId(resumeLead.id);
      setLeadRefNo(resumeLead.refNo);
      const cs = resumeLead.currentStep ?? 1;
      if (cs >= 1) {
        setStep1Values({ companyName: resumeLead.companyName ?? '', remarks: resumeLead.remarks ?? '' });
      }
      if (cs >= 2) {
        setStep2Values({
          contactName: resumeLead.contactName ?? '',
          contactPhone: resumeLead.contactPhone ?? '',
          contactEmail: resumeLead.contactEmail ?? '',
          discussionNote: resumeLead.discussionNote ?? '',
        });
      }
      setStep(cs + 1 > 3 ? 3 : cs + 1);
    }
  }, [resumeLead]);

  // GPS capture
  const [locationLoading, setLocationLoading] = useState(false);

  const acquireLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      let status = await checkLocationPermission();
      if (status === 'denied') {
        status = await requestLocationPermission();
      }
      setLocationStatus(status);

      if (status === 'blocked') {
        Alert.alert(
          'Location Required',
          'Location access is blocked. Please enable it in your device settings to create a lead.',
          [
            { text: 'Open Settings', onPress: () => openLocationSettings() },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        setLocationLoading(false);
        return;
      }

      if (status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Location permission is required to create a new lead. Please grant location access.',
          [{ text: 'Try Again', onPress: () => acquireLocation() }, { text: 'Cancel', style: 'cancel' }],
        );
        setLocationLoading(false);
        return;
      }

      const loc = await getCurrentLocation(15000);
      setCoords(loc);
      setLocationStatus('granted');
    } catch (err: any) {
      setLocationStatus('unavailable');
      const errCode = err?.code;
      if (errCode === 2) {
        promptEnableLocationServices();
      } else if (errCode === 1) {
        Alert.alert(
          'Location Permission Denied',
          'Please allow location access in your device settings.',
          [{ text: 'Open Settings', onPress: () => openLocationSettings() }, { text: 'Cancel', style: 'cancel' }],
        );
      } else {
        Alert.alert(
          'Location Error',
          'Could not get your location. Please make sure GPS is turned on and try again.',
          [
            { text: 'Open GPS Settings', onPress: () => promptEnableLocationServices() },
            { text: 'Retry', onPress: () => acquireLocation() },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
      }
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useEffect(() => {
    acquireLocation();
  }, [acquireLocation]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && !coords && !locationLoading) {
        acquireLocation();
      }
    });
    return () => sub.remove();
  }, [coords, locationLoading, acquireLocation]);

  // Reverse geocode via backend API
  useEffect(() => {
    if (!coords) return;
    apiClient.get('/geo/reverse-geocode', { params: { lat: coords.latitude, lng: coords.longitude } })
      .then((res: any) => {
        if (res.data?.address) setVisitLocation(res.data.address);
      })
      .catch(() => {});
  }, [coords]);

  // --- Step 1 Form ---
  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { companyName: '', remarks: '' },
  });

  const onSaveStep1 = useCallback(async (data: Step1Data) => {
    try {
      const res = await leadsApi.createStepped({
        companyName: data.companyName,
        remarks: data.remarks || undefined,
        gpsLatitude: coords?.latitude,
        gpsLongitude: coords?.longitude,
        visitLocation: visitLocation || undefined,
      });
      const lead = res.data.lead;
      setLeadId(lead.id);
      setLeadRefNo(lead.refNo);
      setStep1Values(data);
      setStep(2);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not save. Please try again.');
    }
  }, [coords, visitLocation, queryClient]);

  // --- Step 2 Form ---
  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { contactName: '', contactPhone: '', contactEmail: '', discussionNote: '' },
  });

  const onSaveStep2 = useCallback(async (data: Step2Data) => {
    if (!leadId) return;
    try {
      const res = await leadsApi.saveStep2(leadId, {
        contactName: data.contactName,
        contactPhone: data.contactPhone || undefined,
        contactEmail: data.contactEmail || undefined,
        discussionNote: data.discussionNote || undefined,
      });
      if (res.data.duplicateWarning?.length) {
        Alert.alert('Duplicate Warning', `Similar lead(s): ${res.data.duplicateWarning.join(', ')}`);
      }
      setStep2Values(data);
      setStep(3);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not save. Please try again.');
    }
  }, [leadId, queryClient]);

  // --- Step 3 Submit ---
  const onSaveStep3 = useCallback(async () => {
    if (!leadId) return;
    setStep3Submitting(true);
    try {
      let body: Parameters<typeof leadsApi.saveStep3>[1];

      if (qualPath === 'NOT_QUALIFIED') {
        if (!notQualRemark.trim()) {
          Alert.alert('Required', 'Please add a remark for cancellation.');
          setStep3Submitting(false);
          return;
        }
        body = { path: 'NOT_QUALIFIED', remark: notQualRemark.trim() };
      } else if (qualSubPath === 'FUTURE_POTENTIAL') {
        if (!followUpDate) {
          Alert.alert('Required', 'Please select a follow-up date.');
          setStep3Submitting(false);
          return;
        }
        body = { path: 'FUTURE_POTENTIAL', followUpDate: followUpDate.toISOString().split('T')[0], remarks: followUpRemarks || undefined };
      } else if (qualSubPath === 'REQUIREMENT_IDENTIFIED' && dealType) {
        if (!quotationRef.trim() || !quotationDate || !quotationAmount.trim()) {
          Alert.alert('Required', 'Please fill all quotation fields.');
          setStep3Submitting(false);
          return;
        }
        body = {
          path: 'REQUIREMENT_IDENTIFIED',
          dealType,
          quotationRef: quotationRef.trim(),
          quotationDate: quotationDate.toISOString().split('T')[0],
          quotationAmount: parseFloat(quotationAmount),
        };
      } else {
        setStep3Submitting(false);
        return;
      }

      const res = await leadsApi.saveStep3(leadId, body);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
      await queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      await queryClient.invalidateQueries({ queryKey: ['lead-dashboard-summary'] });

      if (res.data.opportunity?.id) {
        Alert.alert('Lead Qualified', 'Opportunity created successfully.', [
          { text: 'View', onPress: () => navigation.replace('OpportunityDetail', { id: res.data.opportunity!.id }) },
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } else if (body.path === 'NOT_QUALIFIED') {
        Alert.alert('Lead Cancelled', '', [{ text: 'Done', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('Follow-up Saved', '', [{ text: 'Done', onPress: () => navigation.goBack() }]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not save. Please try again.');
    } finally {
      setStep3Submitting(false);
    }
  }, [leadId, qualPath, qualSubPath, dealType, notQualRemark, followUpDate, followUpRemarks, quotationRef, quotationDate, quotationAmount, queryClient, navigation]);

  // Resume loading state
  if (resumeLeadId && resumeLoading) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 12 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={s.pageHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backBtn, { backgroundColor: theme.colors.surfaceAlt }]}>
              <ChevronLeft size={20} color={theme.colors.text} strokeWidth={2} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <AppText style={s.pageTitle} color={theme.colors.text}>
                {resumeLeadId ? 'Continue Lead' : 'New Lead'}
              </AppText>
              {leadRefNo && (
                <AppText style={s.pageSub} color={theme.colors.primary}>{leadRefNo}</AppText>
              )}
            </View>
          </View>

          {/* Step Indicator */}
          <StepIndicator current={step} theme={theme} />

          {/* Locked Step 1 */}
          {step > 1 && step1Values && (
            <>
              <LockedStepCard
                title="Site Visit"
                theme={theme}
                fields={[
                  { label: 'Company', value: step1Values.companyName },
                  ...(step1Values.remarks ? [{ label: 'Remarks', value: step1Values.remarks }] : []),
                  ...(visitLocation ? [{ label: 'Location', value: visitLocation }] : []),
                ]}
              />
              <SectionConnector theme={theme} />
            </>
          )}

          {/* Locked Step 2 */}
          {step > 2 && step2Values && (
            <>
              <LockedStepCard
                title="Contact Details"
                theme={theme}
                fields={[
                  { label: 'Name', value: step2Values.contactName },
                  ...(step2Values.contactPhone ? [{ label: 'Phone', value: step2Values.contactPhone }] : []),
                  ...(step2Values.contactEmail ? [{ label: 'Email', value: step2Values.contactEmail }] : []),
                  ...(step2Values.discussionNote ? [{ label: 'Discussion', value: step2Values.discussionNote }] : []),
                ]}
              />
              <SectionConnector theme={theme} />
            </>
          )}

          {/* === STEP 1: Site Visit === */}
          {step === 1 && (
            <View style={s.form}>
              <Controller control={step1Form.control} name="companyName" render={({ field }) => (
                <AppInput
                  label="Company Name"
                  placeholder="e.g. Northstar Labs"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={step1Form.formState.errors.companyName?.message}
                  autoFocus
                  returnKeyType="next"
                />
              )} />

              <Controller control={step1Form.control} name="remarks" render={({ field }) => (
                <AppInput
                  label="Remarks / Observation"
                  placeholder="What did you observe at the site?"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  multiline
                  style={{ minHeight: 120, textAlignVertical: 'top' }}
                />
              )} />

              {/* GPS status */}
              <View style={[s.gpsRow, { backgroundColor: theme.colors.surfaceAlt, borderRadius: 10 }]}>
                {locationLoading ? (
                  <>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <AppText style={{ fontSize: 13, color: theme.colors.textMuted, flex: 1 }}>Acquiring location…</AppText>
                  </>
                ) : locationStatus === 'granted' && coords ? (
                  <>
                    <MapPin size={16} color="#059669" strokeWidth={2} />
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontSize: 13, color: '#059669', fontFamily: 'Inter-SemiBold' }}>Location Captured</AppText>
                      {visitLocation ? (
                        <AppText style={{ fontSize: 12, color: theme.colors.text, marginTop: 4, lineHeight: 18 }} numberOfLines={3}>{visitLocation}</AppText>
                      ) : (
                        <AppText style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2, fontStyle: 'italic' }}>Fetching address…</AppText>
                      )}
                    </View>
                  </>
                ) : locationStatus === 'blocked' ? (
                  <>
                    <Lock size={14} color="#DC2626" strokeWidth={2} />
                    <AppText style={{ fontSize: 13, color: '#DC2626', flex: 1 }}>Location blocked — required</AppText>
                    <TouchableOpacity onPress={openLocationSettings}>
                      <AppText style={{ fontSize: 12, color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }}>Open Settings</AppText>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} color="#DC2626" strokeWidth={2} />
                    <AppText style={{ fontSize: 13, color: '#DC2626', flex: 1 }}>Location required</AppText>
                    <TouchableOpacity onPress={acquireLocation}>
                      <AppText style={{ fontSize: 12, color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }}>Retry</AppText>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (!coords) {
                    Alert.alert(
                      'Location Required',
                      'GPS location must be captured before saving. Please enable location and try again.',
                      locationStatus === 'blocked'
                        ? [{ text: 'Open Settings', onPress: () => openLocationSettings() }, { text: 'Cancel', style: 'cancel' }]
                        : [{ text: 'Retry', onPress: () => acquireLocation() }, { text: 'Cancel', style: 'cancel' }],
                    );
                    return;
                  }
                  void step1Form.handleSubmit(onSaveStep1)();
                }}
                style={[s.submitBtn, { backgroundColor: theme.colors.primary, opacity: (step1Form.formState.isSubmitting || locationLoading) ? 0.7 : 1 }]}
                disabled={step1Form.formState.isSubmitting || locationLoading}
                activeOpacity={0.85}
              >
                <AppText style={s.submitBtnText}>
                  {step1Form.formState.isSubmitting ? 'Saving…' : locationLoading ? 'Getting Location…' : 'Save & Continue'}
                </AppText>
              </TouchableOpacity>
            </View>
          )}

          {/* === STEP 2: Contact Details === */}
          {step === 2 && (
            <View style={s.form}>
              <Controller control={step2Form.control} name="contactName" render={({ field }) => (
                <AppInput
                  label="Customer Name"
                  placeholder="e.g. Anika Patel"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={step2Form.formState.errors.contactName?.message}
                  autoFocus
                  returnKeyType="next"
                />
              )} />

              <Controller control={step2Form.control} name="contactPhone" render={({ field }) => (
                <AppInput
                  label="Mobile Number"
                  placeholder="e.g. 9876543210"
                  value={field.value}
                  onChangeText={(text: string) => field.onChange(text.replace(/[^0-9]/g, ''))}
                  onBlur={field.onBlur}
                  error={step2Form.formState.errors.contactPhone?.message}
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="next"
                />
              )} />

              <Controller control={step2Form.control} name="contactEmail" render={({ field }) => (
                <AppInput
                  label="Email (Optional)"
                  placeholder="name@company.com"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={step2Form.formState.errors.contactEmail?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              )} />

              <Controller control={step2Form.control} name="discussionNote" render={({ field }) => (
                <AppInput
                  label="Discussion Note"
                  placeholder="Key points from the conversation…"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={step2Form.formState.errors.discussionNote?.message}
                  multiline
                  maxLength={1000}
                  style={{ minHeight: 120, textAlignVertical: 'top' }}
                />
              )} />

              <TouchableOpacity
                onPress={() => { void step2Form.handleSubmit(onSaveStep2)(); }}
                style={[s.submitBtn, { backgroundColor: theme.colors.primary, opacity: step2Form.formState.isSubmitting ? 0.7 : 1 }]}
                disabled={step2Form.formState.isSubmitting}
                activeOpacity={0.85}
              >
                <AppText style={s.submitBtnText}>
                  {step2Form.formState.isSubmitting ? 'Saving…' : 'Save & Continue'}
                </AppText>
              </TouchableOpacity>
            </View>
          )}

          {/* === STEP 3: Qualification === */}
          {step === 3 && (
            <View style={s.form}>
              {/* Top-level: Qualified / Not Qualified */}
              {!qualPath && (
                <>
                  <AppText style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: theme.colors.text, textAlign: 'center', marginBottom: 4 }}>
                    How did the visit go?
                  </AppText>
                  <AppText style={{ fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', marginBottom: 20 }}>
                    Is this lead worth pursuing?
                  </AppText>
                  <TouchableOpacity
                    onPress={() => setQualPath('QUALIFIED')}
                    style={[s.qualBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                    activeOpacity={0.8}
                  >
                    <View style={[s.qualBtnIcon, { backgroundColor: '#059669' }]}>
                      <ThumbsUp size={20} color="#FFF" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#065F46' }}>Qualified</AppText>
                      <AppText style={{ fontSize: 12, color: '#059669', marginTop: 2 }}>Lead has potential, proceed further</AppText>
                    </View>
                    <ChevronLeft size={18} color="#059669" strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setQualPath('NOT_QUALIFIED')}
                    style={[s.qualBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                    activeOpacity={0.8}
                  >
                    <View style={[s.qualBtnIcon, { backgroundColor: '#DC2626' }]}>
                      <ThumbsDown size={20} color="#FFF" strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#991B1B' }}>Not Qualified</AppText>
                      <AppText style={{ fontSize: 12, color: '#DC2626', marginTop: 2 }}>Cancel this lead</AppText>
                    </View>
                    <ChevronLeft size={18} color="#DC2626" strokeWidth={2} style={{ transform: [{ rotate: '180deg' }] }} />
                  </TouchableOpacity>
                </>
              )}

              {/* Not Qualified → Remark + Cancel */}
              {qualPath === 'NOT_QUALIFIED' && (
                <>
                  <TouchableOpacity onPress={() => setQualPath(null)} style={s.backLink}>
                    <ChevronLeft size={16} color={theme.colors.primary} />
                    <AppText style={{ fontSize: 13, color: theme.colors.primary, fontFamily: 'Inter-Medium' }}>Back</AppText>
                  </TouchableOpacity>
                  <AppInput
                    label="Reason for cancellation"
                    placeholder="Why is this lead not qualified?"
                    value={notQualRemark}
                    onChangeText={setNotQualRemark}
                    multiline
                    style={{ minHeight: 120, textAlignVertical: 'top' }}
                  />
                  <TouchableOpacity
                    onPress={onSaveStep3}
                    style={[s.submitBtn, { backgroundColor: '#DC2626', opacity: step3Submitting ? 0.7 : 1 }]}
                    disabled={step3Submitting}
                    activeOpacity={0.85}
                  >
                    <AppText style={s.submitBtnText}>{step3Submitting ? 'Saving…' : 'Cancel Lead'}</AppText>
                  </TouchableOpacity>
                </>
              )}

              {/* Qualified → sub-paths */}
              {qualPath === 'QUALIFIED' && !qualSubPath && (
                <>
                  <TouchableOpacity onPress={() => setQualPath(null)} style={s.backLink}>
                    <ChevronLeft size={16} color={theme.colors.primary} />
                    <AppText style={{ fontSize: 13, color: theme.colors.primary, fontFamily: 'Inter-Medium' }}>Back</AppText>
                  </TouchableOpacity>
                  <View style={s.optionRow}>
                    <TouchableOpacity
                      onPress={() => setQualSubPath('FUTURE_POTENTIAL')}
                      style={[s.optionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                      activeOpacity={0.8}
                    >
                      <Calendar size={28} color={theme.colors.primary} strokeWidth={1.5} />
                      <AppText style={{ fontSize: 15, fontFamily: 'Inter-SemiBold', color: theme.colors.text, marginTop: 8 }}>Future Potential</AppText>
                      <AppText style={{ fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 }}>Schedule follow-up</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setQualSubPath('REQUIREMENT_IDENTIFIED')}
                      style={[s.optionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                      activeOpacity={0.8}
                    >
                      <CheckCircle size={28} color="#059669" strokeWidth={1.5} />
                      <AppText style={{ fontSize: 15, fontFamily: 'Inter-SemiBold', color: theme.colors.text, marginTop: 8 }}>Requirement{'\n'}Identified</AppText>
                      <AppText style={{ fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 }}>Create opportunity</AppText>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Future Potential form */}
              {qualSubPath === 'FUTURE_POTENTIAL' && (
                <>
                  <TouchableOpacity onPress={() => setQualSubPath(null)} style={s.backLink}>
                    <ChevronLeft size={16} color={theme.colors.primary} />
                    <AppText style={{ fontSize: 13, color: theme.colors.primary, fontFamily: 'Inter-Medium' }}>Back</AppText>
                  </TouchableOpacity>
                  <View style={{ marginBottom: 4 }}>
                    <AppText variant="labelSm" color={theme.colors.textSecondary} style={{ marginBottom: 6 }}>Follow-up Date</AppText>
                    <TouchableOpacity
                      onPress={() => setShowFollowUpPicker(true)}
                      style={[s.dateField, { borderColor: theme.colors.border, borderRadius: theme.radii.sm, backgroundColor: theme.colors.surface }]}
                      activeOpacity={0.7}
                    >
                      <Calendar size={18} color={theme.colors.primary} strokeWidth={2} />
                      <AppText style={{ fontSize: 14, fontFamily: 'Inter-Regular' }} color={followUpDate ? theme.colors.text : theme.colors.textMuted}>
                        {followUpDate ? followUpDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date'}
                      </AppText>
                    </TouchableOpacity>
                    {showFollowUpPicker && (
                      Platform.OS === 'ios' ? (
                        <Modal transparent animationType="slide">
                          <View style={s.pickerOverlay}>
                            <View style={[s.pickerSheet, { backgroundColor: theme.colors.surface }]}>
                              <View style={s.pickerHeader}>
                                <TouchableOpacity onPress={() => setShowFollowUpPicker(false)}>
                                  <AppText style={{ fontSize: 15, fontFamily: 'Inter-Medium' }} color={theme.colors.textMuted}>Cancel</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setShowFollowUpPicker(false)}>
                                  <AppText style={{ fontSize: 15, fontFamily: 'Inter-SemiBold' }} color={theme.colors.primary}>Done</AppText>
                                </TouchableOpacity>
                              </View>
                              <DateTimePicker
                                value={followUpDate ?? new Date()}
                                mode="date"
                                display="spinner"
                                minimumDate={new Date()}
                                onChange={(_: DateTimePickerEvent, date?: Date) => { if (date) setFollowUpDate(date); }}
                              />
                            </View>
                          </View>
                        </Modal>
                      ) : (
                        <DateTimePicker
                          value={followUpDate ?? new Date()}
                          mode="date"
                          display="default"
                          minimumDate={new Date()}
                          onChange={(_: DateTimePickerEvent, date?: Date) => { setShowFollowUpPicker(false); if (date) setFollowUpDate(date); }}
                        />
                      )
                    )}
                  </View>
                  <AppInput
                    label="Remarks"
                    placeholder="Notes for follow-up…"
                    value={followUpRemarks}
                    onChangeText={setFollowUpRemarks}
                    multiline
                    style={{ minHeight: 120, textAlignVertical: 'top' }}
                  />
                  <TouchableOpacity
                    onPress={onSaveStep3}
                    style={[s.submitBtn, { backgroundColor: theme.colors.primary, opacity: step3Submitting ? 0.7 : 1 }]}
                    disabled={step3Submitting}
                    activeOpacity={0.85}
                  >
                    <AppText style={s.submitBtnText}>{step3Submitting ? 'Saving…' : 'Save Follow-up'}</AppText>
                  </TouchableOpacity>
                </>
              )}

              {/* Requirement Identified → deal type selection */}
              {qualSubPath === 'REQUIREMENT_IDENTIFIED' && !dealType && (
                <>
                  <TouchableOpacity onPress={() => setQualSubPath(null)} style={s.backLink}>
                    <ChevronLeft size={16} color={theme.colors.primary} />
                    <AppText style={{ fontSize: 13, color: theme.colors.primary, fontFamily: 'Inter-Medium' }}>Back</AppText>
                  </TouchableOpacity>
                  <AppText style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: theme.colors.text, marginBottom: 12 }}>
                    Select Deal Type
                  </AppText>
                  <View style={s.chipRow}>
                    {([
                      { key: 'AMC' as const, label: 'AMC' },
                      { key: 'MAINTENANCE' as const, label: 'Maintenance' },
                      { key: 'INSTALLATION' as const, label: 'New System' },
                    ]).map(dt => (
                      <TouchableOpacity
                        key={dt.key}
                        onPress={() => setDealType(dt.key)}
                        style={[s.dealChip, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}
                        activeOpacity={0.8}
                      >
                        <AppText style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: theme.colors.text }}>{dt.label}</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Requirement Identified → quotation form */}
              {qualSubPath === 'REQUIREMENT_IDENTIFIED' && dealType && (
                <>
                  <TouchableOpacity onPress={() => setDealType(null)} style={s.backLink}>
                    <ChevronLeft size={16} color={theme.colors.primary} />
                    <AppText style={{ fontSize: 13, color: theme.colors.primary, fontFamily: 'Inter-Medium' }}>Back</AppText>
                  </TouchableOpacity>
                  <View style={[s.dealTypeBadge, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <AppText style={{ fontSize: 13, fontFamily: 'Inter-SemiBold', color: theme.colors.primary }}>
                      {dealType === 'INSTALLATION' ? 'New System' : dealType === 'AMC' ? 'AMC' : 'Maintenance'}
                    </AppText>
                  </View>
                  <AppInput
                    label="Quotation Number"
                    placeholder="e.g. QT-2026-001"
                    value={quotationRef}
                    onChangeText={setQuotationRef}
                    returnKeyType="next"
                  />
                  <View style={{ marginBottom: 4 }}>
                    <AppText variant="labelSm" color={theme.colors.textSecondary} style={{ marginBottom: 6 }}>Quotation Date</AppText>
                    <TouchableOpacity
                      onPress={() => setShowQuotationPicker(true)}
                      style={[s.dateField, { borderColor: theme.colors.border, borderRadius: theme.radii.sm, backgroundColor: theme.colors.surface }]}
                      activeOpacity={0.7}
                    >
                      <Calendar size={18} color={theme.colors.primary} strokeWidth={2} />
                      <AppText style={{ fontSize: 14, fontFamily: 'Inter-Regular' }} color={quotationDate ? theme.colors.text : theme.colors.textMuted}>
                        {quotationDate ? quotationDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date'}
                      </AppText>
                    </TouchableOpacity>
                    {showQuotationPicker && (
                      Platform.OS === 'ios' ? (
                        <Modal transparent animationType="slide">
                          <View style={s.pickerOverlay}>
                            <View style={[s.pickerSheet, { backgroundColor: theme.colors.surface }]}>
                              <View style={s.pickerHeader}>
                                <TouchableOpacity onPress={() => setShowQuotationPicker(false)}>
                                  <AppText style={{ fontSize: 15, fontFamily: 'Inter-Medium' }} color={theme.colors.textMuted}>Cancel</AppText>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setShowQuotationPicker(false)}>
                                  <AppText style={{ fontSize: 15, fontFamily: 'Inter-SemiBold' }} color={theme.colors.primary}>Done</AppText>
                                </TouchableOpacity>
                              </View>
                              <DateTimePicker
                                value={quotationDate ?? new Date()}
                                mode="date"
                                display="spinner"
                                onChange={(_: DateTimePickerEvent, date?: Date) => { if (date) setQuotationDate(date); }}
                              />
                            </View>
                          </View>
                        </Modal>
                      ) : (
                        <DateTimePicker
                          value={quotationDate ?? new Date()}
                          mode="date"
                          display="default"
                          onChange={(_: DateTimePickerEvent, date?: Date) => { setShowQuotationPicker(false); if (date) setQuotationDate(date); }}
                        />
                      )
                    )}
                  </View>
                  <AppInput
                    label="Amount"
                    placeholder="e.g. 150000"
                    value={quotationAmount}
                    onChangeText={setQuotationAmount}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    onPress={onSaveStep3}
                    style={[s.submitBtn, { backgroundColor: '#059669', opacity: step3Submitting ? 0.7 : 1 }]}
                    disabled={step3Submitting}
                    activeOpacity={0.85}
                  >
                    <AppText style={s.submitBtnText}>{step3Submitting ? 'Saving…' : 'Qualify Lead'}</AppText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Cancel link */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.cancelLink} activeOpacity={0.7}>
            <AppText style={s.cancelText} color={theme.colors.textMuted}>Cancel</AppText>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingBottom: 48 },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 26, fontFamily: 'Inter-Bold', lineHeight: 32 },
  pageSub: { fontSize: 13, fontFamily: 'Inter-SemiBold', marginTop: 2 },
  form: { gap: 4, marginTop: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 8 },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepLine: { height: 2, width: 40, marginHorizontal: 8 },
  lockedCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  lockedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  lockedRow: { flexDirection: 'column', gap: 2 },
  lockedLabel: { fontSize: 11, fontFamily: 'Inter-Medium', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  lockedValue: { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 20 },
  connectorWrap: { alignItems: 'center', height: 28 },
  connectorLine: { width: 1.5, flex: 1 },
  connectorDot: { width: 6, height: 6, borderRadius: 3 },
  optionRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    borderRadius: 16,
    borderWidth: 1,
  },
  qualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
    marginBottom: 12,
  },
  qualBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dealChip: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dealTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  gpsRow: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitBtn: {
    marginTop: 20,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#FFF' },
  cancelLink: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, minHeight: 48, paddingHorizontal: 14,
  },
  pickerOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
});
