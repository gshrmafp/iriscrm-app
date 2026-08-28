import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '@/design-system';
import { AppText } from '@/components/common/AppText';

export function SplashScreen() {
  const theme = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <View style={[styles.logoBox, { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: theme.radii.xl }]}>
          <AppText variant="displayLg" color="#FFFFFF">I</AppText>
        </View>
        <AppText variant="h1" color="#FFFFFF" style={styles.appName}>IRIS</AppText>
        <AppText variant="bodyMd" color="rgba(255,255,255,0.8)">CRM Platform</AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoBox: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  appName: { marginBottom: 4 },
});
