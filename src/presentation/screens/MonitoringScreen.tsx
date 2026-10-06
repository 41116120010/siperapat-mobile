import React, { useState } from 'react';
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
import { Button } from '../components/common/Button';

interface MonitoringScreenProps {
  meetingId?: string;
  onBack?: () => void;
}

type TabType = 'verified' | 'unverified' | 'minutes';

interface Participant {
  name: string;
  role: string;
  nip: string;
  time: string;
  location: string;
  isOnline?: boolean;
}

const VERIFIED_PARTICIPANTS: Participant[] = [
  {
    name: 'Afdalisma, SH, M.Pd',
    role: 'Kepala LLDIKTI Wilayah X',
    nip: '197012051992032002',
    time: '09:14 WIB',
    location: 'R. Sidang Utama',
  },
  {
    name: 'Ely Susanti, SE, MM',
    role: 'Pokja Akademik & Kemahasiswaan',
    nip: '196708231991032001',
    time: '09:18 WIB',
    location: 'Gedung A',
  },
  {
    name: 'Febrina Fitri, SE, M.Si',
    role: 'Bagian Sumber Daya PT',
    nip: '196502101991032002',
    time: '09:25 WIB',
    location: 'Daring (Zoom)',
    isOnline: true,
  },
  {
    name: 'Reri Anton, ST, MM',
    role: 'Pokja Pendidik & Tenaga Kependidikan',
    nip: '197003081991031001',
    time: '09:32 WIB',
    location: 'R. Sidang Utama',
  },
];

const UNVERIFIED_PARTICIPANTS: Participant[] = [
  {
    name: 'Dr. Hj. Syahril, M.Pd',
    role: 'Sekretaris Lembaga',
    nip: '196803151991031002',
    time: 'Menunggu Presensi',
    location: 'R. Sidang Utama',
  },
  {
    name: 'Hendri Nova, S.Kom, M.Kom',
    role: 'Pokja Sistem Informasi & PDDIKTI',
    nip: '197509122001121001',
    time: 'Menunggu Presensi',
    location: 'Gedung A',
  },
];

export const MonitoringScreen: React.FC<MonitoringScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('verified');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPokja, setSelectedPokja] = useState('Semua Unit (11 Pokja)');

  const handleCopyBANumber = () => {
    Alert.alert(
      'Salin Nomor Berita Acara',
      'Nomor BA-RAPAT/2026/0142/LLDIKTI-X berhasil disalin ke papan klip.'
    );
  };

  const handleDownloadPdf = () => {
    Alert.alert(
      'Unduh Berita Acara Resmi (PDF)',
      'Dokumen Berita Acara Rapat lengkap dengan stempel digital BSrE (BA-RAPAT/2026/0142/LLDIKTI-X.pdf) berhasil diunduh.'
    );
  };

  const handleDownloadWord = () => {
    Alert.alert(
      'Unduh Dokumen Word',
      'Naskah dinas risalah sidang (BA-RAPAT/2026/0142/LLDIKTI-X.docx) berhasil diunduh untuk pengarsipan.'
    );
  };

  const handleDownloadExcel = () => {
    Alert.alert(
      'Unduh Tabulasi Kehadiran',
      'Data tabulasi rekapan presensi 79 ASN (Excel / CSV) berhasil diekspor.'
    );
  };

  const displayList =
    activeTab === 'verified' ? VERIFIED_PARTICIPANTS : UNVERIFIED_PARTICIPANTS;

  const filteredList = displayList.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nip.includes(searchQuery)
  );

  return (
    <View style={styles.container}>
      <Header
        title="Monitoring Kehadiran Rapat"
        subtitle="Administrasi & Presensi Kedinasan LLDIKTI X"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* AGENDA SUMMARY & LIVE STATUS HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCodeRow}>
              <Text style={styles.heroCode}>RPK-1026-X</Text>
              <Text style={styles.heroType}>Rapat Dinas</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Presensi Dibuka</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Rapat Koordinasi Penjaminan Mutu & Akreditasi Program Studi PTS 2026
          </Text>

          {/* 4-Grid Meta */}
          <View style={styles.metaGrid}>
            <View style={styles.metaBox}>
              <MaterialIcons name="calendar-today" size={16} color={colors.onSurfaceVariant} />
              <View style={styles.metaBoxContent}>
                <Text style={styles.metaBoxLabel}>JADWAL PELAKSANAAN</Text>
                <Text style={styles.metaBoxValue} numberOfLines={1}>
                  Kamis, 24 Okt 2026 • 09.00 - 12.00 WIB
                </Text>
              </View>
            </View>

            <View style={styles.metaBox}>
              <MaterialIcons name="videocam" size={16} color={colors.onSurfaceVariant} />
              <View style={styles.metaBoxContent}>
                <Text style={styles.metaBoxLabel}>FORMAT PRESENSI</Text>
                <Text style={styles.metaBoxValue} numberOfLines={1}>
                  Hybrid (R. Sidang Gedung A & Zoom)
                </Text>
              </View>
            </View>

            <View style={styles.metaBox}>
              <MaterialIcons name="person" size={16} color={colors.onSurfaceVariant} />
              <View style={styles.metaBoxContent}>
                <Text style={styles.metaBoxLabel}>PIMPINAN RAPAT</Text>
                <Text style={styles.metaBoxValue} numberOfLines={1}>
                  Afdalisma, SH, M.Pd
                </Text>
              </View>
            </View>

            <View style={styles.metaBox}>
              <MaterialIcons name="description" size={16} color={colors.onSurfaceVariant} />
              <View style={styles.metaBoxContent}>
                <Text style={styles.metaBoxLabel}>NOTULIS RESMI</Text>
                <Text style={styles.metaBoxValue} numberOfLines={1}>
                  Rahmat Hidayat, S.Kom
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* LIVE ATTENDANCE METRICS & PROGRESS GRID */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsHeader}>
            <View>
              <Text style={styles.metricsTitle}>Rekapitulasi Kehadiran Pegawai</Text>
              <Text style={styles.metricsSub}>Data presensi tervalidasi per 09:35 WIB</Text>
            </View>
            <View style={styles.quorumPill}>
              <Text style={styles.quorumPillText}>Kuorum: 66.7%</Text>
            </View>
          </View>

          {/* 3-Column Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Hadir Sah</Text>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, { color: '#047857' }]}>68</Text>
                <Text style={styles.metricUnit}>ASN</Text>
              </View>
              <Text style={[styles.metricFooter, { color: '#047857' }]}>
                86.1% Terverifikasi
              </Text>
            </View>

            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Belum Hadir</Text>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, { color: '#BE123C' }]}>11</Text>
                <Text style={styles.metricUnit}>ASN</Text>
              </View>
              <Text style={[styles.metricFooter, { color: '#BE123C' }]}>
                13.9% Menunggu
              </Text>
            </View>

            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Target Undangan</Text>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>79</Text>
                <Text style={styles.metricUnit}>ASN</Text>
              </View>
              <Text style={[styles.metricFooter, { color: '#047857' }]}>
                Kuorum Tercapai
              </Text>
            </View>
          </View>

          {/* Participation Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Partisipasi Kehadiran</Text>
              <Text style={styles.progressValue}>86.1% (68 / 79 ASN)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '86.1%' }]} />
            </View>
          </View>
        </View>

        {/* SEGMENTED CONTROL / TAB NAVIGATION */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab('verified')}
            style={[
              styles.tabBtn,
              activeTab === 'verified' && styles.tabBtnActive,
            ]}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'verified' && styles.tabBtnTextActive,
              ]}
            >
              Terverifikasi Sah
            </Text>
            <View style={styles.tabBadgeVerified}>
              <Text style={styles.tabBadgeTextWhite}>68</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('unverified')}
            style={[
              styles.tabBtn,
              activeTab === 'unverified' && styles.tabBtnActive,
            ]}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'unverified' && styles.tabBtnTextActive,
              ]}
            >
              Belum Hadir
            </Text>
            <View style={styles.tabBadgeUnverified}>
              <Text style={styles.tabBadgeTextRose}>11</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('minutes')}
            style={[
              styles.tabBtn,
              activeTab === 'minutes' && styles.tabBtnActive,
            ]}
          >
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'minutes' && styles.tabBtnTextActive,
              ]}
            >
              Notulensi & RTL
            </Text>
            <View style={styles.tabBadgeDraft}>
              <Text style={styles.tabBadgeTextDraft}>Draft</Text>
            </View>
          </Pressable>
        </View>

        {/* SEARCH & FILTER CONTROLS */}
        {activeTab !== 'minutes' ? (
          <View style={styles.filterSection}>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <MaterialIcons name="search" size={18} color={colors.outline} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari nama ASN atau 18 digit NIP..."
                  placeholderTextColor={colors.outline}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>

            {/* Quick Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pokjaChipsRow}
            >
              {[
                'Semua Unit (11 Pokja)',
                'Pimpinan Lembaga',
                'Akademik & Kemahasiswaan',
                'Sumber Daya PT',
              ].map((chip) => {
                const active = selectedPokja === chip;
                return (
                  <Pressable
                    key={chip}
                    onPress={() => setSelectedPokja(chip)}
                    style={[
                      styles.pokjaChip,
                      active && styles.pokjaChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pokjaChipText,
                        active && styles.pokjaChipTextActive,
                      ]}
                    >
                      {chip}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Participants Feed */}
            <View style={styles.participantFeed}>
              {filteredList.map((p, idx) => (
                <View key={idx} style={styles.participantCard}>
                  <View style={styles.pAvatar}>
                    <MaterialIcons
                      name={p.isOnline ? 'videocam' : 'person'}
                      size={20}
                      color={colors.onSurfaceVariant}
                    />
                  </View>
                  <View style={styles.pContent}>
                    <View style={styles.pTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pName}>{p.name}</Text>
                        <Text style={styles.pRole}>{p.role}</Text>
                      </View>
                      <View
                        style={[
                          styles.pTimeBadge,
                          activeTab === 'unverified' && styles.pTimeBadgeWait,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pTimeText,
                            activeTab === 'unverified' && styles.pTimeTextWait,
                          ]}
                        >
                          {p.time}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.pMetaRow}>
                      <Text style={styles.pNipPill}>NIP {p.nip}</Text>
                      <Text style={styles.pLocPill}>{p.location}</Text>
                      <Text
                        style={[
                          styles.pStatusPill,
                          activeTab === 'unverified' && styles.pStatusPillWait,
                        ]}
                      >
                        {activeTab === 'verified' ? 'Hadir Sah' : 'Menunggu'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* NOTULENSI & RTL DRAFT VIEW */}
        {activeTab === 'minutes' ? (
          <View style={styles.minutesCard}>
            <View style={styles.minutesHeader}>
              <MaterialIcons name="edit-note" size={20} color={colors.primary} />
              <Text style={styles.minutesTitle}>Draf Risalah Sidang Rapat</Text>
            </View>
            <Text style={styles.minutesBody}>
              1. Peningkatan kuota akreditasi program studi vokasi LLDIKTI X tahun 2026.{'\n'}
              2. Penyelarasan format pelaporan PDDikti semester genap.{'\n'}
              3. Alokasi anggaran pendampingan klinik mutu PT Wilayah Sumbar, Riau, Jambi, Kepri.
            </Text>
            <Text style={styles.minutesMeta}>
              Notulis: Rahmat Hidayat, S.Kom • Terakhir disunting 09:30 WIB
            </Text>
          </View>
        ) : null}

        {/* SECTION: BERITA ACARA & OFFICIAL GOV-TECH EXPORT */}
        <View style={styles.baCard}>
          <View style={styles.baHeader}>
            <MaterialIcons name="description" size={20} color={colors.onSurfaceVariant} />
            <View>
              <Text style={styles.baTitle}>Penerbitan Berita Acara Rapat</Text>
              <Text style={styles.baSubtitle}>
                Tata Naskah Dinas Elektronik Kemdiktisaintek
              </Text>
            </View>
          </View>

          {/* BA Number Box */}
          <View style={styles.baNumberBox}>
            <Text style={styles.baNumberLabel}>NOMOR BERITA ACARA:</Text>
            <View style={styles.baNumberRow}>
              <Text style={styles.baNumberValue}>
                BA-RAPAT/2026/0142/LLDIKTI-X
              </Text>
              <Pressable onPress={handleCopyBANumber} style={styles.copyBtn}>
                <MaterialIcons name="content-copy" size={16} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
          </View>

          {/* Export Buttons */}
          <View style={styles.baActionGrid}>
            <Button
              title="Unduh Berita Acara (PDF Resmi)"
              onPress={handleDownloadPdf}
              variant="primary"
              size="md"
              fullWidth
              icon={
                <MaterialIcons
                  name="picture-as-pdf"
                  size={18}
                  color={colors.onPrimary}
                />
              }
            />

            <Button
              title="Unduh Dokumen Word (.docx)"
              onPress={handleDownloadWord}
              variant="outline"
              size="md"
              fullWidth
              icon={
                <MaterialIcons
                  name="description"
                  size={18}
                  color={colors.onSurfaceVariant}
                />
              }
            />

            <Pressable onPress={handleDownloadExcel} style={styles.excelBtn}>
              <MaterialIcons name="table-chart" size={15} color={colors.onSurfaceVariant} />
              <Text style={styles.excelBtnText}>
                Unduh Tabulasi Kehadiran (Excel / CSV)
              </Text>
            </Pressable>
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
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: spacing.sm,
    ...elevations.level1,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCode: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.3)',
    fontWeight: '600',
  },
  heroType: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  liveBadgeText: {
    ...typography.labelSm,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
  },
  heroTitle: {
    ...typography.headlineSm,
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.onSurface,
    lineHeight: 22,
  },
  metaGrid: {
    gap: 6,
  },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    padding: 8,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.3)',
  },
  metaBoxContent: {
    flex: 1,
  },
  metaBoxLabel: {
    ...typography.labelSm,
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  metaBoxValue: {
    ...typography.bodySm,
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurface,
    marginTop: 1,
  },
  metricsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: spacing.sm,
    ...elevations.level1,
  },
  metricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricsTitle: {
    ...typography.headlineSm,
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  metricsSub: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  quorumPill: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  quorumPillText: {
    ...typography.labelMono,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCol: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.3)',
  },
  metricLabel: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  metricValue: {
    ...typography.headlineLg,
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  metricUnit: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  metricFooter: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  progressSection: {
    marginTop: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  progressValue: {
    ...typography.labelMono,
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.4)',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabBtnText: {
    ...typography.labelMd,
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabBadgeVerified: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeUnverified: {
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabBadgeDraft: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tabBadgeTextWhite: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabBadgeTextRose: {
    fontSize: 10,
    color: '#BE123C',
    fontWeight: '700',
  },
  tabBadgeTextDraft: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  filterSection: {
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLowest,
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
  pokjaChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pokjaChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    backgroundColor: colors.surfaceContainerLowest,
  },
  pokjaChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pokjaChipText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  pokjaChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  participantFeed: {
    gap: spacing.xs + 2,
  },
  participantCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.lg,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    ...elevations.level1,
  },
  pAvatar: {
    width: 36,
    height: 36,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pContent: {
    flex: 1,
  },
  pTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pName: {
    ...typography.headlineSm,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  pRole: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  pTimeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  pTimeBadgeWait: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  pTimeText: {
    ...typography.labelMono,
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  pTimeTextWait: {
    color: '#BE123C',
  },
  pMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  pNipPill: {
    ...typography.labelMono,
    fontSize: 10,
    backgroundColor: '#F1F5F9',
    color: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  pLocPill: {
    ...typography.labelSm,
    fontSize: 10,
    backgroundColor: colors.surfaceContainerLow,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  pStatusPill: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#ECFDF5',
    color: '#065F46',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 3,
  },
  pStatusPillWait: {
    backgroundColor: '#FFF1F2',
    color: '#BE123C',
  },
  minutesCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: 8,
  },
  minutesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  minutesTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  minutesBody: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurface,
    lineHeight: 18,
  },
  minutesMeta: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.outline,
    fontStyle: 'italic',
  },
  baCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: spacing.sm,
    ...elevations.level1,
  },
  baHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  baTitle: {
    ...typography.headlineSm,
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  baSubtitle: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  baNumberBox: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.3)',
  },
  baNumberLabel: {
    ...typography.labelSm,
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  baNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  baNumberValue: {
    ...typography.labelMono,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  copyBtn: {
    padding: 4,
  },
  baActionGrid: {
    gap: spacing.xs + 2,
    paddingTop: 4,
  },
  excelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  excelBtnText: {
    ...typography.labelSm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
  },
});
