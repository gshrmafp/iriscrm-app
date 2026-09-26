import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Platform, ScrollView, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { AppText } from '@/components/common/AppText';

export interface DateRangeValue {
  dateFrom?: string;
  dateTo?: string;
}

type Preset = 'week' | 'month' | 'quarter' | 'year';

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
];

function presetToRange(preset: Preset): DateRangeValue {
  const now = new Date();
  let start: Date;
  switch (preset) {
    case 'week': {
      const day = now.getDay();
      const sinceMonday = (day + 6) % 7; // Mon=0 ... Sun=6
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      break;
    }
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
  }
  return { dateFrom: start.toISOString(), dateTo: now.toISOString() };
}

function DateField({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  const theme = useTheme();
  const [show, setShow] = useState(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[st.dateField, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}
        activeOpacity={0.7}
      >
        <Calendar size={13} color={theme.colors.primary} strokeWidth={2} />
        <AppText style={st.dateFieldText} color={theme.colors.text}>
          {value.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </AppText>
      </TouchableOpacity>
      {show && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <View style={st.pickerOverlay}>
              <View style={[st.pickerSheet, { backgroundColor: theme.colors.surface }]}>
                <View style={st.pickerHeader}>
                  <TouchableOpacity onPress={() => setShow(false)}>
                    <AppText style={st.pickerCancel} color={theme.colors.textMuted}>Cancel</AppText>
                  </TouchableOpacity>
                  <AppText style={st.pickerTitle} color={theme.colors.text}>{label}</AppText>
                  <TouchableOpacity onPress={() => setShow(false)}>
                    <AppText style={st.pickerDone} color={theme.colors.primary}>Done</AppText>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={value}
                  mode="date"
                  display="spinner"
                  onChange={(_: DateTimePickerEvent, d?: Date) => { if (d) onChange(d); }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={value}
            mode="date"
            display="default"
            onChange={(_: DateTimePickerEvent, d?: Date) => { setShow(false); if (d) onChange(d); }}
          />
        )
      )}
    </>
  );
}

// Quick presets + a bank-statement-style custom From/To range, mirroring
// the web DateRangeFilter (IrisFrontend/src/components/dashboard/date-range-filter.tsx).
// Emits ISO date strings; an empty value means "all time".
export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}) {
  const theme = useTheme();
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date>(new Date());
  const [customTo, setCustomTo] = useState<Date>(new Date());

  function selectPreset(preset: Preset) {
    setActivePreset(preset);
    setShowCustom(false);
    onChange(presetToRange(preset));
  }

  function toggleCustom() {
    setActivePreset(null);
    setShowCustom(s => !s);
  }

  function applyCustom() {
    setActivePreset(null);
    const endOfDay = new Date(customTo.getFullYear(), customTo.getMonth(), customTo.getDate(), 23, 59, 59, 999);
    onChange({ dateFrom: customFrom.toISOString(), dateTo: endOfDay.toISOString() });
  }

  function clearAll() {
    setActivePreset(null);
    setShowCustom(false);
    onChange({});
  }

  const hasFilter = !!(value.dateFrom || value.dateTo);

  return (
    <View style={{ gap: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.row}>
        {PRESETS.map(preset => {
          const active = activePreset === preset.value;
          return (
            <TouchableOpacity
              key={preset.value}
              onPress={() => selectPreset(preset.value)}
              style={[st.chip, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border }]}
              activeOpacity={0.75}
            >
              <AppText style={st.chipText} color={active ? '#FFFFFF' : theme.colors.textSecondary}>{preset.label}</AppText>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={toggleCustom}
          style={[st.chip, { backgroundColor: showCustom ? theme.colors.primary : theme.colors.surface, borderColor: showCustom ? theme.colors.primary : theme.colors.border }]}
          activeOpacity={0.75}
        >
          <Calendar size={12} color={showCustom ? '#FFFFFF' : theme.colors.textSecondary} strokeWidth={2} />
          <AppText style={st.chipText} color={showCustom ? '#FFFFFF' : theme.colors.textSecondary}>Custom</AppText>
        </TouchableOpacity>
        {hasFilter ? (
          <TouchableOpacity onPress={clearAll} style={st.clearBtn} activeOpacity={0.75}>
            <AppText style={st.chipText} color={theme.colors.textMuted}>Clear</AppText>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {showCustom ? (
        <View style={[st.customRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <DateField label="From date" value={customFrom} onChange={setCustomFrom} />
          <AppText style={st.toText} color={theme.colors.textMuted}>to</AppText>
          <DateField label="To date" value={customTo} onChange={setCustomTo} />
          <TouchableOpacity onPress={applyCustom} style={[st.applyBtn, { backgroundColor: theme.colors.primary }]} activeOpacity={0.8}>
            <AppText style={st.applyText}>Apply</AppText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, paddingHorizontal: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: 'Inter-Medium' },
  clearBtn: { justifyContent: 'center', paddingHorizontal: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, padding: 8 },
  toText: { fontSize: 11, fontFamily: 'Inter-Regular' },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, height: 34, paddingHorizontal: 8, borderRadius: 8, flex: 1 },
  dateFieldText: { fontSize: 11, fontFamily: 'Inter-Regular' },
  applyBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  applyText: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  pickerCancel: { fontSize: 15, fontFamily: 'Inter-Medium' },
  pickerTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  pickerDone: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
