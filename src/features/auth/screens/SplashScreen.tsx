import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { AppText } from '@/components/common/AppText';

const { width: W, height: H } = Dimensions.get('window');

function AnimatedRing({ delay, size, dur }: { delay: number; size: number; dur: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: dur, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: dur, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        st.ring,
        {
          width: size, height: size, borderRadius: size / 2,
          transform: [{ scale }], opacity,
        },
      ]}
    />
  );
}

function LoadingBar() {
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ).start();
  }, []);

  const tx = translateX.interpolate({ inputRange: [-1, 1], outputRange: [-120, 120] });

  return (
    <View style={st.barTrack}>
      <Animated.View style={[st.barFill, { transform: [{ translateX: tx }] }]} />
    </View>
  );
}

export function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={st.container}>
      {/* Gradient background */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="bg" x1="0%" y1="0%" x2="50%" y2="100%">
              <Stop offset="0%" stopColor="#0F172A" />
              <Stop offset="100%" stopColor="#1E1B4B" />
            </LinearGradient>
          </Defs>
          <Rect width={W} height={H} fill="url(#bg)" />
        </Svg>
      </View>

      {/* Ripple rings */}
      <AnimatedRing delay={0} size={280} dur={2800} />
      <AnimatedRing delay={900} size={280} dur={2800} />
      <AnimatedRing delay={1800} size={280} dur={2800} />

      {/* Logo */}
      <Animated.View style={[st.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <View style={st.logoBox}>
          <AppText style={st.logoLetter}>I</AppText>
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View style={[st.textWrap, { opacity: textOpacity }]}>
        <AppText style={st.appName}>IRIS</AppText>
      </Animated.View>

      <Animated.View style={{ opacity: tagOpacity }}>
        <AppText style={st.tagline}>CRM Platform</AppText>
      </Animated.View>

      {/* Loading bar */}
      <View style={st.bottomWrap}>
        <LoadingBar />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },

  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },

  logoWrap: { alignItems: 'center', zIndex: 10 },

  logoBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: '#6366F1',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 16,
  },

  logoLetter: {
    fontSize: 38, fontFamily: 'Inter-Bold', color: '#FFF', letterSpacing: 1,
  },

  textWrap: { marginTop: 20 },

  appName: {
    fontSize: 28, fontFamily: 'Inter-Bold', color: '#FFF',
    letterSpacing: 10, textAlign: 'center',
  },

  tagline: {
    fontSize: 12, fontFamily: 'Inter-Medium',
    color: 'rgba(255,255,255,0.4)', letterSpacing: 3,
    textAlign: 'center', marginTop: 8,
  },

  bottomWrap: {
    position: 'absolute', bottom: 80,
    alignItems: 'center',
  },

  barTrack: {
    width: 120, height: 3, borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },

  barFill: {
    width: 40, height: 3, borderRadius: 1.5,
    backgroundColor: 'rgba(99, 102, 241, 0.7)',
  },
});
