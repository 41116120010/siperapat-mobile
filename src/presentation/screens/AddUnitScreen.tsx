import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  Hash,
  Info,
  PauseCircle,
  PlusCircle,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { FeedbackModal } from '../components/modals/FeedbackModal';
import { useEmployeeStore } from '../store/useEmployeeStore';

interface AddUnitScreenProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export const AddUnitScreen: React.FC<AddUnitScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const { addUnit, isLoading, error, clearError } = useEmployeeStore();

  // Form State
  const [kodeUnit, setKodeUnit] = useState('');
  const [namaUnit, setNamaUnit] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Success Feedback Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<{
    kode_unit: string;
    nama_unit: string;
    is_active: boolean;
  } | null>(null);

  const isFormValid =
    kodeUnit.trim().length >= 2 && namaUnit.trim().length >= 3;

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    clearError();
    const trimmedCode = kodeUnit.trim().toUpperCase();
    const trimmedName = namaUnit.trim();

    const result = await addUnit({
      kode_unit: trimmedCode,
      nama_unit: trimmedName,
      deskripsi: deskripsi.trim() || null,
      is_active: isActive,
    });

    if (result) {
      setCreatedSummary({
        kode_unit: result.kode_unit,
        nama_unit: result.nama_unit,
        is_active: Boolean(result.is_active),
      });
      setShowSuccessModal(true);
    }
  };

  const isActionHandledRef = React.useRef(false);

  const handleBack = () => {
    if (isActionHandledRef.current) return;
    isActionHandledRef.current = true;
    onBack?.();
  };

  const handleSuccessClose = () => {
    if (isActionHandledRef.current) return;
    isActionHandledRef.current = true;
    setShowSuccessModal(false);
    if (onSuccess) {
      onSuccess();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Tambah Unit Kerja"
        subtitle="Daftarkan struktur organisasi / Pokja baru di lingkungan LLDIKTI"
        showBack={Boolean(onBack)}
        onBack={handleBack}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ERROR ALERT BANNER */}
          {error ? (
            <View style={styles.errorBanner}>
              <AlertCircle
                size={18}
                color={colors.error}
                strokeWidth={2}
              />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                onPress={clearError}
                style={styles.errorCloseButton}
                accessibilityRole="button"
                accessibilityLabel="Tutup pesan kesalahan"
              >
                <X size={16} color={colors.error} strokeWidth={2} />
              </Pressable>
            </View>
          ) : null}

          {/* FORM CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Building2
                  size={20}
                  color={colors.primary}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.cardHeaderTextWrap}>
                <Text style={styles.cardTitle}>Informasi Pokok Unit Kerja</Text>
                <Text style={styles.cardSubtitle}>
                  Lengkapi identitas singkatan dan nama unit kerja resmi
                </Text>
              </View>
            </View>

            <View style={styles.formFields}>
              {/* NAMA UNIT KERJA */}
              <Input
                label="Nama Unit Kerja *"
                placeholder="Contoh: Pokja Transformasi Pendidikan Tinggi"
                value={namaUnit}
                onChangeText={(text) => {
                  setNamaUnit(text);
                  if (error) clearError();
                }}
                autoCapitalize="words"
                maxLength={150}
                helperText="Nama lengkap bidang atau subbagian kelembagaan"
                leftIcon={
                  <Building2
                    size={18}
                    color={colors.onSurfaceVariant}
                    strokeWidth={2}
                  />
                }
              />

              {/* KODE UNIT */}
              <Input
                label="Kode Singkatan Unit *"
                placeholder="Contoh: POKJA-TPT"
                value={kodeUnit}
                onChangeText={(text) => {
                  setKodeUnit(text.toUpperCase());
                  if (error) clearError();
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                maxLength={20}
                isMono
                helperText="Harus unik, huruf kapital alfanumerik atau tanda hubung."
                leftIcon={
                  <Hash
                    size={18}
                    color={colors.onSurfaceVariant}
                    strokeWidth={2}
                  />
                }
              />

              {/* DESKRIPSI UNIT (OPSIONAL) */}
              <Input
                label="Deskripsi Tugas & Fungsi"
                placeholder="Uraian singkat peran dan tanggung jawab unit kerja..."
                value={deskripsi}
                onChangeText={setDeskripsi}
                multiline
                numberOfLines={3}
                maxLength={500}
                helperText="Catatan ruang lingkup tanggung jawab unit kerja kedinasan (maks. 500 karakter)"
                leftIcon={
                  <FileText
                    size={18}
                    color={colors.onSurfaceVariant}
                    strokeWidth={2}
                  />
                }
              />

              {/* STATUS KEAKTIFAN OPERASIONAL */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Unit berstatus aktif</Text>
                <View style={styles.statusPillsRow}>
                  <Pressable
                    onPress={() => setIsActive(true)}
                    style={[
                      styles.statusPill,
                      isActive && styles.statusPillActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Pilih status unit aktif"
                  >
                    <CheckCircle2
                      size={18}
                      color={isActive ? colors.success : colors.outline}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        isActive && styles.statusPillTextActive,
                      ]}
                    >
                      Aktif
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setIsActive(false)}
                    style={[
                      styles.statusPill,
                      !isActive && styles.statusPillInactive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Pilih status unit nonaktif"
                  >
                    <PauseCircle
                      size={18}
                      color={!isActive ? colors.error : colors.outline}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        !isActive && styles.statusPillTextInactive,
                      ]}
                    >
                      Nonaktif
                    </Text>
                  </Pressable>
                </View>
                <Text style={styles.fieldHint}>
                  Unit kerja nonaktif tidak dapat dipilih saat mendaftarkan agenda rapat baru
                </Text>
              </View>
            </View>
          </View>

          {/* SUBMIT & CANCEL ACTIONS (1:1 Web units/create.blade.php) */}
          <View style={styles.actionRow}>
            {onBack ? (
              <Button
                title="Batal"
                onPress={handleBack}
                variant="secondary"
                size="lg"
                disabled={isLoading}
                style={styles.cancelActionBtn}
              />
            ) : null}
            <Button
              title="Simpan Unit Kerja"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={!isFormValid || isLoading}
              style={styles.submitActionBtn}
              icon={
                <PlusCircle
                  size={20}
                  color={colors.onPrimary}
                  strokeWidth={2}
                />
              }
            />
          </View>

          {/* PANDUAN PENAMAAN & SCOPING */}
          <View style={styles.guideDarkCard}>
            <View style={styles.guideHeader}>
              <Info size={18} color={colors.onPrimaryContainer} strokeWidth={2} />
              <Text style={styles.guideDarkTitle}>Standar Penamaan Unit</Text>
            </View>
            <View style={styles.guideList}>
              <Text style={styles.guideDarkItem}>
                • <Text style={styles.guideDarkStrong}>Nama Unit:</Text> Gunakan nomenklatur resmi
                Pokja / Sub-bagian (misal: Pokja Kelembagaan & Kerjasama).
              </Text>
              <Text style={styles.guideDarkItem}>
                • <Text style={styles.guideDarkStrong}>Kode Unit:</Text> Format ringkas 3-10 huruf
                kapital alfanumerik (misal: POKJA-KLB, AKADEMIK, KEUANGAN).
              </Text>
              <Text style={styles.guideDarkItem}>
                • <Text style={styles.guideDarkStrong}>Status Aktif:</Text> Unit aktif akan otomatis
                muncul pada target scoping rapat dan pilihan registrasi pegawai.
              </Text>
            </View>
          </View>

          <View style={styles.guideLightCard}>
            <Text style={styles.guideLightTitle}>Integrasi Scoping Presensi</Text>
            <Text style={styles.guideLightBody}>
              Setiap agenda rapat kedinasan dapat dikhususkan hanya untuk unit tertentu atau
              mencakup seluruh unit LLDIKTI Wilayah X.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* SUCCESS CONFIRMATION MODAL */}
      <FeedbackModal
        visible={showSuccessModal}
        type="success"
        title="Unit Kerja Berhasil Ditambahkan"
        message="Struktur unit kerja baru telah berhasil didaftarkan pada direktori kedinasan LLDIKTI X."
        detail={
          createdSummary
            ? {
                'Kode Unit': createdSummary.kode_unit,
                'Nama Unit': createdSummary.nama_unit,
                'Status Operasional': createdSummary.is_active
                  ? 'Aktif'
                  : 'Nonaktif',
              }
            : undefined
        }
        confirmText="Kembali ke Direktori"
        onConfirm={handleSuccessClose}
        onClose={handleSuccessClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.errorContainer,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.onErrorContainer,
    flex: 1,
    fontSize: 12,
  },
  errorCloseButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    ...cardSurface,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardHeaderTextWrap: {
    flex: 1,
  },
  cardTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  cardSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  formFields: {
    gap: spacing.sm + 4,
  },
  fieldGroup: {
    gap: 6,
    marginTop: 2,
  },
  fieldLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  fieldHint: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  statusPill: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  statusPillActive: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  statusPillInactive: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.errorBorder,
  },
  statusPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  statusPillTextActive: {
    color: colors.onSuccessContainer,
    fontFamily: fontFamilies.sansBold,
  },
  statusPillTextInactive: {
    color: colors.onErrorContainer,
    fontFamily: fontFamilies.sansBold,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelActionBtn: {
    flex: 1,
  },
  submitActionBtn: {
    flex: 2,
  },
  guideDarkCard: {
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    padding: spacing.md,
    gap: spacing.sm,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  guideDarkTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  guideList: {
    gap: spacing.xs + 2,
  },
  guideDarkItem: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.onPrimaryContainer,
    fontSize: 12,
    lineHeight: 18,
  },
  guideDarkStrong: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  guideLightCard: {
    ...cardSurface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  guideLightTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  guideLightBody: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
