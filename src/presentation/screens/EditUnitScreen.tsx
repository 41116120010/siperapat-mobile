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
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  Hash,
  Info,
  PauseCircle,
  Save,
  Users,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { ApiUserDto } from '../../data/datasources/apiTypes';
import { userApi } from '../../data/datasources/userApi';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { FeedbackModal } from '../components/modals/FeedbackModal';
import { useEmployeeStore } from '../store/useEmployeeStore';

function formatIndonesianDateLabel(iso?: string | null): string {
  if (!iso) return '-';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(parsed);
  } catch {
    return iso.slice(0, 10);
  }
}

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
  const [serverIsActive, setServerIsActive] = useState<boolean | null>(null);
  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [agendasCount, setAgendasCount] = useState<number | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [unitUsers, setUnitUsers] = useState<ApiUserDto[]>([]);
  const [unitUsersTotal, setUnitUsersTotal] = useState<number>(0);

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
      const [unitRes, usersRes] = await Promise.allSettled([
        userApi.unit(unitId),
        userApi.users(1, { unitId, perPage: 25 }),
      ]);

      let unitRecord =
        unitRes.status === 'fulfilled' ? unitRes.value.data : null;
      if (!unitRecord) {
        unitRecord = await fetchUnitById(unitId);
      }

      if (unitRecord && isMounted) {
        setKodeUnit(unitRecord.kode_unit ?? '');
        setNamaUnit(unitRecord.nama_unit ?? '');
        setDeskripsi(unitRecord.deskripsi ?? '');
        const activeFlag = Boolean(unitRecord.is_active);
        setIsActive(activeFlag);
        setServerIsActive(activeFlag);
        setUsersCount(
          typeof unitRecord.users_count === 'number' ? unitRecord.users_count : null
        );
        setAgendasCount(
          typeof unitRecord.agendas_count === 'number' ? unitRecord.agendas_count : null
        );
        setCreatedAt('created_at' in unitRecord ? (unitRecord.created_at ?? null) : null);
      }

      if (usersRes.status === 'fulfilled' && isMounted) {
        setUnitUsers(usersRes.value.data ?? []);
        setUnitUsersTotal(usersRes.value.meta?.total ?? usersRes.value.data?.length ?? 0);
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
        subtitle={
          namaUnit
            ? `Perbarui data organisasi untuk ${namaUnit}`
            : 'Pembaruan Data & Struktur Unit Kerja'
        }
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
              <Info
                size={18}
                color={colors.primary}
                strokeWidth={2}
              />
              <Text style={styles.infoBannerText}>
                Unit kerja ini saat ini menaungi{' '}
                <Text style={styles.infoBannerHighlight}>{usersCount} pegawai ASN</Text>{' '}
                terdaftar.
              </Text>
            </View>
          ) : null}

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

          {/* SUBMIT BUTTON */}
          <View style={styles.actionContainer}>
            <Button
              title="Perbarui Unit Kerja"
              onPress={handleSubmit}
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
              disabled={!isFormValid || isLoading}
              icon={
                <Save
                  size={20}
                  color={colors.onPrimary}
                  strokeWidth={2}
                />
              }
            />
          </View>

          {/* RINGKASAN UNIT TERDAFTAR */}
          <View style={styles.summaryDarkCard}>
            <View style={styles.summaryHeader}>
              <Info size={18} color={colors.onPrimaryContainer} strokeWidth={2} />
              <Text style={styles.summaryDarkTitle}>Ringkasan Unit Terdaftar</Text>
            </View>
            <View style={styles.summaryRows}>
              <Text style={styles.summaryDarkItem}>
                Total Pegawai Terhubung:{' '}
                <Text style={styles.summaryDarkStrong}>
                  {usersCount ?? unitUsersTotal} orang
                </Text>
              </Text>
              <Text style={styles.summaryDarkItem}>
                Agenda Rapat Terlibat:{' '}
                <Text style={styles.summaryDarkStrong}>
                  {agendasCount ?? 0} agenda
                </Text>
              </Text>
              <Text style={styles.summaryDarkItem}>
                Status Saat Ini:{' '}
                <Text
                  style={
                    (serverIsActive ?? isActive)
                      ? styles.summaryStatusActive
                      : styles.summaryStatusInactive
                  }
                >
                  {(serverIsActive ?? isActive) ? 'Aktif Beroperasi' : 'Non-Aktif'}
                </Text>
              </Text>
              <View style={styles.summaryFooterDivider}>
                <Text style={styles.summaryCreatedAt}>
                  Dibuat pada: {formatIndonesianDateLabel(createdAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* PEGAWAI DI UNIT INI */}
          <View style={styles.card}>
            <View style={styles.unitUsersHeader}>
              <Users size={16} color={colors.primary} strokeWidth={2} />
              <Text style={styles.unitUsersTitle}>
                Pegawai di Unit Ini ({usersCount ?? unitUsersTotal})
              </Text>
            </View>
            {unitUsers.length === 0 ? (
              <Text style={styles.unitUsersEmpty}>
                Belum ada pegawai terhubung pada unit ini.
              </Text>
            ) : (
              <View style={styles.unitUsersList}>
                {unitUsers.map((member, index) => (
                  <View
                    key={member.id}
                    style={[
                      styles.unitUserRow,
                      index > 0 && styles.unitUserRowBorder,
                    ]}
                  >
                    <View style={styles.unitUserInfo}>
                      <Text style={styles.unitUserName} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <Text style={styles.unitUserNip} numberOfLines={1}>
                        NIP: {member.nip || '-'}
                      </Text>
                    </View>
                    <View style={styles.unitUserRoleBadge}>
                      <Text style={styles.unitUserRoleText}>
                        {member.role?.label || member.role?.value || 'Pegawai'}
                      </Text>
                    </View>
                  </View>
                ))}
                {unitUsersTotal > unitUsers.length ? (
                  <Text style={styles.unitUsersMoreHint}>
                    Menampilkan {unitUsers.length} dari {unitUsersTotal} pegawai pada unit ini.
                  </Text>
                ) : null}
              </View>
            )}
          </View>

          {/* PERUBAHAN KODE UNIT */}
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>Perubahan Kode Unit</Text>
            <Text style={styles.noticeBody}>
              Perubahan kode unit akan otomatis diperbarui pada seluruh riwayat agenda dan laporan
              berita acara rapat terkait.
            </Text>
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
    borderColor: colors.borderSubtle,
  },
  infoBannerText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurface,
    flex: 1,
  },
  infoBannerHighlight: {
    fontFamily: fontFamilies.sansBold,
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
  idBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  idBadgeText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 10.5,
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
  actionContainer: {
    marginTop: spacing.xs,
  },
  summaryDarkCard: {
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  summaryDarkTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  summaryRows: {
    gap: 6,
  },
  summaryDarkItem: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onPrimaryContainer,
    fontSize: 12,
  },
  summaryDarkStrong: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  summaryStatusActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.successLight,
  },
  summaryStatusInactive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.warningLight,
  },
  summaryFooterDivider: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.primaryContainer,
  },
  summaryCreatedAt: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
    fontSize: 11,
  },
  unitUsersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingBottom: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  unitUsersTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  unitUsersEmpty: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  unitUsersList: {
    gap: 0,
  },
  unitUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.xs + 4,
  },
  unitUserRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  unitUserInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  unitUserName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    fontSize: 12.5,
  },
  unitUserNip: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoMedium,
    color: colors.textMuted,
    fontSize: 10.5,
  },
  unitUserRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  unitUserRoleText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    color: colors.onSurface,
    fontSize: 10,
  },
  unitUsersMoreHint: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  noticeCard: {
    ...cardSurface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  noticeTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  noticeBody: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
