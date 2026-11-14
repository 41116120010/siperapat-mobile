import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { spacing } from '../../../core/theme/tokens';
import { TutWuriLoader } from './TutWuriLoader';

export interface TutWuriRefreshBannerProps {
  refreshing: boolean;
  label?: string;
}

/**
 * Animated top pull-to-refresh indicator displaying the Tut Wuri Handayani
 * shimmer loader whenever an interactive refresh is active.
 */
export const TutWuriRefreshBanner: React.FC<TutWuriRefreshBannerProps> = ({
  refreshing,
  label = 'Memperbarui data...',
}) => {
  const progress = useRef(new Animated.Value(refreshing ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: refreshing ? 1 : 0,
      duration: refreshing ? 180 : 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [refreshing, progress]);

  const height = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });

  const opacity = progress.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.35, 1],
  });

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          height,
          opacity,
          borderBottomWidth: refreshing ? 1 : 0,
        },
      ]}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.innerRow}>
        <TutWuriLoader size="sm" accessibilityLabel={label} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Animated.View>
  );
};

/**
 * Returns a native RefreshControl whose default circular spinner is parked
 * offscreen so TutWuriRefreshBanner acts as the visible top loader across platforms.
 */
export function useTutWuriRefreshControl(refreshing: boolean, onRefresh: () => void) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      progressViewOffset={-10000}
      colors={[colors.primary]}
      tintColor="transparent"
    />
  );
}

const styles = StyleSheet.create({
  banner: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceSoft,
    borderBottomColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
});
