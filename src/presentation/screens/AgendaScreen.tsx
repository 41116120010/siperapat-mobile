import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { MeetingCard } from '../components/cards/MeetingCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMeetingStore } from '../store/useMeetingStore';
import { Meeting } from '../../domain/entities/types';

interface AgendaScreenProps {
  onNavigateDetail: (meetingId: string) => void;
  onNavigateCreate: () => void;
}

export const AgendaScreen: React.FC<AgendaScreenProps> = ({
  onNavigateDetail,
  onNavigateCreate,
}) => {
  const { meetings, fetchMeetings, isLoading } = useMeetingStore();
  const [filter, setFilter] = useState<'semua' | 'hybrid' | 'offline' | 'online'>('semua');

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const filtered = meetings.filter((m) => {
    if (filter === 'semua') return true;
    return m.type === filter;
  });

  const handlePdfView = (title: string) => {
    Alert.alert(
      'Unduh Berkas Undangan',
      `Surat Undangan Dinas Resmi untuk "${title}" (Nomor: 0142/LL10/KP/2026.pdf) dibuka.`
    );
  };

  const handleJoinLink = (url?: string) => {
    Alert.alert(
      'Akses Zoom Kedinasan',
      `Menghubungkan ke Ruang Sidang Virtual LLDIKTI X: ${url || 'Meeting ID: 982 348 1239'}`
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Agenda Rapat Kedinasan"
        subtitle="Jadwal & Koordinasi LLDIKTI X"
        rightAction={
          <Pressable
            onPress={onNavigateCreate}
            style={styles.createIconButton}
            accessibilityLabel="Buat Rapat Baru"
          >
            <MaterialIcons name="add" size={22} color={colors.primary} />
          </Pressable>
        }
      />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['semua', 'hybrid', 'offline', 'online'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setFilter(tab)}
            style={[
              styles.filterTab,
              filter === tab && styles.filterTabActive,
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === tab && styles.filterTabTextActive,
              ]}
            >
              {tab === 'semua'
                ? 'Semua Tipe'
                : tab === 'hybrid'
                ? 'Hybrid'
                : tab === 'offline'
                ? 'Tatap Muka'
                : 'Zoom Daring'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Meeting }) => (
          <MeetingCard
            meeting={item}
            onPressDetail={() => onNavigateDetail(item.id)}
            onPressPdf={() => handlePdfView(item.title)}
            onPressJoinLink={() => handleJoinLink(item.zoomUrl)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && meetings.length > 0}
            onRefresh={fetchMeetings}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="Tidak Ada Jadwal Rapat"
            description="Tidak ada agenda yang sesuai dengan tipe pertemuan yang dipilih."
            actionLabel="Buat Agenda Baru"
            onAction={onNavigateCreate}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  createIconButton: {
    width: 36,
    height: 36,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  filterTab: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
});
