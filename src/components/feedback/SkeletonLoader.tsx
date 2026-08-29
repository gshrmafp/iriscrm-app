import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/design-system';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonBoxProps) {
  const theme = useTheme();
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: theme.colors.border },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function SkeletonLeadCard() {
  const theme = useTheme();
  return (
    <View style={[skStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <SkeletonBox width={44} height={44} borderRadius={22} />
      <View style={skStyles.body}>
        <SkeletonBox width="60%" height={14} borderRadius={7} />
        <SkeletonBox width="40%" height={11} borderRadius={5} style={{ marginTop: 6 }} />
        <View style={skStyles.row}>
          <SkeletonBox width={56} height={20} borderRadius={10} />
          <SkeletonBox width={70} height={11} borderRadius={5} />
        </View>
      </View>
      <SkeletonBox width={8} height={14} borderRadius={4} />
    </View>
  );
}

export function SkeletonCustomerCard() {
  const theme = useTheme();
  return (
    <View style={[skStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <SkeletonBox width={50} height={50} borderRadius={25} />
      <View style={skStyles.body}>
        <View style={skStyles.row}>
          <SkeletonBox width="50%" height={14} borderRadius={7} />
          <SkeletonBox width={52} height={20} borderRadius={10} />
        </View>
        <SkeletonBox width="65%" height={11} borderRadius={5} style={{ marginTop: 6 }} />
        <SkeletonBox width="45%" height={11} borderRadius={5} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function SkeletonActivityItem() {
  const theme = useTheme();
  return (
    <View style={[skStyles.activityItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <SkeletonBox width={36} height={36} borderRadius={10} />
      <View style={skStyles.body}>
        <SkeletonBox width="70%" height={13} borderRadius={6} />
        <SkeletonBox width="50%" height={11} borderRadius={5} style={{ marginTop: 5 }} />
        <SkeletonBox width="35%" height={10} borderRadius={5} style={{ marginTop: 4 }} />
      </View>
      <SkeletonBox width={20} height={20} borderRadius={10} />
    </View>
  );
}

export function SkeletonDashboardStat() {
  const theme = useTheme();
  return (
    <View style={[skStyles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <SkeletonBox width={36} height={36} borderRadius={10} />
      <SkeletonBox width="50%" height={22} borderRadius={8} style={{ marginTop: 12 }} />
      <SkeletonBox width="70%" height={11} borderRadius={5} style={{ marginTop: 6 }} />
    </View>
  );
}

const skStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  body: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 110,
  },
});
