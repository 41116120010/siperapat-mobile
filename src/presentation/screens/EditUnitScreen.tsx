import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
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

interface EditUnitScreenProps {
  unitId: number | string;
  onBack?: () => void;
  onSuccess?: () => void;
}

export const EditUnitScreen: React.FC<EditUnitScreenProps> = ({
  unitId,
  onBack,
  onSuccess,
}) => {
  const { fetchUnitById, updateUnit, isLoading, error, clearError } =
    useEmployeeStore();

  const [isInitializing, setIsInitializing] = useState(true);

  // Form State
  const [kodeUnit, setKodeUnit] = useState('');
  const [namaUnit, setNamaUnit] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [usersCount, setUsersCount] = useState<number | null>(null);

  // Success Feedback Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updatedSummary, setUpdatedSummary] = useState<{
    kode_unit: string;
    nama_unit: string;
    is_active: boolean;
  } | null>(null);

  // Load Unit Data on Mount
  useEffect(() => {
    let isMounted = true;
    const loadUnit = async () => {
      setIsInitializing(true);
      const unit = await fetchUnitById(unitId);
      if (unit && isMounted) {
        setKodeUnit(unit.kode_unit ?? '');
        setNamaUnit(unit.nama_unit ?? '');
        setDeskripsi(unit.deskripsi ?? '');
        setIsActive(Boolean(unit.is_active));
        setUsersCount(
          typeof unit.users_count === 'number' ? unit.users_count : null
        );
      }
      if (isMounted) {
        setIsInitializing(false);
      }
    };
    void loadUnit();
    return () => {
      isMounted = false;
    };
  }, [unitId, fetchUnitById]);

  const isFormValid =
    kodeUnit.trim().length >= 2 && namaUnit.trim().length >= 3;

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    clearError();
    const trimmedCode = kodeUnit.trim().toUpperCase();
    const trimmedName = namaUnit.trim();

    const result = await updateUnit(unitId, {
      kode_unit: trimmedCode,
      nama_unit: trimmedName,
      deskripsi: deskripsi.trim() || null,
      is_active: isActive,
    });

    if (result) {
      setUpdatedSummary({
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

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <Header
          title="Edit Unit Kerja"
          subtitle="Pembaruan Data & Struktur Unit Kerja"
          showBack={Boolean(onBack)}
          onBack={handleBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat data unit kerja...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Edit Unit Kerja"
        subtitle="Pembaruan Data & Struktur Unit Kerja"
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
          {/* CONTEXT & ASN DEPENDENCY BANNER */}
          {usersCount !== null && usersCount > 0 ? (
            <View style={styles.infoBanner}>
              <MaterialIcons
                name="info-outline"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.infoBannerText}>
                Unit kerja ini saat ini menaungi{' '}
                <Text style={{ fontWeight: '700' }}>{usersCount} pegawai ASN</Text>{' '}
                terdaftar.
              </Text>
            </View>
          ) : null}

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
                <Text style={styles.cardTitle}>Pembaruan Informasi Unit</Text>
                <Text style={styles.cardSubtitle}>
                  Sesuaikan rincian identitas dan status keaktifan unit kerja
                </Text>
              </View>
              <View style={styles.idBadge}>
                <Text style={styles.idBadgeText}>ID: {unitId}</Text>
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
              title="Simpan Perubahan"
              onPress={handleSubmit}
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
              disabled={!isFormValid || isLoading}
              icon={
                <MaterialIcons
                  name="save"
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
        title="Data Unit Kerja Diperbarui"
        message="Pembaruan data dan struktur unit kerja telah berhasil disimpan."
        detail={
          updatedSummary
            ? {
                'Kode Unit': updatedSummary.kode_unit,
                'Nama Unit': updatedSummary.nama_unit,
                'Status Operasional': updatedSummary.is_active
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 12.5,
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
  },
  infoBannerText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurface,
    flex: 1,
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
  idBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  idBadgeText: {
    ...typography.labelMono,
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.primary,
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
