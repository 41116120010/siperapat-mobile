import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ScrollViewInstance,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  Ban,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Pencil,
  Power,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { useEmployeeStore } from '../store/useEmployeeStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { triggerPageTransition } from '../store/useTransitionStore';
import { Employee } from '../../domain/entities/types';
import { ErrorState } from '../components/common/ErrorState';
import { PaginationBar } from '../components/common/PaginationBar';
import { ApiUnitRecord } from '../../data/datasources/userApi';
import { useAuthStore } from '../store/useAuthStore';

interface EmployeeDirectoryScreenProps {
  onBack?: () => void;
  onNavigateAdd?: () => void;
  onNavigateEdit?: (employeeId: string) => void;
  onNavigateAddUnit?: () => void;
  onNavigateEditUnit?: (unitId: number | string) => void;
}

const NO_UNIT_FILTER = 'Tanpa Unit (Tingkat Lembaga)';

function formatUnitDate(iso?: string | null): string {
  if (!iso) return '-';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '-';
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

export const EmployeeDirectoryScreen: React.FC<EmployeeDirectoryScreenProps> = ({
  onBack,
  onNavigateAdd,
  onNavigateEdit,
  onNavigateAddUnit,
  onNavigateEditUnit,
}) => {
  const authUser = useAuthStore((state) => state.user);
  const role = authUser?.role;
  const isAdministrator = role === 'administrator';
  const {
    employees,
    userSummary,
    units: apiUnits,
    allUnits,
    unitSummary,
    total,
    currentPage,
    lastPage,
    unitsCurrentPage,
    unitsLastPage,
    unitsTotal,
    employeesLoading,
    employeesError,
    unitsLoading,
    unitsError,
    fetchEmployees,
    fetchUnits,
    fetchAllUnits,
    deleteEmployee,
    toggleEmployeeStatus,
    deleteUnit,
    toggleUnitStatus,
  } = useEmployeeStore();

  const [activeTab, setActiveTab] = useState<'asn' | 'units'>('asn');
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('Semua Peran');
  const [selectedStatus, setSelectedStatus] = useState('Semua Status');
  const [selectedUnit, setSelectedUnit] = useState('Semua Unit');
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedUnitStatus, setSelectedUnitStatus] = useState('Semua Status');
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);

  useEffect(() => {
    if (isAdministrator) {
      void fetchAllUnits({ activeOnly: false });
    }
  }, [isAdministrator, fetchAllUnits]);

  const selectedUnitId: number | string | undefined = isAdministrator
    ? selectedUnit === NO_UNIT_FILTER
      ? 'none'
      : allUnits.find((item) => item.nama_unit === selectedUnit)?.id
    : undefined;

  const apiRole =
    selectedRole === 'Semua Peran'
      ? undefined
      : selectedRole === 'Administrator'
      ? 'administrator'
      : selectedRole === 'Admin Unit'
      ? 'admin'
      : 'staff';

  const apiUserStatus =
    selectedStatus === 'Aktif Saja'
      ? 'active'
      : selectedStatus === 'Non-Aktif'
      ? 'inactive'
      : undefined;

  const apiUnitStatus =
    selectedUnitStatus === 'Aktif Saja'
      ? 'active'
      : selectedUnitStatus === 'Non-Aktif'
      ? 'inactive'
      : undefined;

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEmployees(1, {
        search,
        role: apiRole,
        status: apiUserStatus,
        unitId: selectedUnitId,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, apiRole, apiUserStatus, selectedUnitId, fetchEmployees]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchUnits(1, false, {
        search: unitSearch,
        status: apiUnitStatus,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [unitSearch, apiUnitStatus, fetchUnits]);

  const employeeList = employees;
  const totalCount = userSummary?.total_users ?? total;
  const activeCount = userSummary?.active_users ?? 0;
  const inactiveCount = userSummary?.inactive_users ?? 0;

  const unitTotalCount = unitSummary?.total_units ?? unitsTotal;
  const unitActiveCount = unitSummary?.active_units ?? 0;
  const unitInactiveCount = unitSummary?.inactive_units ?? 0;

  const roles = isAdministrator
    ? ['Semua Peran', 'Administrator', 'Admin Unit', 'Staff Pegawai']
    : ['Semua Peran', 'Admin Unit', 'Staff Pegawai'];
  const statusOptions = ['Semua Status', 'Aktif Saja', 'Non-Aktif'];
  const unitFilterOptions = [
    'Semua Unit',
    NO_UNIT_FILTER,
    ...allUnits.map((unit) => unit.nama_unit),
  ];

  const hasActiveUserFilters =
    search !== '' ||
    selectedRole !== 'Semua Peran' ||
    selectedStatus !== 'Semua Status' ||
    selectedUnit !== 'Semua Unit';

  const hasActiveUnitFilters =
    unitSearch !== '' || selectedUnitStatus !== 'Semua Status';

  const handleResetUserFilters = () => {
    setSearch('');
    setSelectedRole('Semua Peran');
    setSelectedStatus('Semua Status');
    setSelectedUnit('Semua Unit');
  };

  const handleResetUnitFilters = () => {
    setUnitSearch('');
    setSelectedUnitStatus('Semua Status');
  };

  const handleAddEmployee = () => {
    if (onNavigateAdd) {
      onNavigateAdd();
    } else {
      useFeedbackStore.getState().showToast({
        type: 'info',
        message: 'Membuka formulir pendaftaran akun pegawai ASN baru...',
      });
    }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    useFeedbackStore.getState().showModal({
      type: 'confirm',
      confirmVariant: 'destructive',
      title: 'Hapus Akun Pegawai',
      message: `Apakah Anda yakin ingin menghapus data pegawai "${employee.name}" (${employee.nip || employee.username})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Pegawai',
      cancelText: 'Batal',
      onConfirm: async () => {
        const success = await deleteEmployee(employee.id);
        if (success) {
          useFeedbackStore.getState().showToast({
            type: 'success',
            message: `Data pegawai ${employee.name} berhasil dihapus.`,
          });
          const targetPage =
            employees.length <= 1 && currentPage > 1 ? currentPage - 1 : currentPage;
          void fetchEmployees(targetPage, {
            search,
            role: apiRole,
            status: apiUserStatus,
            unitId: selectedUnitId,
          });
        } else {
          useFeedbackStore.getState().showToast({
            type: 'error',
            message: 'Gagal menghapus pegawai. Silakan coba beberapa saat lagi.',
          });
        }
      },
    });
  };

  const handleToggleEmployeeStatus = (employee: Employee) => {
    const nextAction = employee.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan';
    useFeedbackStore.getState().showModal({
      type: 'confirm',
      confirmVariant: employee.status === 'Aktif' ? 'destructive' : 'primary',
      title: `${nextAction} Akun Pegawai`,
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
          void fetchEmployees(currentPage, {
            search,
            role: apiRole,
            status: apiUserStatus,
            unitId: selectedUnitId,
          });
        } else {
          useFeedbackStore.getState().showToast({
            type: 'error',
            message: `Gagal ${nextAction.toLowerCase()} akun pegawai.`,
          });
        }
      },
    });
  };

  const handleAddUnit = () => {
    if (onNavigateAddUnit) {
      onNavigateAddUnit();
    } else {
      useFeedbackStore.getState().showToast({
        type: 'info',
        message: 'Membuka formulir pendaftaran unit kerja baru...',
      });
    }
  };

  const handleEditUnit = (unit: ApiUnitRecord) => {
    if (onNavigateEditUnit) {
      onNavigateEditUnit(unit.id);
    } else {
      useFeedbackStore.getState().showToast({
        type: 'info',
        message: `Membuka formulir pembaruan data ${unit.nama_unit}...`,
      });
    }
  };

  const handleToggleUnitStatus = (unit: ApiUnitRecord) => {
    const nextAction = unit.is_active ? 'Nonaktifkan' : 'Aktifkan';
    useFeedbackStore.getState().showModal({
      type: 'confirm',
      confirmVariant: unit.is_active ? 'destructive' : 'primary',
      title: `${nextAction} Unit Kerja`,
      message: `Apakah Anda yakin ingin ${nextAction.toLowerCase()} unit "${unit.nama_unit}" (${unit.kode_unit})?`,
      confirmText: nextAction,
      cancelText: 'Batal',
      onConfirm: async () => {
        const updated = await toggleUnitStatus(unit.id);
        if (updated) {
          useFeedbackStore.getState().showToast({
            type: 'success',
            message: `Unit kerja ${unit.nama_unit} berhasil di-${nextAction.toLowerCase()}.`,
          });
          void fetchUnits(unitsCurrentPage, false, {
            search: unitSearch,
            status: apiUnitStatus,
          });
          if (isAdministrator) {
            void fetchAllUnits({ activeOnly: false });
          }
        } else {
          useFeedbackStore.getState().showToast({
            type: 'error',
            message: `Gagal ${nextAction.toLowerCase()} unit kerja.`,
          });
        }
      },
    });
  };

  const handleDeleteUnit = (unit: ApiUnitRecord) => {
    const hasUsers = typeof unit.users_count === 'number' && unit.users_count > 0;
    const hasAgendas = typeof unit.agendas_count === 'number' && unit.agendas_count > 0;
    if (hasUsers || hasAgendas) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: 'Unit kerja yang masih memiliki pegawai atau agenda rapat tidak dapat dihapus.',
      });
      return;
    }

    useFeedbackStore.getState().showModal({
      type: 'confirm',
      confirmVariant: 'destructive',
      title: 'Hapus Unit Kerja',
      message: `Apakah Anda yakin ingin menghapus unit kerja "${unit.nama_unit}" (${unit.kode_unit})? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Unit',
      cancelText: 'Batal',
      onConfirm: async () => {
        const success = await deleteUnit(unit.id);
        if (success) {
          useFeedbackStore.getState().showToast({
            type: 'success',
            message: `Unit kerja ${unit.nama_unit} berhasil dihapus.`,
          });
          const targetPage =
            apiUnits.length <= 1 && unitsCurrentPage > 1
              ? unitsCurrentPage - 1
              : unitsCurrentPage;
          void fetchUnits(targetPage, false, {
            search: unitSearch,
            status: apiUnitStatus,
          });
          if (isAdministrator) {
            void fetchAllUnits({ activeOnly: false });
          }
        } else {
          useFeedbackStore.getState().showToast({
            type: 'error',
            message: 'Gagal menghapus unit kerja. Silakan coba beberapa saat lagi.',
          });
        }
      },
    });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > lastPage || page === currentPage || employeesLoading) return;
    triggerPageTransition(400);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    void fetchEmployees(page, {
      search,
      role: apiRole,
      status: apiUserStatus,
      unitId: selectedUnitId,
    });
  };

  const handleUnitsPageChange = (page: number) => {
    if (page < 1 || page > unitsLastPage || page === unitsCurrentPage || unitsLoading) return;
    triggerPageTransition(400);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    void fetchUnits(page, false, {
      search: unitSearch,
      status: apiUnitStatus,
    });
  };

  const filteredASN = employeeList;

  return (
    <View style={styles.container}>
      <Header
        title={
          activeTab === 'asn'
            ? isAdministrator
              ? 'Kelola Seluruh Pengguna'
              : `Pegawai Unit: ${authUser?.unitKerja || 'Unit Kerja'}`
            : 'Master Unit Kerja'
        }
        subtitle={
          activeTab === 'asn'
            ? 'Daftar aparatur dan staf terdaftar di sistem presensi'
            : `Administrasi ${totalCount} ASN & ${unitTotalCount} Unit Kerja`
        }
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={activeTab === 'asn' ? employeesLoading : unitsLoading}
            onRefresh={() =>
              activeTab === 'asn'
                ? fetchEmployees(1, {
                    search,
                    role: apiRole,
                    status: apiUserStatus,
                    unitId: selectedUnitId,
                  })
                : fetchUnits(1, false, { search: unitSearch, status: apiUnitStatus })
            }
          />
        }
      >
        {/* 3 GLOBAL SERVER METRIC CARDS (Aligned with Web users/index & units/index) */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <View style={styles.statIconBox}>
                {activeTab === 'asn' ? (
                  <Users size={15} strokeWidth={2} color={colors.onPrimary} />
                ) : (
                  <Building2 size={15} strokeWidth={2} color={colors.onPrimary} />
                )}
              </View>
              <Text style={styles.statValue}>
                {activeTab === 'asn' ? totalCount : unitTotalCount}
              </Text>
            </View>
            <Text style={styles.statLabel} numberOfLines={2}>
              {activeTab === 'asn'
                ? isAdministrator
                  ? 'Total Pengguna'
                  : 'Pegawai di Unit'
                : 'Total Unit'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <View style={[styles.statIconBox, styles.statIconSuccess]}>
                <CheckCircle2 size={15} strokeWidth={2} color={colors.success} />
              </View>
              <Text style={styles.statValue}>
                {activeTab === 'asn' ? activeCount : unitActiveCount}
              </Text>
            </View>
            <Text style={styles.statLabel} numberOfLines={2}>
              {activeTab === 'asn' ? 'Akun Aktif' : 'Unit Aktif'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <View style={[styles.statIconBox, styles.statIconDanger]}>
                <Ban size={15} strokeWidth={2} color={colors.error} />
              </View>
              <Text style={styles.statValue}>
                {activeTab === 'asn' ? inactiveCount : unitInactiveCount}
              </Text>
            </View>
            <Text style={styles.statLabel} numberOfLines={2}>
              {activeTab === 'asn' ? 'Akun Non-Aktif' : 'Unit Non-Aktif'}
            </Text>
          </View>
        </View>

        {/* TAB SWITCHER SEGMENTED CONTROL */}
        <View style={styles.segmentedContainer}>
          <Pressable
            onPress={() => setActiveTab('asn')}
            style={[
              styles.segmentedBtn,
              activeTab === 'asn' && styles.segmentedBtnActive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'asn' }}
          >
            <Text
              style={[
                styles.segmentedBtnText,
                activeTab === 'asn' && styles.segmentedBtnTextActive,
              ]}
            >
              Data Pegawai ASN ({totalCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('units')}
            style={[
              styles.segmentedBtn,
              activeTab === 'units' && styles.segmentedBtnActive,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'units' }}
          >
            <Text
              style={[
                styles.segmentedBtnText,
                activeTab === 'units' && styles.segmentedBtnTextActive,
              ]}
            >
              Master Unit Kerja ({unitTotalCount})
            </Text>
          </Pressable>
        </View>

        {/* PRIMARY OPERATIONAL ACTION BAR */}
        {activeTab === 'asn' || isAdministrator ? (
          <Pressable
            onPress={activeTab === 'asn' ? handleAddEmployee : handleAddUnit}
            style={({ pressed }) => [
              styles.primaryAddBtn,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              activeTab === 'asn'
                ? 'Tambah Pengguna'
                : 'Tambah Unit Kerja Baru'
            }
          >
            {activeTab === 'asn' ? (
              <UserPlus size={18} strokeWidth={2} color={colors.onPrimary} />
            ) : (
              <Building2 size={18} strokeWidth={2} color={colors.onPrimary} />
            )}
            <Text style={styles.primaryAddBtnText}>
              {activeTab === 'asn'
                ? 'Tambah Pengguna'
                : 'Tambah Unit Kerja Baru'}
            </Text>
          </Pressable>
        ) : null}

        {activeTab === 'asn' ? (
          <>
            {/* SEARCH FIELD */}
            <View style={styles.searchBox}>
              <Search size={18} strokeWidth={2} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari NIP, nama, atau username..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <Pressable
                  onPress={() => setSearch('')}
                  style={styles.searchClearBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Bersihkan pencarian pegawai"
                >
                  <X size={17} strokeWidth={2} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* ROLE FILTER PILLS */}
            <View style={styles.filterScrollRow}>
              <Text style={styles.filterLabel}>Role:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsContainer}
              >
                {roles.map((r) => {
                  const active = selectedRole === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setSelectedRole(r)}
                      style={[
                        styles.roleChip,
                        active && styles.roleChipActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          active && styles.roleChipTextActive,
                        ]}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* STATUS FILTER PILLS */}
            <View style={styles.filterScrollRow}>
              <Text style={styles.filterLabel}>Status:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsContainer}
              >
                {statusOptions.map((st) => {
                  const active = selectedStatus === st;
                  return (
                    <Pressable
                      key={st}
                      onPress={() => setSelectedStatus(st)}
                      style={[
                        styles.roleChip,
                        active && styles.roleChipActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          active && styles.roleChipTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* UNIT FILTER CHIPS */}
            {isAdministrator ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.unitChipsContainer}
              >
                {unitFilterOptions.map((u) => {
                  const active = selectedUnit === u;
                  return (
                    <Pressable
                      key={u}
                      onPress={() => setSelectedUnit(u)}
                      style={[
                        styles.unitChip,
                        active && styles.unitChipActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[
                          styles.unitChipText,
                          active && styles.unitChipTextActive,
                        ]}
                      >
                        {u}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* DIRECTORY LIST HEADER */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.listHeaderTitle}>
                Daftar Pegawai{' '}
                <Text style={styles.listHeaderSub}>
                  ({filteredASN.length} dari {total} ASN)
                </Text>
              </Text>
              {hasActiveUserFilters ? (
                <Pressable
                  onPress={handleResetUserFilters}
                  style={({ pressed }) => [
                    styles.resetFilterBtn,
                    pressed && styles.btnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Reset filter pegawai"
                >
                  <RotateCcw size={13} strokeWidth={2} color={colors.primary} />
                  <Text style={styles.resetFilterBtnText}>Reset</Text>
                </Pressable>
              ) : null}
            </View>

            {employeesError ? (
              <ErrorState
                message={employeesError}
                onRetry={() =>
                  fetchEmployees(1, {
                    search,
                    role: apiRole,
                    status: apiUserStatus,
                    unitId: selectedUnitId,
                  })
                }
              />
            ) : null}
            {!employeesError && employeesLoading && employees.length === 0 ? (
              <ActivityIndicator color={colors.primary} />
            ) : null}

            {/* ASN CARDS */}
            <View style={styles.cardsContainer}>
              {filteredASN.map((item) => {
                const isSelf = authUser != null && String(item.id) === String(authUser.id);
                const canDeleteUser =
                  !isSelf && (item.role !== 'Administrator' || isAdministrator);

                return (
                  <View key={item.id} style={styles.asnCard}>
                    <View style={styles.asnCardTop}>
                      <View style={styles.asnAvatar}>
                        <Text style={styles.asnAvatarText}>{item.initials}</Text>
                      </View>
                      <View style={styles.asnMainInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.asnName}>{item.name}</Text>
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>{item.role}</Text>
                          </View>
                          <View
                            style={[
                              styles.unitStatusBadge,
                              item.status === 'Aktif'
                                ? styles.unitStatusActive
                                : styles.unitStatusInactive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.unitStatusText,
                                item.status === 'Aktif'
                                  ? styles.unitStatusTextActive
                                  : styles.unitStatusTextInactive,
                              ]}
                            >
                              {item.status}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.nipRow}>
                          <CreditCard size={14} strokeWidth={2} color={colors.textMuted} />
                          <Text style={styles.nipText}>{item.nip}</Text>
                          <Text style={styles.dividerDot}>•</Text>
                          <Text style={styles.usernameText}>{item.username}</Text>
                        </View>

                        <View style={styles.unitRow}>
                          <Building2 size={14} strokeWidth={2} color={colors.textMuted} />
                          <Text style={styles.unitText}>
                            {item.unit || NO_UNIT_FILTER}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.asnCardBottom}>
                      <Text style={styles.cardBottomMeta}>
                        {item.lastLogin
                          ? `Login: ${item.lastLogin}`
                          : item.attendanceRate
                          ? `Presensi: ${item.attendanceRate} (${item.totalMeetings} Rapat)`
                          : `Status: ${item.status}`}
                      </Text>

                      <View style={styles.cardActions}>
                        {!isSelf ? (
                          <Pressable
                            onPress={() => handleToggleEmployeeStatus(item)}
                            style={({ pressed }) => [
                              item.status === 'Aktif'
                                ? styles.cardActionWarnBtn
                                : styles.cardActionSuccessBtn,
                              pressed && styles.btnPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`${
                              item.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'
                            } akun ${item.name}`}
                          >
                            <Power
                              size={14}
                              strokeWidth={2}
                              color={
                                item.status === 'Aktif'
                                  ? colors.onWarningContainer
                                  : colors.onSuccessContainer
                              }
                            />
                            <Text
                              style={
                                item.status === 'Aktif'
                                  ? styles.cardActionWarnBtnText
                                  : styles.cardActionSuccessBtnText
                              }
                            >
                              {item.status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                            </Text>
                          </Pressable>
                        ) : null}

                        {canDeleteUser ? (
                          <Pressable
                            onPress={() => handleDeleteEmployee(item)}
                            style={({ pressed }) => [
                              styles.cardActionDeleteBtn,
                              pressed && styles.btnPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Hapus akun pegawai ${item.name}`}
                          >
                            <Trash2 size={14} strokeWidth={2} color={colors.error} />
                            <Text style={styles.cardActionDeleteBtnText}>Hapus</Text>
                          </Pressable>
                        ) : null}

                        <Pressable
                          onPress={() => {
                            if (onNavigateEdit) {
                              onNavigateEdit(item.id);
                            } else {
                              useFeedbackStore.getState().showToast({
                                type: 'info',
                                message: `Membuka formulir pembaruan data ${item.name}...`,
                              });
                            }
                          }}
                          style={({ pressed }) => [
                            styles.cardActionBtn,
                            pressed && styles.btnPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit pegawai ${item.name}`}
                        >
                          <Pencil size={14} strokeWidth={2} color={colors.primary} />
                          <Text style={styles.cardActionBtnTextPrimary}>Edit</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
              {!employeesLoading && !employeesError && filteredASN.length === 0 ? (
                <Text style={styles.emptyDirectory}>
                  Tidak ada pegawai yang cocok.
                </Text>
              ) : null}
            </View>

            {/* PAGINATION CONTROLS (PEGAWAI ASN) */}
            {total > 0 ? (
              <PaginationBar
                currentPage={currentPage}
                lastPage={lastPage}
                total={total}
                label="Pegawai"
                isLoading={employeesLoading}
                onPageChange={handlePageChange}
              />
            ) : null}
          </>
        ) : (
          /* MASTER UNIT KERJA LIST */
          <>
            {/* SEARCH FIELD UNIT */}
            <View style={styles.searchBox}>
              <Search size={18} strokeWidth={2} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama atau kode unit..."
                placeholderTextColor={colors.textMuted}
                value={unitSearch}
                onChangeText={setUnitSearch}
              />
              {unitSearch ? (
                <Pressable
                  onPress={() => setUnitSearch('')}
                  style={styles.searchClearBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Bersihkan pencarian unit"
                >
                  <X size={17} strokeWidth={2} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* STATUS FILTER UNIT */}
            <View style={styles.filterScrollRow}>
              <Text style={styles.filterLabel}>Status:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipsContainer}
              >
                {statusOptions.map((st) => {
                  const active = selectedUnitStatus === st;
                  return (
                    <Pressable
                      key={st}
                      onPress={() => setSelectedUnitStatus(st)}
                      style={[
                        styles.roleChip,
                        active && styles.roleChipActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          active && styles.roleChipTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.listHeaderRow}>
              <Text style={styles.listHeaderTitle}>
                Daftar Unit Kerja{' '}
                <Text style={styles.listHeaderSub}>
                  ({apiUnits.length} dari {unitsTotal} Unit)
                </Text>
              </Text>
              {hasActiveUnitFilters ? (
                <Pressable
                  onPress={handleResetUnitFilters}
                  style={({ pressed }) => [
                    styles.resetFilterBtn,
                    pressed && styles.btnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Reset filter unit kerja"
                >
                  <RotateCcw size={13} strokeWidth={2} color={colors.primary} />
                  <Text style={styles.resetFilterBtnText}>Reset</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.cardsContainer}>
              {unitsError ? (
                <ErrorState
                  message={unitsError}
                  onRetry={() =>
                    fetchUnits(1, false, { search: unitSearch, status: apiUnitStatus })
                  }
                />
              ) : null}
              {unitsLoading && apiUnits.length === 0 ? (
                <ActivityIndicator color={colors.primary} />
              ) : null}
              {apiUnits.map((unit) => {
                const canDeleteUnit =
                  (unit.users_count ?? 0) === 0 && (unit.agendas_count ?? 0) === 0;

                return (
                  <View key={unit.id} style={styles.unitMasterCard}>
                    <View style={styles.unitMasterCardTop}>
                      <View style={styles.unitMasterIcon}>
                        <Building2 size={20} strokeWidth={2} color={colors.primary} />
                      </View>
                      <View style={styles.unitMasterMainInfo}>
                        <View style={styles.unitCodeRow}>
                          <Text style={styles.unitMasterCode}>{unit.kode_unit}</Text>
                          <View
                            style={[
                              styles.unitStatusBadge,
                              unit.is_active
                                ? styles.unitStatusActive
                                : styles.unitStatusInactive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.unitStatusText,
                                unit.is_active
                                  ? styles.unitStatusTextActive
                                  : styles.unitStatusTextInactive,
                              ]}
                            >
                              {unit.is_active ? 'Aktif' : 'Nonaktif'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.unitMasterName}>{unit.nama_unit}</Text>
                        {unit.deskripsi ? (
                          <Text style={styles.unitDescription} numberOfLines={2}>
                            {unit.deskripsi}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.unitBadgesCol}>
                        <View style={styles.unitMasterCountBadge}>
                          <Users size={12} strokeWidth={2} color={colors.primary} />
                          <Text style={styles.unitMasterCountText}>
                            {unit.users_count ?? 0} ASN
                          </Text>
                        </View>
                        <View style={styles.unitMasterCountBadge}>
                          <FileText size={12} strokeWidth={2} color={colors.primary} />
                          <Text style={styles.unitMasterCountText}>
                            {unit.agendas_count ?? 0} Rapat
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.unitCardBottom}>
                      <View style={styles.unitDateMeta}>
                        <Calendar size={12} strokeWidth={2} color={colors.textMuted} />
                        <Text style={styles.cardBottomMeta}>
                          Dibuat: {formatUnitDate(unit.created_at)}
                        </Text>
                      </View>

                      <View style={styles.cardActions}>
                        {isAdministrator ? (
                          <>
                            <Pressable
                              onPress={() => handleToggleUnitStatus(unit)}
                              style={({ pressed }) => [
                                unit.is_active
                                  ? styles.cardActionWarnBtn
                                  : styles.cardActionSuccessBtn,
                                pressed && styles.btnPressed,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`${
                                unit.is_active ? 'Nonaktifkan' : 'Aktifkan'
                              } unit ${unit.nama_unit}`}
                            >
                              <Power
                                size={14}
                                strokeWidth={2}
                                color={
                                  unit.is_active
                                    ? colors.onWarningContainer
                                    : colors.onSuccessContainer
                                }
                              />
                              <Text
                                style={
                                  unit.is_active
                                    ? styles.cardActionWarnBtnText
                                    : styles.cardActionSuccessBtnText
                                }
                              >
                                {unit.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                              </Text>
                            </Pressable>
                            {canDeleteUnit ? (
                              <Pressable
                                onPress={() => handleDeleteUnit(unit)}
                                style={({ pressed }) => [
                                  styles.cardActionDeleteBtn,
                                  pressed && styles.btnPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Hapus unit kerja ${unit.nama_unit}`}
                              >
                                <Trash2 size={14} strokeWidth={2} color={colors.error} />
                                <Text style={styles.cardActionDeleteBtnText}>
                                  Hapus
                                </Text>
                              </Pressable>
                            ) : null}
                            <Pressable
                              onPress={() => handleEditUnit(unit)}
                              style={({ pressed }) => [
                                styles.cardActionBtn,
                                pressed && styles.btnPressed,
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`Edit unit kerja ${unit.nama_unit}`}
                            >
                              <Pencil size={14} strokeWidth={2} color={colors.primary} />
                              <Text style={styles.cardActionBtnTextPrimary}>
                                Edit
                              </Text>
                            </Pressable>
                          </>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
              {!unitsLoading && !unitsError && apiUnits.length === 0 ? (
                <Text style={styles.emptyDirectory}>
                  Tidak ada unit kerja yang cocok.
                </Text>
              ) : null}

              {/* PAGINATION CONTROLS (UNIT KERJA) */}
              {unitsTotal > 0 ? (
                <PaginationBar
                  currentPage={unitsCurrentPage}
                  lastPage={unitsLastPage}
                  total={unitsTotal}
                  label="Unit Kerja"
                  isLoading={unitsLoading}
                  onPageChange={handleUnitsPageChange}
                />
              ) : null}
            </View>
          </>
        )}
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
    gap: spacing.sm + 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    ...cardSurface,
    flex: 1,
    borderRadius: rounded.card,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 88,
    gap: 8,
    overflow: 'hidden',
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  statIconBox: {
    width: 30,
    height: 30,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconSuccess: {
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  statIconDanger: {
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  statValue: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.monoBold,
    fontSize: 19,
    lineHeight: 22,
    color: colors.primary,
  },
  statLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10.5,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.lg,
    padding: 3,
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  segmentedBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: rounded.md,
    alignItems: 'center',
  },
  segmentedBtnActive: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  segmentedBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  segmentedBtnTextActive: {
    color: colors.primary,
    fontFamily: fontFamilies.sansBold,
  },
  primaryAddBtn: {
    minHeight: MIN_TOUCH_TARGET + 2,
    backgroundColor: colors.primary,
    borderRadius: rounded.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryAddBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    color: colors.onPrimary,
  },
  searchBox: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    minHeight: MIN_TOUCH_TARGET,
    fontSize: 12.5,
    color: colors.onSurface,
  },
  searchClearBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  roleChip: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  roleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
  },
  roleChipTextActive: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.sansBold,
  },
  unitChipsContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  unitChip: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
  },
  unitChipActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  unitChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  unitChipTextActive: {
    color: colors.primary,
    fontFamily: fontFamilies.sansBold,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  listHeaderTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  listHeaderSub: {
    fontFamily: fontFamilies.sansRegular,
    color: colors.onSurfaceVariant,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 10,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
  },
  resetFilterBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    color: colors.primary,
  },
  cardsContainer: {
    gap: 10,
  },
  emptyDirectory: {
    ...typography.bodySm,
    textAlign: 'center',
    color: colors.onSurfaceVariant,
    padding: spacing.md,
  },
  asnCard: {
    ...cardSurface,
    borderRadius: rounded.card,
    padding: spacing.sm + 4,
    overflow: 'hidden',
  },
  asnCardTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  asnAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  asnAvatarText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    color: colors.primary,
  },
  asnMainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  asnName: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13.5,
    color: colors.onSurface,
  },
  roleBadge: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  roleBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10,
    color: colors.primary,
  },
  nipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  nipText: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  dividerDot: {
    ...typography.labelSm,
    color: colors.borderStrong,
    fontSize: 10,
    marginHorizontal: 2,
  },
  usernameText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  unitText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  asnCardBottom: {
    flexDirection: 'column',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: 10,
    paddingTop: 10,
    gap: spacing.xs + 2,
  },
  cardBottomMeta: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  cardActionBtnTextPrimary: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11.5,
    color: colors.primary,
  },
  cardActionWarnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningContainer,
  },
  cardActionWarnBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11.5,
    color: colors.onWarningContainer,
  },
  cardActionSuccessBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.successBorder,
    backgroundColor: colors.successContainer,
  },
  cardActionSuccessBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11.5,
    color: colors.onSuccessContainer,
  },
  cardActionDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorContainer,
  },
  cardActionDeleteBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11.5,
    color: colors.error,
  },
  unitMasterCard: {
    ...cardSurface,
    borderRadius: rounded.card,
    padding: spacing.sm + 4,
    overflow: 'hidden',
  },
  unitMasterCardTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  unitMasterIcon: {
    width: 40,
    height: 40,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  unitMasterMainInfo: {
    flex: 1,
  },
  unitCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitMasterCode: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 12,
    color: colors.primary,
  },
  unitStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    borderWidth: 1,
  },
  unitStatusActive: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  unitStatusInactive: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.errorBorder,
  },
  unitStatusText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10,
  },
  unitStatusTextActive: {
    color: colors.onSuccessContainer,
  },
  unitStatusTextInactive: {
    color: colors.onErrorContainer,
  },
  unitMasterName: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 13,
    color: colors.onSurface,
    marginTop: 3,
  },
  unitDescription: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 3,
    lineHeight: 15,
  },
  unitBadgesCol: {
    gap: 4,
    alignItems: 'flex-end',
  },
  unitMasterCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  unitMasterCountText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10.5,
    color: colors.primary,
  },
  unitCardBottom: {
    flexDirection: 'column',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: 10,
    paddingTop: 10,
    gap: spacing.xs + 2,
  },
  unitDateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  btnPressed: {
    opacity: 0.8,
  },
});
