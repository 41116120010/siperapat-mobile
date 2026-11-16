import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ScrollViewInstance,
  TextInput,
  Pressable,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Check,
  PenTool,
  Search,
  User,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { resolveAuthenticatedMediaFile } from '../../core/utils/authenticatedMediaCache';
import { resolveAttendanceMediaUrl } from '../../core/utils/mediaUrl';
import { formatTanggalWaktuWIB } from '../../core/utils/dateFormatter';
import { Attendance } from '../../domain/entities/types';
import { Header } from '../components/common/Header';
import { AutoScrollText } from '../components/common/AutoScrollText';
import { EmptyState } from '../components/common/EmptyState';
import { PaginationBar } from '../components/common/PaginationBar';
import {
  TutWuriRefreshBanner,
  useTutWuriRefreshControl,
} from '../components/common/TutWuriRefresh';
import { EvidenceViewerModal } from '../components/modals/EvidenceViewerModal';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { triggerPageTransition } from '../store/useTransitionStore';

interface RiwayatScreenProps {
  onSelectReceipt: (id: string) => void;
}

const ITEMS_PER_PAGE = 10;

interface HistoryMediaThumbProps {
  attendanceId: string;
  kind: 'selfie' | 'signature';
  rawUrl?: string | null;
  verificationToken?: string;
}

const HistoryMediaThumb: React.FC<HistoryMediaThumbProps> = ({
  attendanceId,
  kind,
  rawUrl,
  verificationToken,
}) => {
  const [localUri, setLocalUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolved = resolveAttendanceMediaUrl(rawUrl, attendanceId, kind);
    if (!resolved) {
      setLocalUri(null);
      return;
    }

    const safeId = attendanceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeToken = (verificationToken || 'SIP').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = kind === 'selfie' ? 'jpg' : 'png';

    void resolveAuthenticatedMediaFile(resolved, {
      cachePrefix: `hist_${kind}`,
      cacheKey: `${safeId}_${safeToken}`,
      ext,
    }).then((uri) => {
      if (!cancelled) {
        setLocalUri(uri);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [attendanceId, kind, rawUrl, verificationToken]);

  if (localUri) {
    return (
      <Image
        source={{ uri: localUri }}
        style={kind === 'selfie' ? styles.thumbImageCover : styles.thumbImageContain}
        resizeMode={kind === 'selfie' ? 'cover' : 'contain'}
      />
    );
  }

  return kind === 'selfie' ? (
    <User size={15} color={colors.textMuted} strokeWidth={2} />
  ) : (
    <PenTool size={15} color={colors.textMuted} strokeWidth={2} />
  );
};

interface HistoryRowItem {
  id: string;
  title: string;
  timeWib: string;
  scheduleDate: string;
  scheduleTime: string;
  room: string;
  meetingId: string;
  meetingType?: 'hybrid' | 'offline' | 'online';
  attendance: Attendance;
}

function formatAttendanceTimeWIB(timestamp?: string | null): string {
  if (!timestamp) return '-';
  return formatTanggalWaktuWIB(timestamp);
}

function splitScheduleParts(schedule?: string | null): { date: string; time: string } {
  if (!schedule || !schedule.trim()) {
    return { date: 'Sesuai jadwal agenda', time: 'WIB s.d. Selesai' };
  }
  const clean = schedule.trim();
  const pipeParts = clean.split(/\s*\|\s*|\s*•\s*/);
  if (pipeParts.length >= 2) {
    return {
      date: pipeParts[0].trim(),
      time: pipeParts.slice(1).join(' ').trim(),
    };
  }
  const timeMatch = clean.match(/^(.*?)[,\s]+(\d{1,2}[:.]\d{2}.*)$/);
  if (timeMatch) {
    return {
      date: timeMatch[1].trim(),
      time: timeMatch[2].trim(),
    };
  }
  return { date: clean, time: '' };
}

export const RiwayatScreen: React.FC<RiwayatScreenProps> = ({ onSelectReceipt }) => {
  const navigation = useNavigation<any>();
  const authUser = useAuthStore((state) => state.user);
  const detailRoute = authUser?.role === 'staff' ? 'AgendaDetail' : 'Monitoring';
  const {
    attendances,
    fetchHistory,
    historyPage,
    isLoading,
    error,
  } = useAttendanceStore();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [evidenceModalState, setEvidenceModalState] = useState<{
    attendance: Attendance;
    tab: 'selfie' | 'signature';
  } | null>(null);
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchHistory(1, false, {
        search: appliedSearch,
        period: 'all',
        tipeRapat: 'all',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchHistory, appliedSearch]);

  const refreshControl = useTutWuriRefreshControl(isRefreshing, () => {
    void handleRefresh();
  });

  useFocusEffect(
    useCallback(() => {
      void fetchHistory(1, false, {
        search: appliedSearch,
        period: 'all',
        tipeRapat: 'all',
      });
    }, [fetchHistory, appliedSearch])
  );

  const handleSubmitSearch = () => {
    const trimmed = searchInput.trim();
    if (trimmed === appliedSearch) {
      void fetchHistory(1, false, {
        search: trimmed,
        period: 'all',
        tipeRapat: 'all',
      });
      return;
    }
    setAppliedSearch(trimmed);
  };

  const handleResetSearch = () => {
    setSearchInput('');
    if (appliedSearch !== '') {
      setAppliedSearch('');
    } else {
      void fetchHistory(1, false, { search: '', period: 'all', tipeRapat: 'all' });
    }
  };

  const handlePageChange = (page: number) => {
    if (
      !historyPage ||
      page < 1 ||
      page > historyPage.lastPage ||
      page === historyPage.currentPage ||
      isLoading
    ) {
      return;
    }
    triggerPageTransition(400);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    void fetchHistory(page, false, {
      search: appliedSearch,
      period: 'all',
      tipeRapat: 'all',
    });
  };

  const rows: HistoryRowItem[] = attendances.map((item) => {
    const scheduleParts = splitScheduleParts(item.meetingSchedule);
    return {
      id: item.id,
      title: item.meetingTitle,
      timeWib: formatAttendanceTimeWIB(item.timestamp),
      scheduleDate: scheduleParts.date,
      scheduleTime: scheduleParts.time,
      room: item.meetingLocation || 'Daring',
      meetingType: item.meetingType,
      meetingId: item.meetingId,
      attendance: item,
    };
  });

  const currentPage = historyPage?.currentPage ?? 1;
  const hasSearchFilter = searchInput.trim().length > 0 || appliedSearch.length > 0;

  return (
    <View style={styles.container}>
      <Header />

      <View style={styles.scrollWrapper}>
        <TutWuriRefreshBanner refreshing={isRefreshing} />

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
        {/* Title Section (Web SSOT attendances/history.blade.php:4-5) */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Riwayat Kehadiran Rapat</Text>
          <Text style={styles.mainSubtitle}>
            Daftar seluruh kehadiran rapat kedinasan yang pernah Anda ikuti
          </Text>
        </View>

        {/* Action Bar & Search (Web SSOT attendances/history.blade.php:10-30) */}
        <View style={styles.searchCard}>
          <View style={styles.searchFormRow}>
            <View style={styles.searchBox}>
              <Search size={16} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari judul rapat atau lokasi..."
                placeholderTextColor={colors.textMuted}
                value={searchInput}
                onChangeText={setSearchInput}
                returnKeyType="search"
                onSubmitEditing={handleSubmitSearch}
              />
              {searchInput.length > 0 ? (
                <Pressable
                  onPress={handleResetSearch}
                  style={styles.searchClearBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Bersihkan pencarian"
                >
                  <X size={16} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.searchActionsRow}>
              <Pressable
                onPress={handleSubmitSearch}
                style={({ pressed }) => [
                  styles.searchActionBtn,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cari riwayat kehadiran"
              >
                <Text style={styles.searchActionBtnText}>Cari</Text>
              </Pressable>

              {hasSearchFilter ? (
                <Pressable
                  onPress={handleResetSearch}
                  style={({ pressed }) => [
                    styles.searchActionBtn,
                    pressed && styles.btnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Reset pencarian"
                >
                  <Text style={styles.searchActionBtnText}>Reset</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {/* Attendance History Table Panel (Web SSOT attendances/history.blade.php:33-134) */}
        {error && rows.length === 0 ? (
          <EmptyState
            icon="cloud-off"
            title="Riwayat tidak dapat dimuat"
            description={error}
            actionLabel="Coba Lagi"
            onAction={() =>
              void fetchHistory(1, false, {
                search: appliedSearch,
                period: 'all',
                tipeRapat: 'all',
              })
            }
          />
        ) : (
          <View style={styles.tablePanel}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              bounces={false}
              overScrollMode="never"
              nestedScrollEnabled
              style={styles.tableHorizontalScroll}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View style={styles.tableWrapper} collapsable={false}>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <View style={[styles.cellNo, styles.headerCell]}>
                    <Text style={[styles.thText, styles.textCenter]}>No</Text>
                  </View>
                  <View style={[styles.cellAgenda, styles.headerCell]}>
                    <Text style={styles.thText}>Agenda Rapat</Text>
                  </View>
                  <View style={[styles.cellSchedule, styles.headerCell]}>
                    <Text style={styles.thText}>Jadwal Pelaksanaan</Text>
                  </View>
                  <View style={[styles.cellTime, styles.headerCell]}>
                    <Text style={styles.thText}>Waktu Presensi</Text>
                  </View>
                  <View style={[styles.cellMedia, styles.headerCell]}>
                    <Text style={[styles.thText, styles.textCenter]}>
                      Verifikasi Media
                    </Text>
                  </View>
                  <View style={[styles.cellAction, styles.headerCell]}>
                    <Text style={[styles.thText, styles.textRight]}>Aksi</Text>
                  </View>
                </View>

                {/* Table Rows */}
                {rows.map((item, index) => {
                  const rowNo = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.tableBodyRow,
                        index === rows.length - 1 && styles.tableBodyRowLast,
                      ]}
                    >
                      {/* No */}
                      <View style={[styles.cellNo, styles.bodyCell]}>
                        <Text style={styles.noText}>{rowNo}</Text>
                      </View>

                      {/* Agenda Rapat */}
                      <View style={[styles.cellAgenda, styles.bodyCell]}>
                        <Pressable
                          onPress={() => {
                            triggerPageTransition();
                            navigation.navigate(detailRoute, { meetingId: item.meetingId });
                          }}
                          style={({ pressed }) => [
                            styles.agendaTitleBtn,
                            pressed && styles.btnPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Buka detail agenda ${item.title}`}
                        >
                          <Text style={styles.agendaTitleText} numberOfLines={2}>
                            {item.title}
                          </Text>
                        </Pressable>
                        <View style={styles.agendaSubRow}>
                          {item.meetingType ? (
                            <Text style={styles.agendaTypeText}>
                              {item.meetingType.toUpperCase()}
                            </Text>
                          ) : null}
                          {item.meetingType ? (
                            <Text style={styles.agendaDotText}>•</Text>
                          ) : null}
                          <AutoScrollText style={styles.agendaRoomText}>
                            {item.room}
                          </AutoScrollText>
                        </View>
                      </View>

                      {/* Jadwal Pelaksanaan */}
                      <View style={[styles.cellSchedule, styles.bodyCell]}>
                        <Text style={styles.scheduleDateText} numberOfLines={2}>
                          {item.scheduleDate}
                        </Text>
                        {item.scheduleTime ? (
                          <AutoScrollText style={styles.scheduleTimeText}>
                            {item.scheduleTime}
                          </AutoScrollText>
                        ) : null}
                      </View>

                      {/* Waktu Presensi */}
                      <View style={[styles.cellTime, styles.bodyCell]}>
                        <View style={styles.timeBadge}>
                          <Check
                            size={12}
                            color={colors.onSuccessContainer}
                            strokeWidth={2.5}
                          />
                          <Text style={styles.timeBadgeText}>{item.timeWib}</Text>
                        </View>
                      </View>

                      {/* Verifikasi Media */}
                      <View style={[styles.cellMedia, styles.bodyCellCenter]}>
                        <View style={styles.mediaThumbsRow}>
                          <Pressable
                            onPress={() =>
                              setEvidenceModalState({
                                attendance: item.attendance,
                                tab: 'selfie',
                              })
                            }
                            style={({ pressed }) => [
                              styles.mediaThumbTouch,
                              pressed && styles.btnPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Verifikasi Foto Selfie Anda"
                          >
                            <View style={styles.mediaThumbBox}>
                              <HistoryMediaThumb
                                attendanceId={item.id}
                                kind="selfie"
                                rawUrl={
                                  item.attendance.selfieUrl ?? item.attendance.selfieUri
                                }
                                verificationToken={item.attendance.verificationToken}
                              />
                            </View>
                          </Pressable>

                          <Pressable
                            onPress={() =>
                              setEvidenceModalState({
                                attendance: item.attendance,
                                tab: 'signature',
                              })
                            }
                            style={({ pressed }) => [
                              styles.mediaThumbTouch,
                              pressed && styles.btnPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Klik untuk memperbesar Tanda Tangan"
                          >
                            <View style={styles.mediaThumbBox}>
                              <HistoryMediaThumb
                                attendanceId={item.id}
                                kind="signature"
                                rawUrl={
                                  item.attendance.signatureUrl ??
                                  item.attendance.signatureSvg
                                }
                                verificationToken={item.attendance.verificationToken}
                              />
                            </View>
                          </Pressable>
                        </View>
                      </View>

                      {/* Aksi */}
                      <View style={[styles.cellAction, styles.bodyCellRight]}>
                        <Pressable
                          onPress={() => onSelectReceipt(item.id)}
                          style={({ pressed }) => [
                            styles.receiptBtn,
                            pressed && styles.btnPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Buka tanda terima presensi"
                        >
                          <Text style={styles.receiptBtnText}>Bukti Sah</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Empty State inside Table Panel */}
            {rows.length === 0 ? (
              <View style={styles.tableEmptyWrap}>
                <Text style={styles.tableEmptyText}>
                  Belum ada catatan kehadiran rapat yang ditemukan.
                </Text>
                {hasSearchFilter ? (
                  <Pressable
                    onPress={handleResetSearch}
                    style={({ pressed }) => [
                      styles.searchActionBtn,
                      pressed && styles.btnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Reset Pencarian"
                  >
                    <Text style={styles.searchActionBtnText}>Reset Pencarian</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Pagination inside Panel Footer */}
            {historyPage && historyPage.total > 0 ? (
              <View style={styles.paginationFooter}>
                <PaginationBar
                  currentPage={historyPage.currentPage}
                  lastPage={historyPage.lastPage}
                  total={historyPage.total}
                  label="Riwayat Presensi"
                  isLoading={isLoading}
                  onPageChange={handlePageChange}
                />
              </View>
            ) : null}
          </View>
        )}
        </ScrollView>
      </View>

      <EvidenceViewerModal
        visible={Boolean(evidenceModalState)}
        onClose={() => setEvidenceModalState(null)}
        initialTab={evidenceModalState?.tab ?? 'selfie'}
        attendanceId={evidenceModalState?.attendance.id}
        selfieUrl={evidenceModalState?.attendance.selfieUrl}
        selfieUri={evidenceModalState?.attendance.selfieUri}
        signatureUrl={evidenceModalState?.attendance.signatureUrl}
        signatureSvg={evidenceModalState?.attendance.signatureSvg}
        participantName={evidenceModalState?.attendance.asnName}
        participantNip={evidenceModalState?.attendance.asnNip}
        meetingTitle={evidenceModalState?.attendance.meetingTitle}
        verificationToken={evidenceModalState?.attendance.verificationToken}
        signedAt={evidenceModalState?.attendance.timestamp}
        ipAddress={evidenceModalState?.attendance.ipAddress}
        deviceInfo={evidenceModalState?.attendance.deviceInfo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  scrollWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  titleSection: {
    marginTop: 2,
  },
  mainTitle: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.primaryDarkest,
  },
  mainSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchCard: {
    ...cardSurface,
    padding: spacing.md,
  },
  searchFormRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    minWidth: 200,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.sm + 4,
    paddingRight: 2,
    gap: 8,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12.5,
    color: colors.onSurface,
    minHeight: MIN_TOUCH_TARGET,
  },
  searchClearBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchActionBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 16,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchActionBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primaryDarkest,
  },
  tablePanel: {
    ...cardSurface,
    overflow: 'hidden',
  },
  tableHorizontalScroll: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  tableWrapper: {
    minWidth: 815,
    flexGrow: 1,
    backgroundColor: colors.surfaceCard,
  },
  tableHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerCell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  thText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.primaryDarkest,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
  tableBodyRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
  },
  tableBodyRowLast: {
    borderBottomWidth: 0,
  },
  bodyCell: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  bodyCellCenter: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyCellRight: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cellNo: {
    width: 48,
  },
  cellAgenda: {
    width: 220,
  },
  cellSchedule: {
    width: 155,
  },
  cellTime: {
    width: 170,
  },
  cellMedia: {
    width: 112,
  },
  cellAction: {
    width: 110,
  },
  noText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 12,
    color: colors.primary,
    textAlign: 'center',
  },
  agendaTitleBtn: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  agendaTitleText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13.5,
    color: colors.primaryDarkest,
    lineHeight: 18,
  },
  agendaSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    minWidth: 0,
  },
  agendaTypeText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    color: colors.primary,
  },
  agendaDotText: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.textMuted,
  },
  agendaRoomText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoMedium,
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    minWidth: 0,
  },
  scheduleDateText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primaryDarkest,
  },
  scheduleTimeText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoMedium,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    minWidth: 0,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: rounded.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeBadgeText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    color: colors.onSuccessContainer,
  },
  mediaThumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  mediaThumbTouch: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaThumbBox: {
    width: 34,
    height: 34,
    borderRadius: rounded.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImageCover: {
    width: '100%',
    height: '100%',
  },
  thumbImageContain: {
    width: '90%',
    height: '90%',
  },
  receiptBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primaryDarkest,
  },
  tableEmptyWrap: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tableEmptyText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansBold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  paginationFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  btnPressed: {
    opacity: 0.85,
  },
});
