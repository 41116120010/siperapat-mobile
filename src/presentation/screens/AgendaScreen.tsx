import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  Linking,
  ListRenderItem,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Search, X } from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { MeetingCard } from '../components/cards/MeetingCard';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { PaginationBar } from '../components/common/PaginationBar';
import { useAuthStore } from '../store/useAuthStore';
import { useMeetingStore } from '../store/useMeetingStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { triggerPageTransition } from '../store/useTransitionStore';
import { Meeting, MeetingStatus } from '../../domain/entities/types';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';

interface AgendaScreenProps {
  onNavigateDetail: (meetingId: string) => void;
  onNavigateCreate: () => void;
}

type StatusFilter = 'all' | MeetingStatus;
type TypeFilter = 'semua' | 'hybrid' | 'offline' | 'online';

const STATUS_TABS: readonly { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'draft', label: 'Draf' },
  { id: 'ongoing', label: 'Berlangsung' },
  { id: 'upcoming', label: 'Terjadwal' },
  { id: 'completed', label: 'Selesai' },
  { id: 'cancelled', label: 'Dibatalkan' },
];

const TYPE_TABS: readonly { id: TypeFilter; label: string }[] = [
  { id: 'semua', label: 'Semua Tipe' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'offline', label: 'Tatap Muka' },
  { id: 'online', label: 'Zoom Daring' },
];

export const AgendaScreen: React.FC<AgendaScreenProps> = ({
  onNavigateDetail,
  onNavigateCreate,
}) => {
  const userRole = useAuthStore((state) => state.user?.role);
  const canCreateAgenda = userRole === 'administrator' || userRole === 'admin';

  const { meetings, fetchMeetings, isLoading, error, currentPage, lastPage, total } =
    useMeetingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('semua');
  const [selectedDocument, setSelectedDocument] = useState<Meeting | null>(null);
  const flatListRef = useRef<FlatList<Meeting>>(null);

  useFocusEffect(
    useCallback(() => {
      void fetchMeetings(1, false, typeFilter === 'semua' ? 'all' : typeFilter);
    }, [fetchMeetings, typeFilter])
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return meetings.filter((m) => {
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchesType = typeFilter === 'semua' || m.type === typeFilter;
      const matchesSearch =
        query.length === 0 ||
        m.title.toLowerCase().includes(query) ||
        m.venue.toLowerCase().includes(query) ||
        m.code.toLowerCase().includes(query) ||
        m.leader.toLowerCase().includes(query);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [meetings, statusFilter, typeFilter, searchQuery]);

  const hasActiveFilter =
    statusFilter !== 'all' || typeFilter !== 'semua' || searchQuery.trim().length > 0;

  const handleRefresh = useCallback(() => {
    void fetchMeetings(1, false, typeFilter === 'semua' ? 'all' : typeFilter);
  }, [fetchMeetings, typeFilter]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > lastPage || page === currentPage || isLoading) return;
      triggerPageTransition(400);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      void fetchMeetings(page, false, typeFilter === 'semua' ? 'all' : typeFilter);
    },
    [lastPage, currentPage, isLoading, fetchMeetings, typeFilter]
  );

  const handleStatusChange = useCallback((nextStatus: StatusFilter) => {
    setStatusFilter(nextStatus);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleTypeChange = useCallback((nextType: TypeFilter) => {
    setTypeFilter(nextType);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('semua');
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

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
        .showToast({ type: 'info', message: 'Tautan rapat belum tersedia.' });
    }
  }, []);

  const keyExtractor = useCallback((item: Meeting) => item.id, []);

  const renderItem = useCallback<ListRenderItem<Meeting>>(
    ({ item }) => (
      <MeetingCard
        meeting={item}
        onPressDetail={() => onNavigateDetail(item.id)}
        onPressPdf={() => handlePdfView(item)}
        onPressJoinLink={() => handleJoinLink(item.zoomUrl)}
      />
    ),
    [onNavigateDetail, handlePdfView, handleJoinLink]
  );

  const listFooter = useMemo(
    () =>
      filtered.length > 0 ? (
        <PaginationBar
          currentPage={currentPage}
          lastPage={lastPage}
          total={total}
          label="Rapat Kedinasan"
          isLoading={isLoading}
          onPageChange={handlePageChange}
        />
      ) : undefined,
    [filtered.length, currentPage, lastPage, total, isLoading, handlePageChange]
  );

  const listEmpty = useMemo(() => {
    if (error) {
      return <ErrorState message={error} onRetry={handleRefresh} />;
    }
    if (hasActiveFilter) {
      return (
        <EmptyState
          icon="search"
          title="Tidak Ada Jadwal Rapat"
          description="Tidak ada agenda yang sesuai dengan kata kunci atau filter yang dipilih."
          actionLabel="Reset Filter"
          onAction={handleResetFilters}
        />
      );
    }
    return (
      <EmptyState
        icon="calendar"
        title="Belum Ada Agenda Rapat"
        description="Belum ada jadwal pertemuan kedinasan yang tercatat saat ini."
        actionLabel={canCreateAgenda ? 'Buat Agenda Baru' : undefined}
        onAction={canCreateAgenda ? onNavigateCreate : undefined}
      />
    );
  }, [error, handleRefresh, hasActiveFilter, handleResetFilters, canCreateAgenda, onNavigateCreate]);

  return (
    <View style={styles.container}>
      <Header />

      {/* Title Section with Role-Guarded Create Meeting Button */}
      <View style={styles.titleSection}>
        <View style={styles.titleTextWrap}>
          <Text style={styles.mainTitle}>Agenda Rapat Kedinasan</Text>
          <Text style={styles.mainSubtitle}>
            Jadwal & koordinasi rapat dinas LLDIKTI Wilayah X
          </Text>
        </View>
        {canCreateAgenda ? (
          <Pressable
            onPress={onNavigateCreate}
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.createButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Buat Rapat Baru"
          >
            <Plus size={16} strokeWidth={2} color={colors.onPrimary} />
            <Text style={styles.createButtonText}>Buat Rapat</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={17} strokeWidth={2} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari judul atau lokasi rapat..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Cari judul atau lokasi rapat"
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              style={styles.searchClearButton}
              accessibilityRole="button"
              accessibilityLabel="Bersihkan pencarian"
            >
              <X size={16} strokeWidth={2} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 6 Status Filter Tabs (Aligned with Web agendas/index) */}
      <View style={styles.filterGroup}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalFilterContent}
        >
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => handleStatusChange(tab.id)}
                style={({ pressed }) => [
                  styles.filterTab,
                  isActive && styles.filterTabActive,
                  pressed && styles.filterTabPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Compact Tipe Rapat Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeFilterContent}
        >
          {TYPE_TABS.map((tab) => {
            const isActive = typeFilter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => handleTypeChange(tab.id)}
                style={({ pressed }) => [
                  styles.typeChip,
                  isActive && styles.typeChipActive,
                  pressed && styles.filterTabPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    isActive && styles.typeChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && meetings.length > 0}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
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
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  titleTextWrap: {
    flex: 1,
  },
  mainTitle: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 20,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  mainSubtitle: {
    ...typography.labelSm,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.lg,
    gap: 6,
  },
  createButtonPressed: {
    opacity: 0.88,
  },
  createButtonText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
    fontSize: 12,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.lg,
    minHeight: MIN_TOUCH_TARGET,
    paddingLeft: 12,
    paddingRight: 4,
    gap: 8,
  },
  searchInput: {
    ...typography.bodyMd,
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    color: colors.onSurface,
    paddingVertical: 8,
  },
  searchClearButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterGroup: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    gap: spacing.xs + 2,
  },
  horizontalFilterContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs + 2,
  },
  filterTab: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabPressed: {
    opacity: 0.85,
  },
  filterTabText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  filterTabTextActive: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.sansBold,
  },
  typeFilterContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs + 2,
  },
  typeChip: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  typeChipActive: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.primary,
  },
  typeChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
  },
  typeChipTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
});
