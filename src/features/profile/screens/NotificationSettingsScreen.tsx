import React, { useState } from 'react';
import { ScrollView, View, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Bell, MessageSquare, CalendarCheck, AlertTriangle, UserPlus } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { getPreference, setPreference } from '@/services/storage/preferences';

interface NotifPref {
  key: string;
  label: string;
  subtitle: string;
  Icon: React.ComponentType<any>;
  default: boolean;
}

const NOTIFICATION_PREFS: NotifPref[] = [
  { key: 'notif_follow_up_due', label: 'Follow-up reminders', subtitle: 'Get notified when a follow-up is due', Icon: CalendarCheck, default: true },
  { key: 'notif_lead_assigned', label: 'Lead assignments', subtitle: 'When a new lead is assigned to you', Icon: UserPlus, default: true },
  { key: 'notif_comments', label: 'Comments & mentions', subtitle: 'When someone mentions you or comments', Icon: MessageSquare, default: true },
  { key: 'notif_status_changes', label: 'Status changes', subtitle: 'When a lead or opportunity status changes', Icon: Bell, default: true },
  { key: 'notif_overdue', label: 'Overdue alerts', subtitle: 'When a follow-up becomes overdue', Icon: AlertTriangle, default: true },
];

export function NotificationSettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const p of NOTIFICATION_PREFS) initial[p.key] = p.default;
    return initial;
  });

  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    (async () => {
      const stored: Record<string, boolean> = {};
      for (const p of NOTIFICATION_PREFS) {
        const val = await getPreference<boolean>(p.key);
        stored[p.key] = val ?? p.default;
      }
      setPrefs(stored);
      setLoaded(true);
    })();
  }, []);

  const toggle = async (key: string) => {
    const newVal = !prefs[key];
    setPrefs(prev => ({ ...prev, [key]: newVal }));
    await setPreference(key, newVal);
  };

  return (
    <Screen edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={theme.colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} color={theme.colors.text}>Notifications</AppText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <AppText style={styles.sectionLabel} color={theme.colors.textMuted}>
          PUSH NOTIFICATIONS
        </AppText>

        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {NOTIFICATION_PREFS.map((pref, i) => {
            const Icon = pref.Icon;
            const isLast = i === NOTIFICATION_PREFS.length - 1;
            return (
              <View
                key={pref.key}
                style={[styles.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}
              >
                <View style={[styles.iconWrap, { backgroundColor: theme.colors.primaryLight }]}>
                  <Icon size={16} color={theme.colors.primary} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.rowLabel} color={theme.colors.text}>{pref.label}</AppText>
                  <AppText style={styles.rowSubtitle} color={theme.colors.textMuted}>{pref.subtitle}</AppText>
                </View>
                <Switch
                  value={prefs[pref.key] ?? pref.default}
                  onValueChange={() => toggle(pref.key)}
                  trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                  thumbColor="#FFF"
                />
              </View>
            );
          })}
        </View>

        <AppText style={styles.footerHint} color={theme.colors.textMuted}>
          Notification preferences are stored on this device. To receive push notifications, make sure notifications are enabled in your device settings.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: 'Inter-SemiBold' },
  scroll: { paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },

  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowLabel: { fontSize: 15, fontFamily: 'Inter-Medium' },
  rowSubtitle: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 1 },

  footerHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    paddingHorizontal: 20,
    marginTop: 16,
    lineHeight: 18,
  },
});
