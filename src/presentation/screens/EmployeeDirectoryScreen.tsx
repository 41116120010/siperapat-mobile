import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ScrollViewInstance,
  Pressable,
  TextInput,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
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

  const selectedUnitId = isAdministrator ? apiUnits.find((item) => item.nama_unit === selectedUnit)?.id : undefined;
  const apiRole = selectedRole === 'Semua Role' ? undefined : selectedRole === 'Administrator' ? 'administrator' : selectedRole === 'Admin Unit' ? 'admin' : 'staff';

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEmployees(1, { search, role: apiRole, unitId: selectedUnitId });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, apiRole, selectedUnitId, fetchEmployees]);

  const employeeList = employees;
  const totalCount = total;
  const adminCount = employeeList.filter(
    (e) => e.role === 'Administrator' || e.role === 'Admin Unit'
  ).length;
  const staffCount = employeeList.filter((e) => e.role === 'Staff').length;
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
          const targetPage = employees.length <= 1 && currentPage > 1 ? currentPage - 1 : currentPage;
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
        refreshControl={<RefreshControl refreshing={activeTab === 'asn' ? employeesLoading : unitsLoading} onRefresh={() => activeTab === 'asn' ? fetchEmployees(1, { search, role: apiRole, unitId: selectedUnitId }) : fetchUnits(1)} />}
      >
        {/* 4 BENTO STATS CARDS */}
        <View style={styles.bentoGrid}>
          <View style={styles.bentoCol}>
            <View style={styles.bentoTop}>
              <Text style={styles.bentoLabel}>Total Pegawai</Text>
              <MaterialIcons name="group" size={16} color={colors.outline} />
            </View>
            <Text style={styles.bentoValue}>{totalCount}</Text>
            <Text style={styles.bentoSub}>{staffCount} Staf · {adminCount} Admin (halaman ini)</Text>
          </View>

          <View style={styles.bentoCol}>
            <View style={styles.bentoTop}>
              <Text style={styles.bentoLabel}>Unit Kerja Aktif</Text>
              <MaterialIcons
                name="account-tree"
                size={16}
                color={colors.outline}
              />
            </View>
            <Text style={styles.bentoValue}>{apiUnits.length ? apiUnits.filter((unit) => unit.is_active).length : '—'}</Text>
            <Text style={styles.bentoSub}>Unit aktif dimuat</Text>
          </View>

          <View style={styles.bentoCol}>
            <View style={styles.bentoTop}>
              <Text style={styles.bentoLabel}>Status Akun</Text>
              <MaterialIcons name="badge" size={16} color={colors.outline} />
            </View>
            <Text style={styles.bentoValue}>{activeCount}</Text>
            <Text style={styles.bentoSub}>{inactiveCount} Nonaktif (halaman ini)</Text>
          </View>

          <View style={styles.bentoCol}>
            <View style={styles.bentoTop}>
              <Text style={styles.bentoLabel}>Rerata Presensi</Text>
              <MaterialIcons
                name="analytics"
                size={16}
                color={colors.outline}
              />
            </View>
            <Text style={styles.bentoValue}>—</Text>
            <Text style={styles.bentoSub}>Belum tersedia di API</Text>
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
        {activeTab === 'asn' || isAdministrator ? <Pressable
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
          <MaterialIcons
            name={activeTab === 'asn' ? 'person-add' : 'domain-add'}
            size={18}
            color={colors.onPrimary}
          />
          <Text style={styles.primaryAddBtnText}>
            {activeTab === 'asn'
              ? 'Tambah Pegawai Baru'
              : 'Tambah Unit Kerja Baru'}
          </Text>
        </Pressable> : null}

        {activeTab === 'asn' ? (
          <>
            {/* SEARCH FIELD */}
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={20} color={colors.outline} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari NIP, nama, atau username..."
                placeholderTextColor={colors.outline}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <Pressable onPress={() => setSearch('')}>
                  <MaterialIcons name="cancel" size={18} color={colors.outline} />
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
                <MaterialIcons
                  name="swap-vert"
                  size={16}
                  color={colors.secondary}
                />
              </View>
            </View>

            {employeesError ? <ErrorState message={employeesError} onRetry={() => fetchEmployees(1, { search, role: apiRole, unitId: selectedUnitId })} /> : null}
            {!employeesError && employeesLoading && employees.length === 0 ? <ActivityIndicator color={colors.primary} /> : null}
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
                        <MaterialIcons
                          name="badge"
                          size={14}
                          color={colors.outline}
                        />
                        <Text style={styles.nipText}>{item.nip}</Text>
                        <Text style={styles.dividerDot}>•</Text>
                        <Text style={styles.usernameText}>{item.username}</Text>
                      </View>

                      <View style={styles.unitRow}>
                        <MaterialIcons
                          name="domain"
                          size={14}
                          color={colors.outline}
                        />
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
                        <MaterialIcons
                          name="delete-outline"
                          size={14}
                          color={colors.error}
                        />
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
                      >
                        <MaterialIcons
                          name="edit"
                          size={14}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.cardActionBtnText,
                            { color: colors.primary },
                          ]}
                        >
                          Edit
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
              {!employeesLoading && !employeesError && filteredASN.length === 0 ? <Text style={styles.emptyDirectory}>Tidak ada pegawai yang cocok.</Text> : null}
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
            {unitsError ? <ErrorState message={unitsError} onRetry={() => fetchUnits(1)} /> : null}
            {unitsLoading && apiUnits.length === 0 ? <ActivityIndicator color={colors.primary} /> : null}
            {apiUnits.map((unit) => (
              <View key={unit.id} style={styles.unitMasterCard}>
                <View style={styles.unitMasterCardTop}>
                  <View style={styles.unitMasterIcon}>
                    <MaterialIcons
                      name="domain"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.unitMasterMainInfo}>
                    <View style={styles.unitCodeRow}>
                      <Text style={styles.unitMasterCode}>{unit.kode_unit}</Text>
                      <View
                        style={[
                          styles.unitStatusBadge,
                          unit.is_active ? styles.unitStatusActive : styles.unitStatusInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitStatusText,
                            unit.is_active ? styles.unitStatusTextActive : styles.unitStatusTextInactive,
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
                    <MaterialIcons name="people" size={12} color={colors.primary} />
                    <Text style={styles.unitMasterCountText}>{unit.users_count ?? 0} ASN</Text>
                  </View>
                </View>

                <View style={styles.unitCardBottom}>
                  <Text style={styles.cardBottomMeta}>
                    ID: {unit.id}
                  </Text>

                  <View style={styles.cardActions}>
                    {isAdministrator ? <>
                    <Pressable
                      onPress={() => handleDeleteUnit(unit)}
                      style={({ pressed }) => [
                        styles.cardActionDeleteBtn,
                        pressed && styles.btnPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Hapus unit kerja ${unit.nama_unit}`}
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={14}
                        color={colors.error}
                      />
                      <Text style={styles.cardActionDeleteBtnText}>Hapus</Text>
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
                      <MaterialIcons
                        name="edit"
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.cardActionBtnText,
                          { color: colors.primary },
                        ]}
                      >
                        Edit
                      </Text>
                    </Pressable>
                    </> : null}
                  </View>
                </View>
              </View>
            ))}
            {!unitsLoading && !unitsError && apiUnits.length === 0 ? <Text style={styles.emptyDirectory}>Belum ada unit kerja.</Text> : null}

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
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bentoCol: {
    width: '48.5%',
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    justifyContent: 'space-between',
    minHeight: 80,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  bentoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoLabel: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  bentoValue: {
    ...typography.headlineMd,
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2,
  },
  bentoSub: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: 3,
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: rounded.sm,
    alignItems: 'center',
  },
  segmentedBtnActive: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  segmentedBtnText: {
    ...typography.labelMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  segmentedBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  primaryAddBtn: {
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: rounded.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  primaryAddBtnText: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  searchBox: {
    height: 44,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurface,
  },
  filterScrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  filterChipsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  roleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleChipText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  roleChipTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  unitChipsContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    backgroundColor: colors.surfaceCard,
  },
  unitChipActive: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.primary,
  },
  unitChipText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  unitChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  listHeaderTitle: {
    ...typography.headlineSm,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  listHeaderSub: {
    fontWeight: '400',
    color: colors.onSurfaceVariant,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sortBtnText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
  },
  cardsContainer: {
    gap: 8,
  },
  emptyDirectory: { textAlign: 'center', color: colors.onSurfaceVariant, padding: spacing.md },
  asnCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  asnCardTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  asnAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  asnAvatarText: {
    ...typography.labelMd,
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  roleBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  roleBadgeText: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.primary,
    fontWeight: '600',
  },
  nipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  nipText: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  dividerDot: {
    color: colors.outlineVariant,
    fontSize: 10,
    marginHorizontal: 2,
  },
  usernameText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
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
  },
  asnCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
    marginTop: 8,
    paddingTop: 8,
  },
  cardBottomMeta: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    backgroundColor: colors.surfaceCard,
  },
  cardActionBtnText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  cardActionDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.3)',
    backgroundColor: 'rgba(186, 26, 26, 0.05)',
  },
  cardActionDeleteBtnText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.error,
    fontWeight: '600',
  },
  unitMasterCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  unitMasterCardTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  unitMasterIcon: {
    width: 38,
    height: 38,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
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
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  unitStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  unitStatusActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  unitStatusInactive: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    borderColor: 'rgba(186, 26, 26, 0.25)',
  },
  unitStatusText: {
    ...typography.labelSm,
    fontSize: 9.5,
    fontWeight: '600',
  },
  unitStatusTextActive: {
    color: colors.success,
  },
  unitStatusTextInactive: {
    color: colors.error,
  },
  unitMasterName: {
    ...typography.headlineSm,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 2,
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
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  unitMasterCountText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.primary,
    fontWeight: '600',
  },
  unitCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
    marginTop: 8,
    paddingTop: 8,
  },
  btnPressed: {
    opacity: 0.8,
  },
});
