import React from 'react';
import { ScrollView, View, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/design-system';
import { Screen } from '@/components/common/Screen';
import { AppHeader } from '@/components/common/AppHeader';
import { AppText } from '@/components/common/AppText';
import { AppCard } from '@/components/common/AppCard';
import { Loader } from '@/components/feedback/Loader';
import { EmptyState } from '@/components/feedback/EmptyState';
import { SalesStackParamList } from '@/features/sales/navigation/types';
import { customersApi } from '@/services/api/customers.api';

type RouteProps = RouteProp<SalesStackParamList, 'CustomerDetail'>;

function formatRevenue(revenue?: string | null): string | null {
  if (!revenue) return null;
  const num = Number(revenue);
  if (!num) return null;
  return `₹${num.toLocaleString('en-IN')} / year`;
}

export function CustomerDetailScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer', route.params.id],
    queryFn: () => customersApi.getOne(route.params.id).then(r => r.data),
  });

  if (isLoading) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <AppHeader title="Customer" showBack />
        <Loader />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <AppHeader title="Customer" showBack />
        <EmptyState title="Could not load customer" message="Please try again" action={{ label: 'Retry', onPress: refetch }} />
      </Screen>
    );
  }

  const revenue = formatRevenue(data.revenue);

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <AppHeader title="Customer" showBack />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AppCard>
          <View style={styles.titleRow}>
            <AppText variant="h3" color={theme.colors.text}>{data.name}</AppText>
            {data.active === false && (
              <View style={[styles.inactivePill, { backgroundColor: theme.colors.surfaceAlt }]}>
                <AppText variant="label" color={theme.colors.textMuted}>Inactive</AppText>
              </View>
            )}
          </View>
          <AppText variant="bodyMd" color={theme.colors.textSecondary}>{data.type ?? 'Customer'}</AppText>
          {revenue && (
            <AppText variant="bodyMd" color={theme.colors.textMuted} style={{ marginTop: 8 }}>{revenue}</AppText>
          )}
        </AppCard>

        {data.contacts && data.contacts.length > 0 && (
          <AppCard>
            <AppText variant="label" color={theme.colors.textSecondary}>Contacts</AppText>
            {data.contacts.map((c, i) => (
              <View key={i} style={[styles.contactRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
                <AppText variant="bodyMd" color={theme.colors.text}>{c.name}</AppText>
                {c.phone && (
                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${c.phone}`)}>
                    <AppText variant="bodySm" color={theme.colors.primary}>{c.phone}</AppText>
                  </TouchableOpacity>
                )}
                {c.email && (
                  <TouchableOpacity onPress={() => Linking.openURL(`mailto:${c.email}`)}>
                    <AppText variant="bodySm" color={theme.colors.primary}>{c.email}</AppText>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </AppCard>
        )}

        {data.addresses && data.addresses.length > 0 && (
          <AppCard>
            <AppText variant="label" color={theme.colors.textSecondary}>Addresses</AppText>
            {data.addresses.map((a, i) => (
              <AppText key={i} variant="bodyMd" color={theme.colors.textMuted} style={{ marginTop: i > 0 ? 8 : 8 }}>
                {[a.line1, a.city, a.state, a.pincode].filter(Boolean).join(', ')}
              </AppText>
            ))}
          </AppCard>
        )}

        {(!data.contacts || data.contacts.length === 0) && (!data.addresses || data.addresses.length === 0) && (
          <AppCard>
            <AppText variant="bodyMd" color={theme.colors.textMuted}>No contacts or addresses on file yet.</AppText>
          </AppCard>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inactivePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  contactRow: { paddingVertical: 8, gap: 2 },
});
