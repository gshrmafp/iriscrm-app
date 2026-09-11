import React, { useState } from 'react';
import {
  ScrollView, View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/AppText';
import { authApi } from '@/services/api/auth.api';

export function ChangePasswordScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const changeMutation = useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(body).then(r => r.data),
    onSuccess: () => {
      Alert.alert('Password Changed', 'Your password has been updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Failed to change password';
      Alert.alert('Error', msg);
    },
  });

  const passwordsMatch = newPassword === confirmPassword;
  const newLongEnough = newPassword.length >= 8;
  const canSubmit = currentPassword.length > 0 && newLongEnough && passwordsMatch && !changeMutation.isPending;

  const handleSubmit = () => {
    changeMutation.mutate({ currentPassword, newPassword });
  };

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
        {/* Password section */}
        <View style={styles.iconSection}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primaryLight }]}>
            <ShieldCheck size={28} color={theme.colors.primary} strokeWidth={1.8} />
          </View>
          <AppText style={styles.sectionTitle} color={theme.colors.text}>Change Password</AppText>
          <AppText style={styles.sectionSubtitle} color={theme.colors.textMuted}>
            Keep your account secure by updating your password regularly
          </AppText>
        </View>

        <View style={styles.formSection}>
          <AppText style={styles.formLabel} color={theme.colors.textMuted}>Current Password</AppText>
          <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Lock size={18} color={theme.colors.textMuted} strokeWidth={2} />
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={{ ...styles.input, color: theme.colors.text } as TextStyle}
              placeholder="Enter current password"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {showCurrent ? (
                <EyeOff size={18} color={theme.colors.textMuted} strokeWidth={2} />
              ) : (
                <Eye size={18} color={theme.colors.textMuted} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          <AppText style={styles.formLabel} color={theme.colors.textMuted}>New Password</AppText>
          <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderColor: newPassword.length > 0 && !newLongEnough ? '#FCA5A5' : theme.colors.border }]}>
            <Lock size={18} color={theme.colors.textMuted} strokeWidth={2} />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              style={{ ...styles.input, color: theme.colors.text } as TextStyle}
              placeholder="At least 8 characters"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showNew}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {showNew ? (
                <EyeOff size={18} color={theme.colors.textMuted} strokeWidth={2} />
              ) : (
                <Eye size={18} color={theme.colors.textMuted} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
          {newPassword.length > 0 && !newLongEnough && (
            <AppText style={styles.errorHint} color="#DC2626">Password must be at least 8 characters</AppText>
          )}

          <AppText style={styles.formLabel} color={theme.colors.textMuted}>Confirm New Password</AppText>
          <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderColor: confirmPassword.length > 0 && !passwordsMatch ? '#FCA5A5' : theme.colors.border }]}>
            <Lock size={18} color={theme.colors.textMuted} strokeWidth={2} />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={{ ...styles.input, color: theme.colors.text } as TextStyle}
              placeholder="Re-enter new password"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <AppText style={styles.errorHint} color="#DC2626">Passwords do not match</AppText>
          )}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.submitBtn, { backgroundColor: canSubmit ? theme.colors.primary : theme.colors.surfaceAlt }]}
            activeOpacity={0.75}
          >
            {changeMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <AppText style={styles.submitText} color={canSubmit ? '#FFF' : theme.colors.textMuted}>
                Update Password
              </AppText>
            )}
          </TouchableOpacity>
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
  scroll: { paddingBottom: 40 },

  iconSection: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold' },
  sectionSubtitle: { fontSize: 13, fontFamily: 'Inter-Regular', textAlign: 'center', paddingHorizontal: 40 },

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
  errorHint: { fontSize: 11, fontFamily: 'Inter-Medium', marginTop: 4, marginLeft: 4 },

  submitBtn: {
    marginTop: 24,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
