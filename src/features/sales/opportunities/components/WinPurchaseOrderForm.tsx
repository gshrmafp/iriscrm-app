import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, Modal, Platform, StyleSheet } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { AppText } from '@/components/common/AppText';
import { AppButton } from '@/components/common/AppButton';
import { opportunitiesApi } from '@/services/api/opportunities.api';
import { useSilentLocationCapture } from '@/hooks/useSilentLocationCapture';

// Shared Purchase Order capture form — used standalone on
// OpportunityDetailScreen and embedded inline in LeadDetailScreen's
// Purchase Order journey section, so a deal can be won from either place
// without duplicating this logic.
export function WinPurchaseOrderForm({
  opportunityId,
  onCancel,
  onWon,
  bordered = true,
}: {
  opportunityId: string;
  onCancel?: () => void;
  onWon?: () => void;
  bordered?: boolean;
}) {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState<Date | null>(null);
  const [showPoDatePicker, setShowPoDatePicker] = useState(false);
  const [poAmount, setPoAmount] = useState('');
  const [poRemarks, setPoRemarks] = useState('');
  const [siteInput, setSiteInput] = useState('');
  const { location: poLocation, capture: capturePoLocation } = useSilentLocationCapture();

  // Silently capture GPS as soon as this form mounts, same pattern as
  // Meeting logging and Step 1's auto-capture.
  React.useEffect(() => {
    void capturePoLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const winMutation = useMutation({
    mutationFn: () => opportunitiesApi.win(opportunityId, {
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
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-stats'] });
      onWon?.();
    },
  });

  const submit = () => {
    if (!poNumber.trim() || !poDate || !poAmount.trim() || isNaN(parseFloat(poAmount)) || parseFloat(poAmount) <= 0) {
      return;
    }
    winMutation.mutate();
  };

  const canSubmit = !!poNumber.trim() && !!poDate && !!poAmount.trim() && !isNaN(parseFloat(poAmount)) && parseFloat(poAmount) > 0;

  return (
    <View style={[bordered && st.card, bordered && { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {bordered && (
        <AppText style={{ fontSize: 15, fontFamily: 'Inter-SemiBold', marginBottom: 12 }} color={theme.colors.text}>
          Purchase Order Details
        </AppText>
      )}

      <AppText style={st.label} color={theme.colors.textSecondary}>PO Number</AppText>
      <TextInput
        value={poNumber}
        onChangeText={setPoNumber}
        placeholder="e.g. PO-2026-0042"
        placeholderTextColor={theme.colors.textMuted}
        style={[st.input, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, borderColor: theme.colors.border, marginBottom: 12 }]}
      />

      <AppText style={st.label} color={theme.colors.textSecondary}>PO Date</AppText>
      <TouchableOpacity
        onPress={() => setShowPoDatePicker(true)}
        style={[st.dateField, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}
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
            <View style={st.pickerOverlay}>
              <View style={[st.pickerSheet, { backgroundColor: theme.colors.surface }]}>
                <View style={st.pickerHeader}>
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

      <AppText style={{ ...st.label, marginTop: 12 }} color={theme.colors.textSecondary}>PO Amount</AppText>
      <TextInput
        value={poAmount}
        onChangeText={setPoAmount}
        placeholder="e.g. 150000"
        placeholderTextColor={theme.colors.textMuted}
        keyboardType="numeric"
        style={[st.input, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, borderColor: theme.colors.border }]}
      />

      <AppText style={{ ...st.label, marginTop: 12 }} color={theme.colors.textSecondary}>Remarks (optional)</AppText>
      <TextInput
        value={poRemarks}
        onChangeText={setPoRemarks}
        placeholder="Any notes about this PO…"
        placeholderTextColor={theme.colors.textMuted}
        multiline
        style={[st.input, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, borderColor: theme.colors.border, minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
      />

      <AppText style={{ ...st.label, marginTop: 12 }} color={theme.colors.textSecondary}>Site (optional)</AppText>
      <TextInput
        value={siteInput}
        onChangeText={setSiteInput}
        placeholder="e.g. Sector 44, Gurugram"
        placeholderTextColor={theme.colors.textMuted}
        style={[st.input, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, borderColor: theme.colors.border }]}
      />

      <AppButton
        label="Confirm Won"
        onPress={submit}
        loading={winMutation.isPending}
        disabled={!canSubmit}
        fullWidth
        style={{ marginTop: 16 }}
      />
      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={{ alignItems: 'center', paddingVertical: 10 }}>
          <AppText style={{ fontSize: 13, fontFamily: 'Inter-Medium' }} color={theme.colors.textMuted}>Cancel</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  label: { fontSize: 13, fontFamily: 'Inter-Medium', marginBottom: 6 },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, fontSize: 14, fontFamily: 'Inter-Regular' },
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, height: 44, paddingHorizontal: 12, borderRadius: 10,
  },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
});
