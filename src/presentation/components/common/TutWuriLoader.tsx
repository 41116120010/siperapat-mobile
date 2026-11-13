import React, { useEffect, useId, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../../../core/theme/colors';

const tutWuriLogo = require('../../../../assets/images/tut-wuri-handayani.png');

export type TutWuriLoaderSize = 'sm' | 'md' | 'lg';

export interface TutWuriLoaderProps {
  size?: TutWuriLoaderSize;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const SIZE_METRICS: Record<
  TutWuriLoaderSize,
  {
    boxSize: number;
    borderRadius: number;
    logoSize: number;
    borderWidth: number;
    sweepWidth: number;
    sweepHeight: number;
    translateRange: number;
  }
> = {
  sm: {
    boxSize: 24,
    borderRadius: 7,
    logoSize: 16,
    borderWidth: 1,
    sweepWidth: 22,
    sweepHeight: 48,
    translateRange: 44,
  },
  md: {
    boxSize: 52,
    borderRadius: 13,
    logoSize: 34,
    borderWidth: 1.2,
    sweepWidth: 42,
    sweepHeight: 100,
    translateRange: 84,
  },
  lg: {
    boxSize: 80,
    borderRadius: 18,
    logoSize: 50,
    borderWidth: 1.5,
    sweepWidth: 60,
    sweepHeight: 150,
    translateRange: 120,
  },
};

export const TutWuriLoader: React.FC<TutWuriLoaderProps> = ({
  size = 'md',
  style,
  accessibilityLabel = 'Memuat data SIPERAPAT',
}) => {
  const reactId = useId();
  const gradientId = `tutWuriSilau_${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const metrics = SIZE_METRICS[size];

  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    shimmerAnim.setValue(0);
    pulseAnim.setValue(0);

    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            useNativeDriver: true,
          }),
          Animated.delay(140),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 520,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 520,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [shimmerAnim, pulseAnim]);

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-metrics.translateRange, metrics.translateRange],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.03],
  });

  return (
    <Animated.View
      style={[
        styles.badgeBox,
        {
          width: metrics.boxSize,
          height: metrics.boxSize,
          borderRadius: metrics.borderRadius,
          borderWidth: metrics.borderWidth,
          transform: [{ scale: pulseScale }],
        },
        style,
      ]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={tutWuriLogo}
        style={{
          width: metrics.logoSize,
          height: metrics.logoSize,
        }}
        resizeMode="contain"
      />

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
          <Svg width={metrics.sweepWidth} height={metrics.sweepHeight}>
            <Defs>
              <LinearGradient
                id={gradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <Stop offset="0%" stopColor={colors.onPrimary} stopOpacity={0} />
                <Stop offset="25%" stopColor={colors.onPrimary} stopOpacity={0.18} />
                <Stop offset="50%" stopColor={colors.onPrimary} stopOpacity={0.85} />
                <Stop offset="75%" stopColor={colors.onPrimary} stopOpacity={0.22} />
                <Stop offset="100%" stopColor={colors.onPrimary} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect
              x={0}
              y={0}
              width={metrics.sweepWidth}
              height={metrics.sweepHeight}
              fill={`url(#${gradientId})`}
            />
          </Svg>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badgeBox: {
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDarkest,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
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
