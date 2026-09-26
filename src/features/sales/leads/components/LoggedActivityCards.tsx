import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Zap, Users } from 'lucide-react-native';
import { AppText } from '@/components/common/AppText';
import type { FollowUp, LeadMeeting } from '@/services/api/leads.api';

function formatDateTime(val?: string | null): string {
  if (!val) return '';
  return new Date(val).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Shared "a follow-up/meeting was just logged" card — used on both
// LeadDetailScreen's Lead Journey accordion and LeadCreateScreen's wizard,
// so a newly-logged entry is visible immediately in both places instead of
// only surfacing a toast.
export function LoggedFollowUpCard({ item, theme }: { item: FollowUp; theme: any }) {
  return (
    <View style={[st.card, { backgroundColor: theme.colors.primaryLight }]}>
      <View style={[st.icon, { backgroundColor: theme.colors.primary }]}>
        <Zap size={18} color="#FFF" strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={st.note} color={theme.colors.text}>{item.note}</AppText>
        <AppText style={st.meta} color={theme.colors.textMuted}>
          {item.channel ? `${item.channel} · ` : ''}{formatDateTime(item.createdAt)}
        </AppText>
      </View>
    </View>
  );
}

export function LoggedMeetingCard({ item, theme }: { item: LeadMeeting; theme: any }) {
  return (
    <View style={[st.card, { backgroundColor: theme.colors.primaryLight }]}>
      <View style={[st.icon, { backgroundColor: theme.colors.primary }]}>
        <Users size={18} color="#FFF" strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={st.note} color={theme.colors.text}>{item.note}</AppText>
        <AppText style={st.meta} color={theme.colors.textMuted}>
          {formatDateTime(item.createdAt)}{item.visitLocation ? ` · ${item.visitLocation}` : ''}
        </AppText>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  meta: { fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 2 },
});
