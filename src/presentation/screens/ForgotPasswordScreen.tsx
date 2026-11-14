import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  ArrowLeft,
  Clock,
  CreditCard,
  Info,
  KeyRound,
  LogIn,
  Mail,
  MailCheck,
  Send,
  ShieldCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { MIN_TOUCH_TARGET, cardSurface, rounded, spacing } from '../../core/theme/tokens';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { formatNIP } from '../../core/utils/nipValidator';
import { useAuthStore } from '../store/useAuthStore';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onSuccessLogin: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onBack,
  onSuccessLogin,
}) => {
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTarget, setSubmittedTarget] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const { forgotPassword, isLoading: authLoading, error: authError, clearError } = useAuthStore();

  // Clear auth error when user starts typing
  useEffect(() => {
    if (authError) clearError();
  }, [identifier]);

  const isNumericInput = useMemo(() => {
    const trimmed = identifier.trim();
    return trimmed.length > 0 && /^[0-9\s]+$/.test(trimmed);
  }, [identifier]);

  const handleIdentifierChange = (val: string) => {
    if (/^[0-9\s]*$/.test(val)) {
      setIdentifier(formatNIP(val));
    } else {
      setIdentifier(val);
    }
  };

  const maskEmailOrNIP = (target: string) => {
    const trimmed = target.trim();
    if (trimmed.includes('@')) {
      const [name, domain] = trimmed.split('@');
      if (name.length <= 3) {
        return `${name[0]}***@${domain}`;
      }
      return `${name.substring(0, 3)}***@${domain}`;
    }
    // Jika NIP
    if (trimmed.length > 8) {
      return `${trimmed.substring(0, 8)} ••••••••`;
    }
    return trimmed;
  };

  const handleSubmit = useCallback(async () => {
    if (!identifier.trim()) return;

    try {
      const result = await forgotPassword(identifier.trim());
      if (result.success) {
        setSubmittedTarget(identifier.trim());
        setIsSubmitted(true);
        setCooldown(60);
      } else {
        // Error is already set in auth store, no need to show additional error
      }
    } catch (error) {
      // Error is already set in auth store, no need to show additional error
    }
  }, [identifier, forgotPassword]);

  // Countdown timer saat state sukses aktif
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isSubmitted && cooldown > 0) {
      timer = setTimeout(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isSubmitted, cooldown]);

  const handleResend = useCallback(() => {
    if (cooldown > 0 || authLoading) return;
    setIsSubmitted(false);
    setIdentifier('');
    setCooldown(60);
  }, [cooldown, authLoading]);

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
        {/* Dark Slate Hero Header matching LoginScreen & Web .auth-illustration */}
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
              {isSubmitted
                ? 'Tautan Pemulihan Kata Sandi Berhasil Dikirim'
                : 'Pemulihan Akses Kedinasan Mandiri'}
            </Text>

            {/* 3 Pilar Ringkas Pemulihan Akses (forgot-password.blade.php:30-60) */}
            <View style={styles.pillarsList}>
              <View style={styles.pillarRow}>
                <View style={styles.pillarIconBox}>
                  <ShieldCheck size={14} color={colors.onPrimary} strokeWidth={2} />
                </View>
                <View style={styles.pillarTextWrap}>
                  <Text style={styles.pillarTitle}>Verifikasi Multi-Identifier</Text>
                  <Text style={styles.pillarDesc}>
                    Sistem otomatis mendeteksi NIP 18 Digit, Username, atau Email Kedinasan.
                  </Text>
                </View>
              </View>
              <View style={styles.pillarRow}>
                <View style={styles.pillarIconBox}>
                  <Mail size={14} color={colors.onPrimary} strokeWidth={2} />
                </View>
                <View style={styles.pillarTextWrap}>
                  <Text style={styles.pillarTitle}>Pengiriman Tautan Aman</Text>
                  <Text style={styles.pillarDesc}>
                    Tautan atur ulang terenkripsi dikirim langsung ke email resmi.
                  </Text>
                </View>
              </View>
              <View style={styles.pillarRow}>
                <View style={styles.pillarIconBox}>
                  <Clock size={14} color={colors.onPrimary} strokeWidth={2} />
                </View>
                <View style={styles.pillarTextWrap}>
                  <Text style={styles.pillarTitle}>Batas Waktu Keamanan 60 Menit</Text>
                  <Text style={styles.pillarDesc}>
                    Demi keamanan, tautan hanya berlaku selama 60 menit sejak diminta.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ImageBackground>

        {/* Form Body */}
        <View style={styles.formSection}>
          <View style={styles.card}>
          {!isSubmitted ? (
            /* STATE 1: FORMULIR PENGAJUAN PEMULIHAN */
            <>
              <View style={styles.formHeaderRow}>
                <View style={styles.formIconWrap}>
                  <KeyRound size={20} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.formHeaderText}>
                  <Text style={styles.cardHeading}>Lupa Kata Sandi?</Text>
                  <Text style={styles.cardInstruction}>
                    Masukkan NIP (18 Digit), Username, atau Email kedinasan Anda. Sistem akan mengirimkan tautan untuk mengatur ulang kata sandi.
                  </Text>
                </View>
              </View>

              {/* Input NIP / Username / Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NIP, Username, atau Email Kedinasan</Text>
                <Input
                  placeholder="Contoh: 19701205... / afdalisma / nama@..."
                  value={identifier}
                  onChangeText={handleIdentifierChange}
                  keyboardType="default"
                  autoCapitalize="none"
                  maxLength={40}
                  isMono={isNumericInput}
                  containerStyle={styles.compactInputContainer}
                  leftIcon={
                    isNumericInput ? (
                      <CreditCard size={18} color={colors.textMuted} strokeWidth={2} />
                    ) : (
                      <Mail size={18} color={colors.textMuted} strokeWidth={2} />
                    )
                  }
                />
              </View>

              {authError ? (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={colors.error} strokeWidth={2} />
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              ) : null}

              {/* Info Box Pedoman Keamanan */}
              <View style={styles.noticeBox}>
                <Info size={16} color={colors.infoText} strokeWidth={2} />
                <Text style={styles.noticeText}>
                  Tautan pemulihan hanya akan dikirimkan ke alamat email kedinasan aktif
                  yang telah terdaftar di database kepegawaian LLDIKTI X.
                </Text>
              </View>

              {/* Tombol Aksi */}
              <View style={styles.actionColumn}>
                <Button
                  title="Kirim Tautan Atur Ulang"
                  onPress={handleSubmit}
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={authLoading}
                  disabled={authLoading || !identifier.trim()}
                  icon={<Send size={18} color={colors.onPrimary} strokeWidth={2} />}
                />

                <Button
                  title="Kembali ke Halaman Masuk"
                  onPress={onBack}
                  variant="secondary"
                  size="lg"
                  fullWidth
                  disabled={authLoading}
                  icon={<ArrowLeft size={18} color={colors.primary} strokeWidth={2} />}
                />
              </View>
            </>
          ) : (
            /* STATE 2: KONFIRMASI SUKSES PENGIRIMAN */
            <View style={styles.successStateWrap}>
              <View style={styles.successBadgeWrap}>
                <MailCheck size={36} color={colors.success} strokeWidth={2} />
              </View>

              <Text style={styles.successTitle}>Periksa Email Kedinasan</Text>
              <Text style={styles.successDesc}>
                Instruksi dan tautan pemulihan kata sandi telah dikirimkan ke email yang
                terkait dengan:
              </Text>

              {/* Target Masking Card */}
              <View style={styles.targetPill}>
                {submittedTarget.includes('@') ? (
                  <Mail size={16} color={colors.primary} strokeWidth={2} />
                ) : (
                  <CreditCard size={16} color={colors.primary} strokeWidth={2} />
                )}
                <Text style={styles.targetPillText}>
                  {maskEmailOrNIP(submittedTarget)}
                </Text>
              </View>

              <View style={styles.expiryNoticeBox}>
                <Clock size={16} color={colors.primary} strokeWidth={2} />
                <Text style={styles.expiryNoticeText}>
                  Tautan berlaku selama 60 menit. Jika tidak ditemukan di Kotak Masuk,
                  periksa folder Spam email dinas Anda.
                </Text>
              </View>

              {/* Tombol Navigasi Kembali & Kirim Ulang */}
              <View style={styles.actionColumn}>
                <Button
                  title="Masuk ke Sistem"
                  onPress={onSuccessLogin}
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<LogIn size={18} color={colors.onPrimary} strokeWidth={2} />}
                />

                {/* Resend Link */}
                <View style={styles.resendRow}>
                  <Text style={styles.resendText}>Tidak menerima email? </Text>
                  <Pressable
                    onPress={handleResend}
                    disabled={cooldown > 0 || authLoading}
                    style={styles.resendButton}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.resendLink,
                        (cooldown > 0 || authLoading) && styles.resendLinkDisabled,
                      ]}
                    >
                      {cooldown > 0
                        ? `Kirim ulang dalam (${cooldown}d)`
                        : 'Kirim Ulang Tautan'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
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
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 2,
  },
  formHeaderText: {
    flex: 1,
  },
  formIconWrap: {
    width: 42,
    height: 42,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeading: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  cardInstruction: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  compactInputContainer: {
    marginBottom: 0,
  },
  inputLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.onSurface,
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
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    padding: spacing.sm + 4,
    borderRadius: rounded.md,
  },
  noticeText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.infoText,
    lineHeight: 16,
    flex: 1,
  },
  actionColumn: {
    width: '100%',
    gap: spacing.sm + 2,
    marginTop: 4,
  },
  successStateWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  successBadgeWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 17,
    color: colors.onSurface,
    textAlign: 'center',
  },
  successDesc: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: spacing.xs,
  },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    borderRadius: rounded.full,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  targetPillText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12.5,
    color: colors.primary,
  },
  expiryNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: rounded.md,
    marginBottom: spacing.lg,
    width: '100%',
  },
  expiryNoticeText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 16,
    flex: 1,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  resendButton: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  resendText: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.textSecondary,
  },
  resendLink: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  resendLinkDisabled: {
    color: colors.textMuted,
    textDecorationLine: 'none',
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
});
