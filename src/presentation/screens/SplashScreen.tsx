import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Dimensions,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing, elevations } from '../../core/theme/tokens';
import { useAuthStore } from '../store/useAuthStore';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: (hasSession: boolean) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const checkSession = useAuthStore((state) => state.checkSession);

  const handleEnter = async () => {
    if (isCheckingSession) return;
    setIsCheckingSession(true);
    const hasSession = await checkSession();
    onFinish(hasSession);
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../../assets/images/rumah-gadang-bg.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
        blurRadius={2}
      >
        {/* Neutral Optical Scrim Gradient (Preserves Minangkabau Architecture & eliminates blue mud) */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <SvgLinearGradient id="neutralScrim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#0A0F1A" stopOpacity="0.60" />
                <Stop offset="32%" stopColor="#0B1222" stopOpacity="0.40" />
                <Stop offset="65%" stopColor="#070D1A" stopOpacity="0.66" />
                <Stop offset="100%" stopColor="#03060E" stopOpacity="0.88" />
              </SvgLinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#neutralScrim)" />
          </Svg>
        </View>

        {/* Content Container */}
        <View style={styles.content}>
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
              disabled={isCheckingSession}
              style={({ pressed }) => [
                styles.enterButton,
                pressed && styles.enterButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Masuk ke Sistem"
            >
              <Text style={styles.enterButtonText}>
                Masuk ke Sistem
              </Text>
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color={colors.primary}
              />
            </Pressable>

            <Text style={styles.copyrightText}>
              @ 2026 LLDIKTI WILAYAH X
            </Text>

            {/* Home indicator pill */}
            <View style={styles.homeIndicator} />
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D1A',
  },
  backgroundImage: {
    width,
    height,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: height * 0.12,
    paddingBottom: spacing.xl,
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
    backgroundColor: '#FFFFFF',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...elevations.level3,
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
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
    fontSize: 34,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    ...typography.headlineSm,
    fontSize: 15,
    color: colors.textSplashMuted,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  institutionContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
    paddingTop: spacing.md,
    maxWidth: 280,
    alignItems: 'center',
  },
  institutionTitle: {
    ...typography.labelMd,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 4,
  },
  ministrySubtitle: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.textSplashMinistry,
    fontWeight: '400',
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
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: rounded.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    ...elevations.level2,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  enterButtonPressed: {
    backgroundColor: colors.surfaceContainer,
    transform: [{ scale: 0.98 }],
  },
  enterButtonText: {
    ...typography.labelLg,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  copyrightText: {
    ...typography.labelSm,
    color: colors.outlineVariant,
    fontSize: 11,
    fontWeight: '500',
  },
  homeIndicator: {
    width: 128,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginTop: 4,
  },
});
