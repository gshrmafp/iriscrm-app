import React from 'react';
import { ScrollView, View, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Lock, ShieldCheck, Fingerprint, Smartphone,
  ChevronRight, Info, FileText,
} from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { SalesStackParamList } from '@/features/sales/navigation/types';

type Nav = NativeStackNavigationProp<SalesStackParamList>;

function MenuItem({ Icon, label, subtitle, onPress, iconBg }: {
  Icon: React.ComponentType<any>;
  label: string;
  subtitle: string;
  onPress?: () => void;
  iconBg?: string;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg ?? theme.colors.surfaceAlt }]}>
        <Icon size={18} color={iconBg ? '#FFF' : theme.colors.textSecondary} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={styles.menuLabel} color={theme.colors.text}>{label}</AppText>
        <AppText style={styles.menuSub} color={theme.colors.textMuted}>{subtitle}</AppText>
      </View>
      <ChevronRight size={18} color={theme.colors.textMuted} strokeWidth={2} />
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
      <AppText style={styles.infoLabel} color={theme.colors.textMuted}>{label}</AppText>
      <AppText style={styles.infoValue} color={theme.colors.text}>{value}</AppText>
    </View>
  );
}

export function PrivacySecurityScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  return (
    <Screen edges={['left', 'right']}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={theme.colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} color={theme.colors.text}>Privacy & Security</AppText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.primaryLight }]}>
            <ShieldCheck size={32} color={theme.colors.primary} strokeWidth={1.8} />
          </View>
          <AppText style={styles.heroTitle} color={theme.colors.text}>Your Security</AppText>
          <AppText style={styles.heroSubtitle} color={theme.colors.textMuted}>
            Manage your account security and privacy preferences
          </AppText>
        </View>

        {/* Account Security */}
        <AppText style={styles.sectionLabel} color={theme.colors.textMuted}>ACCOUNT SECURITY</AppText>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <MenuItem
            Icon={Lock}
            label="Change Password"
            subtitle="Update your account password"
            iconBg={theme.colors.primary}
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <MenuItem
            Icon={Fingerprint}
            label="Biometric Login"
            subtitle="Use Face ID or fingerprint to sign in"
            onPress={() => Alert.alert('Coming Soon', 'Biometric authentication will be available in a future update.')}
          />
          <MenuItem
            Icon={Smartphone}
            label="Active Sessions"
            subtitle="View devices signed into your account"
            onPress={() => Alert.alert('Active Sessions', 'You are currently signed in on this device only.')}
          />
        </View>

        {/* Privacy */}
        <AppText style={styles.sectionLabel} color={theme.colors.textMuted}>PRIVACY</AppText>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <MenuItem
            Icon={FileText}
            label="Privacy Policy"
            subtitle="Read our privacy policy"
            onPress={() => Alert.alert('Privacy Policy', 'IRIS CRM respects your privacy. Your data is stored securely and used only for CRM operations within your organization.')}
          />
          <MenuItem
            Icon={Info}
            label="Terms of Service"
            subtitle="View terms and conditions"
            onPress={() => Alert.alert('Terms of Service', 'For full terms of service, contact your workspace administrator.')}
          />
        </View>

        {/* Security info */}
        <AppText style={styles.sectionLabel} color={theme.colors.textMuted}>SECURITY INFO</AppText>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <InfoRow label="Encryption" value="AES-256 / TLS 1.3" />
          <InfoRow label="Authentication" value="JWT Token-based" />
          <InfoRow label="Password Policy" value="Minimum 8 characters" />
        </View>

        <AppText style={styles.footerNote} color={theme.colors.textMuted}>
          For security concerns or to report suspicious activity, contact your workspace administrator immediately.
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

  heroSection: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  heroIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 22, fontFamily: 'Inter-Bold' },
  heroSubtitle: { fontSize: 13, fontFamily: 'Inter-Regular', textAlign: 'center', paddingHorizontal: 40 },

  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
  },

  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuLabel: { fontSize: 15, fontFamily: 'Inter-Medium' },
  menuSub: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 1 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
  infoValue: { fontSize: 14, fontFamily: 'Inter-Medium' },

  footerNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    paddingHorizontal: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
});
