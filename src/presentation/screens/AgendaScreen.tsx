import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { MeetingCard } from '../components/cards/MeetingCard';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { useAuthStore } from '../store/useAuthStore';
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
  const { meetings, fetchMeetings, isLoading, isLoadingMore, error, currentPage, lastPage } = useMeetingStore();
  const user = useAuthStore((state) => state.user);
  const [filter, setFilter] = useState<'semua' | 'hybrid' | 'offline' | 'online'>('semua');

  useEffect(() => {
    fetchMeetings(1, false, filter === 'semua' ? 'all' : filter);
  }, [fetchMeetings, filter]);

  const filtered = meetings.filter((m) => {
    if (filter === 'semua') return true;
    return m.type === filter;
  });

  const canCreate = user?.role === 'administrator' || user?.role === 'admin';

  return (
    <View style={styles.container}>
      <Header />

      {/* Title Section with Create Meeting Button */}
      <View style={styles.titleSection}>
        <View style={styles.titleTextWrap}>
          <Text style={styles.mainTitle}>Agenda Rapat Kedinasan</Text>
          <Text style={styles.mainSubtitle}>
            Jadwal & koordinasi rapat dinas LLDIKTI Wilayah X
          </Text>
        </View>
        {canCreate ? <Pressable
          onPress={onNavigateCreate}
          style={styles.createButton}
          accessibilityRole="button"
          accessibilityLabel="Buat Rapat Baru"
        >
          <MaterialIcons name="add" size={18} color={colors.onPrimary} />
          <Text style={styles.createButtonText}>Buat Rapat</Text>
        </Pressable> : null}
      </View>

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
            onPressPdf={() => onNavigateDetail(item.id)}
            onPressJoinLink={() => onNavigateDetail(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && meetings.length > 0}
            onRefresh={() => fetchMeetings(1, false)}
            colors={[colors.primary]}
          />
        }
        onEndReached={() => { if (currentPage < lastPage) void fetchMeetings(currentPage + 1, true); }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={isLoadingMore ? <ActivityIndicator style={{ padding: spacing.md }} color={colors.primary} /> : null}
        ListEmptyComponent={
          isLoading ? <ActivityIndicator style={{ padding: spacing.xl }} color={colors.primary} /> : error ? <ErrorState message={error} onRetry={() => fetchMeetings(1, false)} /> : <EmptyState
            title="Tidak Ada Jadwal Rapat"
            description="Tidak ada agenda yang sesuai dengan tipe pertemuan yang dipilih."
            actionLabel={canCreate ? 'Buat Agenda Baru' : undefined}
            onAction={canCreate ? onNavigateCreate : undefined}
          />
        }
      />
      {error && meetings.length > 0 ? <ErrorState message={error} onRetry={() => fetchMeetings(1, false)} style={{ marginHorizontal: spacing.md }} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  titleTextWrap: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  mainTitle: {
    ...typography.headlineMd,
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  mainSubtitle: {
    ...typography.labelSm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 8,
    borderRadius: rounded.md,
    gap: 4,
  },
  createButtonText: {
    ...typography.labelSm,
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 12,
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
