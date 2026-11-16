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
  FileText,
  User,
  X,
  Eye,
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
import { activityLogApi } from '../../data/datasources/userApi';
import { ApiActivityLogDto } from '../../data/datasources/apiTypes';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import {
  formatTanggalSingkat,
  formatWaktuWIB,
  parseJakartaDate,
} from '../../core/utils/dateFormatter';

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Gagal memuat riwayat aktivitas pribadi.';
}

export interface PersonalActivityLogScreenProps {
  onBack?: () => void;
  onNavigateSystemLogs?: () => void;
  onNavigateProfile?: () => void;
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
  if (!name) return 'AS';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AS';
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
    timeText: `Pukul ${formatWaktuWIB(parsed)}`,
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

export const PersonalActivityLogScreen: React.FC<PersonalActivityLogScreenProps> = ({
  onBack,
  onNavigateSystemLogs,
  onNavigateProfile,
}) => {
  const user = useAuthStore((s) => s.user);

  const [searchInput, setSearchInput] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    type: '',
    startDate: '',
    endDate: '',
  });

  const [logs, setLogs] = useState<ApiActivityLogDto[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);
  const [payloadModalLog, setPayloadModalLog] = useState<ApiActivityLogDto | null>(null);

  const fetchPersonalLogs = useCallback(
    async (targetPage: number, isRefreshAction = false) => {
      try {
        if (isRefreshAction) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setErrorMessage(null);

        const res = await activityLogApi.personal(
          targetPage,
          appliedFilters.search.trim() || undefined,
          10,
          {
            type: appliedFilters.type || undefined,
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
    fetchPersonalLogs(1);
  }, [fetchPersonalLogs]);

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
      startDate,
      endDate,
    });
  };

  const handleResetFilter = () => {
    setSearchInput('');
    setSelectedType('');
    setStartDate('');
    setEndDate('');
    setAppliedFilters({
      search: '',
      type: '',
      startDate: '',
      endDate: '',
    });
  };

  const hasActiveFilters = Boolean(
    appliedFilters.search ||
      appliedFilters.type ||
      appliedFilters.startDate ||
      appliedFilters.endDate ||
      searchInput.trim() ||
      selectedType ||
      startDate ||
      endDate,
  );

  const typeOptions = useMemo<AgendaOption[]>(() => {
    const dynamicTypes = logs
      .map((item) => item.activity_type)
      .filter((val): val is string => Boolean(val));
    const merged = Array.from(new Set([...KNOWN_ACTIVITY_TYPES, ...dynamicTypes])).sort();
    return [
      { id: '', title: 'Semua Jenis Aktivitas' },
      ...merged.map((t) => ({ id: t, title: t })),
    ];
  }, [logs]);

  const roleBadgeLabel = useMemo(() => {
    if (user?.role === 'administrator') return 'Administrator';
    if (user?.role === 'admin') return 'Admin Unit';
    return 'Staff / Pegawai';
  }, [user?.role]);

  const cleanUsername = useMemo(() => {
    const raw = user?.username || '';
    return raw.startsWith('@') ? raw.slice(1) : raw || 'pegawai';
  }, [user?.username]);

  return (
    <View style={styles.screen}>
      <Header
        title="Log Aktivitas Saya"
        subtitle="Rekaman riwayat tindakan dan jejak audit keamanan akun Anda pada sistem SIPERAPAT"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <TutWuriRefreshBanner refreshing={isRefreshing} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={useTutWuriRefreshControl(isRefreshing, () => fetchPersonalLogs(page, true))}
      >
        {/* User Summary Header Card (1:1 profile/logs.blade.php:10-48) */}
        <View style={styles.userSummaryCard}>
          <View style={styles.userSummaryTop}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={styles.userInfoCol}>
              <View style={styles.userNameRow}>
                <Text style={styles.userNameText}>{user?.name || 'Pegawai ASN'}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleBadgeLabel}</Text>
                </View>
              </View>
              <Text style={styles.userMetaText}>
                NIP: {user?.nip || '-'} • Username: @{cleanUsername}
                {user?.unitKerja ? ` • ${user.unitKerja}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.userActionsRow}>
            {user?.role === 'administrator' && onNavigateSystemLogs && (
              <Pressable
                style={styles.secondaryHeaderButton}
                onPress={onNavigateSystemLogs}
                accessibilityRole="button"
              >
                <FileText size={15} color={colors.onSurface} strokeWidth={2} />
                <Text style={styles.secondaryHeaderButtonText}>
                  Master Log Audit Sistem
                </Text>
              </Pressable>
            )}
            <Pressable
              style={styles.secondaryHeaderButton}
              onPress={onNavigateProfile || onBack}
              accessibilityRole="button"
            >
              <User size={15} color={colors.onSurface} strokeWidth={2} />
              <Text style={styles.secondaryHeaderButtonText}>Pengaturan Profil</Text>
            </Pressable>
          </View>
        </View>

        {/* Filter Toolbar (1:1 profile/logs.blade.php:51-102) */}
        <View style={styles.filterCard}>
          <Input
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Cari deskripsi atau alamat IP..."
            leftIcon={<Search size={18} color={colors.textMuted} strokeWidth={2} />}
            returnKeyType="search"
            onSubmitEditing={handleApplyFilter}
            containerStyle={styles.inputZeroMargin}
          />

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
              {selectedType || 'Semua Jenis Aktivitas'}
            </AutoScrollText>
            <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>

          <View style={styles.dateRow}>
            <Pressable
              style={[styles.selectButton, styles.dateCol]}
              onPress={() => setActiveDatePicker('start')}
              accessibilityRole="button"
            >
              <AutoScrollText
                style={[
                  styles.selectButtonText,
                  !startDate && styles.selectButtonPlaceholder,
                ]}
              >
                {startDate ? formatDateYmdToId(startDate) : 'Dari Tanggal'}
              </AutoScrollText>
              <Calendar size={15} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>

            <Text style={styles.dateSeparator}>–</Text>

            <Pressable
              style={[styles.selectButton, styles.dateCol]}
              onPress={() => setActiveDatePicker('end')}
              accessibilityRole="button"
            >
              <AutoScrollText
                style={[
                  styles.selectButtonText,
                  !endDate && styles.selectButtonPlaceholder,
                ]}
              >
                {endDate ? formatDateYmdToId(endDate) : 'Sampai Tanggal'}
              </AutoScrollText>
              <Calendar size={15} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.filterButtonsRow}>
            <Pressable
              style={styles.filterPrimaryBtn}
              onPress={handleApplyFilter}
              accessibilityRole="button"
            >
              <Text style={styles.filterPrimaryBtnText}>Filter</Text>
            </Pressable>

            {hasActiveFilters && (
              <Pressable
                style={styles.filterResetBtn}
                onPress={handleResetFilter}
                accessibilityRole="button"
              >
                <RotateCcw size={14} color={colors.textSecondary} strokeWidth={2} />
                <Text style={styles.filterResetBtnText}>Reset</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Tabel Riwayat Aktivitas Pribadi (1:1 profile/logs.blade.php:105-192) */}
        <View style={styles.tablePanel}>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => fetchPersonalLogs(page)}
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
                title="Belum Ada Riwayat Aktivitas"
                description="Tidak ditemukan catatan aktivitas yang sesuai dengan filter pencarian Anda."
                actionLabel={hasActiveFilters ? 'Reset Filter Pencarian' : undefined}
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
                {/* 5-Column Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thCell, styles.colNo]}>No</Text>
                  <Text style={[styles.thCell, styles.colTime]}>Waktu Aktivitas</Text>
                  <Text style={[styles.thCell, styles.colType]}>Jenis Tindakan</Text>
                  <Text style={[styles.thCell, styles.colDesc]}>Deskripsi Riwayat</Text>
                  <Text style={[styles.thCell, styles.colIp]}>Alamat IP & Perangkat</Text>
                </View>

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

                      {/* 2. Waktu Aktivitas */}
                      <View style={[styles.tdCell, styles.colTime]}>
                        <Text style={styles.timeDateText}>{formattedTime.dateText}</Text>
                        <Text style={styles.timeClockText}>{formattedTime.timeText}</Text>
                        {formattedTime.relativeText ? (
                          <Text style={styles.timeRelativeText}>
                            {formattedTime.relativeText}
                          </Text>
                        ) : null}
                      </View>

                      {/* 3. Jenis Tindakan */}
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

                      {/* 4. Deskripsi Riwayat */}
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
                              Lihat Rincian Data Perubahan
                            </Text>
                          </Pressable>
                        )}
                      </View>

                      {/* 5. Alamat IP & Perangkat */}
                      <View style={[styles.tdCell, styles.colIp]}>
                        <View style={styles.ipPill}>
                          <Text style={styles.ipText}>
                            IP: {log.ip_address || '127.0.0.1'}
                          </Text>
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
                label="aktivitas"
                onPageChange={(nextPage) => fetchPersonalLogs(nextPage)}
                isLoading={isLoading}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal: Semua Jenis Aktivitas */}
      <AgendaOptionModal
        visible={isTypeModalOpen}
        title="Pilih Jenis Aktivitas"
        subtitle="Filter riwayat aktivitas berdasarkan jenis tindakan"
        options={typeOptions}
        selectedId={selectedType}
        onSelect={(opt) => {
          setSelectedType(opt.id);
          setIsTypeModalOpen(false);
        }}
        onClose={() => setIsTypeModalOpen(false)}
        searchable
        searchPlaceholder="Cari jenis aktivitas..."
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

      {/* Modal: Lihat Rincian Data Perubahan */}
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
                <Text style={styles.modalTitle}>Detail Rincian Aktivitas</Text>
                <Text style={styles.modalSubtitle}>
                  Jenis: {payloadModalLog?.activity_type || '-'}
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
  userSummaryCard: {
    ...cardSurface,
    padding: 16,
    gap: 14,
  },
  userSummaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: rounded.full,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  userInfoCol: {
    flex: 1,
    gap: 3,
  },
  userNameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  userNameText: {
    ...typography.headlineSm,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  roleBadgeText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    lineHeight: 14,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  userMetaText: {
    fontFamily: fontFamilies.monoRegular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  userActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  secondaryHeaderButton: {
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
  secondaryHeaderButtonText: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  filterCard: {
    ...cardSurface,
    padding: 16,
    gap: 10,
  },
  inputZeroMargin: {
    marginBottom: 0,
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateCol: {
    flex: 1,
    minWidth: 0,
  },
  dateSeparator: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  filterPrimaryBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.lg,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  filterPrimaryBtnText: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  filterResetBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  filterResetBtnText: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  tablePanel: {
    ...cardSurface,
    overflow: 'hidden',
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
    minWidth: 809,
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
    width: 150,
  },
  colType: {
    width: 165,
  },
  colDesc: {
    width: 265,
  },
  colIp: {
    width: 157,
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
