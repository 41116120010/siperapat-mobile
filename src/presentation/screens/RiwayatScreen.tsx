import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ScrollViewInstance,
  TextInput,
  Pressable,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
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
  room: string;
  verificationMethod: string;
  meetingId: string;
  meetingType?: 'hybrid' | 'offline' | 'online';
}

export const RiwayatScreen: React.FC<RiwayatScreenProps> = ({ onSelectReceipt }) => {
  const { offlineQueueCount, syncOfflineQueue, attendances, fetchHistory, historyPage, historySummary, isLoading, error } = useAttendanceStore();
  const [search, setSearch] = useState('');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<HistoryPeriod>('all');
  const [selectedType, setSelectedType] = useState<HistoryMeetingType>('all');
  const scrollViewRef = useRef<ScrollViewInstance>(null);

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
    const date = item.timestamp ? new Date(item.timestamp) : null;
    return {
      id: item.id, code: `Agenda #${item.agendaId ?? item.meetingId}`, title: item.meetingTitle,
      statusText: 'Tercatat', time: date && !Number.isNaN(date.getTime()) ? date.toLocaleString('id-ID') : 'Waktu tidak tersedia',
      room: 'Detail agenda tersedia pada receipt', verificationMethod: 'Bukti tersimpan sesuai respons API', meetingType: item.meetingType,
      meetingId: item.meetingId,
    };
  });
  // Search, period, and meeting type are applied by the API. Re-filtering this page
  // locally can hide valid server matches (for example location matches) and distort counts.
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
    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void fetchHistory(1, false, { search, period: selectedPeriod, tipeRapat: selectedType })} />}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Riwayat Presensi</Text>
          <Text style={styles.mainSubtitle}>
            Catatan kehadiran rapat kedinasan LLDIKTI Wilayah X
          </Text>
        </View>

        {/* Offline Queue Sync Banner if offline items exist */}
        {offlineQueueCount > 0 ? (
          <View style={styles.syncBanner}>
            <MaterialIcons name="sync" size={18} color={colors.warning} />
            <Text style={styles.syncText}>
              {offlineQueueCount} presensi tersimpan lokal (menunggu sinkronisasi)
            </Text>
            <Pressable onPress={() => syncOfflineQueue()}>
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
          <Text style={[styles.bentoValue, { color: colors.success }]}>{historySummary?.attendance_rate_label ?? '—'}</Text>
            <Text style={styles.bentoSub}>{historySummary?.period_label ?? 'Ringkasan dari API'}</Text>
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
            <MaterialIcons name="search" size={20} color={colors.outline} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari agenda atau nama rapat..."
              placeholderTextColor={colors.outline}
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
            <MaterialIcons
              name="calendar-month"
              size={16}
              color={isFilterActive ? colors.primary : colors.onSurfaceVariant}
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
            <MaterialIcons
              name="arrow-drop-down"
              size={18}
              color={isFilterActive ? colors.primary : colors.onSurfaceVariant}
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
        {error && historyData.length === 0 ? <EmptyState icon="cloud-off" title="Riwayat tidak dapat dimuat" description={error} actionLabel="Coba Lagi" onAction={() => void fetchHistory(1, false, { search, period: selectedPeriod, tipeRapat: selectedType })} /> : filteredHistory.length > 0 ? (
          <View style={styles.cardsContainer}>
            {filteredHistory.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.cardTop}>
                  <View style={styles.statusRow}>
                    <Text style={styles.statusText}>{item.statusText}</Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.codeText}>{item.code}</Text>
                  </View>
                  <Text style={styles.meetingTitle}>{item.title}</Text>
                </View>

                {/* Room and time grid */}
                <View style={styles.metaBox}>
                  <View style={styles.metaRow}>
                    <MaterialIcons
                      name="schedule"
                      size={15}
                      color={colors.primary}
                    />
                    <Text style={styles.metaText}>{item.time}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <MaterialIcons
                      name="meeting-room"
                      size={15}
                      color={colors.primary}
                    />
                    <Text style={styles.metaText}>{item.room}</Text>
                  </View>
                </View>

                {/* Bottom verify & receipt action */}
                <View style={styles.cardBottom}>
                  <Text style={styles.verifyMethodText}>
                    {item.verificationMethod}
                  </Text>
                  <Pressable
                    onPress={() => onSelectReceipt(item.id)}
                    style={({ pressed }) => [
                      styles.receiptBtn,
                      pressed && styles.btnPressed,
                    ]}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Buka tanda terima presensi"
                  >
                    <MaterialIcons
                      name="qr-code-2"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles.receiptBtnText}>Tanda Terima</Text>
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
        onApply={(period, type) => { setSelectedPeriod(period); setSelectedType(type); }}
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  mainSubtitle: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningContainer,
    padding: spacing.sm,
    borderRadius: rounded.md,
  },
  syncText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onWarningContainer,
    flex: 1,
  },
  syncAction: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.onWarningContainer,
    textDecorationLine: 'underline',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    justifyContent: 'space-between',
    minHeight: 74,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  bentoLabel: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  bentoValue: {
    ...typography.headlineMd,
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2,
  },
  bentoSub: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    height: 42,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    gap: 8,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurface,
  },
  calendarFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 42,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.55)',
    overflow: 'hidden',
  },
  calendarFilterBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 35, 111, 0.05)',
  },
  calendarFilterBtnPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  calendarFilterText: {
    ...typography.labelMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  calendarFilterTextActive: {
    color: colors.primary,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  listHeaderSub: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.outline,
  },
  cardsContainer: {
    gap: 8,
  },
  historyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    gap: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  cardTop: {
    gap: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  dotSeparator: {
    color: colors.outline,
    fontSize: 11,
  },
  codeText: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.outline,
  },
  meetingTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    lineHeight: 19,
  },
  metaBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
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
    color: colors.onSurfaceVariant,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
    paddingTop: 8,
  },
  verifyMethodText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.outline,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.55)',
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  btnPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  receiptBtnText: {
    ...typography.labelMd,
    fontSize: 11.5,
    color: colors.primary,
    fontWeight: '600',
  },
});
