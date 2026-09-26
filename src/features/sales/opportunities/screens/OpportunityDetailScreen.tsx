import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, Platform } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { AppButton } from '@/components/common/AppButton';
import { Loader } from '@/components/feedback/Loader';
import { SalesStackParamList } from '@/features/sales/navigation/types';
import {
  opportunitiesApi,
  OpportunityStage,
  FORWARD_STAGE,
  canWinOpportunity,
  isOpportunityClosed,
} from '@/services/api/opportunities.api';
import { DARK_NAVY } from '@/constants/brandColors';
import { useSilentLocationCapture } from '@/hooks/useSilentLocationCapture';

type RouteProps = RouteProp<SalesStackParamList, 'OpportunityDetail'>;

const STAGE_LABEL: Record<OpportunityStage, string> = {
  QUOTATION: 'Quotation',
  FOLLOWUP: 'Follow-up',
  MEETING: 'Meeting',
  PURCHASE_ORDER: 'Purchase Order',
  LOST: 'Lost',
};

const STAGE_STYLE: Record<OpportunityStage, { bg: string; color: string }> = {
  QUOTATION: { bg: '#FEF3C7', color: '#D97706' },
  FOLLOWUP: { bg: '#FFEDD5', color: '#C2410C' },
  MEETING: { bg: '#E0E7FF', color: '#4338CA' },
  PURCHASE_ORDER: { bg: '#D1FAE5', color: '#065F46' },
  LOST: { bg: '#FEE2E2', color: '#991B1B' },
};

const LOST_REASONS = [
  { label: 'Price', value: 'price' },
  { label: 'Chose a competitor', value: 'competitor' },
  { label: 'No budget', value: 'no_budget' },
  { label: 'No response', value: 'no_response' },
];

function formatCurrency(val: string | number): string {
  const num = typeof val === 'string' ? Number(val) : val;
  if (!num) return '—';
  return `₹${num.toLocaleString('en-IN')}`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function OpportunityDetailScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [siteInput, setSiteInput] = useState('');
  const [showWinInput, setShowWinInput] = useState(false);

  // Purchase Order capture — required by the win() endpoint now that a deal
  // closes as PURCHASE_ORDER instead of a bare WON toggle.
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState<Date | null>(null);
  const [showPoDatePicker, setShowPoDatePicker] = useState(false);
  const [poAmount, setPoAmount] = useState('');
  const [poRemarks, setPoRemarks] = useState('');
  const { location: poLocation, capture: capturePoLocation, reset: resetPoLocation } = useSilentLocationCapture();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['opportunity', route.params.id],
    queryFn: () => opportunitiesApi.getOne(route.params.id).then(r => r.data),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['opportunity', route.params.id] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['opportunity-stats'] });
  };

  const transitionMutation = useMutation({
    mutationFn: (toStage: OpportunityStage) => opportunitiesApi.transitionStage(route.params.id, toStage),
    onSuccess: invalidate,
    onError: () => Alert.alert('Error', 'Could not update the stage.'),
  });

  const lostMutation = useMutation({
    mutationFn: (reason: string) => opportunitiesApi.markLost(route.params.id, reason),
    onSuccess: invalidate,
    onError: () => Alert.alert('Error', 'Could not mark this opportunity lost.'),
  });

  const winMutation = useMutation({
    mutationFn: () => opportunitiesApi.win(route.params.id, {
      poNumber: poNumber.trim(),
      poDate: (poDate ?? new Date()).toISOString(),
      poAmount: parseFloat(poAmount),
      poRemarks: poRemarks.trim() || undefined,
      poGpsLatitude: poLocation.gpsLatitude,
      poGpsLongitude: poLocation.gpsLongitude,
      poLocation: poLocation.visitLocation,
      site: siteInput.trim() || undefined,
    }),
    onSuccess: () => {
      invalidate();
      setShowWinInput(false);
      Alert.alert('Purchase Order Captured', 'This opportunity has been marked as won.');
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.error?.message ?? 'Could not mark this opportunity won.'),
  });

  const openWinForm = () => {
    resetPoLocation();
    void capturePoLocation();
    setShowWinInput(true);
  };

  const submitWin = () => {
    if (!poNumber.trim() || !poDate || !poAmount.trim() || isNaN(parseFloat(poAmount)) || parseFloat(poAmount) <= 0) {
      Alert.alert('Required', 'Please fill in PO number, PO date and a valid PO amount.');
      return;
    }
    winMutation.mutate();
  };

  const handleMarkLost = () => {
    Alert.alert('Mark opportunity lost', 'Select a reason', [
      ...LOST_REASONS.map(r => ({ text: r.label, onPress: () => lostMutation.mutate(r.value) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  if (isLoading) return <Screen edges={['left', 'right', 'bottom']}><Loader /></Screen>;
  if (isError || !data) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <View style={styles.errorCenter}>
          <AppText style={{ color: theme.colors.textMuted }}>Failed to load opportunity.</AppText>
        </View>
      </Screen>
    );
  }

  const stageStyle = STAGE_STYLE[data.stage];
  const nextStage = FORWARD_STAGE[data.stage];
  const closed = isOpportunityClosed(data.stage);
  const canWin = canWinOpportunity(data.stage);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={[styles.navBar, { paddingTop: insets.top + 4, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.colors.surfaceAlt }]}>
          <AppText style={{ fontSize: 18, color: theme.colors.text }}>←</AppText>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <AppText style={styles.navName} color={theme.colors.text} numberOfLines={1}>
            {data.lead?.contactName ?? 'Opportunity'}
          </AppText>
          <AppText style={styles.navCompany} color={theme.colors.textMuted} numberOfLines={1}>{data.dealType}</AppText>
        </View>
        <View style={[styles.stagePill, { backgroundColor: stageStyle.bg }]}>
          <AppText style={styles.stagePillText} color={stageStyle.color}>{STAGE_LABEL[data.stage]}</AppText>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.dealCard, { backgroundColor: DARK_NAVY }]}>
          <AppText style={styles.dealCardLabel}>DEAL VALUE</AppText>
          <AppText style={styles.dealCardValue}>{formatCurrency(data.value)}</AppText>
          <AppText style={styles.dealCardSub}>{data.probability}% probability</AppText>
          {data.expectedClose ? (
            <AppText style={styles.dealCardSub}>Expected close {formatDate(data.expectedClose)}</AppText>
          ) : null}
        </View>

        {!closed && (
          <View style={styles.actionsSection}>
            {nextStage && (
              <AppButton
                label={`Move to ${STAGE_LABEL[nextStage]}`}
                onPress={() => transitionMutation.mutate(nextStage)}
                loading={transitionMutation.isPending}
                fullWidth
                style={{ marginBottom: 10 }}
              />
            )}
            {canWin && !showWinInput && (
              <AppButton
                label="Mark Won — Capture PO"
                variant="secondary"
                onPress={openWinForm}
                fullWidth
                style={{ marginBottom: 10 }}
              />
            )}
            {showWinInput && (
              <View style={[styles.winCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <AppText style={{ fontSize: 15, fontFamily: 'Inter-SemiBold', marginBottom: 12 }} color={theme.colors.text}>
                  Purchase Order Details
                </AppText>

                <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium', marginBottom: 6 }} color={theme.colors.textSecondary}>
                  PO Number
                </AppText>
                <TextInput
                  value={poNumber}
                  onChangeText={setPoNumber}
                  placeholder="e.g. PO-2026-0042"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.siteInput, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, borderColor: theme.colors.border, marginBottom: 12 }]}
                />

                <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium', marginBottom: 6 }} color={theme.colors.textSecondary}>
                  PO Date
                </AppText>
                <TouchableOpacity
                  onPress={() => setShowPoDatePicker(true)}
                  style={[styles.dateField, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}
                  activeOpacity={0.7}
                >
                  <Calendar size={18} color={theme.colors.primary} strokeWidth={2} />
                  <AppText style={{ fontSize: 14, fontFamily: 'Inter-Regular' }} color={poDate ? theme.colors.text : theme.colors.textMuted}>
                    {poDate ? poDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date'}
                  </AppText>
                </TouchableOpacity>
                {showPoDatePicker && (
                  Platform.OS === 'ios' ? (
                    <Modal transparent animationType="slide">
                      <View style={styles.pickerOverlay}>
                        <View style={[styles.pickerSheet, { backgroundColor: theme.colors.surface }]}>
                          <View style={styles.pickerHeader}>
                            <TouchableOpacity onPress={() => setShowPoDatePicker(false)}>
                              <AppText style={{ fontSize: 15, fontFamily: 'Inter-Medium' }} color={theme.colors.textMuted}>Cancel</AppText>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowPoDatePicker(false)}>
                              <AppText style={{ fontSize: 15, fontFamily: 'Inter-SemiBold' }} color={theme.colors.primary}>Done</AppText>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={poDate ?? new Date()}
                            mode="date"
                            display="spinner"
                            maximumDate={new Date()}
                            onChange={(_: DateTimePickerEvent, date?: Date) => { if (date) setPoDate(date); }}
                          />
                        </View>
                      </View>
                    </Modal>
                  ) : (
                    <DateTimePicker
                      value={poDate ?? new Date()}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={(_: DateTimePickerEvent, date?: Date) => { setShowPoDatePicker(false); if (date) setPoDate(date); }}
                    />
                  )
                )}

                <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium', marginTop: 12, marginBottom: 6 }} color={theme.colors.textSecondary}>
                  PO Amount
                </AppText>
                <TextInput
                  value={poAmount}
                  onChangeText={setPoAmount}
                  placeholder="e.g. 150000"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                  style={[styles.siteInput, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, borderColor: theme.colors.border }]}
                />

                <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium', marginTop: 12, marginBottom: 6 }} color={theme.colors.textSecondary}>
                  Remarks (optional)
                </AppText>
                <TextInput
                  value={poRemarks}
                  onChangeText={setPoRemarks}
                  placeholder="Any notes about this PO…"
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  style={[styles.siteInput, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, borderColor: theme.colors.border, minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                />

                <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium', marginTop: 12, marginBottom: 6 }} color={theme.colors.textSecondary}>
                  Site (optional)
                </AppText>
                <TextInput
                  value={siteInput}
                  onChangeText={setSiteInput}
                  placeholder="e.g. Sector 44, Gurugram"
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.siteInput, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, borderColor: theme.colors.border }]}
                />

                <AppButton
                  label="Confirm Won"
                  onPress={submitWin}
                  loading={winMutation.isPending}
                  fullWidth
                  style={{ marginTop: 16 }}
                />
                <TouchableOpacity onPress={() => setShowWinInput(false)} style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium' }} color={theme.colors.textMuted}>Cancel</AppText>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={handleMarkLost} style={styles.lostBtn} activeOpacity={0.75}>
              <AppText style={styles.lostBtnText}>Mark lost</AppText>
            </TouchableOpacity>
          </View>
        )}

        {data.stageHistory && data.stageHistory.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 12 }} color={theme.colors.text}>
              Stage history
            </AppText>
            {data.stageHistory.map((entry, i) => (
              <View key={entry.id} style={[styles.historyRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
                <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium' }} color={theme.colors.text}>
                  {entry.fromStage ? `${STAGE_LABEL[entry.fromStage]} → ` : ''}{STAGE_LABEL[entry.toStage]}
                </AppText>
                <AppText style={{ fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 2 }} color={theme.colors.textMuted}>
                  {formatDate(entry.createdAt)}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navName: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  navCompany: { fontSize: 12, fontFamily: 'Inter-Regular' },
  stagePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  stagePillText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
  errorCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dealCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  dealCardLabel: { fontSize: 10, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 6 },
  dealCardValue: { fontSize: 30, lineHeight: 36, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  dealCardSub: { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  actionsSection: { marginBottom: 16 },
  winCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  siteInput: { height: 44, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, fontSize: 14, fontFamily: 'Inter-Regular' },
  lostBtn: { marginTop: 4, paddingVertical: 12, alignItems: 'center' },
  lostBtnText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#DC2626' },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  historyRow: { paddingVertical: 10 },
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, height: 44, paddingHorizontal: 12, borderRadius: 10,
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
