import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { BentoGrid } from '../components/cards/BentoStatCard';
import { MeetingCard } from '../components/cards/MeetingCard';
import { EmptyState } from '../components/common/EmptyState';
import {
  MeetingFilterModal,
  FilterStatus,
  FilterOrder,
} from '../components/modals/MeetingFilterModal';
import { useAuthStore } from '../store/useAuthStore';
import { useMeetingStore } from '../store/useMeetingStore';
import { useFeedbackStore } from '../store/useFeedbackStore';

interface DashboardScreenProps {
  onNavigatePresensi: (meetingId: string) => void;
  onNavigateDetail: (meetingId: string) => void;
  onNavigateAgenda: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigatePresensi,
  onNavigateDetail,
  onNavigateAgenda,
}) => {
  const { user } = useAuthStore();
  const {
    meetings,
    activeMeeting,
    isLoading,
    filterTab,
    setFilterTab,
    fetchMeetings,
  } = useMeetingStore();

  const [activeFilterOrder, setActiveFilterOrder] = useState<FilterOrder>('all');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const ongoingCount = meetings.filter((m) => m.status === 'ongoing').length;
  const upcomingMeetings = meetings.filter((m) => m.status === 'upcoming');
  const completedMeetings = meetings.filter((m) => m.status === 'completed');

  const filteredMeetings = meetings
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
    });

  const categoryTabs: { id: FilterStatus; label: string; count: number }[] = [
    { id: 'all', label: 'Semua', count: meetings.length },
    { id: 'ongoing', label: 'Berlangsung', count: ongoingCount },
    { id: 'upcoming', label: 'Mendatang', count: upcomingMeetings.length },
    { id: 'completed', label: 'Selesai', count: completedMeetings.length },
  ];

  const handlePdfView = (title: string) => {
    useFeedbackStore.getState().showToast({
      type: 'info',
      message: `Membuka berkas surat undangan dinas untuk "${title}".`,
    });
  };

  const handleJoinLink = (url?: string) => {
    useFeedbackStore.getState().showToast({
      type: 'info',
      message: `Menghubungkan ke ruang sidang virtual: ${url || 'Meeting ID: 894 1205 9920'}`,
    });
  };

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && meetings.length > 0}
            onRefresh={fetchMeetings}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingSub}>Selamat Pagi,</Text>
          <Text style={styles.greetingName}>
            {user?.name ?? 'Afdalisma, SH, M.Pd'}
          </Text>
          <Text style={styles.greetingRole}>
            {user?.jabatan ?? 'Kepala LLDIKTI Wilayah X'}
          </Text>
        </View>

        {/* Bento Telemetry Stats */}
        <BentoGrid
          stats={[
            { label: 'Presensi Rapat', value: '18', subValue: 'Selesai' },
            {
              label: 'Jadwal Mendatang',
              value: upcomingMeetings.length.toString(),
              subValue: 'Agenda',
              isPrimary: true,
            },
            {
              label: 'Tingkat Kehadiran',
              value: '96.8%',
              subValue: 'Sah',
              subValueColor: colors.success,
            },
          ]}
        />

        {/* Meeting Section Title with Enterprise Filter Button */}
        <View style={styles.sectionHeaderRow}>
          <View>
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
            <MaterialIcons
              name="tune"
              size={15}
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
                onPressPdf={() => handlePdfView(meeting.title)}
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
    marginBottom: spacing.xs,
    paddingTop: spacing.xs,
  },
  greetingSub: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  greetingName: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 20,
    marginTop: 2,
  },
  greetingRole: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 16,
  },
  sectionSub: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.55)',
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  filterButtonHighlighted: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 35, 111, 0.05)',
  },
  filterButtonPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  filterButtonText: {
    ...typography.labelMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  filterButtonTextHighlighted: {
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
  filterScroll: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
    paddingVertical: 2,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: rounded.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#00236F',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  filterPillInactive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  filterPillPressed: {
    opacity: 0.85,
  },
  filterPillText: {
    ...typography.labelMd,
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  badgeCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeCountActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  badgeCountInactive: {
    backgroundColor: colors.surfaceContainerLow,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  badgeCountTextActive: {
    color: colors.onPrimary,
  },
});
