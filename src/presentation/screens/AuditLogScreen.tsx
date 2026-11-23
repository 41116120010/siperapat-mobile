import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import {
  Search,
  Calendar,
  ChevronDown,
  RotateCcw,
  Activity,
  X,
  Eye,
  SlidersHorizontal,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { typography, fontFamilies } from '../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, cardSurface } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { AutoScrollText } from '../components/common/AutoScrollText';
import { Input } from '../components/common/Input';
import { EmptyState } from '../components/common/EmptyState';
import { PaginationBar } from '../components/common/PaginationBar';
import { TutWuriLoader } from '../components/common/TutWuriLoader';
import {
  TutWuriRefreshBanner,
  useTutWuriRefreshControl,
} from '../components/common/TutWuriRefresh';
import {
  AgendaOptionModal,
  AgendaOption,
} from '../components/modals/AgendaOptionModal';
import { CalendarDatePickerModal } from '../components/modals/CalendarDatePickerModal';
import { activityLogApi, userApi } from '../../data/datasources/userApi';
import { ApiActivityLogDto, ApiUserDto } from '../../data/datasources/apiTypes';
import { useFeedbackStore } from '../store/useFeedbackStore';
import {
  formatTanggalSingkat,
  formatWaktuWIB,
  parseJakartaDate,
} from '../../core/utils/dateFormatter';

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Gagal memuat log aktivitas.';
}

export interface AuditLogScreenProps {
  onBack?: () => void;
}

const KNOWN_ACTIVITY_TYPES: string[] = [
  'ATTENDANCE_CHECKIN',
  'ATTENDANCE_DELETE',
  'CREATE_AGENDA',
  'UPDATE_AGENDA',
  'DELETE_AGENDA',
  'EXPORT_PDF',
  'EXPORT_WORD',
  'LOGIN',
  'LOGOUT',
  'PASSWORD_RESET',
  'PASSWORD_CHANGE',
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'TOGGLE_USER_STATUS',
  'CREATE_UNIT',
  'UPDATE_UNIT',
  'DELETE_UNIT',
];

function getInitials(name?: string | null): string {
  if (!name) return 'SI';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SI';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDateYmdToId(ymd: string): string {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateTimeId(isoString?: string | null): {
  dateText: string;
  timeText: string;
  relativeText: string;
} {
  if (!isoString) {
    return { dateText: '-', timeText: '-', relativeText: '' };
  }
  const parsed = parseJakartaDate(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return { dateText: isoString, timeText: '', relativeText: '' };
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
  let relativeText = 'Baru saja';
  if (diffSeconds >= 86400) {
    const days = Math.floor(diffSeconds / 86400);
    relativeText = `${days} hari yang lalu`;
  } else if (diffSeconds >= 3600) {
    const hrs = Math.floor(diffSeconds / 3600);
    relativeText = `${hrs} jam yang lalu`;
  } else if (diffSeconds >= 60) {
    const mins = Math.floor(diffSeconds / 60);
    relativeText = `${mins} menit yang lalu`;
  }

  return {
    dateText: formatTanggalSingkat(parsed),
    timeText: formatWaktuWIB(parsed),
    relativeText,
  };
}

function getBadgeStyleForType(type: string): {
  bg: string;
  border: string;
  text: string;
} {
  const upper = (type || '').toUpperCase();
  if (upper.includes('DELETE')) {
    return {
      bg: colors.errorContainer,
      border: colors.errorBorder,
      text: colors.onErrorContainer,
    };
  }
  if (upper.includes('UPDATE') || upper.includes('TOGGLE')) {
    return {
      bg: colors.warningContainer,
      border: colors.warningBorder,
      text: colors.onWarningContainer,
    };
  }
  if (upper.includes('LOGIN') || upper.includes('ATTENDANCE')) {
    return {
      bg: colors.successContainer,
      border: colors.successBorder,
      text: colors.onSuccessContainer,
    };
  }
  if (upper.includes('EXPORT')) {
    return {
      bg: colors.primaryDarkest,
      border: colors.primaryDarkest,
      text: colors.onPrimary,
    };
  }
  return {
    bg: colors.surfaceSoft,
    border: colors.borderStrong,
    text: colors.onSurface,
  };
}

export const AuditLogScreen: React.FC<AuditLogScreenProps> = ({ onBack }) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    type: '',
    userId: '',
    startDate: '',
    endDate: '',
  });

  const [logs, setLogs] = useState<ApiActivityLogDto[]>([]);
  const [actorUsers, setActorUsers] = useState<ApiUserDto[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);
  const [payloadModalLog, setPayloadModalLog] = useState<ApiActivityLogDto | null>(null);

  useEffect(() => {
    let mounted = true;
    userApi
      .candidates({ includeInactive: true })
      .then((res) => {
        if (mounted && Array.isArray(res.data)) {
          setActorUsers(res.data);
        }
      })
      .catch(() => {
        // Ignore user dropdown preload error if non-fatal
      });
    return () => {
      mounted = false;
    };
  }, []);

  const fetchLogs = useCallback(
    async (targetPage: number, isRefreshAction = false) => {
      try {
        if (isRefreshAction) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setErrorMessage(null);

        const res = await activityLogApi.system(
          targetPage,
          appliedFilters.search.trim() || undefined,
          10,
          {
            type: appliedFilters.type || undefined,
            userId: appliedFilters.userId || undefined,
            startDate: appliedFilters.startDate || undefined,
            endDate: appliedFilters.endDate || undefined,
          },
        );

        const rows = Array.isArray(res.data) ? res.data : [];
        setLogs(rows);
        setPage(res.meta?.current_page || targetPage);
        setLastPage(res.meta?.last_page || 1);
        setTotal(res.meta?.total ?? rows.length);
      } catch (err) {
        setErrorMessage(extractErrorMessage(err));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [appliedFilters],
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleApplyFilter = () => {
    if (startDate && endDate && startDate > endDate) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Tanggal mulai tidak boleh lebih besar dari tanggal selesai.',
      });
      return;
    }

    setAppliedFilters({
      search: searchInput.trim(),
      type: selectedType,
      userId: selectedUserId,
      startDate,
      endDate,
    });
  };

  const handleResetFilter = () => {
    setSearchInput('');
    setSelectedType('');
    setSelectedUserId('');
    setStartDate('');
    setEndDate('');
    setAppliedFilters({
      search: '',
      type: '',
      userId: '',
      startDate: '',
      endDate: '',
    });
  };

  const hasActiveFilters = Boolean(
    appliedFilters.search ||
      appliedFilters.type ||
      appliedFilters.userId ||
      appliedFilters.startDate ||
      appliedFilters.endDate ||
      searchInput.trim() ||
      selectedType ||
      selectedUserId ||
      startDate ||
      endDate,
  );

  const typeOptions = useMemo<AgendaOption[]>(() => {
    const dynamicTypes = logs
      .map((item) => item.activity_type)
      .filter((val): val is string => Boolean(val));
    const merged = Array.from(new Set([...KNOWN_ACTIVITY_TYPES, ...dynamicTypes])).sort();
    return [
      { id: '', title: 'Semua Aktivitas' },
      ...merged.map((t) => ({ id: t, title: t })),
    ];
  }, [logs]);

  const userOptions = useMemo<AgendaOption[]>(() => {
    return [
      { id: '', title: 'Semua Pengguna' },
      ...actorUsers.map((u) => ({
        id: String(u.id),
        title: u.name,
        subtitle: u.unit?.kode_unit ? `${u.unit.kode_unit} • NIP: ${u.nip || '-'}` : `NIP: ${u.nip || '-'}`,
      })),
    ];
  }, [actorUsers]);

  const selectedUserLabel = useMemo(() => {
    if (!selectedUserId) return 'Semua Pengguna';
    const found = actorUsers.find((u) => String(u.id) === String(selectedUserId));
    if (!found) return `Pegawai #${selectedUserId}`;
    return found.unit?.kode_unit ? `${found.name} (${found.unit.kode_unit})` : found.name;
  }, [selectedUserId, actorUsers]);

  return (
    <View style={styles.screen}>
      <Header
        title="Audit Trail & Log Aktivitas"
        subtitle="Rekaman seluruh tindakan, mutasi data, dan autentikasi pengguna pada sistem"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <TutWuriRefreshBanner refreshing={isRefreshing} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={useTutWuriRefreshControl(isRefreshing, () => fetchLogs(page, true))}
      >
        {/* Filter & Search Toolbar (1:1 logs/index.blade.php:10-74) */}
        <View style={styles.filterCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Pencarian Kata Kunci</Text>
            <Input
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Cari deskripsi tindakan, IP, atau browser..."
              leftIcon={<Search size={18} color={colors.textMuted} strokeWidth={2} />}
              returnKeyType="search"
              onSubmitEditing={handleApplyFilter}
              containerStyle={styles.inputZeroMargin}
            />
          </View>

          <View style={styles.filterGridRow}>
            {/* Tipe Aktivitas */}
            <View style={styles.filterCol}>
              <Text style={styles.fieldLabel}>Tipe Aktivitas</Text>
              <Pressable
                style={styles.selectButton}
                onPress={() => setIsTypeModalOpen(true)}
                accessibilityRole="button"
              >
                <AutoScrollText
                  style={[
                    styles.selectButtonText,
                    !selectedType && styles.selectButtonPlaceholder,
                  ]}
                >
                  {selectedType || 'Semua Aktivitas'}
                </AutoScrollText>
                <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Aktor Pegawai */}
            <View style={styles.filterCol}>
              <Text style={styles.fieldLabel}>Aktor Pegawai</Text>
              <Pressable
                style={styles.selectButton}
                onPress={() => setIsUserModalOpen(true)}
                accessibilityRole="button"
              >
                <AutoScrollText
                  style={[
                    styles.selectButtonText,
                    !selectedUserId && styles.selectButtonPlaceholder,
                  ]}
                >
                  {selectedUserLabel}
                </AutoScrollText>
                <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          <View style={styles.filterGridRow}>
            {/* Dari Tanggal */}
            <View style={styles.filterCol}>
              <Text style={styles.fieldLabel}>Dari Tanggal</Text>
              <Pressable
                style={styles.selectButton}
                onPress={() => setActiveDatePicker('start')}
                accessibilityRole="button"
              >
                <AutoScrollText
                  style={[
                    styles.selectButtonText,
                    !startDate && styles.selectButtonPlaceholder,
                  ]}
                >
                  {startDate ? formatDateYmdToId(startDate) : 'Pilih Tanggal'}
                </AutoScrollText>
                <Calendar size={16} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Sampai Tanggal */}
            <View style={styles.filterCol}>
              <Text style={styles.fieldLabel}>Sampai Tanggal</Text>
              <Pressable
                style={styles.selectButton}
                onPress={() => setActiveDatePicker('end')}
                accessibilityRole="button"
              >
                <AutoScrollText
                  style={[
                    styles.selectButtonText,
                    !endDate && styles.selectButtonPlaceholder,
                  ]}
                >
                  {endDate ? formatDateYmdToId(endDate) : 'Pilih Tanggal'}
                </AutoScrollText>
                <Calendar size={16} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          <View style={styles.filterActionsRow}>
            {hasActiveFilters && (
              <Pressable
                style={styles.resetButton}
                onPress={handleResetFilter}
                accessibilityRole="button"
              >
                <RotateCcw size={15} color={colors.textSecondary} strokeWidth={2} />
                <Text style={styles.resetButtonText}>Reset Filter</Text>
              </Pressable>
            )}
            <Pressable
              style={styles.applyButton}
              onPress={handleApplyFilter}
              accessibilityRole="button"
            >
              <SlidersHorizontal size={15} color={colors.onPrimary} strokeWidth={2} />
              <Text style={styles.applyButtonText}>Terapkan Filter</Text>
            </Pressable>
          </View>
        </View>

        {/* Tabel Log Aktivitas (1:1 logs/index.blade.php:77-184) */}
        <View style={styles.tablePanel}>
          <View style={styles.tablePanelHeader}>
            <View style={styles.tablePanelTitleRow}>
              <Activity size={16} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.tablePanelTitle}>Riwayat Aktivitas & Jejak Audit</Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>Total: {total} Log</Text>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => fetchLogs(page)}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Coba Lagi</Text>
              </Pressable>
            </View>
          ) : isLoading ? (
            <View style={styles.skeletonContainer}>
              <TutWuriLoader size="lg" />
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon={Activity}
                title="Tidak ada rekaman log aktivitas yang sesuai dengan kriteria filter."
                description="Silakan sesuaikan kata kunci pencarian atau rentang filter tanggal di atas."
                actionLabel={hasActiveFilters ? 'Reset Pencarian & Filter' : undefined}
                onAction={hasActiveFilters ? handleResetFilter : undefined}
              />
            </View>
          ) : (
            <ScrollView
              horizontal
              bounces={false}
              overScrollMode="never"
              nestedScrollEnabled
              showsHorizontalScrollIndicator
              style={styles.tableScrollView}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View style={styles.tableInner} collapsable={false}>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, styles.colNo]}>No</Text>
                  <Text style={[styles.thCell, styles.colTime]}>Waktu & Tanggal</Text>
                  <Text style={[styles.thCell, styles.colActor]}>Pegawai</Text>
                  <Text style={[styles.thCell, styles.colType]}>Tipe Aktivitas</Text>
                  <Text style={[styles.thCell, styles.colDesc]}>Deskripsi Tindakan</Text>
                  <Text style={[styles.thCell, styles.colIp]}>IP & Perangkat</Text>
                </View>

                {/* Table Rows */}
                {logs.map((log, index) => {
                  const rowNo = (Math.max(page, 1) - 1) * 10 + index + 1;
                  const formattedTime = formatDateTimeId(log.created_at);
                  const badgeTone = getBadgeStyleForType(log.activity_type);
                  const hasPayload = Boolean(
                    log.properties && Object.keys(log.properties).length > 0,
                  );

                  return (
                    <View
                      key={String(log.id)}
                      style={[
                        styles.tableDataRow,
                        index === logs.length - 1 && styles.tableDataRowLast,
                      ]}
                    >
                      {/* 1. No */}
                      <View style={[styles.tdCell, styles.colNo]}>
                        <Text style={styles.rowNoText}>{rowNo}</Text>
                      </View>

                      {/* 2. Waktu & Tanggal */}
                      <View style={[styles.tdCell, styles.colTime]}>
                        <Text style={styles.timeDateText}>{formattedTime.dateText}</Text>
                        <Text style={styles.timeClockText}>{formattedTime.timeText}</Text>
                        {formattedTime.relativeText ? (
                          <Text style={styles.timeRelativeText}>
                            {formattedTime.relativeText}
                          </Text>
                        ) : null}
                      </View>

                      {/* 3. Pegawai */}
                      <View style={[styles.tdCell, styles.colActor]}>
                        {log.user ? (
                          <View style={styles.actorRow}>
                            <View style={styles.actorAvatar}>
                              <Text style={styles.actorAvatarText}>
                                {getInitials(log.user.name)}
                              </Text>
                            </View>
                            <View style={styles.actorInfo}>
                              <AutoScrollText style={styles.actorName}>
                                {log.user.name}
                              </AutoScrollText>
                              <AutoScrollText style={styles.actorMeta}>
                                NIP: {log.user.nip || '-'}
                                {log.user.unit?.kode_unit
                                  ? ` • ${log.user.unit.kode_unit}`
                                  : ''}
                              </AutoScrollText>
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.actorGuestText}>Sistem / Tamu</Text>
                        )}
                      </View>

                      {/* 4. Tipe Aktivitas */}
                      <View style={[styles.tdCell, styles.colType]}>
                        <View
                          style={[
                            styles.activityTypeBadge,
                            {
                              backgroundColor: badgeTone.bg,
                              borderColor: badgeTone.border,
                            },
                          ]}
                        >
                          <AutoScrollText
                            style={[styles.activityTypeBadgeText, { color: badgeTone.text }]}
                          >
                            {log.activity_type}
                          </AutoScrollText>
                        </View>
                      </View>

                      {/* 5. Deskripsi Tindakan */}
                      <View style={[styles.tdCell, styles.colDesc]}>
                        <Text style={styles.descText}>{log.description}</Text>
                        {hasPayload && (
                          <Pressable
                            style={styles.payloadTrigger}
                            onPress={() => setPayloadModalLog(log)}
                            accessibilityRole="button"
                          >
                            <Eye size={13} color={colors.textSecondary} strokeWidth={2} />
                            <Text style={styles.payloadTriggerText}>
                              Lihat Payload Perubahan
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      {/* 6. IP & Perangkat */}
                      <View style={[styles.tdCell, styles.colIp]}>
                        <View style={styles.ipPill}>
                          <Text style={styles.ipText}>{log.ip_address || '-'}</Text>
                        </View>
                        <Text style={styles.uaText} numberOfLines={2}>
                          {log.user_agent || '-'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {total > 0 && (
            <View style={styles.paginationFooter}>
              <PaginationBar
                currentPage={page}
                lastPage={lastPage}
                total={total}
                label="log"
                onPageChange={(nextPage) => fetchLogs(nextPage)}
                isLoading={isLoading}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal: Tipe Aktivitas */}
      <AgendaOptionModal
        visible={isTypeModalOpen}
        title="Pilih Tipe Aktivitas"
        subtitle="Filter riwayat berdasarkan kode tindakan sistem"
        options={typeOptions}
        selectedId={selectedType}
        onSelect={(opt) => {
          setSelectedType(opt.id);
          setIsTypeModalOpen(false);
        }}
        onClose={() => setIsTypeModalOpen(false)}
        searchable
        searchPlaceholder="Cari kode tipe aktivitas..."
      />

      {/* Modal: Aktor Pegawai */}
      <AgendaOptionModal
        visible={isUserModalOpen}
        title="Pilih Aktor Pegawai"
        subtitle="Filter log berdasarkan pegawai pelaksana tindakan"
        options={userOptions}
        selectedId={selectedUserId}
        onSelect={(opt) => {
          setSelectedUserId(opt.id);
          setIsUserModalOpen(false);
        }}
        onClose={() => setIsUserModalOpen(false)}
        searchable
        searchPlaceholder="Cari nama atau NIP pegawai..."
      />

      {/* Modal: Date Picker */}
      <CalendarDatePickerModal
        visible={activeDatePicker !== null}
        title={activeDatePicker === 'start' ? 'Pilih Dari Tanggal' : 'Pilih Sampai Tanggal'}
        selectedDate={activeDatePicker === 'start' ? startDate : endDate}
        onSelectDate={(selectedYmd) => {
          if (activeDatePicker === 'start') {
            setStartDate(selectedYmd);
          } else if (activeDatePicker === 'end') {
            setEndDate(selectedYmd);
          }
          setActiveDatePicker(null);
        }}
        onClose={() => setActiveDatePicker(null)}
      />

      {/* Modal: Detail Payload Perubahan */}
      <Modal
        visible={payloadModalLog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPayloadModalLog(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleWrap}>
                <Text style={styles.modalTitle}>Detail Payload Log Aktivitas</Text>
                <Text style={styles.modalSubtitle}>
                  Tipe: {payloadModalLog?.activity_type || '-'}
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setPayloadModalLog(null)}
                accessibilityRole="button"
              >
                <X size={18} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalDescText}>{payloadModalLog?.description}</Text>
              <View style={styles.jsonCodeBox}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <Text style={styles.jsonCodeText}>
                    {JSON.stringify(payloadModalLog?.properties ?? {}, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.modalDoneBtn}
                onPress={() => setPayloadModalLog(null)}
                accessibilityRole="button"
              >
                <Text style={styles.modalDoneBtnText}>Tutup</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  filterCard: {
    ...cardSurface,
    padding: 16,
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  inputZeroMargin: {
    marginBottom: 0,
  },
  filterGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  selectButton: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.lg,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectButtonText: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  selectButtonPlaceholder: {
    color: colors.textSecondary,
  },
  filterActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  resetButton: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resetButtonText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  applyButton: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 16,
    borderRadius: rounded.lg,
    backgroundColor: colors.primaryDarkest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applyButtonText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  tablePanel: {
    ...cardSurface,
    overflow: 'hidden',
  },
  tablePanelHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  tablePanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tablePanelTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainer,
  },
  totalBadgeText: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  skeletonContainer: {
    padding: 16,
    gap: 10,
  },
  skeletonRow: {
    width: '100%',
  },
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  errorBox: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 16,
    borderRadius: rounded.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  tableScrollView: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  tableInner: {
    minWidth: 997,
    flexGrow: 1,
    backgroundColor: colors.surfaceCard,
  },
  tableHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  thCell: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    paddingHorizontal: 8,
    includeFontPadding: false,
  },
  tableDataRow: {
    width: '100%',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceCard,
  },
  tableDataRowLast: {
    borderBottomWidth: 0,
  },
  tdCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  colNo: {
    width: 48,
  },
  colTime: {
    width: 145,
  },
  colActor: {
    width: 200,
  },
  colType: {
    width: 165,
  },
  colDesc: {
    width: 265,
  },
  colIp: {
    width: 150,
  },
  rowNoText: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  timeDateText: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  timeClockText: {
    fontFamily: fontFamilies.monoRegular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  timeRelativeText: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    marginTop: 2,
    includeFontPadding: false,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actorAvatar: {
    width: 32,
    height: 32,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actorAvatarText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  actorInfo: {
    flex: 1,
    minWidth: 0,
  },
  actorName: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurface,
    includeFontPadding: false,
    minWidth: 0,
  },
  actorMeta: {
    fontFamily: fontFamilies.monoRegular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
    includeFontPadding: false,
    minWidth: 0,
  },
  actorGuestText: {
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  activityTypeBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.md,
    borderWidth: 1,
  },
  activityTypeBadgeText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 10,
    lineHeight: 14,
    includeFontPadding: false,
    flexShrink: 1,
    minWidth: 0,
  },
  descText: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  payloadTrigger: {
    marginTop: 6,
    minHeight: MIN_TOUCH_TARGET,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  payloadTriggerText: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  ipPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceSoft,
  },
  ipText: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  uaText: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    marginTop: 4,
    includeFontPadding: false,
  },
  paginationFooter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSoft,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.scrimNeutralTop,
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    ...cardSurface,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalHeaderTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    ...typography.headlineSm,
    fontSize: 15,
    color: colors.onSurface,
  },
  modalSubtitle: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    includeFontPadding: false,
  },
  modalCloseBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded.md,
  },
  modalBody: {
    padding: 16,
  },
  modalDescText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    marginBottom: 12,
  },
  jsonCodeBox: {
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.lg,
    padding: 12,
  },
  jsonCodeText: {
    fontFamily: fontFamilies.monoRegular,
    fontSize: 11,
    lineHeight: 17,
    color: colors.onPrimaryContainer,
    includeFontPadding: false,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalDoneBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 18,
    borderRadius: rounded.lg,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
});
