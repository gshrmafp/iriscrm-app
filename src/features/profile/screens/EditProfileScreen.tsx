import React, { useState } from 'react';
import {
  ScrollView, View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, User, Mail, Shield, MapPin, Save } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { setSession } from '@/app/store/slices/authSlice';
import { authApi } from '@/services/api/auth.api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  REGIONAL_ADMIN: 'Regional Admin',
  SALES_MANAGER: 'Sales Manager',
  SALES_EXECUTIVE: 'Sales Executive',
  AUDITOR: 'Auditor',
};

const AVATAR_COLORS = ['#3B4ECC', '#7C3AED', '#059669', '#B45309', '#DC2626', '#0891B2'];

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function EditProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useAppSelector(s => s.auth.user);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => authApi.getMe().then(r => r.data),
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; email?: string }) => authApi.updateMe(body).then(r => r.data),
    onSuccess: (updated) => {
      dispatch(setSession({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role as any,
        regionId: updated.regionId,
      }));
      AsyncStorage.setItem('iris-cached-user', JSON.stringify({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        regionId: updated.regionId,
      }));
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      Alert.alert('Profile Updated', 'Your profile has been updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to update profile';
      Alert.alert('Error', msg);
    },
  });

  const hasChanges = name !== (user?.name ?? '') || email !== (user?.email ?? '');
  const canSave = hasChanges && name.trim().length > 0 && email.trim().length > 0;

  const handleSave = () => {
    const body: { name?: string; email?: string } = {};
    if (name !== user?.name) body.name = name.trim();
    if (email !== user?.email) body.email = email.trim();
    updateMutation.mutate(body);
  };

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
    : 'U';
  const avatarBg = avatarColor(user?.name ?? 'User');
  const regionId = profile?.regionId ?? user?.regionId ?? '';

  return (
    <Screen edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={22} color={theme.colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} color={theme.colors.text}>Edit Profile</AppText>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave || updateMutation.isPending}
          style={[styles.saveBtn, { backgroundColor: canSave ? theme.colors.primary : theme.colors.surfaceAlt }]}
          activeOpacity={0.75}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Save size={18} color={canSave ? '#FFF' : theme.colors.textMuted} strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
            <AppText style={styles.avatarText}>{initials}</AppText>
          </View>
          <AppText style={styles.avatarHint} color={theme.colors.textMuted}>
            Initials are generated from your name
          </AppText>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <AppText style={styles.formLabel} color={theme.colors.textMuted}>Full Name</AppText>
          <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <User size={18} color={theme.colors.textMuted} strokeWidth={2} />
            <TextInput
              value={name}
              onChangeText={setName}
              style={{ ...styles.input, color: theme.colors.text } as TextStyle}
              placeholder="Enter your full name"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          <AppText style={styles.formLabel} color={theme.colors.textMuted}>Email</AppText>
          <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Mail size={18} color={theme.colors.textMuted} strokeWidth={2} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={{ ...styles.input, color: theme.colors.text } as TextStyle}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Read-only fields */}
          <AppText style={styles.formLabel} color={theme.colors.textMuted}>Role</AppText>
          <View style={[styles.readonlyRow, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
            <Shield size={18} color={theme.colors.textMuted} strokeWidth={2} />
            <AppText style={styles.readonlyText} color={theme.colors.textSecondary}>
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—'}
            </AppText>
          </View>

          <AppText style={styles.formLabel} color={theme.colors.textMuted}>Region</AppText>
          <View style={[styles.readonlyRow, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
            <MapPin size={18} color={theme.colors.textMuted} strokeWidth={2} />
            <AppText style={styles.readonlyText} color={theme.colors.textSecondary}>
              {regionId || '—'}
            </AppText>
          </View>

          <AppText style={styles.readonlyHint} color={theme.colors.textMuted}>
            Role and region can only be changed by an admin.
          </AppText>
        </View>
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
  saveBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },

  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontFamily: 'Inter-Bold', color: '#FFF' },
  avatarHint: { fontSize: 12, fontFamily: 'Inter-Regular' },

  formSection: { paddingHorizontal: 16, gap: 4 },
  formLabel: { fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 12, marginBottom: 4, marginLeft: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter-Regular', paddingVertical: 0 },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  readonlyText: { flex: 1, fontSize: 15, fontFamily: 'Inter-Regular' },
  readonlyHint: { fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 8, marginLeft: 4 },
});
