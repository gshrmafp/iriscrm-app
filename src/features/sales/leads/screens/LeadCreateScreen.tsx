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
} from 'react-native';
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
} from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { AppInput } from '@/components/forms/AppInput';
import { leadsApi } from '@/services/api/leads.api';
import type { SalesStackParamList } from '@/features/sales/navigation/types';
import {
  checkLocationPermission,
  requestLocationPermission,
  getCurrentLocation,
  openLocationSettings,
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
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  discussionNote: z.string().optional(),
}).refine(d => (d.contactPhone && d.contactPhone.length > 0) || (d.contactEmail && d.contactEmail.length > 0), {
  message: 'Phone or email is required',
  path: ['contactPhone'],
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
          <AppText style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: theme.colors.textMuted }}>{f.label}</AppText>
          <AppText style={{ fontSize: 13, fontFamily: 'Inter-Regular', color: theme.colors.text, flex: 1, textAlign: 'right' }} numberOfLines={1}>{f.value}</AppText>
        </View>
      ))}
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
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpRemarks, setFollowUpRemarks] = useState('');
  const [quotationRef, setQuotationRef] = useState('');
  const [quotationDate, setQuotationDate] = useState('');
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
  useEffect(() => {
    (async () => {
      const status = await checkLocationPermission();
      if (status === 'granted') {
        setLocationStatus('granted');
        try {
          const loc = await getCurrentLocation(10000);
          setCoords(loc);
        } catch { setLocationStatus('unavailable'); }
      } else if (status === 'denied') {
        const req = await requestLocationPermission();
        setLocationStatus(req);
        if (req === 'granted') {
          try {
            const loc = await getCurrentLocation(10000);
            setCoords(loc);
          } catch { setLocationStatus('unavailable'); }
        }
      } else {
        setLocationStatus(status);
      }
    })();
  }, []);

  // Reverse geocode
  useEffect(() => {
    if (!coords) return;
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`, {
      headers: { 'User-Agent': 'IRIS-CRM-Mobile/1.0' },
    })
      .then(r => r.json())
      .then(data => { if (data.display_name) setVisitLocation(data.display_name); })
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
        if (!followUpDate.trim()) {
          Alert.alert('Required', 'Please select a follow-up date.');
          setStep3Submitting(false);
          return;
        }
        body = { path: 'FUTURE_POTENTIAL', followUpDate: followUpDate.trim(), remarks: followUpRemarks || undefined };
      } else if (qualSubPath === 'REQUIREMENT_IDENTIFIED' && dealType) {
        if (!quotationRef.trim() || !quotationDate.trim() || !quotationAmount.trim()) {
          Alert.alert('Required', 'Please fill all quotation fields.');
          setStep3Submitting(false);
          return;
        }
        body = {
          path: 'REQUIREMENT_IDENTIFIED',
          dealType,
          quotationRef: quotationRef.trim(),
          quotationDate: quotationDate.trim(),
          quotationAmount: parseFloat(quotationAmount),
        };
      } else {
        setStep3Submitting(false);
        return;
      }

      const res = await leadsApi.saveStep3(leadId, body);
      await queryClient.invalidateQueries({ queryKey: ['leads'] });
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
            <LockedStepCard
              title="Site Visit"
              theme={theme}
              fields={[
                { label: 'Company', value: step1Values.companyName },
                ...(step1Values.remarks ? [{ label: 'Remarks', value: step1Values.remarks }] : []),
                ...(coords ? [{ label: 'GPS', value: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` }] : []),
              ]}
            />
          )}

          {/* Locked Step 2 */}
          {step > 2 && step2Values && (
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
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
              )} />

              {/* GPS status */}
              {locationStatus !== 'checking' && (
                <View style={[s.gpsRow, { backgroundColor: theme.colors.surfaceAlt, borderRadius: 10 }]}>
                  {locationStatus === 'granted' && coords ? (
                    <>
                      <CheckCircle size={14} color="#059669" strokeWidth={2} />
                      <View style={{ flex: 1 }}>
                        <AppText style={{ fontSize: 13, color: '#059669' }}>GPS captured</AppText>
                        {visitLocation && (
                          <AppText style={{ fontSize: 11, color: theme.colors.textMuted, marginTop: 2 }} numberOfLines={2}>{visitLocation}</AppText>
                        )}
                      </View>
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
                      <AppText style={{ fontSize: 13, color: theme.colors.textMuted, flex: 1 }}>Location unavailable</AppText>
                    </>
                  )}
                </View>
              )}

              <TouchableOpacity
                onPress={() => { void step1Form.handleSubmit(onSaveStep1)(); }}
                style={[s.submitBtn, { backgroundColor: theme.colors.primary, opacity: step1Form.formState.isSubmitting ? 0.7 : 1 }]}
                disabled={step1Form.formState.isSubmitting}
                activeOpacity={0.85}
              >
                <AppText style={s.submitBtnText}>
                  {step1Form.formState.isSubmitting ? 'Saving…' : 'Save & Continue'}
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
                  label="Contact Number"
                  placeholder="+91 98765 43210"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={step2Form.formState.errors.contactPhone?.message}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              )} />

              <Controller control={step2Form.control} name="contactEmail" render={({ field }) => (
                <AppInput
                  label="Email"
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
                  multiline
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
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
                <View style={s.optionRow}>
                  <TouchableOpacity
                    onPress={() => setQualPath('QUALIFIED')}
                    style={[s.optionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    activeOpacity={0.8}
                  >
                    <CheckCircle size={28} color="#059669" strokeWidth={1.5} />
                    <AppText style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: theme.colors.text, marginTop: 8 }}>Qualified</AppText>
                    <AppText style={{ fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 }}>Lead has potential</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setQualPath('NOT_QUALIFIED')}
                    style={[s.optionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    activeOpacity={0.8}
                  >
                    <AlertTriangle size={28} color="#DC2626" strokeWidth={1.5} />
                    <AppText style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: theme.colors.text, marginTop: 8 }}>Not Qualified</AppText>
                    <AppText style={{ fontSize: 12, color: theme.colors.textMuted, textAlign: 'center', marginTop: 4 }}>Cancel this lead</AppText>
                  </TouchableOpacity>
                </View>
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
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
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
                  <AppInput
                    label="Follow-up Date"
                    placeholder="YYYY-MM-DD"
                    value={followUpDate}
                    onChangeText={setFollowUpDate}
                    returnKeyType="next"
                  />
                  <AppInput
                    label="Remarks"
                    placeholder="Notes for follow-up…"
                    value={followUpRemarks}
                    onChangeText={setFollowUpRemarks}
                    multiline
                    style={{ minHeight: 80, textAlignVertical: 'top' }}
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
                  <AppInput
                    label="Quotation Date"
                    placeholder="YYYY-MM-DD"
                    value={quotationDate}
                    onChangeText={setQuotationDate}
                    returnKeyType="next"
                  />
                  <AppInput
                    label="Amount (₹)"
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
  form: { gap: 4, marginTop: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 8 },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepLine: { height: 2, width: 40, marginHorizontal: 8 },
  lockedCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 12, gap: 6 },
  lockedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  lockedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  optionRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    borderRadius: 16,
    borderWidth: 1,
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
});
