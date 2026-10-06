import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing, elevations } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { BentoGrid } from '../components/cards/BentoStatCard';
import { MeetingCard } from '../components/cards/MeetingCard';
import { EmptyState } from '../components/common/EmptyState';
import { useAuthStore } from '../store/useAuthStore';
import { useMeetingStore } from '../store/useMeetingStore';

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

  const [activeFilterOrder, setActiveFilterOrder] = useState<'all' | 'priority'>('all');

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const ongoingCount = meetings.filter((m) => m.status === 'ongoing').length;
  const upcomingMeetings = meetings.filter((m) => m.status === 'upcoming');

  const filteredMeetings = meetings.filter((m) => {
    if (filterTab === 'ongoing') return m.status === 'ongoing';
    if (filterTab === 'upcoming') return m.status === 'upcoming';
    if (filterTab === 'completed') return m.status === 'completed';
    return true;
  });

  const handleFilterPress = () => {
    Alert.alert(
      'Filter Agenda Rapat',
      'Pilih kriteria urutan rapat:',
      [
        {
          text: 'Semua Rapat Dinas',
          onPress: () => setActiveFilterOrder('all'),
        },
        {
          text: 'Hanya Rapat Prioritas / Pleno',
          onPress: () => setActiveFilterOrder('priority'),
        },
        { text: 'Batal', style: 'cancel' },
      ]
    );
  };

  const handlePdfView = (title: string) => {
    Alert.alert(
      'Unduhan Berkas Undangan',
      `Surat Undangan Dinas Resmi untuk "${title}" (Nomor: 0142/LL10/KP/2026.pdf) dibuka.`
    );
  };

  const handleJoinLink = (url?: string) => {
    Alert.alert(
      'Akses Zoom Kedinasan',
      `Menghubungkan ke Ruang Sidang Virtual LLDIKTI X: ${url || 'Meeting ID: 894 1205 9920'}`
    );
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
            { label: 'Jadwal Mendatang', value: '3', subValue: 'Agenda', isPrimary: true },
            {
              label: 'Tingkat Kehadiran',
              value: '96.8%',
              subValue: 'Sah',
              subValueColor: colors.success,
            },
          ]}
        />

        {/* Meeting Section Title with Filter Button */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Daftar Rapat Dinas</Text>
            <Text style={styles.sectionSub}>Wilayah Kerja LLDIKTI Wilayah X</Text>
          </View>
          <Pressable
            onPress={handleFilterPress}
            style={({ pressed }) => [
              styles.filterButton,
              pressed && styles.filterButtonPressed,
            ]}
          >
            <MaterialIcons name="filter-list" size={16} color={colors.primary} />
            <Text style={styles.filterButtonText}>Filter</Text>
          </Pressable>
        </View>

        {/* Filter Pills with Badge Counters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <Pressable
            onPress={() => setFilterTab('ongoing')}
            style={[
              styles.filterPill,
              filterTab === 'ongoing' ? styles.filterPillActive : styles.filterPillInactive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                filterTab === 'ongoing' && styles.filterPillTextActive,
              ]}
            >
              Sedang Berlangsung
            </Text>
            <View
              style={[
                styles.badgeCount,
                filterTab === 'ongoing' ? styles.badgeCountActive : styles.badgeCountInactive,
              ]}
            >
              <Text
                style={[
                  styles.badgeCountText,
                  filterTab === 'ongoing' && styles.badgeCountTextActive,
                ]}
              >
                {ongoingCount}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setFilterTab('upcoming')}
            style={[
              styles.filterPill,
              filterTab === 'upcoming' ? styles.filterPillActive : styles.filterPillInactive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                filterTab === 'upcoming' && styles.filterPillTextActive,
              ]}
            >
              Akan Datang
            </Text>
            <View style={styles.badgeCountGray}>
              <Text style={styles.badgeCountGrayText}>
                {upcomingMeetings.length}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setFilterTab('completed')}
            style={[
              styles.filterPill,
              filterTab === 'completed' ? styles.filterPillActive : styles.filterPillInactive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                filterTab === 'completed' && styles.filterPillTextActive,
              ]}
            >
              Riwayat Selesai
            </Text>
          </Pressable>
        </ScrollView>

        {/* Active Highlight Card when ongoing tab is active */}
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
            .filter((m) => (filterTab === 'ongoing' ? m.id !== activeMeeting?.id : true))
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

        {/* Legal Guarantee Card */}
        <View style={styles.legalBox}>
          <Text style={styles.legalText}>
            Presensi diverifikasi secara terpusat melalui NIP dan geofencing resmi LLDIKTI Wilayah X. Seluruh tanda tangan elektronik sah berdasarkan ketentuan UU ITE.
          </Text>
        </View>
      </ScrollView>
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
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    backgroundColor: colors.surfaceContainerLowest,
  },
  filterButtonPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  filterButtonText: {
    ...typography.labelMd,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  filterScroll: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: rounded.full,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    ...elevations.level1,
  },
  filterPillInactive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
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
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountActive: {
    backgroundColor: colors.secondaryFixedDim,
  },
  badgeCountInactive: {
    backgroundColor: colors.surfaceContainer,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeCountTextActive: {
    color: colors.onSecondaryFixed,
  },
  badgeCountGray: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountGrayText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  legalBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.3)',
  },
  legalText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
