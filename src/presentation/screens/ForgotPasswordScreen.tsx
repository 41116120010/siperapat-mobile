import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing, elevations } from '../../core/theme/tokens';
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

  const handleHelpdesk = () => {
    Linking.openURL('tel:0751123456').catch(() => {});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Identity & Institutional Header Bar */}
        <View style={styles.header}>
          <View style={styles.logoTile}>
            <Image
              source={require('../../../assets/images/tut-wuri-handayani.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appTitle}>SIPERAPAT</Text>
          <Text style={styles.appSubtitle}>LLDIKTI WILAYAH X</Text>
          <Text style={styles.welcomeSubtitle}>
            {isSubmitted
              ? 'Tautan Pemulihan Kata Sandi Berhasil Dikirim'
              : 'Pemulihan Kata Sandi Akun Kedinasan ASN'}
          </Text>
        </View>

        {/* Main Authentication Bento Card */}
        <View style={styles.card}>
          {!isSubmitted ? (
            /* STATE 1: FORMULIR PENGAJUAN PEMULIHAN */
            <>
              <View style={styles.formHeaderRow}>
                <View style={styles.formIconWrap}>
                  <MaterialIcons name="lock-reset" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardHeading}>Lupa Kata Sandi?</Text>
                  <Text style={styles.cardInstruction}>
                    Masukkan NIP atau Email dinas resmi Anda untuk menerima instruksi pemulihan.
                  </Text>
                </View>
              </View>

              {/* Input NIP / Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NIP (18 Digit) atau Email Kedinasan</Text>
                <Input
                  label=""
                  placeholder="Masukkan NIP atau email dinas"
                  value={identifier}
                  onChangeText={handleIdentifierChange}
                  keyboardType="default"
                  maxLength={40}
                  isMono={isNumericInput}
                  leftIcon={
                    <MaterialIcons
                      name={isNumericInput ? 'badge' : 'mail'}
                      size={20}
                      color={colors.outline}
                    />
                  }
                />
              </View>

              {/* Info Box Pedoman Keamanan */}
              <View style={styles.noticeBox}>
                <MaterialIcons name="info" size={18} color={colors.primary} />
                <Text style={styles.noticeText}>
                  Tautan pemulihan hanya akan dikirimkan ke alamat email kedinasan aktif
                  yang telah terdaftar di database kepegawaian LLDIKTI X.
                </Text>
              </View>

              {/* Tombol Aksi */}
              <View style={styles.actionColumn}>
                <Button
                  title="Kirim Tautan Pemulihan"
                  onPress={handleSubmit}
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={authLoading}
                  disabled={authLoading || !identifier.trim()}
                  icon={<MaterialIcons name="send" size={18} color={colors.onPrimary} />}
                />

                <Button
                  title="Kembali ke Halaman Masuk"
                  onPress={onBack}
                  variant="outline"
                  size="lg"
                  fullWidth
                  disabled={authLoading}
                  icon={<MaterialIcons name="arrow-back" size={18} color={colors.primary} />}
                />
              </View>
            </>
          ) : (
            /* STATE 2: KONFIRMASI SUKSES PENGIRIMAN */
            <View style={styles.successStateWrap}>
              <View style={styles.successBadgeWrap}>
                <MaterialIcons name="mark-email-read" size={44} color={colors.primary} />
              </View>

              <Text style={styles.successTitle}>Periksa Email Kedinasan</Text>
              <Text style={styles.successDesc}>
                Instruksi dan tautan pemulihan kata sandi telah dikirimkan ke email yang
                terkait dengan:
              </Text>

              {/* Target Masking Card */}
              <View style={styles.targetPill}>
                <MaterialIcons
                  name={submittedTarget.includes('@') ? 'mail-outline' : 'badge'}
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.targetPillText}>
                  {maskEmailOrNIP(submittedTarget)}
                </Text>
              </View>

              <View style={styles.expiryNoticeBox}>
                <MaterialIcons name="schedule" size={16} color={colors.secondary} />
                <Text style={styles.expiryNoticeText}>
                  Tautan berlaku selama 15 menit. Jika tidak ditemukan di Kotak Masuk,
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
                  icon={<MaterialIcons name="login" size={18} color={colors.onPrimary} />}
                />

                {/* Resend Link */}
                <View style={styles.resendRow}>
                  <Text style={styles.resendText}>Tidak menerima email? </Text>
                  <Pressable
                    onPress={handleResend}
                    disabled={cooldown > 0 || authLoading}
                    hitSlop={6}
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
          <View style={styles.helpdeskRow}>
            <Text style={styles.helpdeskText}>Kendala akun kedinasan? </Text>
            <Pressable onPress={handleHelpdesk} style={styles.helpdeskLinkWrap}>
              <Text style={styles.helpdeskLink}>
                Hubungi Helpdesk Kepegawaian
              </Text>
              <MaterialIcons name="open-in-new" size={12} color={colors.secondary} />
            </Pressable>
          </View>

          <Text style={styles.copyrightText}>
            © 2026 Lembaga Layanan Pendidikan Tinggi Wilayah X • Kemdiktisaintek
          </Text>
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
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoTile: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    ...elevations.level2,
    shadowColor: '#00236F',
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    ...typography.headlineLg,
    fontSize: 24,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  appSubtitle: {
    ...typography.labelSm,
    color: colors.secondary,
    letterSpacing: 1.2,
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  welcomeSubtitle: {
    ...typography.bodySm,
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 290,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    ...elevations.level2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    gap: spacing.md,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },
  formIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeading: {
    ...typography.headlineSm,
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  cardInstruction: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
    marginTop: 2,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.labelMd,
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noticeText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
    flex: 1,
  },
  actionColumn: {
    gap: spacing.sm,
    marginTop: 4,
  },
  successStateWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  successBadgeWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typography.headlineSm,
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  successDesc: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: spacing.xs,
  },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.full,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },
  targetPillText: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.primary,
  },
  expiryNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(79, 107, 153, 0.08)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.md,
    marginBottom: spacing.lg,
  },
  expiryNoticeText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.secondary,
    lineHeight: 15,
    flex: 1,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  resendText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
  },
  resendLink: {
    ...typography.labelSm,
    fontSize: 11.5,
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  resendLinkDisabled: {
    color: colors.outline,
    textDecorationLine: 'none',
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  helpdeskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  helpdeskText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
  },
  helpdeskLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  helpdeskLink: {
    ...typography.labelSm,
    fontSize: 11.5,
    color: colors.secondary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  copyrightText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.outline,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 14,
  },
});
