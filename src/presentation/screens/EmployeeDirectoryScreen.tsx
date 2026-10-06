import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing, elevations } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';

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
  { code: 'BAG-AKM', name: 'Bagian Akademik', count: '14 ASN' },
  { code: 'BAG-SDPT', name: 'Sumber Daya PT', count: '12 ASN' },
  { code: 'POKJA-PTK', name: 'Pendidik & Tendik', count: '10 ASN' },
  { code: 'SUBBAG-HKTL', name: 'Hukum & Kepegawaian', count: '15 ASN' },
  { code: 'SUBBAG-TU', name: 'Tata Usaha & BMN', count: '18 ASN' },
];

interface EmployeeDirectoryScreenProps {
  onBack?: () => void;
}

export const EmployeeDirectoryScreen: React.FC<EmployeeDirectoryScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'asn' | 'units'>('asn');
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('Semua Role');
  const [selectedUnit, setSelectedUnit] = useState('Semua Unit (79)');

  const roles = ['Semua Role', 'Administrator', 'Admin Unit', 'Staff'];
  const units = [
    'Semua Unit (79)',
    'Lintas Unit (1)',
    'Bagian Akademik (14)',
    'Sumber Daya PT (12)',
    'Pokja PTK (10)',
    'Hukum & TU (15)',
  ];

  const handleAddEmployee = () => {
    Alert.alert(
      'Tambah Pegawai ASN',
      'Formulir pendaftaran akun kedinasan baru akan dimuat.'
    );
  };

  const handleResetPassword = (name: string) => {
    Alert.alert(
      'Reset Kata Sandi',
      `Tautan setel ulang kata sandi telah dikirim ke email kedinasan ${name}.`
    );
  };

  const filteredASN = ASN_DATA.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.nip.includes(search) ||
      item.username.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      selectedRole === 'Semua Role' || item.role === selectedRole;
    return matchSearch && matchRole;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Kelola Pegawai & Unit Kerja"
        subtitle="Administrasi 79 ASN & 11 Unit Kerja"
        showBack={Boolean(onBack)}
        onBack={onBack}
        rightAction={
          <Pressable onPress={handleAddEmployee} style={styles.headerBtn}>
            <MaterialIcons name="person-add" size={20} color={colors.primary} />
          </Pressable>
        }
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
            <Text style={styles.bentoValue}>
              79 <Text style={styles.bentoUnit}>ASN</Text>
            </Text>
            <Text style={styles.bentoSub}>78 Staff · 1 Superadmin</Text>
          </View>

          <View style={styles.bentoCol}>
            <View style={styles.bentoTop}>
              <Text style={styles.bentoLabel}>Unit Kerja Aktif</Text>
              <MaterialIcons name="account-tree" size={16} color={colors.outline} />
            </View>
            <Text style={styles.bentoValue}>
              11 <Text style={styles.bentoUnit}>Pokja</Text>
            </Text>
            <Text style={styles.bentoSub}>100% Terdaftar Sah</Text>
          </View>

          <View style={styles.bentoCol}>
            <View style={styles.bentoTop}>
              <Text style={styles.bentoLabel}>Status Akun</Text>
              <MaterialIcons name="badge" size={16} color={colors.outline} />
            </View>
            <Text style={styles.bentoValue}>
              78 <Text style={styles.bentoUnitGreen}>Aktif</Text>
            </Text>
            <Text style={styles.bentoSub}>1 Nonaktif / Mutasi</Text>
          </View>

          <View style={styles.bentoCol}>
            <View style={styles.bentoTop}>
              <Text style={styles.bentoLabel}>Rerata Presensi</Text>
              <MaterialIcons name="analytics" size={16} color={colors.outline} />
            </View>
            <Text style={[styles.bentoValue, { color: colors.primary }]}>
              96.4%
            </Text>
            <Text style={styles.bentoSub}>Kuartal II LLDIKTI X</Text>
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
              Data Pegawai ASN (79)
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
        <Pressable onPress={handleAddEmployee} style={styles.primaryAddBtn}>
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
                placeholder="Cari NIP 18 digit, nama, atau username..."
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
                <Text style={styles.listHeaderSub}>({filteredASN.length} ASN)</Text>
              </Text>
              <View style={styles.sortBtn}>
                <Text style={styles.sortBtnText}>Urutkan Abjad</Text>
                <MaterialIcons name="swap-vert" size={16} color={colors.secondary} />
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
                        <MaterialIcons name="badge" size={14} color={colors.outline} />
                        <Text style={styles.nipText}>{item.nip}</Text>
                        <Text style={styles.dividerPipe}>|</Text>
                        <Text style={styles.usernameText}>{item.username}</Text>
                      </View>

                      <View style={styles.unitRow}>
                        <MaterialIcons name="domain" size={14} color={colors.outline} />
                        <Text style={styles.unitText}>{item.unit}</Text>
                      </View>
                    </View>

                    <View style={styles.activeDotBadge}>
                      <View style={styles.activeDot} />
                      <Text style={styles.activeDotText}>Aktif</Text>
                    </View>
                  </View>

                  <View style={styles.asnCardBottom}>
                    <Text style={styles.cardBottomMeta}>
                      {item.lastLogin
                        ? `Terakhir login: ${item.lastLogin}`
                        : item.attendanceRate
                        ? `Kehadiran: ${item.attendanceRate} (${item.totalMeetings} Rapat)`
                        : `Terdaftar: ${item.regDate}`}
                    </Text>

                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={() => handleResetPassword(item.name)}
                        style={styles.cardActionBtn}
                      >
                        <MaterialIcons name="lock-reset" size={15} color={colors.onSurfaceVariant} />
                        <Text style={styles.cardActionBtnText}>Reset Sandi</Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert('Edit Pegawai', `Sunting profil ${item.name}`)
                        }
                        style={[styles.cardActionBtn, styles.editActionBtn]}
                      >
                        <MaterialIcons name="edit" size={15} color={colors.onSurface} />
                        <Text style={[styles.cardActionBtnText, { color: colors.onSurface }]}>
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
                  <MaterialIcons name="account-tree" size={20} color={colors.primary} />
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

        {/* MASTER UNIT KERJA PREVIEW BANNER */}
        <View style={styles.structureBanner}>
          <View style={styles.structureHeader}>
            <View style={styles.structureTitleRow}>
              <MaterialIcons name="hub" size={20} color={colors.outline} />
              <Text style={styles.structureTitle}>
                Struktur 11 Unit Kerja Resmi LLDIKTI X
              </Text>
            </View>
            <Text style={styles.structureSubtitle}>
              Pemetaan hierarki rapat, koordinator pokja, dan pengesahan notula
            </Text>
          </View>

          <View style={styles.structureChipsWrap}>
            {MASTER_UNITS.map((u) => (
              <View key={u.code} style={styles.structureChip}>
                <Text style={styles.structureChipText}>
                  <Text style={{ fontWeight: '700' }}>{u.code}</Text> · {u.name} ({u.count})
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    justifyContent: 'space-between',
    minHeight: 82,
    ...elevations.level1,
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
  bentoUnit: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  bentoUnitGreen: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  bentoSub: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: rounded.md,
    padding: 3,
    marginTop: 2,
  },
  segmentedBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: rounded.sm,
    alignItems: 'center',
  },
  segmentedBtnActive: {
    backgroundColor: colors.surfaceContainerLowest,
    ...elevations.level1,
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
    ...elevations.level1,
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
    backgroundColor: colors.surfaceContainerLowest,
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
    paddingVertical: 4,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainer,
  },
  roleChipActive: {
    backgroundColor: colors.primaryContainer,
  },
  roleChipText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  roleChipTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: colors.surfaceContainerLowest,
  },
  unitChipActive: {
    backgroundColor: colors.surfaceContainerHigh,
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
    fontSize: 14,
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    ...elevations.level1,
  },
  asnCardTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  asnAvatar: {
    width: 40,
    height: 40,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  asnAvatarText: {
    ...typography.labelMd,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
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
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  roleBadgeText: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.onSurface,
    fontWeight: '500',
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
  dividerPipe: {
    color: colors.outlineVariant,
    fontSize: 11,
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
  activeDotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  activeDotText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurface,
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
    paddingVertical: 3,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
  },
  cardActionBtnText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  editActionBtn: {
    backgroundColor: colors.surfaceContainerLow,
  },
  unitMasterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 2,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: 10,
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
    fontSize: 12.5,
    color: colors.onSurface,
  },
  unitMasterCountBadge: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  unitMasterCountText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  structureBanner: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    gap: 8,
    marginTop: 4,
  },
  structureHeader: {
    gap: 2,
  },
  structureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  structureTitle: {
    ...typography.headlineSm,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  structureSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  structureChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  structureChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  structureChipText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurface,
  },
});
