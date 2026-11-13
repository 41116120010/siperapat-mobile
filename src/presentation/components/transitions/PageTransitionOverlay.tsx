import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Image,
  Platform,
} from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useTransitionStore } from '../../store/useTransitionStore';
import { colors } from '../../../core/theme/colors';

const tutWuriLogo = require('../../../../assets/images/tut-wuri-handayani.png');

export const PageTransitionOverlay: React.FC = () => {
  const isTransitioning = useTransitionStore((state) => state.isTransitioning);

  // Visibility state to keep component mounted during exit animation
  const [shouldRender, setShouldRender] = useState(isTransitioning);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const shimmerLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isTransitioning) {
      setShouldRender(true);

      // Start continuous looping shimmer animation across the Tut Wuri box
      shimmerAnim.setValue(0);
      shimmerLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 850,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.delay(120),
        ])
      );
      shimmerLoopRef.current.start();

      // Entrance fade-in and scale-in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (shouldRender) {
      // Exit fade-out and subtle scale-up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          if (shimmerLoopRef.current) {
            shimmerLoopRef.current.stop();
            shimmerLoopRef.current = null;
          }
          setShouldRender(false);
          scaleAnim.setValue(0.92);
        }
      });
    }

    return () => {
      if (shimmerLoopRef.current) {
        shimmerLoopRef.current.stop();
      }
    };
  }, [isTransitioning, fadeAnim, scaleAnim, shimmerAnim, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  // Interpolate shimmer horizontal translation
  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 140],
  });

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim }]}
      pointerEvents={isTransitioning ? 'auto' : 'none'}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      aria-busy={isTransitioning}
    >
      {/* 1. EFEK BLUR & FROSTED ATMOSPHERIC BACKDROP */}
      <View style={styles.backdropLayer}>
        {/* Ambient Radial Soft Halo di belakang kotak */}
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient
              id="centerFocusGlow"
              cx="50%"
              cy="50%"
              rx="45%"
              ry="35%"
            >
              <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.35} />
              <Stop offset="40%" stopColor={colors.primaryContainer} stopOpacity={0.55} />
              <Stop offset="100%" stopColor={colors.primaryDarkest} stopOpacity={0.68} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#centerFocusGlow)" />
        </Svg>
      </View>

      {/* 2. KOTAK WADAH DENGAN IKON TUT WURI & ANIMASI SILAU */}
      <Animated.View
        style={[
          styles.badgeBox,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Ikon Tut Wuri Handayani (Tanpa Background) */}
        <Image
          source={tutWuriLogo}
          style={styles.logoImage}
          resizeMode="contain"
          accessible
          accessibilityLabel="Emblem Tut Wuri Handayani Kementerian Pendidikan dan Kebudayaan"
        />

        {/* 3. LAPISAN BERKAS CAHAYA SILAU (SHEEN SHIMMER SWEEP) */}
        <Animated.View
          style={[
            styles.shimmerContainer,
            {
              transform: [{ translateX: shimmerTranslateX }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.shimmerRotator}>
            <Svg width={75} height={180}>
              <Defs>
                <LinearGradient
                  id="silauGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <Stop offset="0%" stopColor={colors.onPrimary} stopOpacity={0} />
                  <Stop offset="25%" stopColor={colors.onPrimary} stopOpacity={0.15} />
                  <Stop offset="50%" stopColor={colors.onPrimary} stopOpacity={0.85} />
                  <Stop offset="75%" stopColor={colors.onPrimary} stopOpacity={0.2} />
                  <Stop offset="100%" stopColor={colors.onPrimary} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={75} height={180} fill="url(#silauGrad)" />
            </Svg>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdropLayer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrimNeutralMid,
  },
  badgeBox: {
    width: 104,
    height: 104,
    borderRadius: 22,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    // iOS Soft Shadow (Android uses elevation: 0 to avoid black-box artifact)
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDarkest,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  logoImage: {
    width: 66,
    height: 66,
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmerRotator: {
    transform: [{ rotate: '25deg' }],
  },
});
