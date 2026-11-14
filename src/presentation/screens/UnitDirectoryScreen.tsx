import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { ApiUnitRecord } from '../../data/datasources/userApi';
import { formatTanggalNumerik } from '../../core/utils/dateFormatter';
import { Header } from '../components/common/Header';
import { AutoScrollText } from '../components/common/AutoScrollText';
import { ErrorState } from '../components/common/ErrorState';
import { PaginationBar } from '../components/common/PaginationBar';
import { TutWuriLoader } from '../components/common/TutWuriLoader';
import {
  TutWuriRefreshBanner,
  useTutWuriRefreshControl,
} from '../components/common/TutWuriRefresh';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { useEmployeeStore } from '../store/useEmployeeStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { triggerPageTransition } from '../store/useTransitionStore';

export interface UnitDirectoryScreenProps {
  onNavigateAddUnit: () => void;
  onNavigateEditUnit: (unitId: number) => void;
  onBack?: () => void;
}

type UnitStatusFilter = 'all' | 'active' | 'inactive';

const STATUS_OPTIONS: AgendaOption[] = [
  {
    id: 'all',
    title: 'Semua Status',
    subtitle: 'Tampilkan unit aktif maupun non-aktif',
    icon: Layers,
  },
  {
    id: 'active',
    title: 'Aktif Saja',
    subtitle: 'Hanya unit kerja yang beroperasi aktif',
    icon: CheckCircle2,
  },
  {
    id: 'inactive',
    title: 'Non-Aktif',
    subtitle: 'Hanya unit kerja yang dinonaktifkan',
    icon: Layers,
  },
];

function formatCreatedShort(iso?: string | null): string {
  if (!iso) return '-';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return formatTanggalNumerik(iso);
}

export const UnitDirectoryScreen: React.FC<UnitDirectoryScreenProps> = ({
  onNavigateAddUnit,
  onNavigateEditUnit,
  onBack,
}) => {
  const navigation = useNavigation();
  const {
    units,
    unitsCurrentPage,
    unitsLastPage,
    unitsTotal,
    unitsLoading,
    unitsError,
    isLoading,
    fetchUnits,
    toggleUnitStatus,
    deleteUnit,
  } = useEmployeeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>('all');
  const [isStatusModalVisible, setIsStatusModalVisible] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollViewInstance>(null);
  const committedSearchRef = useRef('');

  const toApiStatus = useCallback(
    (status: UnitStatusFilter): string | undefined =>
      status === 'all' ? undefined : status,
    []
  );

  useFocusEffect(
    useCallback(() => {
      const current = useEmployeeStore.getState().unitsCurrentPage;
      void fetchUnits(current > 0 ? current : 1, false, {
        search: committedSearchRef.current || undefined,
        status: toApiStatus(statusFilter),
      });
    }, [fetchUnits, statusFilter, toApiStatus])
  );

  useEffect(() => {
    if (searchQuery === committedSearchRef.current) return;
    const timer = setTimeout(() => {
      committedSearchRef.current = searchQuery;
      void fetchUnits(1, false, {
        search: searchQuery.trim() || undefined,
        status: toApiStatus(statusFilter),
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchUnits, searchQuery, statusFilter, toApiStatus]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, onBack]);

  const hasActiveFilter = searchQuery.trim().length > 0 || statusFilter !== 'all';

  const selectedStatusLabel = useMemo(() => {
    const matched = STATUS_OPTIONS.find((item) => item.id === statusFilter);
    return matched ? matched.title : 'Semua Status';
  }, [statusFilter]);

  const handleRefresh = useCallback(() => {
    void fetchUnits(1, false, {
      search: searchQuery.trim() || undefined,
      status: toApiStatus(statusFilter),
    });
  }, [fetchUnits, searchQuery, statusFilter, toApiStatus]);

  const handleSearchSubmit = useCallback(() => {
    committedSearchRef.current = searchQuery;
    void fetchUnits(1, false, {
      search: searchQuery.trim() || undefined,
      status: toApiStatus(statusFilter),
    });
  }, [fetchUnits, searchQuery, statusFilter, toApiStatus]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    committedSearchRef.current = '';
    void fetchUnits(1, false, {
      search: undefined,
      status: toApiStatus(statusFilter),
    });
  }, [fetchUnits, statusFilter, toApiStatus]);

  const handleStatusChange = useCallback(
    (nextStatus: UnitStatusFilter) => {
      setStatusFilter(nextStatus);
      void fetchUnits(1, false, {
        search: searchQuery.trim() || undefined,
        status: toApiStatus(nextStatus),
      });
    },
    [fetchUnits, searchQuery, toApiStatus]
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    committedSearchRef.current = '';
    setStatusFilter('all');
    void fetchUnits(1, false, {});
  }, [fetchUnits]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 1 || page > unitsLastPage || page === unitsCurrentPage || unitsLoading) {
        return;
      }
      triggerPageTransition(350);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      void fetchUnits(page, false, {
        search: searchQuery.trim() || undefined,
        status: toApiStatus(statusFilter),
      });
    },
    [
      fetchUnits,
      searchQuery,
      statusFilter,
      toApiStatus,
      unitsCurrentPage,
      unitsLastPage,
      unitsLoading,
    ]
  );

  const handleToggleStatus = useCallback(
    (unit: ApiUnitRecord) => {
      const currentlyActive = Boolean(unit.is_active);
      useFeedbackStore.getState().showModal({
        type: 'confirm',
        confirmVariant: currentlyActive ? 'destructive' : 'primary',
        title: currentlyActive ? 'Nonaktifkan Unit Kerja' : 'Aktifkan Unit Kerja',
        message: `Apakah Anda yakin ingin ${currentlyActive ? 'menonaktifkan' : 'mengaktifkan kembali'} unit kerja '${unit.nama_unit}'?`,
        confirmText: 'Ya, Lanjutkan',
        cancelText: 'Batal',
        onConfirm: async () => {
          setActionLoadingId(unit.id);
          try {
            const updated = await toggleUnitStatus(unit.id);
            if (updated) {
              useFeedbackStore.getState().showToast({
                type: 'success',
                message: `Unit kerja ${updated.kode_unit} berhasil ${updated.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`,
              });
              await fetchUnits(unitsCurrentPage || 1, false, {
                search: searchQuery.trim() || undefined,
                status: toApiStatus(statusFilter),
              });
            } else {
              useFeedbackStore.getState().showToast({
                type: 'error',
                message: 'Gagal mengubah status unit kerja.',
              });
            }
          } finally {
            setActionLoadingId(null);
          }
        },
      });
    },
    [fetchUnits, searchQuery, statusFilter, toApiStatus, toggleUnitStatus, unitsCurrentPage]
  );

  const handleDeleteUnit = useCallback(
    (unit: ApiUnitRecord) => {
      useFeedbackStore.getState().showModal({
        type: 'confirm',
        confirmVariant: 'destructive',
        title: 'Hapus Unit Kerja',
        message: `Apakah Anda yakin ingin menghapus unit kerja '${unit.nama_unit}' secara permanen?`,
        confirmText: 'Ya, Hapus Unit',
        cancelText: 'Batal',
        onConfirm: async () => {
          setActionLoadingId(unit.id);
          try {
            const ok = await deleteUnit(unit.id);
            if (ok) {
              useFeedbackStore.getState().showToast({
                type: 'success',
                message: `Unit kerja ${unit.kode_unit} berhasil dihapus.`,
              });
              await fetchUnits(1, false, {
                search: searchQuery.trim() || undefined,
                status: toApiStatus(statusFilter),
              });
            } else {
              useFeedbackStore.getState().showToast({
                type: 'error',
                message: 'Unit kerja gagal dihapus atau masih memiliki relasi data.',
              });
            }
          } finally {
            setActionLoadingId(null);
          }
        },
      });
    },
    [deleteUnit, fetchUnits, searchQuery, statusFilter, toApiStatus]
  );

  const startRowNumber = Math.max(0, (Math.max(1, unitsCurrentPage) - 1) * 10);
  const isRefreshing = unitsLoading && units.length > 0;

  return (
    <View style={styles.container}>
      <Header
        title="Master Data Unit Kerja"
        subtitle="Daftar Bagian dan Kelompok Kerja (Pokja) di lingkungan LLDIKTI"
        showBack={Boolean(onBack) || navigation.canGoBack()}
        onBack={handleBack}
      />

      <TutWuriRefreshBanner refreshing={isRefreshing} />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={useTutWuriRefreshControl(isRefreshing, handleRefresh)}
      >
        {/* Action Bar & Filter 1 Baris (1:1 Web units/index.blade.php:10-43) */}
        <View style={styles.filterPanel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.filterBarRow}
          >
            <View style={styles.searchBox}>
              <Search size={16} strokeWidth={2} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchSubmit}
                placeholder="Cari nama atau kode unit..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Cari nama atau kode unit"
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
              onPress={() => setIsStatusModalVisible(true)}
              style={({ pressed }) => [
                styles.statusSelectTrigger,
                pressed && styles.pressedFade,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filter status unit kerja"
            >
              <AutoScrollText style={styles.statusSelectText}>
                {selectedStatusLabel}
              </AutoScrollText>
              <ChevronDown size={15} strokeWidth={2} color={colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={handleSearchSubmit}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.pressedFade,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cari unit kerja"
            >
              <Text style={styles.secondaryBtnText}>Cari</Text>
            </Pressable>

            {hasActiveFilter ? (
              <Pressable
                onPress={handleResetFilters}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.pressedFade,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Reset filter unit kerja"
              >
                <Text style={styles.secondaryBtnText}>Reset</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onNavigateAddUnit}
              style={({ pressed }) => [
                styles.addUnitBtn,
                pressed && styles.pressedFade,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Tambah Unit Kerja"
            >
              <Plus size={16} strokeWidth={2} color={colors.onPrimary} />
              <Text style={styles.addUnitBtnText}>Tambah Unit Kerja</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Units Table Panel (1:1 Web units/index.blade.php:46-178) */}
        {unitsError && units.length === 0 ? (
          <ErrorState message={unitsError} onRetry={handleRefresh} />
        ) : (
          <View style={styles.tablePanel}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              bounces={false}
              overScrollMode="never"
              nestedScrollEnabled
              style={styles.tableHorizontalScroll}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View style={styles.tableInner} collapsable={false}>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <View style={[styles.colNo, styles.headerCell]}>
                    <Text style={[styles.headerText, styles.textCenter]}>No</Text>
                  </View>
                  <View style={[styles.colCode, styles.headerCell]}>
                    <Text style={styles.headerText}>Kode Unit</Text>
                  </View>
                  <View style={[styles.colName, styles.headerCell]}>
                    <Text style={styles.headerText}>Nama Unit Kerja</Text>
                  </View>
                  <View style={[styles.colDesc, styles.headerCell]}>
                    <Text style={styles.headerText}>Deskripsi</Text>
                  </View>
                  <View style={[styles.colUsers, styles.headerCell]}>
                    <Text style={[styles.headerText, styles.textCenter]}>Jumlah Pegawai</Text>
                  </View>
                  <View style={[styles.colAgendas, styles.headerCell]}>
                    <Text style={[styles.headerText, styles.textCenter]}>Agenda Rapat</Text>
                  </View>
                  <View style={[styles.colStatus, styles.headerCell]}>
                    <Text style={[styles.headerText, styles.textCenter]}>Status</Text>
                  </View>
                  <View style={[styles.colActions, styles.headerCell]}>
                    <Text style={[styles.headerText, styles.textRight]}>Aksi</Text>
                  </View>
                </View>

                {/* Table Body */}
                {unitsLoading && units.length === 0 ? (
                  <View style={styles.loadingWrap}>
                    <TutWuriLoader size="sm" />
                    <Text style={styles.loadingText}>Memuat data unit kerja...</Text>
                  </View>
                ) : units.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>Tidak ada unit kerja yang sesuai.</Text>
                    {hasActiveFilter ? (
                      <Pressable
                        onPress={handleResetFilters}
                        style={({ pressed }) => [
                          styles.secondaryBtn,
                          pressed && styles.pressedFade,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Reset Filter"
                      >
                        <Text style={styles.secondaryBtnText}>Reset Filter</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  units.map((unit, index) => {
                    const rowBusy = isLoading && actionLoadingId === unit.id;
                    const usersCount = unit.users_count ?? 0;
                    const agendasCount = unit.agendas_count ?? 0;
                    const canDelete = usersCount === 0 && agendasCount === 0;
                    const unitActive = Boolean(unit.is_active);

                    return (
                      <View
                        key={unit.id}
                        style={[
                          styles.tableDataRow,
                          index % 2 === 1 && styles.tableDataRowAlt,
                        ]}
                      >
                        <View style={[styles.colNo, styles.bodyCellCenter]}>
                          <Text style={styles.noCellText}>{startRowNumber + index + 1}</Text>
                        </View>

                        <View style={[styles.colCode, styles.bodyCell]}>
                          <View style={styles.codeBadge}>
                            <AutoScrollText style={styles.codeBadgeText}>
                              {unit.kode_unit}
                            </AutoScrollText>
                          </View>
                        </View>

                        <View style={[styles.colName, styles.bodyCell]}>
                          <Text style={styles.unitNameText} numberOfLines={2}>
                            {unit.nama_unit}
                          </Text>
                          <Text style={styles.createdAtText}>
                            Dibuat: {formatCreatedShort(unit.created_at)}
                          </Text>
                        </View>

                        <View style={[styles.colDesc, styles.bodyCell]}>
                          <Text style={styles.descText} numberOfLines={3}>
                            {unit.deskripsi || '-'}
                          </Text>
                        </View>

                        <View style={[styles.colUsers, styles.bodyCellCenter]}>
                          <View style={styles.countBadge}>
                            <Users size={13} strokeWidth={2} color={colors.onSurface} />
                            <Text style={styles.countBadgeText}>{usersCount}</Text>
                          </View>
                        </View>

                        <View style={[styles.colAgendas, styles.bodyCellCenter]}>
                          <View style={styles.countBadgeStrongBorder}>
                            <Calendar size={13} strokeWidth={2} color={colors.onSurface} />
                            <Text style={styles.countBadgeText}>{agendasCount}</Text>
                          </View>
                        </View>

                        <View style={[styles.colStatus, styles.bodyCellCenter]}>
                          <View
                            style={[
                              styles.statusPill,
                              unitActive ? styles.statusPillActive : styles.statusPillInactive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                unitActive
                                  ? styles.statusPillTextActive
                                  : styles.statusPillTextInactive,
                              ]}
                            >
                              {unitActive ? 'Aktif' : 'Non-Aktif'}
                            </Text>
                          </View>
                        </View>

                        <View style={[styles.colActions, styles.actionsCell]}>
                          <Pressable
                            disabled={rowBusy}
                            onPress={() => handleToggleStatus(unit)}
                            style={({ pressed }) => [
                              styles.toggleActionBtn,
                              unitActive
                                ? styles.toggleDeactivateBtn
                                : styles.toggleActivateBtn,
                              pressed && styles.pressedFade,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`${unitActive ? 'Nonaktifkan' : 'Aktifkan'} ${unit.nama_unit}`}
                          >
                            <AutoScrollText
                              style={[
                                styles.toggleActionText,
                                unitActive
                                  ? styles.toggleDeactivateText
                                  : styles.toggleActivateText,
                              ]}
                            >
                              {unitActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </AutoScrollText>
                          </Pressable>

                          <Pressable
                            disabled={rowBusy}
                            onPress={() => onNavigateEditUnit(unit.id)}
                            style={({ pressed }) => [
                              styles.iconActionBtn,
                              styles.editIconBtn,
                              pressed && styles.pressedFade,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${unit.nama_unit}`}
                          >
                            <Pencil size={15} strokeWidth={2} color={colors.onSurface} />
                          </Pressable>

                          {canDelete ? (
                            <Pressable
                              disabled={rowBusy}
                              onPress={() => handleDeleteUnit(unit)}
                              style={({ pressed }) => [
                                styles.iconActionBtn,
                                styles.deleteIconBtn,
                                pressed && styles.pressedFade,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Hapus ${unit.nama_unit}`}
                            >
                              <Trash2
                                size={15}
                                strokeWidth={2}
                                color={colors.onErrorContainer}
                              />
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>

            {unitsTotal > 0 && unitsLastPage > 1 ? (
              <View style={styles.paginationWrap}>
                <PaginationBar
                  currentPage={unitsCurrentPage}
                  lastPage={unitsLastPage}
                  total={unitsTotal}
                  label="Unit Kerja"
                  isLoading={unitsLoading}
                  onPageChange={handlePageChange}
                />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <AgendaOptionModal
        visible={isStatusModalVisible}
        onClose={() => setIsStatusModalVisible(false)}
        title="Filter Status Unit"
        subtitle="Pilih status operasional unit kerja LLDIKTI X"
        options={STATUS_OPTIONS}
        selectedId={statusFilter}
        onSelect={(option) => {
          setIsStatusModalVisible(false);
          handleStatusChange(option.id as UnitStatusFilter);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  filterPanel: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 4,
  },
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  searchBox: {
    width: 215,
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
  statusSelectTrigger: {
    width: 155,
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
  statusSelectText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.onSurface,
    flex: 1,
    minWidth: 0,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.lg,
  },
  secondaryBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  addUnitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.lg,
  },
  addUnitBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },
  pressedFade: {
    opacity: 0.8,
  },
  tablePanel: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  tableHorizontalScroll: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  tableInner: {
    minWidth: 1093,
    flexGrow: 1,
    backgroundColor: colors.surfaceCard,
  },
  tableHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  headerCell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
  tableDataRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tableDataRowAlt: {
    backgroundColor: colors.background,
  },
  bodyCell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  bodyCellCenter: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colNo: {
    width: 48,
  },
  colCode: {
    width: 115,
  },
  colName: {
    width: 220,
  },
  colDesc: {
    width: 200,
  },
  colUsers: {
    width: 115,
  },
  colAgendas: {
    width: 110,
  },
  colStatus: {
    width: 90,
  },
  colActions: {
    width: 195,
  },
  noCellText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  codeBadge: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  codeBadgeText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 11.5,
    color: colors.onSurface,
    flexShrink: 1,
    minWidth: 0,
  },
  unitNameText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
  },
  createdAtText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoMedium,
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 3,
  },
  descText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  countBadgeStrongBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  countBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
  },
  statusPillActive: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  statusPillInactive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.borderStrong,
  },
  statusPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
  },
  statusPillTextActive: {
    color: colors.onSuccessContainer,
  },
  statusPillTextInactive: {
    color: colors.textSecondary,
  },
  actionsCell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  toggleActionBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 8,
    borderRadius: rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toggleDeactivateBtn: {
    backgroundColor: colors.warningContainer,
    borderColor: colors.warningBorder,
  },
  toggleActivateBtn: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  toggleActionText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    flexShrink: 1,
    minWidth: 0,
  },
  toggleDeactivateText: {
    color: colors.onWarningContainer,
  },
  toggleActivateText: {
    color: colors.onSuccessContainer,
  },
  iconActionBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editIconBtn: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.borderStrong,
  },
  deleteIconBtn: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.errorBorder,
  },
  loadingWrap: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyWrap: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  paginationWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.background,
  },
});
