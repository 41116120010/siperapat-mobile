import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ScrollViewInstance,
  TextInput,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  MapPin,
  QrCode,
  RefreshCw,
  Search,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';
import { PaginationBar } from '../components/common/PaginationBar';
import {
  DateFilterModal,
  HistoryPeriod,
  HistoryMeetingType,
} from '../components/modals/DateFilterModal';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { triggerPageTransition } from '../store/useTransitionStore';

interface RiwayatScreenProps {
  onSelectReceipt: (id: string) => void;
}

interface HistoryItem {
  id: string;
  code: string;
  title: string;
  statusText: string;
  time: string;
  schedule: string;
  room: string;
  verificationMethod: string;
  meetingId: string;
  meetingType?: 'hybrid' | 'offline' | 'online';
}

function formatAttendanceTimeWIB(timestamp?: string | null): string {
  if (!timestamp) return 'Waktu tidak tersedia';
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return 'Waktu tidak tersedia';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss} WIB`;
}

export const RiwayatScreen: React.FC<RiwayatScreenProps> = ({ onSelectReceipt }) => {
  const {
    offlineQueueCount,
    syncOfflineQueue,
    attendances,
    fetchHistory,
    historyPage,
    historySummary,
    isLoading,
    error,
  } = useAttendanceStore();
  const [search, setSearch] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<HistoryPeriod>('all');
  const [selectedType, setSelectedType] = useState<HistoryMeetingType>('all');
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);

  useFocusEffect(
    useCallback(() => {
      void syncOfflineQueue();
      const timer = setTimeout(() => {
        void fetchHistory(1, false, { search, period: selectedPeriod, tipeRapat: selectedType });
      }, 150);
      return () => clearTimeout(timer);
    }, [syncOfflineQueue, fetchHistory, search, selectedPeriod, selectedType])
  );

  const handlePageChange = (page: number) => {
    if (!historyPage || page < 1 || page > historyPage.lastPage || page === historyPage.currentPage || isLoading) return;
    triggerPageTransition(400);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    void fetchHistory(page, false, { search, period: selectedPeriod, tipeRapat: selectedType });
  };

  const historyData: HistoryItem[] = attendances.map((item) => {
    return {
      id: item.id,
      code: `Agenda #${item.agendaId ?? item.meetingId}`,
      title: item.meetingTitle,
      statusText: item.validationStatusLabel || 'Tercatat',
      time: formatAttendanceTimeWIB(item.timestamp),
      schedule: item.meetingSchedule || 'Sesuai jadwal agenda',
      room: item.meetingLocation || 'Detail agenda tersedia pada receipt',
      verificationMethod: item.verificationMethod || 'Swafoto & TTD Digital',
      meetingType: item.meetingType,
      meetingId: item.meetingId,
    };
  });

  // Search, period, and meeting type are applied by the API.
  const filteredHistory = historyData;

  const getPeriodButtonLabel = (period: HistoryPeriod): string => {
    switch (period) {
      case '2026-10':
        return 'Okt 2026';
      case '2026-09':
        return 'Sep 2026';
      case '2026-08':
        return 'Agu 2026';
      default:
        return 'Semua Periode';
    }
  };

  const isFilterActive = selectedPeriod !== 'all' || selectedType !== 'all';

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() =>
              void fetchHistory(1, false, { search, period: selectedPeriod, tipeRapat: selectedType })
            }
          />
        }
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Riwayat Presensi</Text>
          <Text style={styles.mainSubtitle}>
            Daftar seluruh kehadiran rapat kedinasan yang pernah Anda ikuti
          </Text>
        </View>

        {/* Offline Queue Sync Banner if offline items exist */}
        {offlineQueueCount > 0 ? (
          <View style={styles.syncBanner}>
            <RefreshCw size={18} color={colors.warning} strokeWidth={2} />
            <Text style={styles.syncText}>
              {offlineQueueCount} presensi tersimpan lokal (menunggu sinkronisasi)
            </Text>
            <Pressable
              onPress={() => void syncOfflineQueue()}
              style={styles.syncActionBtn}
              accessibilityRole="button"
              accessibilityLabel="Sinkronkan presensi lokal"
            >
              <Text style={styles.syncAction}>Sinkronkan</Text>
            </Pressable>
          </View>
        ) : null}

        {/* SUMMARY OVERVIEW BENTO CARDS */}
        <View style={styles.bentoGrid}>
          <View style={styles.bentoCard}>
            <Text style={styles.bentoLabel}>Total Presensi</Text>
            <Text style={styles.bentoValue}>{historySummary?.total_attended ?? '—'}</Text>
            <Text style={styles.bentoSub}>
              {historySummary?.period_label ?? 'Periode dari API'}
            </Text>
          </View>

          <View style={styles.bentoCard}>
            <Text style={styles.bentoLabel}>Tingkat Kehadiran</Text>
            <Text style={[styles.bentoValue, styles.bentoValueSuccess]}>
              {historySummary?.attendance_rate_label ?? '—'}
            </Text>
            <Text style={styles.bentoSub}>
              {historySummary?.period_label ?? 'Ringkasan dari API'}
            </Text>
          </View>

          <View style={styles.bentoCard}>
            <Text style={styles.bentoLabel}>Periode Aktif</Text>
            <Text style={styles.bentoValue} numberOfLines={1}>
              {selectedPeriod === 'all' ? 'Semua' : getPeriodButtonLabel(selectedPeriod)}
            </Text>
            <Text style={styles.bentoSub}>
              {selectedPeriod === '2026-10' ? 'Bulan Berjalan' : 'Filter Aktif'}
            </Text>
          </View>
        </View>

        {/* SEARCH & ENTERPRISE FILTER CONTROL BAR */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari judul rapat atau lokasi..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Interactive Date Filter Button */}
          <Pressable
            onPress={() => setIsFilterModalVisible(true)}
            style={({ pressed }) => [
              styles.calendarFilterBtn,
              isFilterActive && styles.calendarFilterBtnActive,
              pressed && styles.calendarFilterBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Filter periode tanggal riwayat"
          >
            <Calendar
              size={16}
              color={isFilterActive ? colors.primary : colors.textSecondary}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.calendarFilterText,
                isFilterActive && styles.calendarFilterTextActive,
              ]}
              numberOfLines={1}
            >
              {getPeriodButtonLabel(selectedPeriod)}
            </Text>
            <ChevronDown
              size={16}
              color={isFilterActive ? colors.primary : colors.textSecondary}
              strokeWidth={2}
            />
            {isFilterActive ? <View style={styles.filterActiveDot} /> : null}
          </Pressable>
        </View>

        {/* LIST HEADER */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>
            DAFTAR KEHADIRAN RAPAT KEDINASAN
          </Text>
          <Text style={styles.listHeaderSub}>
            Menampilkan {filteredHistory.length} dari {historyPage?.total ?? 0}
          </Text>
        </View>

        {/* ATTENDANCE HISTORY LIST CARDS OR EMPTY STATE */}
        {error && historyData.length === 0 ? (
          <EmptyState
            icon="cloud-off"
            title="Riwayat tidak dapat dimuat"
            description={error}
            actionLabel="Coba Lagi"
            onAction={() =>
              void fetchHistory(1, false, { search, period: selectedPeriod, tipeRapat: selectedType })
            }
          />
        ) : filteredHistory.length > 0 ? (
          <View style={styles.cardsContainer}>
            {filteredHistory.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.cardTop}>
                  <View style={styles.statusRow}>
                    <View style={styles.timeBadge}>
                      <Check size={12} color={colors.onSuccessContainer} strokeWidth={2.5} />
                      <Text style={styles.timeBadgeText}>{item.time}</Text>
                    </View>
                    <Text style={styles.codeText}>{item.code}</Text>
                  </View>
                  <Text style={styles.meetingTitle}>{item.title}</Text>
                </View>

                {/* Room and schedule info */}
                <View style={styles.metaBox}>
                  <View style={styles.metaRow}>
                    <Clock size={15} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.schedule}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <MapPin size={15} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.meetingType ? `${item.meetingType.toUpperCase()} • ${item.room}` : item.room}
                    </Text>
                  </View>
                </View>

                {/* Bottom verify & receipt action */}
                <View style={styles.cardBottom}>
                  <Text style={styles.verifyMethodText} numberOfLines={1}>
                    {item.verificationMethod}
                  </Text>
                  <Pressable
                    onPress={() => onSelectReceipt(item.id)}
                    style={({ pressed }) => [
                      styles.receiptBtn,
                      pressed && styles.btnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Buka tanda terima presensi"
                  >
                    <QrCode size={16} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.receiptBtnText}>Bukti Sah</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {historyPage && historyPage.total > 0 ? (
              <PaginationBar
                currentPage={historyPage.currentPage}
                lastPage={historyPage.lastPage}
                total={historyPage.total}
                label="Riwayat Presensi"
                isLoading={isLoading}
                onPageChange={handlePageChange}
              />
            ) : null}
          </View>
        ) : (
          <EmptyState
            icon="event-busy"
            title="Tidak Ada Riwayat Presensi"
            description="Tidak ada catatan kehadiran yang sesuai dengan periode atau kata kunci pencarian yang dipilih."
            actionLabel="Atur Ulang Filter"
            onAction={() => {
              setSelectedPeriod('all');
              setSelectedType('all');
              setSearch('');
            }}
          />
        )}
      </ScrollView>

      {/* Enterprise Date Filter Modal */}
      <DateFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        currentPeriod={selectedPeriod}
        currentType={selectedType}
        onApply={(period, type) => {
          setSelectedPeriod(period);
          setSelectedType(type);
        }}
        onReset={() => {
          setSelectedPeriod('all');
          setSelectedType('all');
        }}
      />
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
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningContainer,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: rounded.md,
  },
  syncText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onWarningContainer,
    flex: 1,
  },
  syncActionBtn: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  syncAction: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.onWarningContainer,
    textDecorationLine: 'underline',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  bentoCard: {
    ...cardSurface,
    flex: 1,
    padding: spacing.sm + 2,
    justifyContent: 'space-between',
    minHeight: 74,
    overflow: 'hidden',
  },
  bentoLabel: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.textSecondary,
  },
  bentoValue: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 18,
    color: colors.primaryDarkest,
    marginTop: 2,
  },
  bentoValueSuccess: {
    color: colors.success,
  },
  bentoSub: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
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
  calendarFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  calendarFilterBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  calendarFilterBtnPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  calendarFilterText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  calendarFilterTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  filterActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginLeft: 2,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  listHeaderTitle: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  listHeaderSub: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.textMuted,
  },
  cardsContainer: {
    gap: 10,
  },
  historyCard: {
    ...cardSurface,
    padding: spacing.md,
    gap: 8,
    overflow: 'hidden',
  },
  cardTop: {
    gap: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  timeBadgeText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    color: colors.onSuccessContainer,
  },
  codeText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  meetingTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14.5,
    color: colors.primaryDarkest,
    lineHeight: 20,
  },
  metaBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.sm,
    gap: 4,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.textSecondary,
    flex: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 8,
    gap: spacing.sm,
  },
  verifyMethodText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.textMuted,
    flex: 1,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
    overflow: 'hidden',
  },
  btnPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  receiptBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primary,
  },
});
