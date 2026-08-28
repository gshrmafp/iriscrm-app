import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { AppButton } from '@/components/common/AppButton';
import { Loader } from '@/components/feedback/Loader';
import { SalesStackParamList } from '@/features/sales/navigation/types';
import { leadsApi } from '@/services/api/leads.api';
import { formatFollowUpTime } from '@/utils/date';

type RouteProps = RouteProp<SalesStackParamList, 'LeadDetail'>;
type Nav = NativeStackNavigationProp<SalesStackParamList>;

const PRIMARY = '#3B4ECC';
const DARK_NAVY = '#111C40';

const AVATAR_COLORS = [
  '#3B4ECC', '#7C3AED', '#059669', '#B45309',
  '#DC2626', '#0891B2', '#9333EA', '#65A30D',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// Real LeadStatus values only (NEW | QUALIFIED | LOST). A qualified lead's
// Opportunity has its own richer stage (NEW/CONTACTED/QUOTED/NEGOTIATION/
// WON/LOST) — shown via the Opportunity card below, not fabricated here.
const STATUS_INFO: Record<string, { label: string; bg: string; color: string }> = {
  NEW:       { label: 'New',       bg: '#FEF3C7', color: '#D97706' },
  QUALIFIED: { label: 'Qualified', bg: '#D1FAE5', color: '#065F46' },
  LOST:      { label: 'Lost',      bg: '#FEE2E2', color: '#991B1B' },
};

const DEAL_TYPES = [
  { label: 'Installation', value: 'INSTALLATION' },
  { label: 'AMC', value: 'AMC' },
  { label: 'Product', value: 'PRODUCT' },
];

function formatCurrency(val: string | number): string {
  const num = typeof val === 'string' ? Number(val) : val;
  if (!num) return '—';
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${num}`;
}

function QualifyModal({ visible, onClose, onSubmit, loading }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { dealType: string; value: number }) => void;
  loading: boolean;
}) {
  const theme = useTheme();
  const [dealType, setDealType] = useState('INSTALLATION');
  const [value, setValue] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
          <AppText style={styles.modalTitle} color={theme.colors.text}>Qualify into an opportunity</AppText>
          <View style={styles.channelRow}>
            {DEAL_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setDealType(t.value)}
                style={[styles.channelChip, { backgroundColor: dealType === t.value ? PRIMARY : theme.colors.surfaceAlt }]}
              >
                <AppText style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: dealType === t.value ? '#FFF' : theme.colors.textSecondary }}>
                  {t.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Deal value (₹)"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
            style={[styles.noteInput, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, minHeight: 48 }]}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { borderColor: theme.colors.border }]}>
              <AppText style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: theme.colors.textSecondary }}>Cancel</AppText>
            </TouchableOpacity>
            <AppButton
              label="Create opportunity"
              onPress={() => {
                const num = Number(value);
                if (dealType && num > 0) onSubmit({ dealType, value: num });
              }}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ContactRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.contactRow}>
      <View style={[styles.contactIcon, { backgroundColor: '#EEF2FF' }]}>
        <AppText style={{ fontSize: 14, color: PRIMARY }}>{icon}</AppText>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText style={styles.contactLabel} color={theme.colors.textMuted}>{label}</AppText>
        <AppText style={styles.contactValue} color={theme.colors.text} numberOfLines={1}>{value}</AppText>
      </View>
    </View>
  );
}

function FollowUpModal({ visible, onClose, onSubmit, loading }: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { note: string; channel: string }) => void;
  loading: boolean;
}) {
  const theme = useTheme();
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState('call');
  const channels = ['call', 'email', 'meeting', 'visit'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
          <AppText style={styles.modalTitle} color={theme.colors.text}>Log Follow-up</AppText>
          <View style={styles.channelRow}>
            {channels.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setChannel(c)}
                style={[styles.channelChip, { backgroundColor: channel === c ? PRIMARY : theme.colors.surfaceAlt }]}
              >
                <AppText style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: channel === c ? '#FFF' : theme.colors.textSecondary, textTransform: 'capitalize' }}>
                  {c}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Notes from this interaction…"
            placeholderTextColor={theme.colors.textMuted}
            multiline
            style={[styles.noteInput, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text }]}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { borderColor: theme.colors.border }]}>
              <AppText style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: theme.colors.textSecondary }}>Cancel</AppText>
            </TouchableOpacity>
            <AppButton
              label="Save"
              onPress={() => note.trim() && onSubmit({ note: note.trim(), channel })}
              loading={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function LeadDetailScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [followUpModal, setFollowUpModal] = useState(false);
  const [qualifyModal, setQualifyModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lead', route.params.id],
    queryFn: () => leadsApi.getOne(route.params.id).then(r => r.data),
  });

  const followUpMutation = useMutation({
    mutationFn: (body: { note: string; channel: string }) => leadsApi.addFollowUp(route.params.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', route.params.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setFollowUpModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not save follow-up.'),
  });

  const lostMutation = useMutation({
    mutationFn: (reason: string) => leadsApi.markLost(route.params.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      navigation.goBack();
    },
    onError: () => Alert.alert('Error', 'Could not update lead status.'),
  });

  const qualifyMutation = useMutation({
    mutationFn: (body: { dealType: string; value: number }) => leadsApi.qualify(route.params.id, body),
    onSuccess: res => {
      queryClient.invalidateQueries({ queryKey: ['lead', route.params.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setQualifyModal(false);
      navigation.replace('OpportunityDetail', { id: (res.data as any).id });
    },
    onError: () => Alert.alert('Error', 'Could not qualify this lead.'),
  });

  const handleMarkLost = () => {
    Alert.alert('Mark as Lost', 'Select a reason', [
      { text: 'Price', onPress: () => lostMutation.mutate('price') },
      { text: 'Competitor', onPress: () => lostMutation.mutate('competitor') },
      { text: 'No Budget', onPress: () => lostMutation.mutate('no_budget') },
      { text: 'No Response', onPress: () => lostMutation.mutate('no_response') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleCall = (phone: string) => Linking.openURL(`tel:${phone}`).catch(() => {});
  const handleEmail = (email: string) => Linking.openURL(`mailto:${email}`).catch(() => {});

  if (isLoading) return <Screen edges={['left', 'right', 'bottom']}><Loader /></Screen>;
  if (isError || !data) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <View style={styles.errorCenter}>
          <AppText style={{ color: theme.colors.textMuted }}>Failed to load lead.</AppText>
        </View>
      </Screen>
    );
  }

  const displayName = data.contactName || data.companyName || 'Unknown';
  const company = data.companyName ?? '';
  const ini = displayName.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase() || '?';
  const avatarBg = avatarColor(displayName);
  const statusInfo = STATUS_INFO[data.status] ?? { label: data.status, bg: theme.colors.surfaceAlt, color: theme.colors.textMuted };
  const lastFollowUp = data.followUps?.[0];
  const opportunity = data.opportunity;

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      {/* Top nav bar */}
      <View style={[styles.navBar, { paddingTop: insets.top + 4, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.colors.surfaceAlt }]}>
          <AppText style={{ fontSize: 18, color: theme.colors.text }}>←</AppText>
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <View style={[styles.navAvatar, { backgroundColor: avatarBg }]}>
            <AppText style={styles.navAvatarText}>{ini}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.navName} color={theme.colors.text} numberOfLines={1}>{displayName}</AppText>
            {company ? <AppText style={styles.navCompany} color={theme.colors.textMuted} numberOfLines={1}>{company}</AppText> : null}
          </View>
        </View>
        <View style={styles.moreBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* 3 action buttons */}
        <View style={styles.actionRow}>
          {[
            { icon: '📞', label: 'Call', onPress: data.contactPhone ? () => handleCall(data.contactPhone!) : undefined },
            { icon: '✉', label: 'Email', onPress: data.contactEmail ? () => handleEmail(data.contactEmail!) : undefined },
            { icon: '📅', label: 'Follow up', onPress: () => setFollowUpModal(true) },
          ].map(a => (
            <TouchableOpacity
              key={a.label}
              onPress={a.onPress}
              disabled={!a.onPress}
              style={[styles.actionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: a.onPress ? 1 : 0.4 }]}
              activeOpacity={0.75}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
                <AppText style={{ fontSize: 18 }}>{a.icon}</AppText>
              </View>
              <AppText style={styles.actionLabel} color={theme.colors.text}>{a.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Opportunity / qualify card */}
        {opportunity ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('OpportunityDetail', { id: opportunity.id })}
            style={[styles.dealCard, { backgroundColor: DARK_NAVY }]}
            activeOpacity={0.85}
          >
            <View>
              <AppText style={styles.dealCardLabel}>OPPORTUNITY VALUE</AppText>
              <AppText style={styles.dealCardValue}>{formatCurrency(opportunity.value)}</AppText>
            </View>
            <View style={[styles.statusPill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <AppText style={styles.statusPillText} color="#FFFFFF">{opportunity.stage} ›</AppText>
            </View>
          </TouchableOpacity>
        ) : data.status === 'NEW' ? (
          <View style={[styles.dealCard, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 13, fontFamily: 'Inter-SemiBold' }} color={theme.colors.text}>Not yet qualified</AppText>
              <AppText style={{ fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 }} color={theme.colors.textMuted}>
                Qualify to create an opportunity
              </AppText>
            </View>
            <AppButton label="Qualify" size="sm" onPress={() => setQualifyModal(true)} />
          </View>
        ) : (
          <View style={[styles.dealCard, { backgroundColor: DARK_NAVY }]}>
            <View>
              <AppText style={styles.dealCardLabel}>STATUS</AppText>
              <AppText style={styles.dealCardValue}>{statusInfo.label}</AppText>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
              <AppText style={styles.statusPillText} color={statusInfo.color}>{statusInfo.label}</AppText>
            </View>
          </View>
        )}

        {/* Contact details */}
        {(data.contactEmail || data.contactPhone || data.address) && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText style={{ ...styles.sectionTitle, marginBottom: 12 }} color={theme.colors.text}>Contact details</AppText>
            {data.source && <ContactRow icon="◈" label="Source" value={data.source} />}
            {data.contactEmail && <ContactRow icon="✉" label="Email" value={data.contactEmail} />}
            {data.contactPhone && <ContactRow icon="☎" label="Phone" value={data.contactPhone} />}
            {data.address && <ContactRow icon="⌖" label="Address" value={data.address} />}
          </View>
        )}

        {/* Next best action */}
        {lastFollowUp && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText style={{ ...styles.sectionTitle, marginBottom: 12 }} color={theme.colors.text}>Next best action</AppText>
            <TouchableOpacity
              style={[styles.nextActionCard, { backgroundColor: '#EEF2FF' }]}
              activeOpacity={0.75}
              onPress={() => setFollowUpModal(true)}
            >
              <View style={[styles.nextActionIcon, { backgroundColor: PRIMARY }]}>
                <AppText style={{ fontSize: 16 }}>⚡</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.nextActionTitle} color={theme.colors.text} numberOfLines={1}>
                  {lastFollowUp.note}
                </AppText>
                <AppText style={styles.nextActionSub} color={theme.colors.textMuted}>
                  Last touch {lastFollowUp.createdAt ? new Date(lastFollowUp.createdAt).toLocaleString('en-IN', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </AppText>
              </View>
              <AppText style={{ fontSize: 18, color: PRIMARY }}>›</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Notes */}
        {data.notes && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText style={{ ...styles.sectionTitle, marginBottom: 8 }} color={theme.colors.text}>Notes</AppText>
            <AppText style={styles.notesText} color={theme.colors.textSecondary}>{data.notes}</AppText>
          </View>
        )}

        {/* Mark as lost — only meaningful before qualifying; once there's an
            Opportunity, closing it lost happens on the Opportunity itself. */}
        {data.status === 'NEW' && (
          <TouchableOpacity onPress={handleMarkLost} style={styles.lostBtn} activeOpacity={0.75}>
            <AppText style={styles.lostBtnText}>Mark as Lost</AppText>
          </TouchableOpacity>
        )}
      </ScrollView>

      <FollowUpModal
        visible={followUpModal}
        onClose={() => setFollowUpModal(false)}
        onSubmit={(d) => followUpMutation.mutate(d)}
        loading={followUpMutation.isPending}
      />

      <QualifyModal
        visible={qualifyModal}
        onClose={() => setQualifyModal(false)}
        onSubmit={(d) => qualifyMutation.mutate(d)}
        loading={qualifyMutation.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  navAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navAvatarText: { fontSize: 13, fontFamily: 'Inter-Bold', color: '#FFF' },
  navName: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  navCompany: { fontSize: 12, fontFamily: 'Inter-Regular' },
  moreBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  errorCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  actionRow: { flexDirection: 'row', padding: 16, gap: 10 },
  actionCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 8 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontFamily: 'Inter-SemiBold' },

  dealCard: { marginHorizontal: 16, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  dealCardLabel: { fontSize: 10, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 6 },
  dealCardValue: { fontSize: 30, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPillText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },

  section: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  updateLink: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  stagesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stageLabel: { fontSize: 9, fontFamily: 'Inter-Medium', textTransform: 'capitalize' },

  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  contactIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 13, fontFamily: 'Inter-Regular' },
  contactValue: { fontSize: 13, fontFamily: 'Inter-Medium', textAlign: 'right', flex: 1 },

  nextActionCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12 },
  nextActionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nextActionTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  nextActionSub: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  notesText: { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 22 },

  lostBtn: { marginHorizontal: 16, marginTop: 4, paddingVertical: 14, alignItems: 'center' },
  lostBtnText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#DC2626' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { padding: 20, paddingBottom: 36, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', marginBottom: 16 },
  channelRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  channelChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  noteInput: { borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'Inter-Regular', minHeight: 100, textAlignVertical: 'top', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14 },
});
