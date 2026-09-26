import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/design-system';
import { AppText } from '@/components/common/AppText';
import { AppButton } from '@/components/common/AppButton';

// Shared by LeadDetailScreen (every Lead Journey accordion section) and
// LeadCreateScreen (inline logging right after Step 1/Step 2 are locked) —
// extracted so both screens open the exact same follow-up/meeting logging UI
// instead of maintaining two copies.

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';
    const showSub = Keyboard.addListener(showEvent, () => setVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);
  return visible;
}

// Log Meeting — single required note field (max 400, with a counter), GPS
// captured silently in the background (no visible location UI) reusing the
// same silent-capture hook LeadDetailScreen and OpportunityDetailScreen both
// use, mirroring Step 1's GPS-capture logic in LeadCreateScreen.
export function MeetingModal({ visible, onClose, onSubmit, loading }: {
  visible: boolean; onClose: () => void;
  onSubmit: (data: { note: string }) => void; loading: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[st.modalSheet, { backgroundColor: theme.colors.surface, paddingBottom: 20 + (keyboardVisible ? 0 : insets.bottom) }]}>
          <View style={[st.modalHandle, { backgroundColor: theme.colors.border }]} />
          <AppText style={st.modalTitle} color={theme.colors.text}>Log Meeting</AppText>
          <TextInput value={note} onChangeText={t => setNote(t.slice(0, 400))} placeholder="What was discussed at the meeting…" placeholderTextColor={theme.colors.textMuted}
            multiline maxLength={400} style={[st.noteInput, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]} />
          <AppText style={{ fontSize: 11, textAlign: 'right', marginTop: -12, marginBottom: 16 }} color={theme.colors.textMuted}>
            {note.length}/400
          </AppText>
          <View style={st.modalActions}>
            <TouchableOpacity onPress={onClose} style={[st.cancelBtn, { borderColor: theme.colors.border }]}>
              <AppText style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: theme.colors.textSecondary }}>Cancel</AppText>
            </TouchableOpacity>
            <AppButton label="Save" onPress={() => note.trim() && onSubmit({ note: note.trim() })} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function FollowUpModal({ visible, onClose, onSubmit, loading }: {
  visible: boolean; onClose: () => void;
  onSubmit: (data: { note: string; channel: string }) => void; loading: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState('call');
  const channels = ['call', 'email', 'meeting'];

  useEffect(() => {
    if (visible) { setNote(''); setChannel('call'); }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[st.modalSheet, { backgroundColor: theme.colors.surface, paddingBottom: 20 + (keyboardVisible ? 0 : insets.bottom) }]}>
          <View style={[st.modalHandle, { backgroundColor: theme.colors.border }]} />
          <AppText style={st.modalTitle} color={theme.colors.text}>Log Follow-up</AppText>
          <View style={st.channelRow}>
            {channels.map(c => (
              <TouchableOpacity key={c} onPress={() => setChannel(c)}
                style={[st.channelChip, { backgroundColor: channel === c ? theme.colors.primary : theme.colors.surfaceAlt }]}>
                <AppText style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: channel === c ? '#FFF' : theme.colors.textSecondary, textTransform: 'capitalize' }}>{c}</AppText>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput value={note} onChangeText={setNote} placeholder="Notes from this interaction…" placeholderTextColor={theme.colors.textMuted}
            multiline style={[st.noteInput, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]} />
          <View style={st.modalActions}>
            <TouchableOpacity onPress={onClose} style={[st.cancelBtn, { borderColor: theme.colors.border }]}>
              <AppText style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: theme.colors.textSecondary }}>Cancel</AppText>
            </TouchableOpacity>
            <AppButton label="Save" onPress={() => note.trim() && onSubmit({ note: note.trim(), channel })} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', marginBottom: 16 },
  channelRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  channelChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  noteInput: { borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'Inter-Regular', minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14 },
});
