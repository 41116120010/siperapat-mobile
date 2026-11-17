import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Platform,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { useAuthStore } from '../store/useAuthStore';
import { triggerPageTransition } from '../store/useTransitionStore';

interface SplashScreenProps {
  onFinish: (hasSession: boolean) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const insets = useSafeAreaInsets();
  const { user, checkSession, isLoading } = useAuthStore();
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleEnter = async () => {
    if (isLoading || isEntering) return;
    setIsEntering(true);
    triggerPageTransition(650);
    if (!user) await checkSession();
    onFinish(Boolean(useAuthStore.getState().user));
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={require('../../../assets/images/siluet.webp')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Neutral Optical Scrim Gradient (Preserves Minangkabau Architecture & eliminates blue mud) */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <SvgLinearGradient id="neutralScrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.primaryDarkest} stopOpacity="0.86" />
                <Stop offset="35%" stopColor={colors.primary} stopOpacity="0.76" />
                <Stop offset="68%" stopColor={colors.primaryDarkest} stopOpacity="0.80" />
                <Stop offset="100%" stopColor={colors.primaryDarkest} stopOpacity="0.94" />
              </SvgLinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#neutralScrim)" />
          </Svg>
        </View>

        {/* Content Container */}
        <View
          style={[
            styles.content,
            {
              paddingTop: Math.max(spacing.xl * 2, insets.top + spacing.xl),
              paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.md),
            },
          ]}
        >
          {/* Top & Center Branding Block */}
          <View style={styles.brandingBlock}>
            {/* Logo Container: Tut Wuri Handayani in pristine white tile */}
            <View style={styles.logoTile}>
              <Image
                source={require('../../../assets/images/tut-wuri-handayani.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* App Title & Tagline */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>SIPERAPAT</Text>
              <Text style={styles.tagline}>
                Sistem Presensi & Rapat Kedinasan
              </Text>
            </View>

            {/* Institution Identity with divider accent */}
            <View style={styles.institutionContainer}>
              <Text style={styles.institutionTitle}>LLDIKTI WILAYAH X</Text>
              <Text style={styles.ministrySubtitle}>
                Kementerian Pendidikan Tinggi, Sains, dan Teknologi
              </Text>
            </View>
          </View>

          {/* Bottom Controls & System Status */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleEnter}
              disabled={isLoading || isEntering}
              style={({ pressed }) => [
                styles.enterButton,
                pressed && styles.enterButtonPressed,
                isEntering && styles.enterButtonBusy,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Masuk ke Sistem"
            >
              <Text style={styles.enterButtonText}>
                Masuk ke Sistem
              </Text>
              <ArrowRight
                size={20}
                color={colors.primary}
                strokeWidth={2}
              />
            </Pressable>

            <Text style={styles.copyrightText}>
              © 2026 LLDIKTI WILAYAH X
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDarkest,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    zIndex: 10,
  },
  brandingBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTile: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: colors.primaryDarkest,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        }
      : {}),
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headlineLg,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 34,
    lineHeight: 42,
    color: colors.onPrimary,
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 15,
    color: colors.textSplashMuted,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  institutionContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.toastBorder,
    paddingTop: spacing.md,
    maxWidth: 280,
    alignItems: 'center',
  },
  institutionTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 15,
    color: colors.onPrimary,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 4,
  },
  ministrySubtitle: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.textSplashMinistry,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
    gap: spacing.md,
  },
  enterButton: {
    width: '100%',
    minHeight: Math.max(50, MIN_TOUCH_TARGET),
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: colors.primaryDarkest,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        }
      : {}),
  },
  enterButtonPressed: {
    backgroundColor: colors.surfaceSoft,
    transform: [{ scale: 0.98 }],
  },
  enterButtonBusy: {
    opacity: 0.8,
  },
  enterButtonText: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
    fontSize: 15,
  },
  copyrightText: {
    ...typography.labelSm,
    color: colors.outlineVariant,
    fontSize: 11,
  },
});
