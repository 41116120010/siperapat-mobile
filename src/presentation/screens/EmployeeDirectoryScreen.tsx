import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Ban,
  Building2,
  CheckCircle2,
  ChevronDown,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { PaginationBar } from '../components/common/PaginationBar';
import { ErrorState } from '../components/common/ErrorState';
import { TutWuriLoader } from '../components/common/TutWuriLoader';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { useEmployeeStore } from '../store/useEmployeeStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { useAuthStore } from '../store/useAuthStore';
import { Employee } from '../../domain/entities/types';

interface EmployeeDirectoryScreenProps {
  onBack?: () => void;
  onNavigateAdd?: () => void;
  onNavigateEdit?: (employeeId: string) => void;
  onNavigateAddUnit?: () => void;
  onNavigateEditUnit?: (unitId: number | string) => void;
}

type RoleFilterValue = '' | 'administrator' | 'admin' | 'staff';
type StatusFilterValue = '' | 'active' | 'inactive';

interface AppliedUserFilters {
  search: string;
  unitKey: string; // '' = all, 'none' = tanpa unit, otherwise String(unit.id)
  role: RoleFilterValue;
  status: StatusFilterValue;
}

const DEFAULT_FILTERS: AppliedUserFilters = {
  search: '',
  unitKey: '',
  role: '',
  status: '',
};

const COL_WIDTHS = {
  no: 52,
  pegawai: 220,
  nipUsername: 175,
  unit: 185,
  role: 132,
  status: 112,
  aksi: 220,
} as const;

const TABLE_MIN_WIDTH =
  COL_WIDTHS.no +
  COL_WIDTHS.pegawai +
  COL_WIDTHS.nipUsername +
  COL_WIDTHS.unit +
  COL_WIDTHS.role +
  COL_WIDTHS.status +
  COL_WIDTHS.aksi;

export const EmployeeDirectoryScreen: React.FC<EmployeeDirectoryScreenProps> = ({
  onBack,
  onNavigateAdd,
  onNavigateEdit,
}) => {
  const authUser = useAuthStore((state) => state.user);
  const isAdministrator = authUser?.role === 'administrator';
  const adminUnitTitle = authUser?.unitKerja ? `Pegawai Unit: ${authUser.unitKerja}` : 'Pegawai Unit';

  const {
    employees,
    userSummary,
    allUnits,
    total,
    currentPage,
    lastPage,
    employeesLoading,
    employeesError,
    fetchEmployees,
    fetchAllUnits,
    deleteEmployee,
    toggleEmployeeStatus,
  } = useEmployeeStore();

  const [draftSearch, setDraftSearch] = useState('');
  const [draftUnitKey, setDraftUnitKey] = useState('');
  const [draftRole, setDraftRole] = useState<RoleFilterValue>('');
  const [draftStatus, setDraftStatus] = useState<StatusFilterValue>('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedUserFilters>(DEFAULT_FILTERS);

  const [activeDropdown, setActiveDropdown] = useState<'none' | 'unit' | 'role' | 'status'>('none');
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);

  useEffect(() => {
    if (isAdministrator) {
      void fetchAllUnits({ activeOnly: false });
    }
  }, [isAdministrator, fetchAllUnits]);

  const toQueryFilters = useCallback(
    (filters: AppliedUserFilters) => ({
      search: filters.search.trim() || undefined,
      role: filters.role || undefined,
      status: filters.status || undefined,
      unitId: isAdministrator ? filters.unitKey || undefined : undefined,
    }),
    [isAdministrator],
  );

  useEffect(() => {
    void fetchEmployees(1, toQueryFilters(appliedFilters));
  }, [appliedFilters, fetchEmployees, toQueryFilters]);

  const totalCount = userSummary?.total_users ?? total;
  const activeCount = userSummary?.active_users ?? 0;
  const inactiveCount = userSummary?.inactive_users ?? 0;

  const hasActiveFilters =
    appliedFilters.search !== '' ||
    appliedFilters.unitKey !== '' ||
    appliedFilters.role !== '' ||
    appliedFilters.status !== '' ||
    draftSearch !== '' ||
    draftUnitKey !== '' ||
    draftRole !== '' ||
    draftStatus !== '';

  const unitFilterOptions = useMemo<AgendaOption[]>(() => {
    const items: AgendaOption[] = [
      { id: '', title: 'Semua Unit Kerja', icon: Building2 },
      { id: 'none', title: 'Tanpa Unit (Tingkat Lembaga)', icon: Building2 },
    ];
    allUnits.forEach((unit) => {
      items.push({
        id: String(unit.id),
        title: `${unit.kode_unit} — ${unit.nama_unit}`,
        icon: Building2,
      });
    });
    return items;
  }, [allUnits]);

  const roleFilterOptions = useMemo<AgendaOption[]>(() => {
    const items: AgendaOption[] = [{ id: '', title: 'Semua Peran', icon: Users }];
    if (isAdministrator) {
      items.push({ id: 'administrator', title: 'Administrator', icon: ShieldCheck });
    }
    items.push(
      { id: 'admin', title: 'Admin Unit', icon: UserCheck },
      { id: 'staff', title: 'Staff Pegawai', icon: Users },
    );
    return items;
  }, [isAdministrator]);

  const statusFilterOptions = useMemo<AgendaOption[]>(
    () => [
      { id: '', title: 'Semua Status', icon: Users },
      { id: 'active', title: 'Aktif Saja', icon: CheckCircle2 },
      { id: 'inactive', title: 'Non-Aktif', icon: Ban },
    ],
    [],
  );

  const selectedUnitLabel = useMemo(() => {
    if (!draftUnitKey) return 'Semua Unit Kerja';
    if (draftUnitKey === 'none') return 'Tanpa Unit (Tingkat Lembaga)';
    const found = allUnits.find((unit) => String(unit.id) === draftUnitKey);
    return found ? `${found.kode_unit} — ${found.nama_unit}` : 'Unit Kerja';
  }, [draftUnitKey, allUnits]);

  const selectedRoleLabel = useMemo(() => {
    if (draftRole === 'administrator') return 'Administrator';
    if (draftRole === 'admin') return 'Admin Unit';
    if (draftRole === 'staff') return 'Staff Pegawai';
    return 'Semua Peran';
  }, [draftRole]);

  const selectedStatusLabel = useMemo(() => {
    if (draftStatus === 'active') return 'Aktif Saja';
    if (draftStatus === 'inactive') return 'Non-Aktif';
    return 'Semua Status';
  }, [draftStatus]);

  const unitMapById = useMemo(() => {
    const map = new Map<number, { kode: string; nama: string }>();
    allUnits.forEach((unit) => {
      map.set(unit.id, { kode: unit.kode_unit, nama: unit.nama_unit });
    });
    return map;
  }, [allUnits]);

  const handleApplyFilters = () => {
    setAppliedFilters({
      search: draftSearch.trim(),
      unitKey: draftUnitKey,
      role: draftRole,
      status: draftStatus,
    });
  };

  const handleResetFilters = () => {
    setDraftSearch('');
    setDraftUnitKey('');
    setDraftRole('');
    setDraftStatus('');
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const handleRefresh = () => {
    if (isAdministrator) {
      void fetchAllUnits({ activeOnly: false });
    }
    void fetchEmployees(1, toQueryFilters(appliedFilters));
  };

  const handlePageChange = (targetPage: number) => {
    if (employeesLoading || targetPage < 1 || targetPage > lastPage) return;
    void fetchEmployees(targetPage, toQueryFilters(appliedFilters));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleAddEmployee = () => {
    if (onNavigateAdd) {
      onNavigateAdd();
    } else {
      useFeedbackStore.getState().showToast({
        type: 'info',
        message: 'Membuka formulir pendaftaran pengguna baru...',
      });
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    if (onNavigateEdit) {
      onNavigateEdit(employee.id);
    } else {
      useFeedbackStore.getState().showToast({
        type: 'info',
        message: `Membuka formulir pembaruan data ${employee.name}...`,
      });
    }
  };

  const handleToggleEmployeeStatus = (employee: Employee) => {
    const nextAction = employee.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan';
    useFeedbackStore.getState().showModal({
      type: 'confirm',
      confirmVariant: employee.status === 'Aktif' ? 'destructive' : 'primary',
      title: `${nextAction} Akun Pengguna`,
      message: `Apakah Anda yakin ingin ${nextAction.toLowerCase()} akun "${employee.name}" (${employee.nip || employee.username})?`,
      confirmText: nextAction,
      cancelText: 'Batal',
      onConfirm: async () => {
        const updated = await toggleEmployeeStatus(employee.id);
        if (updated) {
          useFeedbackStore.getState().showToast({
            type: 'success',
            message: `Akun ${employee.name} berhasil di-${nextAction.toLowerCase()}.`,
          });
          void fetchEmployees(currentPage || 1, toQueryFilters(appliedFilters));
        } else {
          useFeedbackStore.getState().showToast({
            type: 'error',
            message: `Gagal ${nextAction.toLowerCase()} akun pengguna.`,
          });
        }
      },
    });
  };

  const handleDeleteEmployee = (employee: Employee) => {
    useFeedbackStore.getState().showModal({
      type: 'confirm',
      confirmVariant: 'destructive',
      title: 'Hapus Akun Pengguna',
      message: `Apakah Anda yakin ingin menghapus permanen akun "${employee.name}" (${employee.nip || employee.username})?`,
      confirmText: 'Hapus Permanen',
      cancelText: 'Batal',
      onConfirm: async () => {
        const ok = await deleteEmployee(employee.id);
        if (ok) {
          useFeedbackStore.getState().showToast({
            type: 'success',
            message: `Data pengguna ${employee.name} berhasil dihapus.`,
          });
          const targetPage = employees.length <= 1 && currentPage > 1 ? currentPage - 1 : currentPage || 1;
          void fetchEmployees(targetPage, toQueryFilters(appliedFilters));
        } else {
          useFeedbackStore.getState().showToast({
            type: 'error',
            message: 'Gagal menghapus pengguna. Silakan coba beberapa saat lagi.',
          });
        }
      },
    });
  };

  return (
    <View style={styles.root}>
      <Header
        title={isAdministrator ? 'Kelola Seluruh Pengguna' : adminUnitTitle}
        subtitle="Daftar aparatur dan staf terdaftar di sistem presensi"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={employeesLoading && currentPage <= 1}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {/* STAT CARDS (1:1 users/index.blade.php: Total, Akun Aktif, Akun Non-Aktif) */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel} numberOfLines={1}>
                {isAdministrator ? 'Total Pengguna' : 'Pegawai di Unit'}
              </Text>
              <Text style={styles.statValue}>{totalCount}</Text>
            </View>
            <View style={[styles.statIconBox, styles.statIconNeutral]}>
              <Users size={18} strokeWidth={2} color={colors.textSecondary} />
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel} numberOfLines={1}>
                Akun Aktif
              </Text>
              <Text style={[styles.statValue, styles.statValueSuccess]}>{activeCount}</Text>
            </View>
            <View style={[styles.statIconBox, styles.statIconSuccess]}>
              <CheckCircle2 size={18} strokeWidth={2} color={colors.success} />
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTextCol}>
              <Text style={styles.statLabel} numberOfLines={1}>
                Akun Non-Aktif
              </Text>
              <Text style={[styles.statValue, styles.statValueError]}>{inactiveCount}</Text>
            </View>
            <View style={[styles.statIconBox, styles.statIconError]}>
              <Ban size={18} strokeWidth={2} color={colors.error} />
            </View>
          </View>
        </View>

        {/* 1-ROW HORIZONTAL TOOLBAR (Search + Unit + Role + Status + Filter + Reset + + Tambah Pengguna) */}
        <View style={styles.toolbarCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.toolbarRow}
          >
            <View style={styles.searchInputWrap}>
              <Search size={16} strokeWidth={2} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama, NIP, username..."
                placeholderTextColor={colors.textMuted}
                value={draftSearch}
                onChangeText={setDraftSearch}
                onSubmitEditing={handleApplyFilters}
                returnKeyType="search"
              />
              {draftSearch !== '' ? (
                <Pressable
                  onPress={() => {
                    setDraftSearch('');
                    if (appliedFilters.search !== '') {
                      setAppliedFilters((prev) => ({ ...prev, search: '' }));
                    }
                  }}
                  style={({ pressed }) => [styles.clearIconBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Bersihkan kata kunci pencarian"
                >
                  <X size={15} strokeWidth={2} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {isAdministrator ? (
              <Pressable
                onPress={() => setActiveDropdown('unit')}
                style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Filter Unit Kerja"
              >
                <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                  {selectedUnitLabel}
                </Text>
                <ChevronDown size={15} strokeWidth={2} color={colors.textSecondary} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => setActiveDropdown('role')}
              style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Filter Peran"
            >
              <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                {selectedRoleLabel}
              </Text>
              <ChevronDown size={15} strokeWidth={2} color={colors.textSecondary} />
            </Pressable>

            <Pressable
              onPress={() => setActiveDropdown('status')}
              style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Filter Status Akun"
            >
              <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                {selectedStatusLabel}
              </Text>
              <ChevronDown size={15} strokeWidth={2} color={colors.textSecondary} />
            </Pressable>

            <Pressable
              onPress={handleApplyFilters}
              style={({ pressed }) => [styles.filterSecondaryBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Terapkan Filter Pengguna"
            >
              <Text style={styles.filterSecondaryBtnText}>Filter</Text>
            </Pressable>

            {hasActiveFilters ? (
              <Pressable
                onPress={handleResetFilters}
                style={({ pressed }) => [styles.resetBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Reset Filter Pengguna"
              >
                <RotateCcw size={14} strokeWidth={2} color={colors.textSecondary} />
                <Text style={styles.resetBtnText}>Reset</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={handleAddEmployee}
              style={({ pressed }) => [styles.addPrimaryBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Tambah Pengguna Baru"
            >
              <Plus size={15} strokeWidth={2} color={colors.onPrimary} />
              <Text style={styles.addPrimaryBtnText}>Tambah Pengguna</Text>
            </Pressable>
          </ScrollView>
        </View>

        {employeesError ? (
          <ErrorState message={employeesError} onRetry={handleRefresh} />
        ) : null}

        {/* 7-COLUMN TABLE (1:1 users/index.blade.php: No, Pegawai, NIP & Username, Unit Kerja, Peran (Role), Status, Aksi) */}
        {!employeesError ? (
          <View style={styles.tablePanel}>
            {employeesLoading && employees.length === 0 ? (
              <View style={styles.loadingState}>
                <TutWuriLoader size="md" />
                <Text style={styles.loadingText}>Memuat daftar pengguna...</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                bounces={false}
                overScrollMode="never"
                nestedScrollEnabled
                showsHorizontalScrollIndicator={true}
                style={styles.tableScrollView}
                contentContainerStyle={styles.tableScrollContent}
              >
                <View style={styles.tableInner} collapsable={false}>
                  {/* TABLE HEADER */}
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.thCell, { width: COL_WIDTHS.no }]}>No</Text>
                    <Text style={[styles.thCell, { width: COL_WIDTHS.pegawai }]}>Pegawai</Text>
                    <Text style={[styles.thCell, { width: COL_WIDTHS.nipUsername }]}>
                      NIP & Username
                    </Text>
                    <Text style={[styles.thCell, { width: COL_WIDTHS.unit }]}>Unit Kerja</Text>
                    <Text style={[styles.thCell, { width: COL_WIDTHS.role }]}>Peran (Role)</Text>
                    <Text style={[styles.thCell, { width: COL_WIDTHS.status }]}>Status</Text>
                    <Text style={[styles.thCell, styles.thCellRight, { width: COL_WIDTHS.aksi }]}>
                      Aksi
                    </Text>
                  </View>

                  {/* TABLE BODY */}
                  {employees.length === 0 ? (
                    <View style={styles.emptyTableRow}>
                      <Users size={28} strokeWidth={2} color={colors.textMuted} />
                      <Text style={styles.emptyTableText}>
                        Tidak ada data pengguna yang sesuai dengan filter pencarian.
                      </Text>
                    </View>
                  ) : (
                    employees.map((item, idx) => {
                      const rowNumber = (Math.max(currentPage, 1) - 1) * 10 + idx + 1;
                      const isSelf = String(item.id) === String(authUser?.id ?? '');
                      const isTargetAdmin = item.role === 'Administrator';
                      const canManageTarget = !isTargetAdmin || isAdministrator;
                      const isActive = item.status === 'Aktif';
                      const cleanUsername = item.username.replace(/^@+/, '');
                      const unitMeta = item.unitId ? unitMapById.get(item.unitId) : undefined;
                      const initials =
                        item.initials ||
                        item.name
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part.charAt(0).toUpperCase())
                          .join('') ||
                        'PN';

                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.tableRow,
                            idx === employees.length - 1 && styles.tableRowLast,
                          ]}
                        >
                          {/* No */}
                          <View style={[styles.tdCell, { width: COL_WIDTHS.no }]}>
                            <Text style={styles.rowNumberText}>{rowNumber}</Text>
                          </View>

                          {/* Pegawai */}
                          <View style={[styles.tdCell, styles.pegawaiCell, { width: COL_WIDTHS.pegawai }]}>
                            <View style={styles.avatarCircle}>
                              <Text style={styles.avatarText}>{initials}</Text>
                            </View>
                            <View style={styles.pegawaiTextCol}>
                              <Text style={styles.pegawaiName} numberOfLines={1}>
                                {item.name}
                                {isSelf ? ' (Anda)' : ''}
                              </Text>
                              <Text style={styles.pegawaiEmail} numberOfLines={1}>
                                {item.email}
                              </Text>
                            </View>
                          </View>

                          {/* NIP & Username */}
                          <View style={[styles.tdCell, { width: COL_WIDTHS.nipUsername }]}>
                            <Text style={styles.nipMono} numberOfLines={1}>
                              {item.nip || '-'}
                            </Text>
                            <Text style={styles.usernameSub} numberOfLines={1}>
                              @{cleanUsername || '-'}
                            </Text>
                          </View>

                          {/* Unit Kerja */}
                          <View style={[styles.tdCell, { width: COL_WIDTHS.unit }]}>
                            {item.unit ? (
                              <View style={styles.unitCol}>
                                <View style={styles.unitCodePill}>
                                  <Text style={styles.unitCodePillText} numberOfLines={1}>
                                    {unitMeta?.kode || item.unit}
                                  </Text>
                                </View>
                                {unitMeta?.nama ? (
                                  <Text style={styles.unitNameSub} numberOfLines={1}>
                                    {unitMeta.nama}
                                  </Text>
                                ) : null}
                              </View>
                            ) : (
                              <Text style={styles.unitCenterText}>Pusat / Lembaga</Text>
                            )}
                          </View>

                          {/* Peran (Role) */}
                          <View style={[styles.tdCell, { width: COL_WIDTHS.role }]}>
                            <View
                              style={[
                                styles.roleBadge,
                                item.role === 'Administrator'
                                  ? styles.roleBadgeAdmin
                                  : item.role === 'Admin Unit'
                                  ? styles.roleBadgeUnit
                                  : styles.roleBadgeStaff,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.roleBadgeText,
                                  item.role === 'Administrator'
                                    ? styles.roleBadgeTextAdmin
                                    : item.role === 'Admin Unit'
                                    ? styles.roleBadgeTextUnit
                                    : styles.roleBadgeTextStaff,
                                ]}
                              >
                                {item.role}
                              </Text>
                            </View>
                          </View>

                          {/* Status */}
                          <View style={[styles.tdCell, { width: COL_WIDTHS.status }]}>
                            <View
                              style={[
                                styles.statusBadge,
                                isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  isActive
                                    ? styles.statusBadgeTextActive
                                    : styles.statusBadgeTextInactive,
                                ]}
                              >
                                {isActive ? 'Aktif' : 'Non-Aktif'}
                              </Text>
                            </View>
                          </View>

                          {/* Aksi */}
                          <View style={[styles.tdCell, styles.aksiCell, { width: COL_WIDTHS.aksi }]}>
                            {!isSelf && canManageTarget ? (
                              <Pressable
                                onPress={() => handleToggleEmployeeStatus(item)}
                                style={({ pressed }) => [
                                  styles.actionToggleBtn,
                                  isActive ? styles.actionToggleBtnDeactivate : styles.actionToggleBtnActivate,
                                  pressed && styles.pressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`${isActive ? 'Nonaktifkan' : 'Aktifkan'} akun ${item.name}`}
                              >
                                <Power
                                  size={13}
                                  strokeWidth={2}
                                  color={isActive ? colors.onWarningContainer : colors.onSuccessContainer}
                                />
                                <Text
                                  style={[
                                    styles.actionToggleText,
                                    isActive
                                      ? styles.actionToggleTextDeactivate
                                      : styles.actionToggleTextActivate,
                                  ]}
                                >
                                  {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                </Text>
                              </Pressable>
                            ) : null}

                            {canManageTarget ? (
                              <Pressable
                                onPress={() => handleEditEmployee(item)}
                                style={({ pressed }) => [styles.iconActionBtn, pressed && styles.pressed]}
                                accessibilityRole="button"
                                accessibilityLabel={`Edit pengguna ${item.name}`}
                              >
                                <Pencil size={15} strokeWidth={2} color={colors.primary} />
                              </Pressable>
                            ) : null}

                            {!isSelf && canManageTarget ? (
                              <Pressable
                                onPress={() => handleDeleteEmployee(item)}
                                style={({ pressed }) => [
                                  styles.iconActionBtn,
                                  styles.iconDeleteBtn,
                                  pressed && styles.pressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Hapus pengguna ${item.name}`}
                              >
                                <Trash2 size={15} strokeWidth={2} color={colors.error} />
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>
            )}

            {total > 0 ? (
              <PaginationBar
                currentPage={currentPage}
                lastPage={lastPage}
                total={total}
                label="Pengguna"
                isLoading={employeesLoading}
                onPageChange={handlePageChange}
                containerStyle={styles.tablePagination}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* DROPDOWN MODALS */}
      <AgendaOptionModal
        visible={activeDropdown === 'unit'}
        onClose={() => setActiveDropdown('none')}
        title="Filter Unit Kerja"
        subtitle="Pilih unit kerja atau tingkat lembaga"
        options={unitFilterOptions}
        selectedId={draftUnitKey}
        searchable={true}
        searchPlaceholder="Cari kode atau nama unit kerja..."
        onSelect={(opt) => setDraftUnitKey(opt.id)}
      />

      <AgendaOptionModal
        visible={activeDropdown === 'role'}
        onClose={() => setActiveDropdown('none')}
        title="Filter Peran Pengguna"
        options={roleFilterOptions}
        selectedId={draftRole}
        searchable={false}
        onSelect={(opt) => setDraftRole((opt.id as RoleFilterValue) || '')}
      />

      <AgendaOptionModal
        visible={activeDropdown === 'status'}
        onClose={() => setActiveDropdown('none')}
        title="Filter Status Akun"
        options={statusFilterOptions}
        selectedId={draftStatus}
        searchable={false}
        onSelect={(opt) => setDraftStatus((opt.id as StatusFilterValue) || '')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },

  /* Stat cards */
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    ...cardSurface,
    flex: 1,
    borderRadius: rounded.lg,
    padding: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  statTextCol: {
    flex: 1,
  },
  statLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
    marginBottom: 2,
  },
  statValue: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  statValueSuccess: {
    color: colors.success,
  },
  statValueError: {
    color: colors.error,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconNeutral: {
    backgroundColor: colors.surfaceSoft,
  },
  statIconSuccess: {
    backgroundColor: colors.successContainer,
  },
  statIconError: {
    backgroundColor: colors.errorContainer,
  },

  /* 1-Row Toolbar */
  toolbarCard: {
    ...cardSurface,
    borderRadius: rounded.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingRight: spacing.xs,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    width: 230,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansRegular,
    color: colors.onSurface,
    paddingVertical: spacing.xs,
  },
  clearIconBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.xs,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET,
    maxWidth: 190,
  },
  dropdownTriggerText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onSurface,
    flexShrink: 1,
  },
  filterSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  filterSecondaryBtnText: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET,
  },
  resetBtnText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
  },
  addPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  addPrimaryBtnText: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onPrimary,
  },

  /* Table Panel */
  tablePanel: {
    ...cardSurface,
    borderRadius: rounded.lg,
    overflow: 'hidden',
  },
  loadingState: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  tableScrollView: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  tableInner: {
    minWidth: TABLE_MIN_WIDTH + spacing.sm * 2,
    flexGrow: 1,
    backgroundColor: colors.surfaceCard,
  },
  tableHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
  },
  thCell: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  thCellRight: {
    textAlign: 'right',
  },
  tableRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceCard,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tdCell: {
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  rowNumberText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  pegawaiCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.sm,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  pegawaiTextCol: {
    flex: 1,
    gap: 1,
  },
  pegawaiName: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  pegawaiEmail: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  nipMono: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    color: colors.onSurface,
  },
  usernameSub: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
    marginTop: 1,
  },
  unitCol: {
    alignItems: 'flex-start',
    gap: 3,
  },
  unitCodePill: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    maxWidth: '100%',
  },
  unitCodePillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
  },
  unitNameSub: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  unitCenterText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  roleBadgeAdmin: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleBadgeUnit: {
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder,
  },
  roleBadgeStaff: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.borderSubtle,
  },
  roleBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
  },
  roleBadgeTextAdmin: {
    color: colors.onPrimary,
  },
  roleBadgeTextUnit: {
    color: colors.infoText,
  },
  roleBadgeTextStaff: {
    color: colors.textSecondary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  statusBadgeInactive: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.errorBorder,
  },
  statusBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
  },
  statusBadgeTextActive: {
    color: colors.onSuccessContainer,
  },
  statusBadgeTextInactive: {
    color: colors.onErrorContainer,
  },
  aksiCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  actionToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    borderWidth: 1,
  },
  actionToggleBtnDeactivate: {
    backgroundColor: colors.warningContainer,
    borderColor: colors.warningBorder,
  },
  actionToggleBtnActivate: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  actionToggleText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
  },
  actionToggleTextDeactivate: {
    color: colors.onWarningContainer,
  },
  actionToggleTextActivate: {
    color: colors.onSuccessContainer,
  },
  iconActionBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDeleteBtn: {
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorContainer,
  },
  emptyTableRow: {
    paddingVertical: spacing.xl * 1.5,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyTableText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
    textAlign: 'center',
  },
  tablePagination: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
  },
});
