import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { useEmployeeStore } from '../store/useEmployeeStore';

interface ASNItem {
  id: string;
  initials: string;
  name: string;
  role: 'Administrator' | 'Admin Unit' | 'Staff';
  nip: string;
  username: string;
  unit: string;
  status: 'Aktif' | 'Nonaktif';
  attendanceRate?: string;
  totalMeetings?: number;
  lastLogin?: string;
  regDate?: string;
}

const ASN_DATA: ASNItem[] = [
  {
    id: 'asn-01',
    initials: 'AF',
    name: 'Afdalisma, SH, M.Pd',
    role: 'Administrator',
    nip: '197012051992032002',
    username: '@afdalisma',
    unit: 'Pimpinan & Lintas Unit (Pusat)',
    status: 'Aktif',
    lastLogin: 'Hari ini, 08:14 WIB',
  },
  {
    id: 'asn-02',
    initials: 'ES',
    name: 'Ely Susanti, SE, MM',
    role: 'Admin Unit',
    nip: '196708231991032001',
    username: '@ely_susanti',
    unit: 'Bagian Akademik & Kemahasiswaan',
    status: 'Aktif',
    attendanceRate: '98%',
    totalMeetings: 24,
  },
  {
    id: 'asn-03',
    initials: 'FF',
    name: 'Febrina Fitri, SE, M.Si',
    role: 'Staff',
    nip: '196502101991032002',
    username: '@febrina_fitri',
    unit: 'Bagian Sumber Daya Perguruan Tinggi',
    status: 'Aktif',
    regDate: 'Jan 2023 · Gol. IV/a',
  },
  {
    id: 'asn-04',
    initials: 'RA',
    name: 'Reri Anton, ST, MM',
    role: 'Staff',
    nip: '197003081991031001',
    username: '@reri_anton',
    unit: 'Pokja Pendidik & Tenaga Kependidikan',
    status: 'Aktif',
    regDate: 'Mar 2023 · Gol. III/d',
  },
];

const MASTER_UNITS = [
  { code: 'BAG-AKM', name: 'Bagian Akademik & Kemahasiswaan', count: '14 ASN' },
  { code: 'BAG-SDPT', name: 'Bagian Sumber Daya Perguruan Tinggi', count: '12 ASN' },
  { code: 'POKJA-PTK', name: 'Pokja Pendidik & Tenaga Kependidikan', count: '10 ASN' },
  { code: 'SUBBAG-HKTL', name: 'Subbag Hukum, Kepegawaian & Tata Laksana', count: '15 ASN' },
  { code: 'SUBBAG-TU', name: 'Subbag Tata Usaha & BMN', count: '18 ASN' },
  { code: 'POKJA-MUTU', name: 'Pokja Penjaminan Mutu & Akreditasi', count: '10 ASN' },
];

interface EmployeeDirectoryScreenProps {
  onBack?: () => void;
  onNavigateAdd?: () => void;
  onNavigateEdit?: (employeeId: string) => void;
}

export const EmployeeDirectoryScreen: React.FC<EmployeeDirectoryScreenProps> = ({
  onBack,
  onNavigateAdd,
  onNavigateEdit,
}) => {
  const { employees, fetchEmployees } = useEmployeeStore();
  const [activeTab, setActiveTab] = useState<'asn' | 'units'>('asn');
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('Semua Role');
  const [selectedUnit, setSelectedUnit] = useState('Semua Unit');

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const employeeList = employees.length > 0 ? employees : ASN_DATA;
  const totalCount = employeeList.length;
  const adminCount = employeeList.filter(
    (e) => e.role === 'Administrator' || e.role === 'Admin Unit'
  ).length;
  const staffCount = employeeList.filter((e) => e.role === 'Staff').length;
  const activeCount = employeeList.filter((e) => e.status === 'Aktif').length;
  const inactiveCount = employeeList.filter((e) => e.status === 'Nonaktif').length;

  const roles = ['Semua Role', 'Administrator', 'Admin Unit', 'Staff'];
  const units = [
    'Semua Unit',
    'Lintas Unit (1)',
    'Bagian Akademik (14)',
    'Sumber Daya PT (12)',
    'Pokja PTK (10)',
    'Hukum & TU (15)',
  ];

  const handleAddEmployee = () => {
    if (onNavigateAdd) {
      onNavigateAdd();
    } else {
      Alert.alert(
        'Tambah Pegawai ASN',
        'Formulir pendaftaran akun kedinasan baru akan dimuat.'
      );
    }
  };

  const handleResetPassword = (name: string) => {
    Alert.alert(
      'Reset Kata Sandi',
      `Tautan setel ulang kata sandi telah dikirim ke email kedinasan ${name}.`
    );
  };

  const filteredASN = employeeList.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.nip.includes(search) ||
      item.username.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      selectedRole === 'Semua Role' || item.role === selectedRole;
    const matchUnit =
      selectedUnit === 'Semua Unit' ||
      (selectedUnit === 'Lintas Unit (1)' && item.unit.includes('Lintas Unit')) ||
      (selectedUnit === 'Bagian Akademik (14)' &&
        item.unit.includes('Akademik')) ||
      (selectedUnit === 'Sumber Daya PT (12)' &&
        item.unit.includes('Sumber Daya')) ||
      (selectedUnit === 'Pokja PTK (10)' && item.unit.includes('Pendidik')) ||
      (selectedUnit === 'Hukum & TU (15)' &&
        (item.unit.includes('Tata Usaha') || item.unit.includes('Hukum')));

    return matchSearch && matchRole && matchUnit;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Kelola Pegawai & Unit Kerja"
        subtitle={`Administrasi ${totalCount} ASN & 11 Unit Kerja`}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 4 BENTO STATS CARDS */}
        <View style={styles.bentoGrid}>
          <View style={styles.bentoCol}>
            <View style={styles.bentoTop}>
              <Text style={styles.bentoLabel}>Total Pegawai</Text>
              <MaterialIcons name="group" size={16} color={colors.outline} />
            </View>
            <Text style={styles.bentoValue}>{totalCount}</Text>
            <Text style={styles.bentoSub}>{staffCount} Staf · {adminCount} Admin</Text>
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
            <Text style={styles.bentoValue}>11</Text>
            <Text style={styles.bentoSub}>Pokja & Bagian</Text>
          </View>

          <View style={styles.bentoCol}>
            <View style={styles.bentoTop}>
              <Text style={styles.bentoLabel}>Status Akun</Text>
              <MaterialIcons name="badge" size={16} color={colors.outline} />
            </View>
            <Text style={styles.bentoValue}>{activeCount}</Text>
            <Text style={styles.bentoSub}>{inactiveCount} Nonaktif / Cuti</Text>
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
            <Text style={styles.bentoValue}>96.4%</Text>
            <Text style={styles.bentoSub}>Triwulan Berjalan</Text>
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
              Master Unit Kerja (11)
            </Text>
          </Pressable>
        </View>

        {/* PRIMARY OPERATIONAL ACTION BAR */}
        <Pressable
          onPress={handleAddEmployee}
          style={({ pressed }) => [
            styles.primaryAddBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <MaterialIcons name="person-add" size={18} color={colors.onPrimary} />
          <Text style={styles.primaryAddBtnText}>Tambah Pegawai Baru</Text>
        </Pressable>

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
                        : `Status: ASN Aktif`}
                    </Text>

                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={() => handleResetPassword(item.name)}
                        style={({ pressed }) => [
                          styles.cardActionBtn,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <MaterialIcons
                          name="lock-reset"
                          size={14}
                          color={colors.onSurfaceVariant}
                        />
                        <Text style={styles.cardActionBtnText}>Reset Sandi</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          if (onNavigateEdit) {
                            onNavigateEdit(item.id);
                          } else {
                            Alert.alert('Edit Pegawai', `Sunting profil ${item.name}`);
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
            </View>
          </>
        ) : (
          /* MASTER UNIT KERJA LIST */
          <View style={styles.cardsContainer}>
            {MASTER_UNITS.map((unit) => (
              <View key={unit.code} style={styles.unitMasterCard}>
                <View style={styles.unitMasterIcon}>
                  <MaterialIcons
                    name="account-tree"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.unitMasterCode}>{unit.code}</Text>
                  <Text style={styles.unitMasterName}>{unit.name}</Text>
                </View>
                <View style={styles.unitMasterCountBadge}>
                  <Text style={styles.unitMasterCountText}>{unit.count}</Text>
                </View>
              </View>
            ))}
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
  unitMasterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 2,
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: 10,
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
  unitMasterIcon: {
    width: 36,
    height: 36,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitMasterCode: {
    ...typography.labelMono,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  unitMasterName: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurface,
  },
  unitMasterCountBadge: {
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
  btnPressed: {
    opacity: 0.8,
  },
});
