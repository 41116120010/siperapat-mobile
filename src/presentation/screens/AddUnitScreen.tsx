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
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
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
        subtitle="Registrasi Struktur Unit Kerja Baru LLDIKTI X"
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
              <MaterialIcons
                name="error-outline"
                size={18}
                color={colors.error}
              />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={clearError} hitSlop={8}>
                <MaterialIcons name="close" size={16} color={colors.error} />
              </Pressable>
            </View>
          ) : null}

          {/* FORM CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <MaterialIcons
                  name="domain"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Informasi Pokok Unit Kerja</Text>
                <Text style={styles.cardSubtitle}>
                  Lengkapi identitas singkatan dan nama unit kerja resmi
                </Text>
              </View>
            </View>

            <View style={styles.formFields}>
              {/* KODE UNIT */}
              <Input
                label="Kode Singkat Unit Kerja *"
                placeholder="Contoh: TU, AKAD, SDPT, HKTL"
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
                helperText="Digunakan sebagai kode referensi cepat pada sistem dan agenda rapat"
                leftIcon={
                  <MaterialIcons
                    name="tag"
                    size={18}
                    color={colors.onSurfaceVariant}
                  />
                }
              />

              {/* NAMA UNIT KERJA */}
              <Input
                label="Nama Unit Kerja Resmi *"
                placeholder="Contoh: Subbag Tata Usaha & BMN"
                value={namaUnit}
                onChangeText={(text) => {
                  setNamaUnit(text);
                  if (error) clearError();
                }}
                autoCapitalize="words"
                maxLength={150}
                helperText="Nama lengkap bidang atau subbagian kelembagaan"
                leftIcon={
                  <MaterialIcons
                    name="domain"
                    size={18}
                    color={colors.onSurfaceVariant}
                  />
                }
              />

              {/* DESKRIPSI UNIT (OPSIONAL) */}
              <Input
                label="Deskripsi / Tugas Pokok (Opsional)"
                placeholder="Tuliskan tugas & fungsi pokok unit kerja..."
                value={deskripsi}
                onChangeText={setDeskripsi}
                multiline
                numberOfLines={3}
                maxLength={500}
                helperText="Catatan ruang lingkup tanggung jawab unit kerja kedinasan (maks. 500 karakter)"
                leftIcon={
                  <MaterialIcons
                    name="description"
                    size={18}
                    color={colors.onSurfaceVariant}
                  />
                }
              />

              {/* STATUS KEAKTIFAN OPERASIONAL */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Status Operasional Unit</Text>
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
                    <MaterialIcons
                      name="check-circle"
                      size={18}
                      color={isActive ? colors.success : colors.outline}
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
                    <MaterialIcons
                      name="pause-circle"
                      size={18}
                      color={!isActive ? colors.error : colors.outline}
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

          {/* SUBMIT BUTTON */}
          <View style={styles.actionContainer}>
            <Button
              title="Simpan Unit Kerja"
              onPress={handleSubmit}
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
              disabled={!isFormValid || isLoading}
              icon={
                <MaterialIcons
                  name="domain-add"
                  size={20}
                  color={colors.onPrimary}
                />
              }
            />
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
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.3)',
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    flex: 1,
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.3)',
  },
  cardHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  cardTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  statusPillActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: 'rgba(5, 150, 105, 0.4)',
  },
  statusPillInactive: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderColor: 'rgba(186, 26, 26, 0.4)',
  },
  statusPillText: {
    ...typography.labelSm,
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  statusPillTextActive: {
    color: colors.success,
    fontWeight: '700',
  },
  statusPillTextInactive: {
    color: colors.error,
    fontWeight: '700',
  },
  actionContainer: {
    marginTop: spacing.xs,
  },
});
