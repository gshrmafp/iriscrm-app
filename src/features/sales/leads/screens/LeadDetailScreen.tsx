import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Phone, Mail, CalendarDays, MapPin,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Zap, Building2, User,
  Clock, Tag, Users, Check,
} from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { AppButton } from '@/components/common/AppButton';
import { Loader } from '@/components/feedback/Loader';
import { SalesStackParamList } from '@/features/sales/navigation/types';
import { leadsApi, type FollowUp, type LeadMeeting } from '@/services/api/leads.api';
import { canWinOpportunity, type OpportunityStage } from '@/services/api/opportunities.api';
import { DARK_NAVY } from '@/constants/brandColors';
import { useSilentLocationCapture } from '@/hooks/useSilentLocationCapture';
import { FollowUpModal, MeetingModal } from '@/features/sales/leads/components/FollowUpMeetingModals';
import { LoggedFollowUpCard, LoggedMeetingCard } from '@/features/sales/leads/components/LoggedActivityCards';
import { WinPurchaseOrderForm } from '@/features/sales/opportunities/components/WinPurchaseOrderForm';

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
  QUOTATION:      { label: 'Quotation',      bg: '#FEF3C7', color: '#D97706' },
  FOLLOWUP:       { label: 'Follow-up',      bg: '#FFEDD5', color: '#C2410C' },
  MEETING:        { label: 'Meeting',        bg: '#E0E7FF', color: '#4338CA' },
  PURCHASE_ORDER: { label: 'Purchase Order', bg: '#DCFCE7', color: '#15803D' },
  LOST:           { label: 'Lost',           bg: '#FEE2E2', color: '#991B1B' },
};

function formatCurrency(val: string | number): string {
  const num = typeof val === 'string' ? Number(val) : val;
  if (!num) return '—';
  return `₹${num.toLocaleString('en-IN')}`;
}

function formatDate(val?: string | null): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(val?: string | null): string {
  if (!val) return '';
  return new Date(val).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const QUALIFICATION_LABELS: Record<string, string> = {
  NOT_QUALIFIED: 'Not Qualified',
  FUTURE_POTENTIAL: 'Future Potential',
  REQUIREMENT_IDENTIFIED: 'Requirement Identified',
};

// --- Lead Journey ---
// Mirrors opportunities.api.ts's FORWARD_STAGE chain (QUOTATION -> FOLLOWUP ->
// MEETING -> PURCHASE_ORDER) as a flat, index-comparable order so the
// accordion can mark a stage "reached" once the opportunity's current stage
// is at or past it. LOST isn't part of this forward chain (mirrors
// FORWARD_STAGE, where LOST has no forward target of its own).
const STAGE_ORDER = ['QUOTATION', 'FOLLOWUP', 'MEETING', 'PURCHASE_ORDER'] as const;

function stageReached(currentStage: string | undefined, target: typeof STAGE_ORDER[number]): boolean {
  if (!currentStage) return false;
  const curIdx = STAGE_ORDER.indexOf(currentStage as typeof STAGE_ORDER[number]);
  const targetIdx = STAGE_ORDER.indexOf(target);
  return curIdx !== -1 && curIdx >= targetIdx;
}

// A stage counts as "reached" if the opportunity's durable stage-history audit
// trail ever recorded a real transition into it (survives the opportunity
// later moving to LOST), OR the opportunity is currently at/past it and hasn't
// been lost. Mirrors the web app's LeadJourney logic exactly.
function stageCompleted(
  opportunity: { stage: string; stageHistory?: { toStage: string }[] } | undefined,
  target: typeof STAGE_ORDER[number],
): boolean {
  if (!opportunity) return false;
  const everReached = opportunity.stageHistory?.some((h) => h.toStage === target) ?? false;
  if (everReached) return true;
  return stageReached(opportunity.stage, target) && opportunity.stage !== 'LOST';
}

type JourneyStageKey = 'NEW_LEAD' | 'CONTACTED' | 'QUALIFIED' | 'QUOTATION' | 'FOLLOWUP' | 'MEETING' | 'PURCHASE_ORDER';

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

// --- Journey field row (compact label/value, skipped entirely when empty) ---
function JourneyField({ label, value, theme }: { label: string; value?: string | null; theme: any }) {
  if (!value) return null;
  return (
    <View style={st.journeyFieldRow}>
      <AppText style={st.detailLabel} color={theme.colors.textMuted}>{label}</AppText>
      <AppText style={st.detailValue} color={theme.colors.text}>{value}</AppText>
    </View>
  );
}

// Logged follow-up/meeting cards live in a shared component — reused by
// LeadCreateScreen's wizard so a newly-logged entry shows up there instantly too.

// --- Lead Journey accordion section ---
// A simple custom accordion: no animation library, just a boolean per
// section (tracked by the parent as a Set of expanded keys) toggling whether
// the content View renders at all. Every section carries its own inline Log
// Follow-up / Log Meeting buttons wired to the same modals used elsewhere on
// this screen, disabled once the lead/opportunity has reached a terminal state.
function JourneySection({
  theme, title, completed, expanded, onToggle, onLogFollowUp, onLogMeeting, terminal, hideActions, children,
}: {
  theme: any;
  title: string;
  completed: boolean;
  expanded: boolean;
  onToggle: () => void;
  onLogFollowUp: () => void;
  onLogMeeting: () => void;
  terminal: boolean;
  // Site Visit and Contacted are one-time intake steps — once completed,
  // they're locked history, not an ongoing stage a follow-up/meeting could
  // still be "at." Logging remains available on every later stage.
  hideActions?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View style={[st.journeyItem, { borderColor: theme.colors.border }]}>
      <TouchableOpacity onPress={onToggle} style={st.journeyHeader} activeOpacity={0.7}>
        <View style={st.journeyHeaderLeft}>
          <View style={[st.journeyStatusDot, { backgroundColor: completed ? '#059669' : theme.colors.surfaceAlt, borderColor: completed ? '#059669' : theme.colors.border }]}>
            {completed ? <Check size={12} color="#FFF" strokeWidth={3} /> : null}
          </View>
          <AppText style={st.journeyTitle} color={theme.colors.text}>{title}</AppText>
        </View>
        {expanded ? (
          <ChevronUp size={18} color={theme.colors.textMuted} strokeWidth={2} />
        ) : (
          <ChevronDown size={18} color={theme.colors.textMuted} strokeWidth={2} />
        )}
      </TouchableOpacity>

      {expanded && (
        <View style={st.journeyBody}>
          {children}
          {!hideActions && (
            <View style={st.journeyActionsRow}>
              <TouchableOpacity onPress={onLogFollowUp} disabled={terminal}
                style={[st.journeyActionBtn, { borderColor: theme.colors.border, opacity: terminal ? 0.4 : 1 }]} activeOpacity={0.75}>
                <CalendarDays size={14} color={theme.colors.primary} strokeWidth={2} />
                <AppText style={st.journeyActionLabel} color={theme.colors.primary}>Log Follow-up</AppText>
              </TouchableOpacity>
              <TouchableOpacity onPress={onLogMeeting} disabled={terminal}
                style={[st.journeyActionBtn, { borderColor: theme.colors.border, opacity: terminal ? 0.4 : 1 }]} activeOpacity={0.75}>
                <Users size={14} color={theme.colors.primary} strokeWidth={2} />
                <AppText style={st.journeyActionLabel} color={theme.colors.primary}>Log Meeting</AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
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
  const [meetingModal, setMeetingModal] = useState(false);
  const [showWinForm, setShowWinForm] = useState(false);
  const { location: meetingLocation, capture: captureMeetingLocation, reset: resetMeetingLocation } = useSilentLocationCapture();

  // Lead Journey accordion — every section is open by default; tracking
  // COLLAPSED keys (rather than expanded ones) means a section that only
  // starts rendering later (e.g. Quotation, once the lead is qualified) is
  // open by default too, since it was never added to this set.
  const [collapsedKeys, setCollapsedKeys] = useState<Set<JourneyStageKey>>(new Set());
  const toggleJourneySection = (key: JourneyStageKey) => {
    setCollapsedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };
  const collapseAll = (keys: JourneyStageKey[]) => setCollapsedKeys(new Set(keys));

  const { data, isLoading, isError } = useQuery({
    queryKey: ['lead', route.params.id],
    queryFn: () => leadsApi.getOne(route.params.id).then(r => r.data),
    refetchOnMount: 'always',
  });

  // The "current" stage — the last completed one, right before whatever's
  // still pending — is the ONLY section that carries the Log Follow-up/Meeting
  // actions (every step behind it is locked history, every step ahead of it
  // hasn't been reached yet).
  const currentJourneyKey: JourneyStageKey = (() => {
    if (data?.opportunity) {
      // FOLLOWUP/MEETING aren't their own visible sections (folded into
      // Quotation) — only PURCHASE_ORDER gets its own row.
      return data.opportunity.stage === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER' : 'QUOTATION';
    }
    if (data?.step3CompletedAt) return 'QUALIFIED';
    if (data?.step2CompletedAt) return 'CONTACTED';
    return 'NEW_LEAD';
  })();

  // Logging a follow-up or meeting can auto-advance the linked opportunity's
  // stage on the backend (QUOTATION -> FOLLOWUP / FOLLOWUP,QUOTATION ->
  // MEETING) — refetch both the lead and the opportunity so the UI reflects it.
  const invalidateAfterLogging = () => {
    queryClient.invalidateQueries({ queryKey: ['lead', route.params.id] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    if (data?.opportunity?.id) {
      queryClient.invalidateQueries({ queryKey: ['opportunity', data.opportunity.id] });
    }
  };

  const followUpMutation = useMutation({
    mutationFn: (body: { note: string; channel: string }) => leadsApi.addFollowUp(route.params.id, body),
    onSuccess: () => {
      invalidateAfterLogging();
      setFollowUpModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not save follow-up.'),
  });

  // Silently capture GPS in the background as soon as the Log Meeting modal
  // opens (same permission/coords flow as LeadCreateScreen's Step 1), so it's
  // usually resolved by the time the user finishes typing the note.
  useEffect(() => {
    if (meetingModal) {
      resetMeetingLocation();
      void captureMeetingLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingModal]);

  const meetingMutation = useMutation({
    mutationFn: (body: { note: string }) => leadsApi.addMeeting(route.params.id, { note: body.note, ...meetingLocation }),
    onSuccess: () => {
      invalidateAfterLogging();
      setMeetingModal(false);
    },
    onError: () => Alert.alert('Error', 'Could not save meeting.'),
  });

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
  const followUps = data.followUps ?? [];
  const meetings = data.meetings ?? [];
  // Follow-up and Meeting aren't their own Journey sections (see below) — a
  // follow-up/meeting logged while the opportunity had already internally
  // progressed to FOLLOWUP/MEETING still folds into the Quotation section's
  // list, since all of it is "activity during the deal."
  const QUOTATION_ALIASES = ['QUOTATION', 'FOLLOWUP', 'MEETING'];
  const followUpsAt = (stage: string) => followUps.filter(f =>
    stage === 'QUOTATION' ? QUOTATION_ALIASES.includes(f.loggedAtStage ?? '') : f.loggedAtStage === stage);
  const meetingsAt = (stage: string) => meetings.filter(m =>
    stage === 'QUOTATION' ? QUOTATION_ALIASES.includes(m.loggedAtStage ?? '') : m.loggedAtStage === stage);

  // Status badge: if opportunity exists use its stage, otherwise use lead status
  const badge = opportunity
    ? OPP_STAGE_INFO[opportunity.stage] ?? { label: opportunity.stage, bg: theme.colors.surfaceAlt, color: theme.colors.textMuted }
    : STATUS_INFO[data.status] ?? { label: data.status, bg: theme.colors.surfaceAlt, color: theme.colors.textMuted };

  // Follow-up/Meeting logging is always available except in a terminal state:
  // the lead itself is Lost, or its opportunity has closed (Purchase Order or Lost).
  const terminal = data.status === 'LOST' || opportunity?.stage === 'PURCHASE_ORDER' || opportunity?.stage === 'LOST';

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
        ) : data.status === 'NEW' && (data.currentStep ?? 3) < 3 ? (
          <View style={[st.dealCard, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 13, fontFamily: 'Inter-SemiBold' }} color={theme.colors.text}>Incomplete — Step {data.currentStep ?? 1}/3</AppText>
              <AppText style={{ fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 }} color={theme.colors.textMuted}>Finish the wizard to qualify this lead</AppText>
            </View>
            <AppButton label="Continue" size="sm" onPress={() => navigation.navigate('LeadCreate', { resumeLeadId: data.id })} />
          </View>
        ) : data.status === 'NEW' ? (
          <View style={[st.dealCard, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 13, fontFamily: 'Inter-SemiBold' }} color={theme.colors.text}>Not yet qualified</AppText>
              <AppText style={{ fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 }} color={theme.colors.textMuted}>
                {data.qualificationPath === 'FUTURE_POTENTIAL' ? 'Follow-up scheduled from the qualification step' : 'No opportunity created for this lead'}
              </AppText>
            </View>
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

        {/* Lead Journey — one accordion section per named stage, each showing
            what happened at that stage plus any follow-up/meeting logged
            while it was active (grouped by loggedAtStage), with its own
            inline Log Follow-up / Log Meeting shortcuts. Replaces the old
            flat "Last Follow-up" / "Meetings" / "Qualification" sections —
            all of that content now lives inside the relevant stage below. */}
        <View style={[st.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={st.journeyHeaderRow}>
            <AppText style={st.sectionTitle} color={theme.colors.text}>Lead Journey</AppText>
            <View style={st.journeyHeaderActions}>
              <TouchableOpacity onPress={() => setCollapsedKeys(new Set())}>
                <AppText style={st.collapseAllLabel} color={theme.colors.primary}>Expand all</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => collapseAll(opportunity
                  ? ['NEW_LEAD', 'CONTACTED', 'QUALIFIED', 'QUOTATION', 'PURCHASE_ORDER']
                  : ['NEW_LEAD', 'CONTACTED', 'QUALIFIED'])}
              >
                <AppText style={st.collapseAllLabel} color={theme.colors.primary}>Collapse all</AppText>
              </TouchableOpacity>
            </View>
          </View>

          <JourneySection theme={theme} title="New Lead" completed={!!data.step1CompletedAt}
            expanded={!collapsedKeys.has('NEW_LEAD')} onToggle={() => toggleJourneySection('NEW_LEAD')}
            onLogFollowUp={() => setFollowUpModal(true)} onLogMeeting={() => setMeetingModal(true)} terminal={terminal}
            hideActions={currentJourneyKey !== 'NEW_LEAD'}>
            <JourneyField label="Company" value={data.companyName} theme={theme} />
            <JourneyField label="Remarks" value={data.remarks} theme={theme} />
            <JourneyField label="Visit Location" value={data.visitLocation} theme={theme} />
            {followUpsAt('NEW_LEAD').map(f => <View key={f.id} style={st.journeyItemSpacer}><LoggedFollowUpCard item={f} theme={theme} /></View>)}
            {meetingsAt('NEW_LEAD').map(m => <View key={m.id} style={st.journeyItemSpacer}><LoggedMeetingCard item={m} theme={theme} /></View>)}
          </JourneySection>

          <JourneySection theme={theme} title="Contacted" completed={!!data.step2CompletedAt}
            expanded={!collapsedKeys.has('CONTACTED')} onToggle={() => toggleJourneySection('CONTACTED')}
            onLogFollowUp={() => setFollowUpModal(true)} onLogMeeting={() => setMeetingModal(true)} terminal={terminal}
            hideActions={currentJourneyKey !== 'CONTACTED'}>
            <JourneyField label="Contact Name" value={data.contactName} theme={theme} />
            <JourneyField label="Phone" value={data.contactPhone} theme={theme} />
            <JourneyField label="Email" value={data.contactEmail} theme={theme} />
            <JourneyField label="Discussion Note" value={data.discussionNote} theme={theme} />
            {followUpsAt('CONTACTED').map(f => <View key={f.id} style={st.journeyItemSpacer}><LoggedFollowUpCard item={f} theme={theme} /></View>)}
            {meetingsAt('CONTACTED').map(m => <View key={m.id} style={st.journeyItemSpacer}><LoggedMeetingCard item={m} theme={theme} /></View>)}
          </JourneySection>

          <JourneySection theme={theme} title="Qualified" completed={!!data.step3CompletedAt}
            expanded={!collapsedKeys.has('QUALIFIED')} onToggle={() => toggleJourneySection('QUALIFIED')}
            onLogFollowUp={() => setFollowUpModal(true)} onLogMeeting={() => setMeetingModal(true)} terminal={terminal}
            hideActions={currentJourneyKey !== 'QUALIFIED'}>
            <JourneyField label="Path" value={data.qualificationPath ? QUALIFICATION_LABELS[data.qualificationPath] ?? data.qualificationPath.replace(/_/g, ' ') : undefined} theme={theme} />
            <JourneyField label="Lost Reason" value={data.lostReason} theme={theme} />
          </JourneySection>

          {opportunity && (
            <JourneySection theme={theme} title="Quotation" completed={stageCompleted(opportunity, 'QUOTATION')}
              expanded={!collapsedKeys.has('QUOTATION')} onToggle={() => toggleJourneySection('QUOTATION')}
              onLogFollowUp={() => setFollowUpModal(true)} onLogMeeting={() => setMeetingModal(true)} terminal={terminal}
              hideActions={currentJourneyKey !== 'QUOTATION'}>
              <JourneyField label="Quotation Ref" value={opportunity.initialQuotationRef} theme={theme} />
              <JourneyField label="Quotation Date" value={opportunity.initialQuotationDate ? formatDate(opportunity.initialQuotationDate) : undefined} theme={theme} />
              <JourneyField label="Quotation Amount" value={opportunity.initialQuotationAmount ? formatCurrency(opportunity.initialQuotationAmount) : undefined} theme={theme} />
              {followUpsAt('QUOTATION').map(f => <View key={f.id} style={st.journeyItemSpacer}><LoggedFollowUpCard item={f} theme={theme} /></View>)}
              {meetingsAt('QUOTATION').map(m => <View key={m.id} style={st.journeyItemSpacer}><LoggedMeetingCard item={m} theme={theme} /></View>)}
            </JourneySection>
          )}

          {opportunity && (
            <JourneySection theme={theme} title="Purchase Order" completed={stageCompleted(opportunity, 'PURCHASE_ORDER')}
              expanded={!collapsedKeys.has('PURCHASE_ORDER')} onToggle={() => toggleJourneySection('PURCHASE_ORDER')}
              onLogFollowUp={() => setFollowUpModal(true)} onLogMeeting={() => setMeetingModal(true)} terminal={terminal}
              hideActions={currentJourneyKey !== 'PURCHASE_ORDER'}>
              <JourneyField label="PO Number" value={opportunity.poNumber} theme={theme} />
              <JourneyField label="PO Date" value={opportunity.poDate ? formatDate(opportunity.poDate) : undefined} theme={theme} />
              <JourneyField label="PO Amount" value={opportunity.poAmount ? formatCurrency(opportunity.poAmount) : undefined} theme={theme} />
              <JourneyField label="PO Remarks" value={opportunity.poRemarks} theme={theme} />
              {followUpsAt('PURCHASE_ORDER').map(f => <View key={f.id} style={st.journeyItemSpacer}><LoggedFollowUpCard item={f} theme={theme} /></View>)}
              {meetingsAt('PURCHASE_ORDER').map(m => <View key={m.id} style={st.journeyItemSpacer}><LoggedMeetingCard item={m} theme={theme} /></View>)}
              {/* Win the deal directly from Lead Details — no need to
                  navigate to the separate Opportunity screen. */}
              {canWinOpportunity(opportunity.stage as OpportunityStage) && (
                showWinForm ? (
                  <View style={st.journeyItemSpacer}>
                    <WinPurchaseOrderForm
                      opportunityId={opportunity.id}
                      onCancel={() => setShowWinForm(false)}
                      onWon={() => setShowWinForm(false)}
                      bordered={false}
                    />
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => setShowWinForm(true)} style={[st.journeyActionBtn, { borderColor: theme.colors.border, marginTop: 8 }]} activeOpacity={0.75}>
                    <AppText style={st.journeyActionLabel} color={theme.colors.primary}>Win — Capture Purchase Order</AppText>
                  </TouchableOpacity>
                )
              )}
            </JourneySection>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <FollowUpModal visible={followUpModal} onClose={() => setFollowUpModal(false)}
        onSubmit={(d) => followUpMutation.mutate(d)} loading={followUpMutation.isPending} />
      <MeetingModal visible={meetingModal} onClose={() => setMeetingModal(false)}
        onSubmit={(d) => meetingMutation.mutate(d)} loading={meetingMutation.isPending} />
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
  journeyHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  journeyHeaderActions: { flexDirection: 'row', gap: 14 },
  collapseAllLabel: { fontSize: 13, fontFamily: 'Inter-Medium', marginBottom: 12 },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  detailIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  detailLabel: { fontSize: 11, fontFamily: 'Inter-Medium', textTransform: 'uppercase', letterSpacing: 0.3 },
  detailValue: { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 20, marginTop: 1 },

  infoText: { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 22 },

  nextActionCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12 },
  nextActionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  loggedItemNote: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  loggedItemMeta: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },

  // --- Lead Journey accordion ---
  journeyItem: { borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  journeyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 },
  journeyHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  journeyStatusDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  journeyTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  journeyBody: { paddingHorizontal: 14, paddingBottom: 14 },
  journeyFieldRow: { marginBottom: 8 },
  journeyItemSpacer: { marginTop: 8 },
  journeyEmptyText: { fontSize: 13, fontFamily: 'Inter-Regular', fontStyle: 'italic', marginBottom: 4 },
  journeyActionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  journeyActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  journeyActionLabel: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
});
