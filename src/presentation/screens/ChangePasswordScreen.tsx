import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Lock,
  User,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { FeedbackModal } from '../components/modals/FeedbackModal';
import { useAuthStore } from '../store/useAuthStore';

interface ChangePasswordScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const { user, changePassword, isLoading } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasUpperAndLower =
    /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isDifferentFromCurrent =
    newPassword.length > 0 &&
    currentPassword.length > 0 &&
    newPassword !== currentPassword;
  const isMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid = useMemo(
    () =>
      currentPassword.trim().length > 0 &&
      hasMinLength &&
      hasUpperAndLower &&
      hasNumber &&
      isDifferentFromCurrent &&
      isMatch,
    [
      currentPassword,
      hasMinLength,
      hasUpperAndLower,
      hasNumber,
      isDifferentFromCurrent,
      isMatch,
    ]
  );

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    setErrorMessage(null);
    const result = await changePassword(currentPassword, newPassword);

    if (result.success) {
      setShowSuccessModal(true);
    } else {
      setErrorMessage(
        result.message || 'Gagal memperbarui kata sandi. Silakan periksa kembali.'
      );
    }
  };

  const isActionHandledRef = useRef(false);

  const handleBack = () => {
    if (isActionHandledRef.current) return;
    isActionHandledRef.current = true;
    onBack();
  };

  const handleFinishSuccess = () => {
    if (isActionHandledRef.current) return;
    isActionHandledRef.current = true;
    setShowSuccessModal(false);
    onSuccess();
  };

  const criteriaItems = [
    { label: 'Minimal 8 karakter', met: hasMinLength },
    {
      label: 'Kombinasi huruf besar (A-Z) dan kecil (a-z)',
      met: hasUpperAndLower,
    },
    { label: 'Memuat sekurang-kurangnya satu angka (0-9)', met: hasNumber },
    { label: 'Berbeda dari kata sandi saat ini', met: isDifferentFromCurrent },
  ];

  return (
    <View style={styles.container}>
      <Header
        title="Perbarui Kata Sandi Akun"
        subtitle="Pastikan menggunakan kombinasi kata sandi yang kuat dan aman"
        showBack
        onBack={handleBack}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* KARTU IDENTITAS AKUN ASN AKTIF */}
          <View style={styles.accountCard}>
            <View style={styles.accountTopRow}>
              <View style={styles.avatarWrap}>
                <User size={20} strokeWidth={2} color={colors.primary} />
              </View>
              <View style={styles.accountMeta}>
                <Text style={styles.accountName}>
                  {user?.name ?? 'Nama pengguna'}
                </Text>
                <Text style={styles.accountNip}>
                  NIP. {user?.nip || '—'} • {user?.jabatan ?? 'Jabatan tidak tersedia'}
                </Text>
              </View>
            </View>
          </View>

          {/* FORMULIR PERUBAHAN KATA SANDI */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Pembaruan Kredensial</Text>

            {errorMessage ? (
              <View style={styles.errorAlert}>
                <AlertCircle size={18} strokeWidth={2} color={colors.error} />
                <Text style={styles.errorAlertText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* 1. Kata Sandi Saat Ini */}
            <View style={styles.inputWrapper}>
              <Input
                label="Kata Sandi Saat Ini *"
                placeholder="Masukkan kata sandi yang sedang digunakan..."
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={(val) => {
                  setCurrentPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                leftIcon={
                  <Lock size={18} strokeWidth={2} color={colors.textMuted} />
                }
                rightAction={
                  <Pressable
                    onPress={() => setShowCurrent(!showCurrent)}
                    style={styles.eyeButton}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showCurrent ? 'Sembunyikan sandi' : 'Tampilkan sandi'
                    }
                  >
                    {showCurrent ? (
                      <EyeOff
                        size={19}
                        strokeWidth={2}
                        color={colors.onSurfaceVariant}
                      />
                    ) : (
                      <Eye
                        size={19}
                        strokeWidth={2}
                        color={colors.onSurfaceVariant}
                      />
                    )}
                  </Pressable>
                }
              />
            </View>

            {/* 2. Kata Sandi Baru */}
            <View style={styles.inputWrapper}>
              <Input
                label="Kata Sandi Baru *"
                placeholder="Minimal 8 karakter kombinasi..."
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={(val) => {
                  setNewPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                leftIcon={
                  <KeyRound size={18} strokeWidth={2} color={colors.primary} />
                }
                rightAction={
                  <Pressable
                    onPress={() => setShowNew(!showNew)}
                    style={styles.eyeButton}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showNew ? 'Sembunyikan sandi' : 'Tampilkan sandi'
                    }
                  >
                    {showNew ? (
                      <EyeOff
                        size={19}
                        strokeWidth={2}
                        color={colors.onSurfaceVariant}
                      />
                    ) : (
                      <Eye
                        size={19}
                        strokeWidth={2}
                        color={colors.onSurfaceVariant}
                      />
                    )}
                  </Pressable>
                }
              />
            </View>

            {/* 3. Konfirmasi Kata Sandi Baru */}
            <View style={styles.inputWrapper}>
              <Input
                label="Konfirmasi Kata Sandi Baru *"
                placeholder="Ulangi kata sandi baru..."
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={(val) => {
                  setConfirmPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                error={
                  confirmPassword.length > 0 && !isMatch
                    ? 'Konfirmasi kata sandi tidak cocok.'
                    : undefined
                }
                leftIcon={
                  <KeyRound
                    size={18}
                    strokeWidth={2}
                    color={colors.secondary}
                  />
                }
                rightAction={
                  <Pressable
                    onPress={() => setShowConfirm(!showConfirm)}
                    style={styles.eyeButton}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showConfirm ? 'Sembunyikan sandi' : 'Tampilkan sandi'
                    }
                  >
                    {showConfirm ? (
                      <EyeOff
                        size={19}
                        strokeWidth={2}
                        color={colors.onSurfaceVariant}
                      />
                    ) : (
                      <Eye
                        size={19}
                        strokeWidth={2}
                        color={colors.onSurfaceVariant}
                      />
                    )}
                  </Pressable>
                }
              />
            </View>

            {/* CHECKLIST KRITERIA KEAMANAN */}
            <View style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>
                Kriteria Keamanan Kata Sandi Kedinasan:
              </Text>

              {criteriaItems.map((item) => (
                <View key={item.label} style={styles.checkItem}>
                  {item.met ? (
                    <CheckCircle2
                      size={16}
                      strokeWidth={2}
                      color={colors.success}
                    />
                  ) : (
                    <Circle
                      size={16}
                      strokeWidth={2}
                      color={colors.borderStrong}
                    />
                  )}
                  <Text
                    style={[
                      styles.checkText,
                      item.met && styles.checkTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* KOTAK INFORMASI KEAMANAN INSTITUSI */}
            <View style={styles.noticeBox}>
              <Info size={18} strokeWidth={2} color={colors.infoText} />
              <Text style={styles.noticeText}>
                Pembaruan kata sandi ini akan disinkronkan secara otomatis
                dengan seluruh layanan kedinasan LLDIKTI Wilayah X dan mencabut
                sesi perangkat lain.
              </Text>
            </View>

            {/* TOMBOL AKSI */}
            <View style={styles.actionsRow}>
              <Button
                title={isLoading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
                onPress={() => void handleSubmit()}
                disabled={!isFormValid || isLoading}
                isLoading={isLoading}
                variant="primary"
                fullWidth
                icon={
                  <CheckCircle2
                    size={18}
                    strokeWidth={2}
                    color={colors.onPrimary}
                  />
                }
              />

              <Button
                title="Batal"
                onPress={handleBack}
                disabled={isLoading}
                variant="outline"
                fullWidth
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FeedbackModal
        visible={showSuccessModal}
        onClose={handleFinishSuccess}
        type="success"
        title="Kata Sandi Berhasil Diperbarui"
        message="Kredensial akun ASN Anda telah diperbarui pada sistem pusat kepegawaian LLDIKTI Wilayah X."
        confirmText="Kembali ke Profil"
        onConfirm={handleFinishSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl + 20,
  },
  accountCard: {
    ...cardSurface,
    borderRadius: rounded.card,
    padding: spacing.md,
    overflow: 'hidden',
    gap: spacing.xs + 2,
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  accountMeta: {
    flex: 1,
  },
  accountName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13.5,
    color: colors.onSurface,
  },
  accountNip: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  formCard: {
    ...cardSurface,
    borderRadius: rounded.card,
    padding: spacing.md,
    overflow: 'hidden',
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14.5,
    color: colors.onSurface,
    paddingBottom: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: 4,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    marginBottom: 4,
  },
  errorAlertText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.error,
    flex: 1,
    lineHeight: 16,
  },
  inputWrapper: {
    marginBottom: -4,
  },
  eyeButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  checklistCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 8,
    marginVertical: 4,
  },
  checklistTitle: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.onSurface,
    marginBottom: 2,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.textMuted,
    flex: 1,
  },
  checkTextActive: {
    color: colors.onSurface,
    fontFamily: fontFamilies.sansSemiBold,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.infoBg,
    borderRadius: rounded.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    marginTop: 4,
    marginBottom: 8,
  },
  noticeText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.infoText,
    flex: 1,
    lineHeight: 16,
  },
  actionsRow: {
    gap: spacing.sm,
    marginTop: 4,
  },
});
