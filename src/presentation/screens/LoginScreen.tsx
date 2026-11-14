import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  AlertCircle,
  Camera,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Lock,
  LogIn,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { MIN_TOUCH_TARGET, cardSurface, rounded, spacing } from '../../core/theme/tokens';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { AutoScrollText } from '../components/common/AutoScrollText';
import { useAuthStore } from '../store/useAuthStore';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateForgotPassword?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onNavigateForgotPassword,
}) => {
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const { login, isLoading, error, clearError } = useAuthStore();

  const isNumericInput = useMemo(() => {
    const trimmed = identifier.trim();
    return trimmed.length > 0 && /^[0-9\s]+$/.test(trimmed);
  }, [identifier]);

  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    if (error) clearError();
  };

  const handleLogin = async () => {
    const success = await login(identifier, password, rememberMe);
    if (success) {
      onLoginSuccess();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.md) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Dark Slate Hero Header matching Web .auth-illustration */}
        <ImageBackground
          source={require('../../../assets/images/rumah-gadang-bg.jpg')}
          style={[
            styles.heroBanner,
            { paddingTop: Math.max(spacing.xl, insets.top + spacing.md) },
          ]}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay} pointerEvents="none" />
          <View style={styles.heroInner}>
            <View style={styles.heroBrandRow}>
              <View style={styles.logoTile}>
                <Image
                  source={require('../../../assets/images/tut-wuri-handayani.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.heroBrandText}>
                <Text style={styles.appTitle}>SIPERAPAT</Text>
                <Text style={styles.appSubtitle}>LLDIKTI WILAYAH X KEMENDIKTISAINTEK</Text>
              </View>
            </View>
            <Text style={styles.welcomeSubtitle}>
              Pencatatan Kehadiran & Notulensi Rapat Terintegrasi
            </Text>

            {/* 3 Pilar Ringkas Nilai Sistem (login.blade.php:30-60) */}
            <View style={styles.pillarsList}>
              <View style={styles.pillarRow}>
                <View style={styles.pillarIconBox}>
                  <ShieldCheck size={14} color={colors.onPrimary} strokeWidth={2} />
                </View>
                <View style={styles.pillarTextWrap}>
                  <Text style={styles.pillarTitle}>Autentikasi Multi-Identifier</Text>
                  <AutoScrollText style={styles.pillarDesc}>
                    NIP 18 Digit atau Username resmi terdaftar
                  </AutoScrollText>
                </View>
              </View>
              <View style={styles.pillarRow}>
                <View style={styles.pillarIconBox}>
                  <Camera size={14} color={colors.onPrimary} strokeWidth={2} />
                </View>
                <View style={styles.pillarTextWrap}>
                  <Text style={styles.pillarTitle}>Presensi Sah & Terverifikasi</Text>
                  <AutoScrollText style={styles.pillarDesc}>
                    Selfie wajah, tanda tangan digital, & stempel waktu
                  </AutoScrollText>
                </View>
              </View>
              <View style={styles.pillarRow}>
                <View style={styles.pillarIconBox}>
                  <FileText size={14} color={colors.onPrimary} strokeWidth={2} />
                </View>
                <View style={styles.pillarTextWrap}>
                  <Text style={styles.pillarTitle}>Rekapitulasi Berita Acara Otomatis</Text>
                  <AutoScrollText style={styles.pillarDesc}>
                    Ekspor daftar hadir & notulensi format PDF & Word
                  </AutoScrollText>
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* Form Body */}
        <View style={styles.formSection}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Masuk ke Akun Anda</Text>
              <Text style={styles.cardSubtitle}>
                Gunakan Nomor Induk Pegawai (NIP 18 Digit) atau Username yang telah terdaftar di sistem.
              </Text>
            </View>

            {/* Unified NIP / Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NIP atau Username</Text>
              <Input
                placeholder="Masukkan Username atau NIP"
                value={identifier}
                onChangeText={handleIdentifierChange}
                keyboardType="default"
                autoCapitalize="none"
                maxLength={32}
                isMono={isNumericInput}
                containerStyle={styles.compactInputContainer}
                leftIcon={
                  isNumericInput ? (
                    <CreditCard size={18} color={colors.textMuted} strokeWidth={2} />
                  ) : (
                    <User size={18} color={colors.textMuted} strokeWidth={2} />
                  )
                }
              />
            </View>

            {/* Password Field with Aligned Forgot Link */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Kata Sandi</Text>
                <Pressable
                  onPress={onNavigateForgotPassword}
                  disabled={!onNavigateForgotPassword}
                  style={styles.forgotLinkButton}
                  accessibilityRole="button"
                  accessibilityLabel="Lupa Kata Sandi"
                >
                  <Text style={styles.forgotLink}>Lupa Kata Sandi?</Text>
                </Pressable>
              </View>

              <Input
                placeholder="Masukkan Kata Sandi"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                containerStyle={styles.compactInputContainer}
                leftIcon={<Lock size={18} color={colors.textMuted} strokeWidth={2} />}
                rightAction={
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeToggleButton}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textSecondary} strokeWidth={2} />
                    ) : (
                      <Eye size={18} color={colors.textSecondary} strokeWidth={2} />
                    )}
                  </Pressable>
                }
              />
            </View>

            {/* Remember Me Checkbox Toggle */}
            <Pressable
              onPress={() => setRememberMe((prev) => !prev)}
              style={styles.rememberRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
              accessibilityLabel="Ingat sesi masuk saya"
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe ? <Check size={12} color={colors.onPrimary} strokeWidth={3} /> : null}
              </View>
              <Text style={styles.rememberText}>Ingat sesi masuk saya</Text>
            </Pressable>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={colors.error} strokeWidth={2} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Primary Submit Button: Masuk ke Sistem */}
            <Button
              title="Masuk ke Sistem"
              onPress={handleLogin}
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading || !identifier || !password}
              style={styles.submitBtn}
              icon={<LogIn size={18} color={colors.onPrimary} strokeWidth={2} />}
            />
          </View>

          {/* Institutional Footer */}
          <View style={styles.footer}>
            <Text style={styles.copyrightText}>
              © 2026 SIPERAPAT - Lembaga Layanan Pendidikan Tinggi (LLDIKTI) Wilayah X.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroBanner: {
    backgroundColor: colors.primaryDarkest,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    position: 'relative',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryContainer,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.primary,
    opacity: 0.84,
  },
  heroInner: {
    zIndex: 1,
    gap: spacing.md,
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  logoTile: {
    width: 48,
    height: 48,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceCard,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  heroBrandText: {
    flex: 1,
  },
  appTitle: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.onPrimary,
    letterSpacing: 1,
  },
  appSubtitle: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSplashMuted,
    letterSpacing: 0.6,
    fontSize: 10.5,
    marginTop: 2,
  },
  welcomeSubtitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 14,
    color: colors.onPrimary,
    lineHeight: 20,
  },
  formSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  card: {
    ...cardSurface,
    borderRadius: rounded.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  cardSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  compactInputContainer: {
    marginBottom: 0,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
  },
  inputLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 11,
    color: colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forgotLinkButton: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  forgotLink: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primary,
  },
  eyeToggleButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.md,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: rounded.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rememberText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 13,
    color: colors.primaryContainer,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
  },
  errorText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.onErrorContainer,
    flex: 1,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  copyrightText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 16,
  },
  pillarsList: {
    gap: spacing.xs + 2,
    paddingTop: spacing.xs,
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: rounded.md,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  pillarIconBox: {
    width: 26,
    height: 26,
    borderRadius: rounded.sm,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  pillarTitle: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.onPrimary,
  },
  pillarDesc: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.borderStrong,
  },
});
