import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { MIN_TOUCH_TARGET, spacing } from '../../../core/theme/tokens';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'SIPERAPAT LLDIKTI X',
  subtitle = 'Sistem Presensi Rapat Kedinasan',
  showBack = false,
  onBack,
  rightAction,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.contentRow}>
        {showBack ? (
          <View style={styles.navRow}>
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Kembali"
            >
              <ChevronLeft
                size={24}
                color={colors.primary}
                strokeWidth={2}
              />
            </Pressable>
            <View style={[styles.textContainer, rightAction ? { paddingRight: MIN_TOUCH_TARGET + 4 } : undefined]}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.centeredBrandContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../../assets/images/tut-wuri-handayani.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandTextContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </View>
        )}

        {rightAction ? (
          <View style={styles.rightActionAbsolute}>{rightAction}</View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    zIndex: 10,
  },
  contentRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    position: 'relative',
    width: '100%',
  },
  centeredBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 34,
    height: 34,
  },
  brandTextContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.xs,
    marginRight: spacing.xs,
  },
  backButtonPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 15,
    color: colors.primary,
    letterSpacing: -0.2,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rightActionAbsolute: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
