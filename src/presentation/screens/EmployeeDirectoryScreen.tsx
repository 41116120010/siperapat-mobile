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
  ArrowUpDown,
  Ban,
  Building2,
  CheckCircle2,
  CreditCard,
  Pencil,
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
import { ApiUnitDto } from '../../data/datasources/apiTypes';
import { useAuthStore } from '../store/useAuthStore';

interface EmployeeDirectoryScreenProps {
  onBack?: () => void;
  onNavigateAdd?: () => void;
  onNavigateEdit?: (employeeId: string) => void;
  onNavigateAddUnit?: () => void;
  onNavigateEditUnit?: (unitId: number | string) => void;
}

export const EmployeeDirectoryScreen: React.FC<EmployeeDirectoryScreenProps> = ({
  onBack,
  onNavigateAdd,
  onNavigateEdit,
  onNavigateAddUnit,
  onNavigateEditUnit,
}) => {
  const role = useAuthStore((state) => state.user?.role);
  const isAdministrator = role === 'administrator';
  const {
    employees,
    units: apiUnits,
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
    deleteEmployee,
    deleteUnit,
  } = useEmployeeStore();

  const [activeTab, setActiveTab] = useState<'asn' | 'units'>('asn');
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('Semua Role');
  const [selectedUnit, setSelectedUnit] = useState('Semua Unit');
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);

  useEffect(() => {
    void fetchUnits(1);
  }, [fetchUnits]);

  const selectedUnitId = isAdministrator
    ? apiUnits.find((item) => item.nama_unit === selectedUnit)?.id
    : undefined;
  const apiRole =
    selectedRole === 'Semua Role'
      ? undefined
      : selectedRole === 'Administrator'
      ? 'administrator'
      : selectedRole === 'Admin Unit'
      ? 'admin'
      : 'staff';

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEmployees(1, { search, role: apiRole, unitId: selectedUnitId });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, apiRole, selectedUnitId, fetchEmployees]);

  const employeeList = employees;
  const totalCount = total;
  const activeCount = employeeList.filter((e) => e.status === 'Aktif').length;
  const inactiveCount = employeeList.filter((e) => e.status === 'Nonaktif').length;

  const roles = ['Semua Role', 'Administrator', 'Admin Unit', 'Staff'];
  const units = ['Semua Unit', ...apiUnits.map((unit) => unit.nama_unit)];

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
          void fetchEmployees(targetPage, { search, role: apiRole, unitId: selectedUnitId });
        } else {
          useFeedbackStore.getState().showToast({
            type: 'error',
            message: 'Gagal menghapus pegawai. Silakan coba beberapa saat lagi.',
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

  const handleEditUnit = (unit: ApiUnitDto) => {
    if (onNavigateEditUnit) {
      onNavigateEditUnit(unit.id);
    } else {
      useFeedbackStore.getState().showToast({
        type: 'info',
        message: `Membuka formulir pembaruan data ${unit.nama_unit}...`,
      });
    }
  };

  const handleDeleteUnit = (unit: ApiUnitDto) => {
    const hasUsers = typeof unit.users_count === 'number' && unit.users_count > 0;
    useFeedbackStore.getState().showModal({
      type: 'confirm',
      confirmVariant: 'destructive',
      title: 'Hapus Unit Kerja',
      message: hasUsers
        ? `Perhatian: Unit kerja "${unit.nama_unit}" (${unit.kode_unit}) memiliki ${unit.users_count} pegawai ASN terdaftar. Menghapus unit ini dapat mempengaruhi data pegawai terkait. Lanjutkan penghapusan?`
        : `Apakah Anda yakin ingin menghapus unit kerja "${unit.nama_unit}" (${unit.kode_unit})? Tindakan ini tidak dapat dibatalkan.`,
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
          void fetchUnits(targetPage);
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
    void fetchEmployees(page, { search, role: apiRole, unitId: selectedUnitId });
  };

  const handleUnitsPageChange = (page: number) => {
    if (page < 1 || page > unitsLastPage || page === unitsCurrentPage || unitsLoading) return;
    triggerPageTransition(400);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    void fetchUnits(page);
  };

  const filteredASN = employeeList;

  return (
    <View style={styles.container}>
      <Header
        title="Kelola Pegawai & Unit Kerja"
        subtitle={`Administrasi ${totalCount} ASN & ${unitsTotal} Unit Kerja`}
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
                ? fetchEmployees(1, { search, role: apiRole, unitId: selectedUnitId })
                : fetchUnits(1)
            }
          />
        }
      >
        {/* 3 REAL METRIC CARDS (Aligned with Web users/index.blade.php) */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <View style={styles.statIconBox}>
                <Users size={15} strokeWidth={2} color={colors.onPrimary} />
              </View>
              <Text style={styles.statValue}>{totalCount}</Text>
            </View>
            <Text style={styles.statLabel} numberOfLines={2}>
              {isAdministrator ? 'Total Pengguna' : 'Pegawai di Unit'}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <View style={[styles.statIconBox, styles.statIconSuccess]}>
                <CheckCircle2 size={15} strokeWidth={2} color={colors.success} />
              </View>
              <Text style={styles.statValue}>{activeCount}</Text>
            </View>
            <Text style={styles.statLabel} numberOfLines={2}>
              Akun Aktif
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <View style={[styles.statIconBox, styles.statIconDanger]}>
                <Ban size={15} strokeWidth={2} color={colors.error} />
              </View>
              <Text style={styles.statValue}>{inactiveCount}</Text>
            </View>
            <Text style={styles.statLabel} numberOfLines={2}>
              Akun Non-Aktif
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
              Master Unit Kerja ({unitsTotal})
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
                ? 'Tambah Pegawai Baru'
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
                ? 'Tambah Pegawai Baru'
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

            {/* UNIT FILTER CHIPS */}
            {isAdministrator ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.unitChipsContainer}
              >
                {units.map((u) => {
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
                  ({filteredASN.length} ASN)
                </Text>
              </Text>
              <View style={styles.sortBtn}>
                <Text style={styles.sortBtnText}>Urutkan Abjad</Text>
                <ArrowUpDown size={15} strokeWidth={2} color={colors.secondary} />
              </View>
            </View>

            {employeesError ? (
              <ErrorState
                message={employeesError}
                onRetry={() =>
                  fetchEmployees(1, { search, role: apiRole, unitId: selectedUnitId })
                }
              />
            ) : null}
            {!employeesError && employeesLoading && employees.length === 0 ? (
              <ActivityIndicator color={colors.primary} />
            ) : null}

            {/* ASN CARDS */}
            <View style={styles.cardsContainer}>
              {filteredASN.map((item) => (
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
                      </View>

                      <View style={styles.nipRow}>
                        <CreditCard size={14} strokeWidth={2} color={colors.textMuted} />
                        <Text style={styles.nipText}>{item.nip}</Text>
                        <Text style={styles.dividerDot}>•</Text>
                        <Text style={styles.usernameText}>{item.username}</Text>
                      </View>

                      <View style={styles.unitRow}>
                        <Building2 size={14} strokeWidth={2} color={colors.textMuted} />
                        <Text style={styles.unitText}>{item.unit}</Text>
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
              ))}
              {!employeesLoading && !employeesError && filteredASN.length === 0 ? (
                <Text style={styles.emptyDirectory}>
                  Tidak ada pegawai yang cocok.
                </Text>
              ) : null}
            </View>

            {/* PAGINATION CONTROLS (PEGAWAI ASN) */}
            {totalCount > 0 ? (
              <PaginationBar
                currentPage={currentPage}
                lastPage={lastPage}
                total={totalCount}
                label="Pegawai"
                isLoading={employeesLoading}
                onPageChange={handlePageChange}
              />
            ) : null}
          </>
        ) : (
          /* MASTER UNIT KERJA LIST */
          <View style={styles.cardsContainer}>
            {unitsError ? (
              <ErrorState message={unitsError} onRetry={() => fetchUnits(1)} />
            ) : null}
            {unitsLoading && apiUnits.length === 0 ? (
              <ActivityIndicator color={colors.primary} />
            ) : null}
            {apiUnits.map((unit) => (
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
                  <View style={styles.unitMasterCountBadge}>
                    <Users size={12} strokeWidth={2} color={colors.primary} />
                    <Text style={styles.unitMasterCountText}>
                      {unit.users_count ?? 0} ASN
                    </Text>
                  </View>
                </View>

                <View style={styles.unitCardBottom}>
                  <Text style={styles.cardBottomMeta}>ID: {unit.id}</Text>

                  <View style={styles.cardActions}>
                    {isAdministrator ? (
                      <>
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
            ))}
            {!unitsLoading && !unitsError && apiUnits.length === 0 ? (
              <Text style={styles.emptyDirectory}>Belum ada unit kerja.</Text>
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
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    color: colors.secondary,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: 10,
    paddingTop: 10,
    gap: spacing.sm,
  },
  cardBottomMeta: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    marginTop: 10,
    paddingTop: 10,
  },
  btnPressed: {
    opacity: 0.8,
  },
});
