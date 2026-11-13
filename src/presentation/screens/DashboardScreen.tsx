import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Calendar,
  CalendarCheck,
  CheckSquare,
  Clock,
  SlidersHorizontal,
  Users,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { MeetingCard } from '../components/cards/MeetingCard';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import {
  MeetingFilterModal,
  FilterStatus,
  FilterOrder,
} from '../components/modals/MeetingFilterModal';
import { useAuthStore } from '../store/useAuthStore';
import { useMeetingStore } from '../store/useMeetingStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { Meeting } from '../../domain/entities/types';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';

interface DashboardScreenProps {
  onNavigatePresensi: (meetingId: string) => void;
  onNavigateDetail: (meetingId: string) => void;
  onNavigateAgenda: () => void;
}

const getWibGreeting = (): string => {
  const wibHour = new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCHours();
  if (wibHour >= 4 && wibHour <= 10) return 'Selamat Pagi,';
  if (wibHour >= 11 && wibHour <= 14) return 'Selamat Siang,';
  if (wibHour >= 15 && wibHour <= 17) return 'Selamat Sore,';
  return 'Selamat Malam,';
};

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigatePresensi,
  onNavigateDetail,
  onNavigateAgenda,
}) => {
  const { user } = useAuthStore();
  const {
    dashboardMeetings: meetings,
    activeMeeting,
    dashboardStats,
    isLoading,
    error,
    filterTab,
    setFilterTab,
    fetchDashboard,
  } = useMeetingStore();

  const [activeFilterOrder, setActiveFilterOrder] = useState<FilterOrder>('all');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Meeting | null>(null);

  useFocusEffect(
    useCallback(() => {
      void fetchDashboard();
    }, [fetchDashboard])
  );

  const greetingText = getWibGreeting();
  const ongoingCount = dashboardStats?.ongoing_agendas;
  const upcomingCount = dashboardStats?.upcoming_agendas;
  const agendaCount = dashboardStats?.total_agendas;
  const attendanceCount = dashboardStats?.my_attendances ?? dashboardStats?.total_attendances;

  const statCards = useMemo(() => {
    const fourthCard =
      user?.role === 'administrator'
        ? {
            key: 'total-users',
            label: 'Total Pengguna',
            value: dashboardStats?.total_users === undefined ? '—' : String(dashboardStats.total_users),
            Icon: Users,
            isHighlight: false,
          }
        : user?.role === 'admin'
        ? {
            key: 'unit-users',
            label: 'Pegawai di Unit',
            value: dashboardStats?.total_users === undefined ? '—' : String(dashboardStats.total_users),
            Icon: Users,
            isHighlight: false,
          }
        : {
            key: 'my-attendances',
            label: 'Riwayat Kehadiran',
            value: attendanceCount === undefined ? '—' : String(attendanceCount),
            Icon: CheckSquare,
            isHighlight: false,
          };

    return [
      {
        key: 'total-agendas',
        label: 'Agenda Rapat',
        value: agendaCount === undefined ? '—' : String(agendaCount),
        Icon: Calendar,
        isHighlight: false,
      },
      {
        key: 'ongoing-agendas',
        label: 'Sedang Berlangsung',
        value: ongoingCount === undefined ? '—' : String(ongoingCount),
        Icon: Clock,
        isHighlight: (ongoingCount ?? 0) > 0,
      },
      {
        key: 'upcoming-agendas',
        label: 'Terjadwal',
        value: upcomingCount === undefined ? '—' : String(upcomingCount),
        Icon: CalendarCheck,
        isHighlight: false,
      },
      fourthCard,
    ];
  }, [
    user?.role,
    agendaCount,
    ongoingCount,
    upcomingCount,
    dashboardStats?.total_users,
    attendanceCount,
  ]);

  const filteredMeetings = useMemo(
    () =>
      meetings
        .filter((m) => {
          if (filterTab === 'ongoing') return m.status === 'ongoing';
          if (filterTab === 'upcoming') return m.status === 'upcoming';
          if (filterTab === 'completed') return m.status === 'completed';
          return true;
        })
        .filter((m) => {
          if (activeFilterOrder === 'priority') {
            return (
              m.type === 'hybrid' ||
              m.title.toLowerCase().includes('pleno') ||
              m.title.toLowerCase().includes('koordinasi')
            );
          }
          return true;
        }),
    [meetings, filterTab, activeFilterOrder]
  );

  const categoryTabs: { id: FilterStatus; label: string; count: number | string }[] = useMemo(
    () => [
      { id: 'all', label: 'Semua', count: agendaCount ?? '—' },
      { id: 'ongoing', label: 'Berlangsung', count: ongoingCount ?? '—' },
      { id: 'upcoming', label: 'Mendatang', count: upcomingCount ?? '—' },
      { id: 'completed', label: 'Selesai', count: dashboardStats?.completed_agendas ?? '—' },
    ],
    [agendaCount, ongoingCount, upcomingCount, dashboardStats?.completed_agendas]
  );

  const handlePdfView = useCallback((meeting: Meeting) => {
    if (meeting.invitationPdfUrl) {
      setSelectedDocument(meeting);
    } else {
      useFeedbackStore
        .getState()
        .showToast({ type: 'info', message: 'Berkas undangan belum tersedia pada agenda ini.' });
    }
  }, []);

  const handleJoinLink = useCallback((url?: string) => {
    if (url) {
      void Linking.openURL(url).catch(() =>
        useFeedbackStore
          .getState()
          .showToast({ type: 'error', message: 'Tautan rapat tidak dapat dibuka.' })
      );
    } else {
      useFeedbackStore
        .getState()
        .showToast({ type: 'info', message: 'Tautan rapat belum tersedia pada agenda ini.' });
    }
  }, []);

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && meetings.length > 0}
            onRefresh={fetchDashboard}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingSub}>{greetingText}</Text>
          <Text style={styles.greetingName}>{user?.name ?? 'ASN'}</Text>
          <Text style={styles.greetingRole}>{user?.jabatan ?? 'SIPERAPAT'}</Text>
        </View>

        {/* 2x2 Gov-Tech Stat Cards */}
        <View style={styles.bentoGrid}>
          {statCards.map((stat) => {
            const IconComponent = stat.Icon;
            return (
              <View key={stat.key} style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <View
                    style={[
                      styles.statIconBox,
                      stat.isHighlight && styles.statIconBoxHighlight,
                    ]}
                  >
                    <IconComponent
                      size={17}
                      strokeWidth={2}
                      color={stat.isHighlight ? colors.success : colors.onPrimary}
                    />
                  </View>
                </View>
                <Text style={styles.statLabel} numberOfLines={2}>
                  {stat.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Meeting Section Title with Enterprise Filter Button */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>Daftar Rapat Dinas</Text>
            <Text style={styles.sectionSub}>Wilayah Kerja LLDIKTI Wilayah X</Text>
          </View>
          <Pressable
            onPress={() => setIsFilterModalVisible(true)}
            style={({ pressed }) => [
              styles.filterButton,
              activeFilterOrder === 'priority' && styles.filterButtonHighlighted,
              pressed && styles.filterButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Filter agenda rapat"
          >
            <SlidersHorizontal
              size={15}
              strokeWidth={2}
              color={
                activeFilterOrder === 'priority'
                  ? colors.primary
                  : colors.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.filterButtonText,
                activeFilterOrder === 'priority' && styles.filterButtonTextHighlighted,
              ]}
            >
              Filter
            </Text>
            {activeFilterOrder === 'priority' ? (
              <View style={styles.filterActiveDot} />
            ) : null}
          </Pressable>
        </View>

        {/* Category Filter Pills with Cohesive Badge Counters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {categoryTabs.map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setFilterTab(tab.id)}
                style={({ pressed }) => [
                  styles.filterPill,
                  isActive ? styles.filterPillActive : styles.filterPillInactive,
                  pressed && styles.filterPillPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Kategori ${tab.label}`}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isActive && styles.filterPillTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.badgeCount,
                    isActive ? styles.badgeCountActive : styles.badgeCountInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeCountText,
                      isActive && styles.badgeCountTextActive,
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Active Highlight Card when ongoing tab is active and meeting exists */}
        {filterTab === 'ongoing' && activeMeeting ? (
          <MeetingCard
            meeting={activeMeeting}
            isActive
            onPressAction={() => onNavigatePresensi(activeMeeting.id)}
          />
        ) : null}

        {error ? <ErrorState message={error} onRetry={fetchDashboard} /> : null}

        {/* List of Meetings according to Filter */}
        {filteredMeetings.length > 0 ? (
          filteredMeetings
            .filter((m) =>
              filterTab === 'ongoing' && activeMeeting
                ? m.id !== activeMeeting.id
                : true
            )
            .map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onPressDetail={() => onNavigateDetail(meeting.id)}
                onPressPdf={() => handlePdfView(meeting)}
                onPressJoinLink={() => handleJoinLink(meeting.zoomUrl)}
              />
            ))
        ) : (
          <EmptyState
            title="Tidak Ada Agenda Rapat"
            description="Tidak ada jadwal pertemuan kedinasan yang sesuai dengan filter yang dipilih."
            actionLabel="Lihat Semua Agenda"
            onAction={onNavigateAgenda}
          />
        )}
      </ScrollView>

      {/* Enterprise Filter Bottom Sheet Modal */}
      <MeetingFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        currentStatus={filterTab}
        currentOrder={activeFilterOrder}
        onApply={(status, order) => {
          setFilterTab(status);
          setActiveFilterOrder(order);
        }}
        onReset={() => {
          setFilterTab('all');
          setActiveFilterOrder('all');
        }}
      />
      <SuratEdaranViewerModal
        visible={selectedDocument !== null}
        onClose={() => setSelectedDocument(null)}
        documentUrl={selectedDocument?.invitationPdfUrl}
        fileName={`Surat-Edaran_${selectedDocument?.code || 'Agenda'}.${selectedDocument?.suratEdaran?.extension || (selectedDocument?.suratEdaran?.is_image ? 'jpg' : 'pdf')}`}
        meetingTitle={selectedDocument?.title}
        meetingCode={selectedDocument?.code}
        meetingDate={`${selectedDocument?.date || ''} ${selectedDocument?.startTime || ''}`.trim()}
        mimeType={selectedDocument?.suratEdaran?.is_image ? 'image/jpeg' : 'application/pdf'}
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
  },
  greetingSection: {
    marginBottom: spacing.sm + 4,
    paddingTop: spacing.xs,
  },
  greetingSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  greetingName: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    fontSize: 20,
    marginTop: 2,
  },
  greetingRole: {
    ...typography.labelSm,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.xs,
  },
  statCard: {
    ...cardSurface,
    width: '48.2%',
    minHeight: 88,
    borderRadius: rounded.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
    gap: 8,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statValue: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.monoBold,
    fontSize: 22,
    lineHeight: 26,
    color: colors.primary,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: rounded.md + 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconBoxHighlight: {
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  statLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitleWrap: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    fontSize: 16,
  },
  sectionSub: {
    ...typography.labelSm,
    color: colors.textMuted,
    fontSize: 11,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
    overflow: 'hidden',
  },
  filterButtonHighlighted: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  filterButtonPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  filterButtonText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  filterButtonTextHighlighted: {
    color: colors.primary,
    fontFamily: fontFamilies.sansBold,
  },
  filterActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginLeft: 2,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
    paddingVertical: 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillInactive: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderSubtle,
  },
  filterPillPressed: {
    opacity: 0.85,
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
  badgeCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeCountActive: {
    backgroundColor: colors.primaryContainer,
  },
  badgeCountInactive: {
    backgroundColor: colors.surfaceSoft,
  },
  badgeCountText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.monoBold,
    fontSize: 10,
    lineHeight: 12,
    color: colors.onSurfaceVariant,
  },
  badgeCountTextActive: {
    color: colors.onPrimary,
  },
});
