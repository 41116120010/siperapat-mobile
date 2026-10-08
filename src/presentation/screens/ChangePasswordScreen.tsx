import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
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

  // Kriteria Validasi Kata Sandi
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

  const isFormValid = useMemo(() => {
    return (
      currentPassword.trim().length > 0 &&
      hasMinLength &&
      hasUpperAndLower &&
      hasNumber &&
      isDifferentFromCurrent &&
      isMatch
    );
  }, [
    currentPassword,
    hasMinLength,
    hasUpperAndLower,
    hasNumber,
    isDifferentFromCurrent,
    isMatch,
  ]);

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

  const isActionHandledRef = React.useRef(false);

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

  return (
    <View style={styles.container}>
      <Header
        title="Ubah Kata Sandi"
        subtitle="Keamanan Akun Kedinasan LLDIKTI X"
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
                <MaterialIcons name="person" size={24} color={colors.primary} />
              </View>
              <View style={styles.accountMeta}>
                <Text style={styles.accountName}>
                  {user?.name ?? 'Afdalisma, SH, M.Pd'}
                </Text>
                <Text style={styles.accountNip}>
                  NIP. {user?.nip ?? '197012051992032002'} • {user?.jabatan ?? 'Kepala Lembaga'}
                </Text>
              </View>
            </View>
          </View>

          {/* FORMULIR PERUBAHAN KATA SANDI */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Pembaruan Kredensial</Text>

            {/* Error Message Alert jika ada */}
            {errorMessage ? (
              <View style={styles.errorAlert}>
                <MaterialIcons
                  name="error-outline"
                  size={18}
                  color={colors.error}
                />
                <Text style={styles.errorAlertText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* 1. Kata Sandi Saat Ini */}
            <View style={styles.inputWrapper}>
              <Input
                label="Kata Sandi Saat Ini *"
                placeholder="Masukkan kata sandi saat ini"
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={(val) => {
                  setCurrentPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                leftIcon={
                  <MaterialIcons
                    name="lock-outline"
                    size={20}
                    color={colors.outline}
                  />
                }
                rightAction={
                  <Pressable
                    onPress={() => setShowCurrent(!showCurrent)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showCurrent ? 'Sembunyikan sandi' : 'Tampilkan sandi'
                    }
                  >
                    <MaterialIcons
                      name={showCurrent ? 'visibility-off' : 'visibility'}
                      size={20}
                      color={colors.onSurfaceVariant}
                    />
                  </Pressable>
                }
              />
            </View>

            {/* 2. Kata Sandi Baru */}
            <View style={styles.inputWrapper}>
              <Input
                label="Kata Sandi Baru *"
                placeholder="Buat kata sandi baru"
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={(val) => {
                  setNewPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                leftIcon={
                  <MaterialIcons name="lock" size={20} color={colors.primary} />
                }
                rightAction={
                  <Pressable
                    onPress={() => setShowNew(!showNew)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showNew ? 'Sembunyikan sandi' : 'Tampilkan sandi'
                    }
                  >
                    <MaterialIcons
                      name={showNew ? 'visibility-off' : 'visibility'}
                      size={20}
                      color={colors.onSurfaceVariant}
                    />
                  </Pressable>
                }
              />
            </View>

            {/* 3. Konfirmasi Kata Sandi Baru */}
            <View style={styles.inputWrapper}>
              <Input
                label="Konfirmasi Kata Sandi Baru *"
                placeholder="Ulangi kata sandi baru"
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
                  <MaterialIcons
                    name="lock-reset"
                    size={20}
                    color={colors.secondary}
                  />
                }
                rightAction={
                  <Pressable
                    onPress={() => setShowConfirm(!showConfirm)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showConfirm ? 'Sembunyikan sandi' : 'Tampilkan sandi'
                    }
                  >
                    <MaterialIcons
                      name={showConfirm ? 'visibility-off' : 'visibility'}
                      size={20}
                      color={colors.onSurfaceVariant}
                    />
                  </Pressable>
                }
              />
            </View>

            {/* CHECKLIST KRITERIA KEAMANAN (ANTI-UI-SLOP) */}
            <View style={styles.checklistCard}>
              <Text style={styles.checklistTitle}>
                Kriteria Keamanan Kata Sandi Kedinasan:
              </Text>

              <View style={styles.checkItem}>
                <MaterialIcons
                  name={hasMinLength ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={hasMinLength ? colors.success : colors.outlineVariant}
                />
                <Text
                  style={[
                    styles.checkText,
                    hasMinLength && styles.checkTextActive,
                  ]}
                >
                  Minimal 8 karakter
                </Text>
              </View>

              <View style={styles.checkItem}>
                <MaterialIcons
                  name={
                    hasUpperAndLower
                      ? 'check-circle'
                      : 'radio-button-unchecked'
                  }
                  size={16}
                  color={
                    hasUpperAndLower ? colors.success : colors.outlineVariant
                  }
                />
                <Text
                  style={[
                    styles.checkText,
                    hasUpperAndLower && styles.checkTextActive,
                  ]}
                >
                  Kombinasi huruf besar (A-Z) dan kecil (a-z)
                </Text>
              </View>

              <View style={styles.checkItem}>
                <MaterialIcons
                  name={hasNumber ? 'check-circle' : 'radio-button-unchecked'}
                  size={16}
                  color={hasNumber ? colors.success : colors.outlineVariant}
                />
                <Text
                  style={[
                    styles.checkText,
                    hasNumber && styles.checkTextActive,
                  ]}
                >
                  Memuat sekurang-kurangnya satu angka (0-9)
                </Text>
              </View>

              <View style={styles.checkItem}>
                <MaterialIcons
                  name={
                    isDifferentFromCurrent
                      ? 'check-circle'
                      : 'radio-button-unchecked'
                  }
                  size={16}
                  color={
                    isDifferentFromCurrent
                      ? colors.success
                      : colors.outlineVariant
                  }
                />
                <Text
                  style={[
                    styles.checkText,
                    isDifferentFromCurrent && styles.checkTextActive,
                  ]}
                >
                  Berbeda dari kata sandi saat ini
                </Text>
              </View>
            </View>

            {/* KOTAK INFORMASI KEAMANAN INSTITUSI */}
            <View style={styles.noticeBox}>
              <MaterialIcons
                name="info-outline"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.noticeText}>
                Pembaruan kata sandi ini akan disinkronkan secara otomatis
                dengan seluruh layanan kedinasan LLDIKTI Wilayah X. Jaga
                kerahasiaan kredensial akun Anda.
              </Text>
            </View>

            {/* TOMBOL AKSI */}
            <View style={styles.actionsRow}>
              <Button
                title={isLoading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
                onPress={handleSubmit}
                disabled={!isFormValid || isLoading}
                isLoading={isLoading}
                variant="primary"
                fullWidth
                icon={
                  <MaterialIcons
                    name="check-circle"
                    size={18}
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

      {/* MODAL FEEDBACK SUKSES ENTERPRISE */}
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
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    overflow: 'hidden',
    gap: spacing.xs + 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  accountMeta: {
    flex: 1,
  },
  accountName: {
    ...typography.labelMd,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  accountNip: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  formCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    overflow: 'hidden',
    gap: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  cardTitle: {
    ...typography.headlineSm,
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.onSurface,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.3)',
    marginBottom: 4,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
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
  checklistCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: 6,
    marginVertical: 4,
  },
  checklistTitle: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  checkTextActive: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(0, 35, 111, 0.04)',
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 35, 111, 0.12)',
    marginTop: 4,
    marginBottom: 8,
  },
  noticeText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 16,
  },
  actionsRow: {
    gap: spacing.sm,
    marginTop: 4,
  },
});
