import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Linking,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Phone, Mail, CalendarDays, MapPin, MoreHorizontal,
  ChevronLeft, ChevronRight, Zap, Building2, User,
  MessageSquare, FileText, Clock, Tag,
} from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { AppButton } from '@/components/common/AppButton';
import { Loader } from '@/components/feedback/Loader';
import { SalesStackParamList } from '@/features/sales/navigation/types';
import { leadsApi } from '@/services/api/leads.api';
import { DARK_NAVY } from '@/constants/brandColors';

type RouteProps = RouteProp<SalesStackParamList, 'LeadDetail'>;
type Nav = NativeStackNavigationProp<SalesStackParamList>;

const AVATAR_COLORS = [
  '#3B4ECC', '#7C3AED', '#059669', '#B45309',
  '#DC2626', '#0891B2', '#9333EA', '#65A30D',
];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const STATUS_INFO: Record<string, { label: string; bg: string; color: string }> = {
  NEW:       { label: 'New',       bg: '#FEF3C7', color: '#D97706' },
  QUALIFIED: { label: 'Qualified', bg: '#D1FAE5', color: '#065F46' },
  LOST:      { label: 'Lost',      bg: '#FEE2E2', color: '#991B1B' },
};

const OPP_STAGE_INFO: Record<string, { label: string; bg: string; color: string }> = {
  NEW:         { label: 'New Visit',   bg: '#DBEAFE', color: '#1D4ED8' },
  CONTACTED:   { label: 'Contacted',   bg: '#E9D5FF', color: '#7C3AED' },
  QUALIFIED:   { label: 'Qualified',   bg: '#D1FAE5', color: '#065F46' },
  QUOTED:      { label: 'Quotation',   bg: '#FEF3C7', color: '#D97706' },
  NEGOTIATION: { label: 'Follow-ups',  bg: '#FFEDD5', color: '#C2410C' },
  MEETING:     { label: 'Meeting',     bg: '#E0E7FF', color: '#4338CA' },
  WON:         { label: 'PO',          bg: '#DCFCE7', color: '#15803D' },
  LOST:        { label: 'Lost',        bg: '#FEE2E2', color: '#991B1B' },
};

const DEAL_TYPES = [
  { label: 'Installation', value: 'INSTALLATION' },
  { label: 'AMC', value: 'AMC' },
  { label: 'Product', value: 'PRODUCT' },
];

function formatCurrency(val: string | number): string {
  const num = typeof val === 'string' ? Number(val) : val;
  if (!num) return '—';
  return `₹${num.toLocaleString('en-IN')}`;
}

function useKeyboardVisible() {
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

function QualifyModal({ visible, onClose, onSubmit, loading }: {
  visible: boolean; onClose: () => void;
  onSubmit: (data: { dealType: string; value: number }) => void; loading: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [dealType, setDealType] = useState('INSTALLATION');
  const [value, setValue] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[st.modalSheet, { backgroundColor: theme.colors.surface, paddingBottom: 20 + (keyboardVisible ? 0 : insets.bottom) }]}>
          <View style={[st.modalHandle, { backgroundColor: theme.colors.border }]} />
          <AppText style={st.modalTitle} color={theme.colors.text}>Qualify into an opportunity</AppText>
          <View style={st.channelRow}>
            {DEAL_TYPES.map(t => (
              <TouchableOpacity key={t.value} onPress={() => setDealType(t.value)}
                style={[st.channelChip, { backgroundColor: dealType === t.value ? theme.colors.primary : theme.colors.surfaceAlt }]}>
                <AppText style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: dealType === t.value ? '#FFF' : theme.colors.textSecondary }}>{t.label}</AppText>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput value={value} onChangeText={setValue} placeholder="Deal value (₹)" placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric" style={[st.noteInput, { backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, minHeight: 48 }]} />
          <View style={st.modalActions}>
            <TouchableOpacity onPress={onClose} style={[st.cancelBtn, { borderColor: theme.colors.border }]}>
              <AppText style={{ fontSize: 14, fontFamily: 'Inter-Medium', color: theme.colors.textSecondary }}>Cancel</AppText>
            </TouchableOpacity>
            <AppButton label="Create opportunity" onPress={() => { const num = Number(value); if (dealType && num > 0) onSubmit({ dealType, value: num }); }}
              loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FollowUpModal({ visible, onClose, onSubmit, loading }: {
  visible: boolean; onClose: () => void;
  onSubmit: (data: { note: string; channel: string }) => void; loading: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState('call');
  const channels = ['call', 'email', 'meeting', 'visit'];
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

// --- Detail Row ---
function DetailRow({ Icon, label, value, onPress }: { Icon: React.ComponentType<any>; label: string; value: string; onPress?: () => void }) {
  const theme = useTheme();
  const content = (
    <View style={st.detailRow}>
      <View style={[st.detailIcon, { backgroundColor: theme.colors.primaryLight }]}>
        <Icon size={15} color={theme.colors.primary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={st.detailLabel} color={theme.colors.textMuted}>{label}</AppText>
        <AppText style={[st.detailValue, onPress && { color: theme.colors.primary }]} color={theme.colors.text}>{value}</AppText>
      </View>
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  return content;
}

// --- Info Block ---
function InfoBlock({ title, text, theme }: { title: string; text: string; theme: any }) {
  return (
    <View style={[st.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <AppText style={st.sectionTitle} color={theme.colors.text}>{title}</AppText>
      <AppText style={st.infoText} color={theme.colors.textSecondary}>{text}</AppText>
    </View>
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
    refetchOnMount: 'always',
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

  if (isLoading) return <Screen edges={['left', 'right', 'bottom']}><Loader /></Screen>;
  if (isError || !data) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <View style={st.errorCenter}>
          <AppText style={{ color: theme.colors.textMuted }}>Failed to load lead.</AppText>
        </View>
      </Screen>
    );
  }

  const displayName = data.contactName || data.companyName || 'Unknown';
  const company = data.companyName ?? '';
  const ini = displayName.split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase() || '?';
  const avatarBg = avatarColor(displayName);
  const opportunity = data.opportunity;
  const lastFollowUp = data.followUps?.[0];

  // Status badge: if opportunity exists use its stage, otherwise use lead status
  const badge = opportunity
    ? OPP_STAGE_INFO[opportunity.stage] ?? { label: opportunity.stage, bg: theme.colors.surfaceAlt, color: theme.colors.textMuted }
    : STATUS_INFO[data.status] ?? { label: data.status, bg: theme.colors.surfaceAlt, color: theme.colors.textMuted };

  const createdDate = new Date(data.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      {/* Top nav bar */}
      <View style={[st.navBar, { paddingTop: insets.top + 4, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[st.backBtn, { backgroundColor: theme.colors.surfaceAlt }]}>
          <ChevronLeft size={20} color={theme.colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={st.navCenter}>
          <View style={[st.navAvatar, { backgroundColor: avatarBg }]}>
            <AppText style={st.navAvatarText}>{ini}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={st.navName} color={theme.colors.text} numberOfLines={1}>{displayName}</AppText>
            {company && company !== displayName ? <AppText style={st.navCompany} color={theme.colors.textMuted} numberOfLines={1}>{company}</AppText> : null}
          </View>
          <View style={[st.statusPill, { backgroundColor: badge.bg }]}>
            <AppText style={{ fontSize: 11, fontFamily: 'Inter-SemiBold', color: badge.color }}>{badge.label}</AppText>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>

        {/* Quick actions */}
        <View style={st.actionRow}>
          {[
            { Icon: Phone, label: 'Call', onPress: data.contactPhone ? () => Linking.openURL(`tel:${data.contactPhone}`).catch(() => {}) : undefined },
            { Icon: Mail, label: 'Email', onPress: data.contactEmail ? () => Linking.openURL(`mailto:${data.contactEmail}`).catch(() => {}) : undefined },
            { Icon: CalendarDays, label: 'Follow up', onPress: () => setFollowUpModal(true) },
          ].map(a => (
            <TouchableOpacity key={a.label} onPress={a.onPress} disabled={!a.onPress}
              style={[st.actionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: a.onPress ? 1 : 0.4 }]} activeOpacity={0.75}>
              <View style={[st.actionIcon, { backgroundColor: theme.colors.primaryLight }]}>
                <a.Icon size={20} color={theme.colors.primary} strokeWidth={2} />
              </View>
              <AppText style={st.actionLabel} color={theme.colors.text}>{a.label}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Opportunity / qualify card */}
        {opportunity ? (
          <TouchableOpacity onPress={() => navigation.navigate('OpportunityDetail', { id: opportunity.id })}
            style={[st.dealCard, { backgroundColor: DARK_NAVY }]} activeOpacity={0.85}>
            <View>
              <AppText style={st.dealCardLabel}>OPPORTUNITY VALUE</AppText>
              <AppText style={st.dealCardValue}>{formatCurrency(opportunity.value)}</AppText>
            </View>
            <View style={[st.oppStagePill, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <AppText style={{ fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#FFF' }}>
                {OPP_STAGE_INFO[opportunity.stage]?.label ?? opportunity.stage}
              </AppText>
              <ChevronRight size={14} color="#FFFFFF" strokeWidth={2} />
            </View>
          </TouchableOpacity>
        ) : data.status === 'NEW' ? (
          <View style={[st.dealCard, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 13, fontFamily: 'Inter-SemiBold' }} color={theme.colors.text}>Not yet qualified</AppText>
              <AppText style={{ fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 }} color={theme.colors.textMuted}>Qualify to create an opportunity</AppText>
            </View>
            <AppButton label="Qualify" size="sm" onPress={() => setQualifyModal(true)} />
          </View>
        ) : (
          <View style={[st.dealCard, { backgroundColor: DARK_NAVY }]}>
            <View>
              <AppText style={st.dealCardLabel}>STATUS</AppText>
              <AppText style={st.dealCardValue}>{badge.label}</AppText>
            </View>
            <View style={[st.oppStagePill, { backgroundColor: badge.bg }]}>
              <AppText style={{ fontSize: 12, fontFamily: 'Inter-SemiBold', color: badge.color }}>{badge.label}</AppText>
            </View>
          </View>
        )}

        {/* Lead Info Card */}
        <View style={[st.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <AppText style={st.sectionTitle} color={theme.colors.text}>Lead Info</AppText>
          <DetailRow Icon={Tag} label="Reference" value={data.refNo} />
          <DetailRow Icon={Building2} label="Company" value={company || '—'} />
          {data.source && <DetailRow Icon={FileText} label="Source" value={data.source} />}
          <DetailRow Icon={Clock} label="Created" value={createdDate} />
          {data.owner && <DetailRow Icon={User} label="Owner" value={data.owner.name} />}
        </View>

        {/* Contact Details */}
        {(data.contactName || data.contactPhone || data.contactEmail) && (
          <View style={[st.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText style={st.sectionTitle} color={theme.colors.text}>Contact Details</AppText>
            {data.contactName && <DetailRow Icon={User} label="Name" value={data.contactName} />}
            {data.contactPhone && (
              <DetailRow Icon={Phone} label="Phone" value={data.contactPhone}
                onPress={() => Linking.openURL(`tel:${data.contactPhone}`).catch(() => {})} />
            )}
            {data.contactEmail && (
              <DetailRow Icon={Mail} label="Email" value={data.contactEmail}
                onPress={() => Linking.openURL(`mailto:${data.contactEmail}`).catch(() => {})} />
            )}
            {data.address && <DetailRow Icon={MapPin} label="Address" value={data.address} />}
          </View>
        )}

        {/* Visit Location */}
        {(data.visitLocation || data.gpsLatitude) && (
          <View style={[st.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText style={st.sectionTitle} color={theme.colors.text}>Visit Location</AppText>
            {data.visitLocation && <DetailRow Icon={MapPin} label="Address" value={data.visitLocation} />}
          </View>
        )}

        {/* Remarks */}
        {data.remarks && <InfoBlock title="Remarks" text={data.remarks} theme={theme} />}

        {/* Discussion Note */}
        {data.discussionNote && <InfoBlock title="Discussion Note" text={data.discussionNote} theme={theme} />}

        {/* Notes */}
        {data.notes && <InfoBlock title="Notes" text={data.notes} theme={theme} />}

        {/* Next best action */}
        {lastFollowUp && (
          <View style={[st.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText style={st.sectionTitle} color={theme.colors.text}>Last Follow-up</AppText>
            <TouchableOpacity style={[st.nextActionCard, { backgroundColor: theme.colors.primaryLight }]} activeOpacity={0.75}
              onPress={() => setFollowUpModal(true)}>
              <View style={[st.nextActionIcon, { backgroundColor: theme.colors.primary }]}>
                <Zap size={18} color="#FFF" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 14, fontFamily: 'Inter-SemiBold' }} color={theme.colors.text}>{lastFollowUp.note}</AppText>
                <AppText style={{ fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 }} color={theme.colors.textMuted}>
                  {lastFollowUp.channel ? `${lastFollowUp.channel} · ` : ''}
                  {lastFollowUp.createdAt ? new Date(lastFollowUp.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </AppText>
              </View>
              <ChevronRight size={18} color={theme.colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {/* Qualification path */}
        {data.qualificationPath && (
          <View style={[st.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <AppText style={st.sectionTitle} color={theme.colors.text}>Qualification</AppText>
            <DetailRow Icon={FileText} label="Path" value={data.qualificationPath.replace(/_/g, ' ')} />
            {data.lostReason && <DetailRow Icon={FileText} label="Lost Reason" value={data.lostReason} />}
          </View>
        )}

        {/* Mark as Lost */}
        {data.status === 'NEW' && !opportunity && (
          <TouchableOpacity onPress={handleMarkLost} style={st.lostBtn} activeOpacity={0.75}>
            <AppText style={st.lostBtnText}>Mark as Lost</AppText>
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <FollowUpModal visible={followUpModal} onClose={() => setFollowUpModal(false)}
        onSubmit={(d) => followUpMutation.mutate(d)} loading={followUpMutation.isPending} />
      <QualifyModal visible={qualifyModal} onClose={() => setQualifyModal(false)}
        onSubmit={(d) => qualifyMutation.mutate(d)} loading={qualifyMutation.isPending} />
    </Screen>
  );
}

const st = StyleSheet.create({
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  navAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navAvatarText: { fontSize: 13, fontFamily: 'Inter-Bold', color: '#FFF' },
  navName: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  navCompany: { fontSize: 12, fontFamily: 'Inter-Regular' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  scroll: { paddingBottom: 40 },
  errorCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  actionRow: { flexDirection: 'row', padding: 16, gap: 10 },
  actionCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center', gap: 8 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontFamily: 'Inter-SemiBold' },

  dealCard: { marginHorizontal: 16, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  dealCardLabel: { fontSize: 10, fontFamily: 'Inter-SemiBold', color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 6 },
  dealCardValue: { fontSize: 30, lineHeight: 36, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  oppStagePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },

  section: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold', marginBottom: 12 },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  detailIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  detailLabel: { fontSize: 11, fontFamily: 'Inter-Medium', textTransform: 'uppercase', letterSpacing: 0.3 },
  detailValue: { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 20, marginTop: 1 },

  infoText: { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 22 },

  nextActionCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12 },
  nextActionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  lostBtn: { marginHorizontal: 16, marginTop: 4, paddingVertical: 14, alignItems: 'center' },
  lostBtnText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#DC2626' },

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
