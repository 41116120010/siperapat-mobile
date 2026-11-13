import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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
import {
  Building,
  CheckCircle2,
  ChevronDown,
  FileText,
  Layers,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { MeetingCard } from '../components/cards/MeetingCard';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { PaginationBar } from '../components/common/PaginationBar';
import { useAuthStore } from '../store/useAuthStore';
import {
  AgendaStatusFilter,
  AgendaUnitFilter,
  useMeetingStore,
} from '../store/useMeetingStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { triggerPageTransition } from '../store/useTransitionStore';
import { agendaApi } from '../../data/datasources/agendaApi';
import { ApiAgendaStatusCounts } from '../../data/datasources/apiTypes';
import { Meeting } from '../../domain/entities/types';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';

interface AgendaScreenProps {
  onNavigateDetail: (meetingId: string) => void;
  onNavigateCreate: () => void;
}

type TypeFilter = 'semua' | 'hybrid' | 'offline' | 'online';

const STATUS_TABS: readonly {
  id: AgendaStatusFilter;
  label: string;
  countKey: keyof ApiAgendaStatusCounts;
}[] = [
  { id: 'all', label: 'Semua', countKey: 'all' },
  { id: 'draft', label: 'Draf / Konsep', countKey: 'draft' },
  { id: 'ongoing', label: 'Sedang Berlangsung', countKey: 'ongoing' },
  { id: 'scheduled', label: 'Terjadwal', countKey: 'scheduled' },
  { id: 'completed', label: 'Selesai', countKey: 'completed' },
  { id: 'cancelled', label: 'Dibatalkan', countKey: 'cancelled' },
];

const TYPE_TABS: readonly { id: TypeFilter; label: string; subtitle: string }[] = [
  {
    id: 'semua',
    label: 'Semua Format Pelaksanaan',
    subtitle: 'Tampilkan rapat luring, daring, dan hybrid',
  },
  {
    id: 'offline',
    label: 'Tatap Muka (Luring)',
    subtitle: 'Pertemuan fisik di ruang rapat LLDIKTI',
  },
  {
    id: 'online',
    label: 'Daring (Virtual)',
    subtitle: 'Rapat virtual melalui tautan konferensi',
  },
  {
    id: 'hybrid',
    label: 'Hibrida',
    subtitle: 'Gabungan peserta luring dan daring',
  },
];

export const AgendaScreen: React.FC<AgendaScreenProps> = ({
  onNavigateDetail,
  onNavigateCreate,
}) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const canCreateAgenda = userRole === 'administrator' || userRole === 'admin';
  const isAdministrator = userRole === 'administrator';

  const {
    meetings,
    fetchMeetings,
    deleteMeeting,
    isLoading,
    error,
    currentPage,
    lastPage,
    total,
    statusCounts,
    agendaMetaById,
    formOptions,
    fetchAgendaFormOptions,
  } = useMeetingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgendaStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('semua');
  const [unitFilter, setUnitFilter] = useState<AgendaUnitFilter>('all');
  const [isFormatModalVisible, setIsFormatModalVisible] = useState(false);
  const [isUnitModalVisible, setIsUnitModalVisible] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Meeting | null>(null);
  const flatListRef = useRef<FlatList<Meeting>>(null);
  const committedSearchRef = useRef('');

  const toApiType = useCallback(
    (type: TypeFilter): 'all' | 'hybrid' | 'offline' | 'online' =>
      type === 'semua' ? 'all' : type,
    []
  );

  useFocusEffect(
    useCallback(() => {
      if (isAdministrator && !formOptions) {
        void fetchAgendaFormOptions();
      }
      void fetchMeetings(1, false, toApiType(typeFilter), {
        status: statusFilter,
        search: searchQuery,
        unitId: isAdministrator ? unitFilter : 'all',
      });
    }, [
      isAdministrator,
      formOptions,
      fetchAgendaFormOptions,
      fetchMeetings,
      toApiType,
      typeFilter,
      statusFilter,
      unitFilter,
      searchQuery,
    ])
  );

  useEffect(() => {
    if (searchQuery === committedSearchRef.current) return;
    const timer = setTimeout(() => {
      committedSearchRef.current = searchQuery;
      void fetchMeetings(1, false, toApiType(typeFilter), {
        status: statusFilter,
        search: searchQuery,
        unitId: isAdministrator ? unitFilter : 'all',
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchMeetings, toApiType, typeFilter, statusFilter, isAdministrator, unitFilter]);

  const hasActiveFilter =
    statusFilter !== 'all' ||
    typeFilter !== 'semua' ||
    searchQuery.trim().length > 0 ||
    (isAdministrator && unitFilter !== 'all');

  const handleRefresh = useCallback(() => {
    void fetchMeetings(1, false, toApiType(typeFilter), {
      status: statusFilter,
      search: searchQuery,
      unitId: isAdministrator ? unitFilter : 'all',
    });
  }, [fetchMeetings, toApiType, typeFilter, statusFilter, searchQuery, isAdministrator, unitFilter]);

  const handleSearchSubmit = useCallback(() => {
    committedSearchRef.current = searchQuery;
    void fetchMeetings(1, false, toApiType(typeFilter), {
      status: statusFilter,
      search: searchQuery,
      unitId: isAdministrator ? unitFilter : 'all',
    });
  }, [searchQuery, fetchMeetings, toApiType, typeFilter, statusFilter, isAdministrator, unitFilter]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    committedSearchRef.current = '';
    void fetchMeetings(1, false, toApiType(typeFilter), {
      status: statusFilter,
      search: '',
      unitId: isAdministrator ? unitFilter : 'all',
    });
  }, [fetchMeetings, toApiType, typeFilter, statusFilter, isAdministrator, unitFilter]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > lastPage || page === currentPage || isLoading) return;
      triggerPageTransition(400);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      void fetchMeetings(page, false, toApiType(typeFilter), {
        status: statusFilter,
        search: searchQuery,
        unitId: isAdministrator ? unitFilter : 'all',
      });
    },
    [
      lastPage,
      currentPage,
      isLoading,
      fetchMeetings,
      toApiType,
      typeFilter,
      statusFilter,
      searchQuery,
      isAdministrator,
      unitFilter,
    ]
  );

  const handleStatusChange = useCallback(
    (nextStatus: AgendaStatusFilter) => {
      setStatusFilter(nextStatus);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      void fetchMeetings(1, false, toApiType(typeFilter), {
        status: nextStatus,
        search: searchQuery,
        unitId: isAdministrator ? unitFilter : 'all',
      });
    },
    [fetchMeetings, toApiType, typeFilter, searchQuery, isAdministrator, unitFilter]
  );

  const handleTypeChange = useCallback(
    (nextType: TypeFilter) => {
      setTypeFilter(nextType);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      void fetchMeetings(1, false, toApiType(nextType), {
        status: statusFilter,
        search: searchQuery,
        unitId: isAdministrator ? unitFilter : 'all',
      });
    },
    [fetchMeetings, toApiType, statusFilter, searchQuery, isAdministrator, unitFilter]
  );

  const handleUnitChange = useCallback(
    (nextUnit: AgendaUnitFilter) => {
      setUnitFilter(nextUnit);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      void fetchMeetings(1, false, toApiType(typeFilter), {
        status: statusFilter,
        search: searchQuery,
        unitId: nextUnit,
      });
    },
    [fetchMeetings, toApiType, typeFilter, statusFilter, searchQuery]
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    committedSearchRef.current = '';
    setStatusFilter('all');
    setTypeFilter('semua');
    setUnitFilter('all');
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    void fetchMeetings(1, false, 'all', {
      status: 'all',
      search: '',
      unitId: 'all',
    });
  }, [fetchMeetings]);

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

  const formatOptions: AgendaOption[] = useMemo(
    () =>
      TYPE_TABS.map((tab) => ({
        id: tab.id,
        title: tab.label,
        subtitle: tab.subtitle,
        icon: Layers,
      })),
    []
  );

  const selectedFormatLabel = useMemo(() => {
    const matched = TYPE_TABS.find((t) => t.id === typeFilter);
    return matched ? matched.label : 'Semua Format Pelaksanaan';
  }, [typeFilter]);

  const unitOptions: AgendaOption[] = useMemo(() => {
    const base: AgendaOption[] = [
      {
        id: 'all',
        title: 'Semua Sasaran Unit Kerja',
        subtitle: 'Tampilkan seluruh agenda rapat kedinasan',
        icon: Building,
      },
      {
        id: 'all_units',
        title: 'Seluruh Unit (Pleno / Universal)',
        subtitle: 'Agenda rapat terbuka untuk seluruh unit kerja',
        icon: Building,
      },
    ];
    const units = (formOptions?.units ?? []).map((unit) => ({
      id: String(unit.id),
      title: `${unit.kode_unit} — ${unit.nama_unit}`,
      subtitle: 'Unit Kerja Sasaran Rapat',
      badge: unit.kode_unit,
      icon: Building,
    }));
    return [...base, ...units];
  }, [formOptions?.units]);

  const selectedUnitLabel = useMemo(() => {
    if (unitFilter === 'all') return 'Semua Sasaran Unit Kerja';
    if (unitFilter === 'all_units') return 'Seluruh Unit (Pleno / Universal)';
    const matched = formOptions?.units.find((u) => u.id === unitFilter);
    return matched ? `${matched.kode_unit} — ${matched.nama_unit}` : 'Unit Kerja Terpilih';
  }, [unitFilter, formOptions?.units]);

  const handleStatusTransition = useCallback(
    (meeting: Meeting, nextStatus: 'ongoing' | 'completed') => {
      const isStarting = nextStatus === 'ongoing';
      useFeedbackStore.getState().showModal({
        type: 'confirm',
        title: isStarting ? 'Mulai Rapat & Buka Presensi?' : 'Selesaikan Rapat?',
        message: isStarting
          ? `Mulai rapat "${meeting.title}" sekarang? Peserta akan dapat melakukan presensi masuk.`
          : `Selesaikan rapat "${meeting.title}" sekarang? Presensi akan ditutup secara otomatis.`,
        confirmText: isStarting ? 'Mulai Rapat' : 'Selesaikan',
        cancelText: 'Batal',
        onConfirm: async () => {
          setActionLoadingId(meeting.id);
          try {
            const response = await agendaApi.updateStatus(meeting.id, nextStatus);
            if (response.success) {
              useFeedbackStore.getState().showToast({
                type: 'success',
                message:
                  response.message ||
                  (isStarting ? 'Rapat berhasil dimulai.' : 'Rapat berhasil diselesaikan.'),
              });
              await fetchMeetings(currentPage, false, toApiType(typeFilter), {
                status: statusFilter,
                search: searchQuery,
                unitId: isAdministrator ? unitFilter : 'all',
              });
            } else {
              useFeedbackStore.getState().showToast({
                type: 'error',
                message: response.message || 'Gagal memperbarui status rapat.',
              });
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Gagal memperbarui status rapat.';
            useFeedbackStore.getState().showToast({ type: 'error', message: msg });
          } finally {
            setActionLoadingId(null);
          }
        },
      });
    },
    [
      currentPage,
      fetchMeetings,
      isAdministrator,
      searchQuery,
      statusFilter,
      toApiType,
      typeFilter,
      unitFilter,
    ]
  );

  const handleDeleteAgenda = useCallback(
    (meeting: Meeting) => {
      useFeedbackStore.getState().showModal({
        type: 'confirm',
        confirmVariant: 'destructive',
        title: 'Hapus Agenda Rapat?',
        message: `Agenda "${meeting.title}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
        confirmText: 'Hapus',
        cancelText: 'Batal',
        onConfirm: async () => {
          setActionLoadingId(meeting.id);
          try {
            const result = await deleteMeeting(meeting.id);
            if (result.success) {
              useFeedbackStore.getState().showToast({
                type: 'success',
                message: result.message || 'Agenda rapat berhasil dihapus.',
              });
              await fetchMeetings(1, false, toApiType(typeFilter), {
                status: statusFilter,
                search: searchQuery,
                unitId: isAdministrator ? unitFilter : 'all',
              });
            } else {
              useFeedbackStore.getState().showToast({
                type: 'error',
                message: result.message || 'Gagal menghapus agenda rapat.',
              });
            }
          } finally {
            setActionLoadingId(null);
          }
        },
      });
    },
    [
      deleteMeeting,
      fetchMeetings,
      isAdministrator,
      searchQuery,
      statusFilter,
      toApiType,
      typeFilter,
      unitFilter,
    ]
  );

  const keyExtractor = useCallback((item: Meeting) => item.id, []);

  const renderItem = useCallback<ListRenderItem<Meeting>>(
    ({ item }) => {
      const meta = agendaMetaById[item.id];
      const organizerLabel = meta?.creator
        ? (meta.creator.unit?.kode_unit ??
          (meta.creator.role?.value === 'administrator' ? 'Pusat' : 'Penyelenggara'))
        : undefined;
      let roleBadge: string | undefined;
      if (userRole === 'admin') {
        const currentUserId = user?.id ? Number(user.id) : null;
        if (user?.unitId && item.creatorUnitId === user.unitId) {
          roleBadge = 'Penyelenggara';
        } else if (currentUserId && item.leaderId === currentUserId) {
          roleBadge = 'Pimpinan Rapat';
        } else if (currentUserId && item.notulisId === currentUserId) {
          roleBadge = 'Notulis Rapat';
        } else {
          roleBadge = 'Unit Partisipan';
        }
      }

      const rawStatus = meta?.status?.value ?? item.status;
      const attendanceTotal = meta?.attendances_count ?? item.totalAttended ?? 0;
      const canManageMinutes = meta?.permissions?.can_manage_minutes ?? canCreateAgenda;
      const canManageStatus = meta?.permissions?.can_manage_status ?? canCreateAgenda;
      const canDelete = (meta?.permissions?.can_delete ?? isAdministrator) && attendanceTotal === 0;
      const isBusy = actionLoadingId === item.id;

      const footerRight =
        canManageMinutes || canManageStatus || canDelete ? (
          <View style={styles.cardActionsRow}>
            {canManageMinutes ? (
              <Pressable
                onPress={() => onNavigateDetail(item.id)}
                style={({ pressed }) => [
                  styles.cardActionMinutesBtn,
                  pressed && styles.filterTabPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Kelola notulensi ${item.title}`}
              >
                <FileText size={14} strokeWidth={2} color={colors.infoText} />
                <Text style={styles.cardActionMinutesText}>Notulensi</Text>
              </Pressable>
            ) : null}

            {rawStatus === 'scheduled' && canManageStatus ? (
              <Pressable
                disabled={isBusy}
                onPress={() => {
                  if (meta?.can_start_now) {
                    handleStatusTransition(item, 'ongoing');
                  } else {
                    useFeedbackStore.getState().showToast({
                      type: 'info',
                      message: meta?.earliest_start_at
                        ? `Rapat baru dapat dimulai pada ${meta.earliest_start_at}.`
                        : 'Rapat dapat dimulai paling cepat 15 menit sebelum jadwal.',
                    });
                  }
                }}
                style={({ pressed }) => [
                  meta?.can_start_now
                    ? styles.cardActionStartBtn
                    : styles.cardActionStartLockedBtn,
                  pressed && styles.filterTabPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Mulai rapat ${item.title}`}
              >
                <Play
                  size={14}
                  strokeWidth={2}
                  color={meta?.can_start_now ? colors.onPrimary : colors.textMuted}
                />
                <Text
                  style={
                    meta?.can_start_now
                      ? styles.cardActionSolidText
                      : styles.cardActionLockedText
                  }
                >
                  Mulai
                </Text>
              </Pressable>
            ) : null}

            {rawStatus === 'ongoing' && canManageStatus ? (
              <Pressable
                disabled={isBusy}
                onPress={() => handleStatusTransition(item, 'completed')}
                style={({ pressed }) => [
                  styles.cardActionFinishBtn,
                  pressed && styles.filterTabPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Selesaikan rapat ${item.title}`}
              >
                <CheckCircle2 size={14} strokeWidth={2} color={colors.onPrimary} />
                <Text style={styles.cardActionSolidText}>Selesai</Text>
              </Pressable>
            ) : null}

            {canDelete ? (
              <Pressable
                disabled={isBusy}
                onPress={() => handleDeleteAgenda(item)}
                style={({ pressed }) => [
                  styles.cardActionDeleteBtn,
                  pressed && styles.filterTabPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Hapus agenda ${item.title}`}
              >
                <Trash2 size={15} strokeWidth={2} color={colors.onErrorContainer} />
              </Pressable>
            ) : null}
          </View>
        ) : undefined;

      return (
        <MeetingCard
          meeting={item}
          onPressDetail={() => onNavigateDetail(item.id)}
          onPressPdf={() => handlePdfView(item)}
          onPressJoinLink={() => handleJoinLink(item.zoomUrl)}
          statusLabel={meta?.status?.label}
          isOverdue={Boolean(meta?.is_overdue)}
          attendancesCount={attendanceTotal}
          targetLabel={meta?.target_label}
          organizerLabel={organizerLabel}
          roleBadge={roleBadge}
          footerRight={footerRight}
        />
      );
    },
    [
      actionLoadingId,
      agendaMetaById,
      canCreateAgenda,
      handleDeleteAgenda,
      handleJoinLink,
      handlePdfView,
      handleStatusTransition,
      isAdministrator,
      onNavigateDetail,
      user?.id,
      user?.unitId,
      userRole,
    ]
  );

  const listFooter = useMemo(
    () =>
      meetings.length > 0 ? (
        <PaginationBar
          currentPage={currentPage}
          lastPage={lastPage}
          total={total}
          label="Rapat Kedinasan"
          isLoading={isLoading}
          onPageChange={handlePageChange}
        />
      ) : undefined,
    [meetings.length, currentPage, lastPage, total, isLoading, handlePageChange]
  );

  const listEmpty = useMemo(() => {
    if (error) {
      return <ErrorState message={error} onRetry={handleRefresh} />;
    }
    if (hasActiveFilter) {
      return (
        <EmptyState
          icon="search"
          title="Tidak Ada Agenda Rapat"
          description="Belum ada agenda rapat yang sesuai dengan filter yang dipilih."
          actionLabel="Reset Filter"
          onAction={handleResetFilters}
        />
      );
    }
    return (
      <EmptyState
        icon="calendar"
        title="Tidak Ada Agenda Rapat"
        description="Belum ada agenda rapat yang sesuai dengan filter yang dipilih."
        actionLabel={canCreateAgenda ? 'Buat Agenda Rapat' : undefined}
        onAction={canCreateAgenda ? onNavigateCreate : undefined}
      />
    );
  }, [error, handleRefresh, hasActiveFilter, handleResetFilters, canCreateAgenda, onNavigateCreate]);

  const listHeader = (
    <View style={styles.listHeader}>
      {/* Title Section with Role-Guarded Create Meeting Button */}
      <View style={styles.titleSection}>
        <View style={styles.titleTextWrap}>
          <Text style={styles.mainTitle}>Daftar Agenda Rapat</Text>
          <Text style={styles.mainSubtitle}>
            Pengelolaan jadwal, informasi pelaksanaan, dan absensi rapat kedinasan.
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
            accessibilityLabel="Buat Agenda Rapat"
          >
            <Plus size={16} strokeWidth={2} color={colors.onPrimary} />
            <Text style={styles.createButtonText}>Buat Agenda Rapat</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Status Filter Tabs (1:1 Web agendas/index.blade.php) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statusTabsScroll}
        contentContainerStyle={styles.horizontalFilterContent}
      >
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          const count = statusCounts ? statusCounts[tab.countKey] : undefined;
          const tabText = count !== undefined ? `${tab.label} (${count})` : tab.label;
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
                {tabText}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Unified White Bordered Filter Bar (1 Horizontal Row: Search + Format + Unit + Cari + Reset) */}
      <View style={styles.filterCard}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.filterBarScrollContent}
        >
          <View style={styles.searchBox}>
            <Search size={16} strokeWidth={2} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              placeholder="Cari judul rapat atau ruangan..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Cari judul rapat atau ruangan"
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={handleClearSearch}
                style={styles.searchClearButton}
                accessibilityRole="button"
                accessibilityLabel="Bersihkan pencarian"
              >
                <X size={15} strokeWidth={2} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setIsFormatModalVisible(true)}
            style={({ pressed }) => [
              styles.filterSelectTrigger,
              pressed && styles.filterTabPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Filter format pelaksanaan"
          >
            <Text style={styles.filterSelectText} numberOfLines={1}>
              {selectedFormatLabel}
            </Text>
            <ChevronDown size={15} strokeWidth={2} color={colors.textMuted} />
          </Pressable>

          {isAdministrator ? (
            <Pressable
              onPress={() => setIsUnitModalVisible(true)}
              style={({ pressed }) => [
                styles.filterSelectTrigger,
                styles.unitFilterSelectTrigger,
                pressed && styles.filterTabPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filter sasaran unit kerja"
            >
              <Text style={styles.filterSelectText} numberOfLines={1}>
                {selectedUnitLabel}
              </Text>
              <ChevronDown size={15} strokeWidth={2} color={colors.textMuted} />
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleSearchSubmit}
            style={({ pressed }) => [
              styles.searchSubmitBtn,
              pressed && styles.filterTabPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Cari agenda rapat"
          >
            <Text style={styles.searchSubmitText}>Cari</Text>
          </Pressable>

          {hasActiveFilter ? (
            <Pressable
              onPress={handleResetFilters}
              style={({ pressed }) => [
                styles.resetFilterBtn,
                pressed && styles.filterTabPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Reset filter"
            >
              <Text style={styles.resetFilterText}>Reset</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header />

      <FlatList
        ref={flatListRef}
        data={meetings}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
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
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
      />

      <AgendaOptionModal
        visible={isFormatModalVisible}
        onClose={() => setIsFormatModalVisible(false)}
        title="Format Pelaksanaan"
        subtitle="Filter agenda rapat berdasarkan metode pelaksanaan"
        options={formatOptions}
        selectedId={typeFilter}
        onSelect={(option) => {
          setIsFormatModalVisible(false);
          handleTypeChange(option.id as TypeFilter);
        }}
      />

      <AgendaOptionModal
        visible={isUnitModalVisible}
        onClose={() => setIsUnitModalVisible(false)}
        title="Filter Sasaran Unit Kerja"
        subtitle="Tampilkan agenda berdasarkan sasaran unit kerja LLDIKTI X"
        options={unitOptions}
        selectedId={String(unitFilter)}
        searchable
        searchPlaceholder="Cari kode atau nama unit kerja..."
        consistentHeight
        onSelect={(option) => {
          setIsUnitModalVisible(false);
          if (option.id === 'all' || option.id === 'all_units') {
            handleUnitChange(option.id);
          } else {
            const parsed = Number(option.id);
            if (Number.isFinite(parsed)) {
              handleUnitChange(parsed);
            }
          }
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
  listHeader: {
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  statusTabsScroll: {
    marginHorizontal: -spacing.md,
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
  filterCard: {
    ...cardSurface,
    borderRadius: rounded.xl,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 4,
  },
  filterBarScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  searchBox: {
    width: 224,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.lg,
    minHeight: MIN_TOUCH_TARGET,
    paddingLeft: 10,
    paddingRight: 2,
    gap: 6,
  },
  searchInput: {
    ...typography.bodyMd,
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    fontSize: 12,
    color: colors.onSurface,
    paddingVertical: 8,
  },
  searchClearButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSelectTrigger: {
    width: 196,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: 12,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  unitFilterSelectTrigger: {
    width: 210,
  },
  filterSelectText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.onSurface,
    flex: 1,
  },
  searchSubmitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 16,
    borderRadius: rounded.lg,
  },
  searchSubmitText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    fontSize: 12,
  },
  resetFilterBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 10,
  },
  resetFilterText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.textSecondary,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
  },
  cardActionMinutesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 10,
    borderRadius: rounded.md,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  cardActionMinutesText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.infoText,
  },
  cardActionStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 10,
    borderRadius: rounded.md,
    backgroundColor: colors.warningLight,
  },
  cardActionStartLockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 10,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cardActionFinishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 10,
    borderRadius: rounded.md,
    backgroundColor: colors.successLight,
  },
  cardActionSolidText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },
  cardActionLockedText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  cardActionDeleteBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded.md,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
});
