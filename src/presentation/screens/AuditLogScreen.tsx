import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ScrollViewInstance,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Calendar,
  ChevronRight,
  Info,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { PaginationBar } from '../components/common/PaginationBar';
import { Button } from '../components/common/Button';
import { CalendarDatePickerModal } from '../components/modals/CalendarDatePickerModal';
import { activityLogApi } from '../../data/datasources/userApi';
import { ApiActivityLogDto, ApiActivityLogPage } from '../../data/datasources/apiTypes';
import { useAuthStore } from '../store/useAuthStore';
import { triggerPageTransition } from '../store/useTransitionStore';

interface AuditLogScreenProps {
  onBack?: () => void;
}

type LogTone = 'success' | 'warning' | 'danger' | 'info' | 'export';

const getLogTone = (activityType: string): { tone: LogTone; label: string } => {
  if (activityType.includes('DELETE')) return { tone: 'danger', label: 'Hapus' };
  if (activityType.includes('UPDATE') || activityType.includes('TOGGLE')) {
    return { tone: 'warning', label: 'Ubah' };
  }
  if (activityType.startsWith('AUTH_') || activityType.includes('LOGIN') || activityType.includes('ATTENDANCE')) {
    return { tone: 'success', label: 'Terverifikasi' };
  }
  if (activityType.includes('EXPORT') || activityType.includes('REPORT')) {
    return { tone: 'export', label: 'Ekspor' };
  }
  return { tone: 'info', label: 'Tercatat' };
};

const formatDateShort = (isoDate: string): string => {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const AuditLogScreen: React.FC<AuditLogScreenProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);
  const [selectedLog, setSelectedLog] = useState<ApiActivityLogDto | null>(null);

  const [logs, setLogs] = useState<ApiActivityLogDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [summary, setSummary] = useState<ApiActivityLogPage['summary']>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = useAuthStore((state) => state.user);
  const isAdministrator = currentUser?.role === 'administrator';
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);

  const categoryValue =
    selectedCategory === 'Login'
      ? 'login'
      : selectedCategory === 'Agenda'
      ? 'agenda'
      : selectedCategory === 'Presensi'
      ? 'presensi'
      : selectedCategory === 'User'
      ? 'user'
      : undefined;

  const loadLogs = useCallback(
    async (nextPage = 1, append = false, query = search) => {
      setIsLoading(true);
      setError(null);
      try {
        const filters = {
          category: categoryValue,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
        const response = isAdministrator
          ? await activityLogApi.system(nextPage, query, 10, filters)
          : await activityLogApi.personal(nextPage, query, 10, filters);
        setLogs((current) =>
          append ? [...current, ...response.data] : response.data
        );
        setTotal(response.meta.total);
        setPage(response.meta.current_page);
        setLastPage(response.meta.last_page);
        setSummary(response.summary);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Gagal memuat log aktivitas.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isAdministrator, search, categoryValue, startDate, endDate]
  );

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > lastPage || nextPage === page || isLoading) return;
    triggerPageTransition(400);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    void loadLogs(nextPage, false, search);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLogs(1, false, search);
    }, 350);
    return () => clearTimeout(timer);
  }, [loadLogs, search]);

  const categories = ['Semua', 'Login', 'Agenda', 'Presensi', 'User'];

  const formattedLogs = useMemo(
    () =>
      logs.map((log) => {
        const badge = getLogTone(log.activity_type);
        const hasProperties =
          log.properties != null && Object.keys(log.properties).length > 0;
        return {
          raw: log,
          id: String(log.id),
          tag: log.activity_type,
          time: log.created_at
            ? new Date(log.created_at).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Asia/Jakarta',
              })
            : '-',
          status: badge.label,
          tone: badge.tone,
          actorName:
            log.user?.name ?? currentUser?.name ?? 'Sistem / Pengguna tidak tersedia',
          actorNip: log.user?.nip ?? currentUser?.nip ?? '-',
          description: log.description,
          ip: log.ip_address ?? '-',
          meta: log.target_model
            ? `${log.target_model}${log.target_id ? ` #${log.target_id}` : ''}`
            : log.user_agent ?? '-',
          hasProperties,
        };
      }),
    [logs, currentUser?.name, currentUser?.nip]
  );

  const handleResetAllFilters = () => {
    setSearch('');
    setSelectedCategory('Semua');
    setStartDate('');
    setEndDate('');
  };

  const selectedLogPayload = useMemo(() => {
    if (!selectedLog?.properties) return null;
    try {
      return JSON.stringify(selectedLog.properties, null, 2);
    } catch {
      return String(selectedLog.properties);
    }
  }, [selectedLog]);

  return (
    <View style={styles.container}>
      <Header
        title={isAdministrator ? 'Log Aktivitas Sistem' : 'Log Aktivitas Saya'}
        subtitle={
          isAdministrator
            ? 'Audit Trail & Rekam Jejak Kedinasan LLDIKTI X'
            : 'Riwayat aktivitas akun Anda'
        }
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => loadLogs(1)} />
        }
      >
        {/* RINGKASAN AKTIVITAS */}
        <View style={styles.integrityCard}>
          <View style={styles.integrityHeader}>
            <View style={styles.integrityTitleRow}>
              <ShieldCheck size={18} strokeWidth={2} color={colors.primary} />
              <Text style={styles.integrityTitle}>Ringkasan Aktivitas</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCol}>
              <Text style={styles.metricNumber}>
                {total.toLocaleString('id-ID')}
              </Text>
              <Text style={styles.metricLabel}>Total Log</Text>
            </View>
            <View style={styles.metricCol}>
              <Text style={styles.metricNumber}>
                {summary?.auth_success?.toLocaleString('id-ID') ?? '-'}
              </Text>
              <Text style={styles.metricLabel}>Otentikasi Sah</Text>
            </View>
            <View style={styles.metricCol}>
              <Text style={styles.metricNumber}>
                {summary?.incident_count?.toLocaleString('id-ID') ?? '-'}
              </Text>
              <Text style={styles.metricLabel}>Insiden</Text>
            </View>
          </View>
        </View>

        {/* SEARCH INPUT */}
        <View style={styles.searchBox}>
          <Search size={18} strokeWidth={2} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari deskripsi aktivitas atau alamat IP..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              style={styles.searchClearBtn}
              accessibilityRole="button"
              accessibilityLabel="Hapus pencarian"
            >
              <X size={17} strokeWidth={2} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* DATE RANGE FILTER */}
        <View style={styles.dateFilterRow}>
          <Pressable
            onPress={() => setDatePickerTarget('start')}
            style={({ pressed }) => [
              styles.dateChipBtn,
              startDate ? styles.dateChipBtnActive : null,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Pilih tanggal mulai filter log"
          >
            <Calendar
              size={15}
              strokeWidth={2}
              color={startDate ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.dateChipText,
                startDate ? styles.dateChipTextActive : null,
              ]}
              numberOfLines={1}
            >
              {startDate ? `Dari: ${formatDateShort(startDate)}` : 'Dari Tanggal'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setDatePickerTarget('end')}
            style={({ pressed }) => [
              styles.dateChipBtn,
              endDate ? styles.dateChipBtnActive : null,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Pilih tanggal akhir filter log"
          >
            <Calendar
              size={15}
              strokeWidth={2}
              color={endDate ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.dateChipText,
                endDate ? styles.dateChipTextActive : null,
              ]}
              numberOfLines={1}
            >
              {endDate ? `Sampai: ${formatDateShort(endDate)}` : 'Sampai Tanggal'}
            </Text>
          </Pressable>

          {startDate || endDate ? (
            <Pressable
              onPress={() => {
                setStartDate('');
                setEndDate('');
              }}
              style={({ pressed }) => [
                styles.dateClearBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Reset filter tanggal"
            >
              <X size={16} strokeWidth={2} color={colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>

        {/* CATEGORY FILTER PILLS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.filterPill,
                  active && styles.filterPillActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filter kategori ${cat}`}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* LIST SECTION HEADER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daftar Aktivitas</Text>
          <Text style={styles.sectionCountText}>
            {formattedLogs.length} Catatan
          </Text>
        </View>

        {/* LOG ITEMS */}
        {error ? (
          <ErrorState message={error} onRetry={() => loadLogs(1)} />
        ) : null}
        {!error && isLoading && logs.length === 0 ? (
          <ActivityIndicator color={colors.primary} />
        ) : null}
        {formattedLogs.length > 0 ? (
          <View style={styles.logsList}>
            {formattedLogs.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setSelectedLog(item.raw)}
                style={({ pressed }) => [
                  styles.logCard,
                  pressed && styles.logCardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Lihat detail aktivitas ${item.tag}`}
              >
                <View style={styles.logCardHeader}>
                  <View style={styles.logTagRow}>
                    <Text style={styles.logTag}>{item.tag}</Text>
                    <View style={styles.dotSeparator} />
                    <Text style={styles.logTime}>{item.time}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      item.tone === 'success' && styles.statusPillSuccess,
                      item.tone === 'warning' && styles.statusPillWarn,
                      item.tone === 'danger' && styles.statusPillDanger,
                      item.tone === 'export' && styles.statusPillExport,
                      item.tone === 'info' && styles.statusPillInfo,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.tone === 'success' && styles.statusPillTextSuccess,
                        item.tone === 'warning' && styles.statusPillTextWarn,
                        item.tone === 'danger' && styles.statusPillTextDanger,
                        item.tone === 'export' && styles.statusPillTextExport,
                        item.tone === 'info' && styles.statusPillTextInfo,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.actorRow}>
                  <Text style={styles.actorName}>{item.actorName}</Text>
                  <Text style={styles.actorNip}>{item.actorNip}</Text>
                </View>

                <Text style={styles.logDesc}>{item.description}</Text>

                <View style={styles.logFooter}>
                  <Text style={styles.ipText}>IP {item.ip}</Text>
                  <View style={styles.metaActionRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.hasProperties ? 'Lihat Payload' : item.meta}
                    </Text>
                    <ChevronRight
                      size={14}
                      strokeWidth={2}
                      color={item.hasProperties ? colors.primary : colors.textMuted}
                    />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="manage-search"
            title="Tidak Ada Log Ditemukan"
            description={
              page < lastPage
                ? 'Tidak ada catatan yang cocok pada halaman ini. Muat halaman berikutnya untuk melanjutkan pencarian.'
                : 'Tidak ada catatan aktivitas yang cocok dengan kata kunci atau filter yang dipilih.'
            }
            actionLabel="Atur Ulang Filter"
            onAction={handleResetAllFilters}
          />
        )}

        {total > 0 ? (
          <PaginationBar
            currentPage={page}
            lastPage={lastPage}
            total={total}
            label="Log Aktivitas"
            isLoading={isLoading}
            onPageChange={handlePageChange}
          />
        ) : null}
      </ScrollView>

      {/* DATE PICKER MODAL (Reusing existing CalendarDatePickerModal) */}
      <CalendarDatePickerModal
        visible={datePickerTarget !== null}
        onClose={() => setDatePickerTarget(null)}
        selectedDate={
          datePickerTarget === 'start' ? startDate : endDate
        }
        minDate={
          datePickerTarget === 'end' && startDate ? startDate : undefined
        }
        title={
          datePickerTarget === 'start'
            ? 'Pilih Tanggal Mulai'
            : 'Pilih Tanggal Akhir'
        }
        subtitle="Filter rentang waktu rekaman aktivitas"
        onSelectDate={(iso) => {
          if (datePickerTarget === 'start') {
            setStartDate(iso);
            if (endDate && endDate < iso) setEndDate(iso);
          } else if (datePickerTarget === 'end') {
            setEndDate(iso);
          }
          setDatePickerTarget(null);
        }}
      />

      {/* DETAIL PAYLOAD MODAL */}
      <Modal
        visible={selectedLog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Info size={18} strokeWidth={2} color={colors.primary} />
                <Text style={styles.modalTitle}>Detail Jejak Audit</Text>
              </View>
              <Pressable
                onPress={() => setSelectedLog(null)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Tutup detail log"
              >
                <X size={18} strokeWidth={2} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {selectedLog ? (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailMetaBox}>
                  <Text style={styles.detailTag}>{selectedLog.activity_type}</Text>
                  <Text style={styles.detailDesc}>{selectedLog.description}</Text>
                  <Text style={styles.detailSubMeta}>
                    Aktor: {selectedLog.user?.name ?? currentUser?.name ?? 'Sistem'} (
                    {selectedLog.user?.nip ?? currentUser?.nip ?? '-'})
                  </Text>
                  <Text style={styles.detailSubMeta}>
                    IP: {selectedLog.ip_address ?? '-'} •{' '}
                    {selectedLog.created_at
                      ? new Date(selectedLog.created_at).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'medium',
                          timeZone: 'Asia/Jakarta',
                        })
                      : '-'}
                  </Text>
                </View>

                {selectedLogPayload ? (
                  <View style={styles.payloadWrap}>
                    <Text style={styles.payloadHeading}>
                      Payload Perubahan (JSON)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <Text style={styles.payloadCode}>{selectedLogPayload}</Text>
                    </ScrollView>
                  </View>
                ) : (
                  <View style={styles.emptyPayloadBox}>
                    <Text style={styles.emptyPayloadText}>
                      Tidak ada payload perubahan tambahan yang tercatat pada log ini.
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : null}

            <Button
              title="Tutup"
              variant="primary"
              onPress={() => setSelectedLog(null)}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.sm + 2,
  },
  integrityCard: {
    ...cardSurface,
    borderRadius: rounded.card,
    padding: spacing.md,
    overflow: 'hidden',
  },
  integrityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.sm,
  },
  integrityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  integrityTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13.5,
    color: colors.onSurface,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    gap: 8,
  },
  metricCol: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.sm,
    borderRadius: rounded.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  metricNumber: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.monoBold,
    fontSize: 16,
    color: colors.primary,
  },
  metricLabel: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  searchBox: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    gap: 8,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    minHeight: MIN_TOUCH_TARGET,
    fontSize: 12.5,
    color: colors.onSurface,
  },
  searchClearBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateChipBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
  },
  dateChipBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  dateChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11.5,
    color: colors.textMuted,
    flex: 1,
  },
  dateChipTextActive: {
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },
  dateClearBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.78,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterPill: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
    overflow: 'hidden',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.sansBold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  sectionCountText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  logsList: {
    gap: 10,
  },
  logCard: {
    ...cardSurface,
    borderRadius: rounded.card,
    padding: spacing.md,
    gap: 6,
    overflow: 'hidden',
  },
  logCardPressed: {
    opacity: 0.85,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  logTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  logTag: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 10.5,
    backgroundColor: colors.surfaceSoft,
    color: colors.onSurface,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: rounded.sm,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.borderStrong,
  },
  logTime: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
  },
  statusPillSuccess: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  statusPillWarn: {
    backgroundColor: colors.warningContainer,
    borderColor: colors.warningBorder,
  },
  statusPillDanger: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.errorBorder,
  },
  statusPillExport: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusPillInfo: {
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder,
  },
  statusPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  statusPillTextSuccess: {
    color: colors.onSuccessContainer,
  },
  statusPillTextWarn: {
    color: colors.onWarningContainer,
  },
  statusPillTextDanger: {
    color: colors.onErrorContainer,
  },
  statusPillTextExport: {
    color: colors.onPrimary,
  },
  statusPillTextInfo: {
    color: colors.infoText,
  },
  actorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  actorName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12.5,
    color: colors.onSurface,
    flex: 1,
  },
  actorNip: {
    ...typography.labelMono,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  logDesc: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 17,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 8,
    marginTop: 2,
    gap: 8,
  },
  ipText: {
    ...typography.labelMono,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  metaActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: '60%',
  },
  metaText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10.5,
    color: colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.scrimNeutralMid,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    ...cardSurface,
    borderRadius: rounded.xl,
    padding: spacing.md,
    maxHeight: '82%',
    gap: spacing.sm + 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.xs + 2,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 15,
    color: colors.onSurface,
  },
  modalCloseBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  modalScroll: {
    maxHeight: 360,
  },
  modalScrollContent: {
    gap: spacing.sm + 2,
  },
  detailMetaBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.sm + 2,
    gap: 4,
  },
  detailTag: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    color: colors.primary,
  },
  detailDesc: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12.5,
    color: colors.onSurface,
  },
  detailSubMeta: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textMuted,
  },
  payloadWrap: {
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.md,
    padding: spacing.sm + 4,
    gap: 6,
  },
  payloadHeading: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.onPrimaryContainer,
  },
  payloadCode: {
    ...typography.labelMono,
    fontSize: 11,
    lineHeight: 16,
    color: colors.onPrimaryContainer,
  },
  emptyPayloadBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  emptyPayloadText: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
