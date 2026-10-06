import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing, elevations } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { useAttendanceStore } from '../store/useAttendanceStore';

interface RiwayatScreenProps {
  onSelectReceipt: (id: string) => void;
}

interface HistoryItem {
  id: string;
  code: string;
  title: string;
  statusText: string;
  time: string;
  room: string;
  verificationMethod: string;
  meetingId: string;
}

const HISTORY_DATA: HistoryItem[] = [
  {
    id: 'att-001',
    code: 'RPK-1026-X',
    title: 'Rapat Koordinasi Penjaminan Mutu & Akreditasi Program Studi PTS 2026',
    statusText: 'Hadir',
    time: 'Hari ini, 09:14 WIB',
    room: 'Hybrid • Ruang Sidang Utama LLDIKTI',
    verificationMethod: 'Verifikasi: Biometrik & TTE Sah',
    meetingId: 'meet-001',
  },
  {
    id: 'att-002',
    code: 'EV-PDD-1026',
    title: 'Evaluasi Pelaporan PDDikti Semester Ganjil 2025/2026',
    statusText: 'Hadir',
    time: '14 Okt 2026, 10:02 WIB',
    room: 'Luring • Auditorium Gedung A LLDIKTI',
    verificationMethod: 'Verifikasi: Presensi Lokasi Sah',
    meetingId: 'meet-002',
  },
  {
    id: 'att-003',
    code: 'BKD-1026-D',
    title: 'Sosialisasi Kebijakan Beban Kerja Dosen (BKD) LLDIKTI X',
    statusText: 'Hadir',
    time: '02 Okt 2026, 08:55 WIB',
    room: 'Daring • Zoom Meeting (ID: 981 234 110)',
    verificationMethod: 'Verifikasi: Token Virtual Valid',
    meetingId: 'meet-003',
  },
  {
    id: 'att-004',
    code: 'KNS-0926-X',
    title: 'Konsinyasi Penyusunan Rencana Anggaran Satker LLDIKTI',
    statusText: 'Hadir',
    time: '25 Sep 2026, 09:05 WIB',
    room: 'Luring • Ruang Rapat Pimpinan',
    verificationMethod: 'Verifikasi: Tanda Tangan Kedinasan',
    meetingId: 'meet-004',
  },
];

export const RiwayatScreen: React.FC<RiwayatScreenProps> = ({ onSelectReceipt }) => {
  const { offlineQueueCount, syncOfflineQueue } = useAttendanceStore();
  const [search, setSearch] = useState('');

  const filteredHistory = HISTORY_DATA.filter(
    (h) =>
      h.title.toLowerCase().includes(search.toLowerCase()) ||
      h.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Riwayat Presensi</Text>
          <Text style={styles.mainSubtitle}>
            Catatan kehadiran rapat kedinasan LLDIKTI Wilayah X
          </Text>
        </View>

        {/* Offline Queue Sync Banner if offline items exist */}
        {offlineQueueCount > 0 ? (
          <View style={styles.syncBanner}>
            <MaterialIcons name="sync" size={18} color={colors.warning} />
            <Text style={styles.syncText}>
              {offlineQueueCount} presensi tersimpan lokal (menunggu sinkronisasi)
            </Text>
            <Pressable onPress={() => syncOfflineQueue()}>
              <Text style={styles.syncAction}>Sinkronkan</Text>
            </Pressable>
          </View>
        ) : null}

        {/* SUMMARY OVERVIEW BENTO CARDS */}
        <View style={styles.bentoGrid}>
          <View style={styles.bentoCard}>
            <Text style={styles.bentoLabel}>Total Rapat</Text>
            <Text style={styles.bentoValue}>24</Text>
            <Text style={styles.bentoSub}>Tahun Anggaran 2026</Text>
          </View>

          <View style={styles.bentoCard}>
            <Text style={styles.bentoLabel}>Tingkat Kehadiran</Text>
            <Text style={[styles.bentoValue, { color: colors.primary }]}>98%</Text>
            <Text style={styles.bentoSub}>Presensi Terverifikasi</Text>
          </View>

          <View style={styles.bentoCard}>
            <Text style={styles.bentoLabel}>Periode Aktif</Text>
            <Text style={styles.bentoValue}>Okt 2026</Text>
            <Text style={styles.bentoSub}>Bulan Berjalan</Text>
          </View>
        </View>

        {/* SEARCH & FILTER CONTROL BAR */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <MaterialIcons name="search" size={20} color={colors.outline} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari agenda atau nama rapat..."
              placeholderTextColor={colors.outline}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <View style={styles.calendarFilterBtn}>
            <MaterialIcons name="calendar-today" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.calendarFilterText}>Oktober 2026</Text>
            <MaterialIcons name="arrow-drop-down" size={18} color={colors.onSurfaceVariant} />
          </View>
        </View>

        {/* LIST HEADER */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listHeaderTitle}>
            DAFTAR KEHADIRAN RAPAT KEDINASAN
          </Text>
          <Text style={styles.listHeaderSub}>
            Menampilkan {filteredHistory.length} dari 24
          </Text>
        </View>

        {/* ATTENDANCE HISTORY LIST CARDS */}
        <View style={styles.cardsContainer}>
          {filteredHistory.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.cardTop}>
                <View style={styles.statusRow}>
                  <Text style={styles.statusText}>{item.statusText}</Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.codeText}>{item.code}</Text>
                </View>
                <Text style={styles.meetingTitle}>{item.title}</Text>
              </View>

              {/* Room and time grid */}
              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <MaterialIcons name="schedule" size={16} color={colors.onSurfaceVariant} />
                  <Text style={styles.metaText}>{item.time}</Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialIcons name="meeting-room" size={16} color={colors.onSurfaceVariant} />
                  <Text style={styles.metaText}>{item.room}</Text>
                </View>
              </View>

              {/* Bottom verify & receipt action */}
              <View style={styles.cardBottom}>
                <Text style={styles.verifyMethodText}>
                  {item.verificationMethod}
                </Text>
                <Pressable
                  onPress={() => onSelectReceipt(item.id)}
                  style={({ pressed }) => [
                    styles.receiptBtn,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <MaterialIcons name="qr-code-2" size={16} color={colors.onSurfaceVariant} />
                  <Text style={styles.receiptBtnText}>Tanda Terima</Text>
                </Pressable>
              </View>
            </View>
          ))}
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
    gap: spacing.sm + 2,
  },
  titleSection: {
    marginTop: 2,
  },
  mainTitle: {
    ...typography.headlineMd,
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  mainSubtitle: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningContainer,
    padding: spacing.sm,
    borderRadius: rounded.md,
  },
  syncText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onWarningContainer,
    flex: 1,
  },
  syncAction: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.onWarningContainer,
    textDecorationLine: 'underline',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    justifyContent: 'space-between',
    minHeight: 74,
    ...elevations.level1,
  },
  bentoLabel: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
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
    fontSize: 9.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    height: 42,
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
  calendarFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 42,
    paddingHorizontal: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
  },
  calendarFilterText: {
    ...typography.labelMd,
    fontSize: 11,
    color: colors.onSurface,
    fontWeight: '500',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  listHeaderTitle: {
    ...typography.labelSm,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  listHeaderSub: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.outline,
  },
  cardsContainer: {
    gap: 8,
  },
  historyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: 8,
    ...elevations.level1,
  },
  cardTop: {
    gap: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.tertiaryContainer,
  },
  dotSeparator: {
    color: colors.outline,
    fontSize: 11,
  },
  codeText: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.outline,
  },
  meetingTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    lineHeight: 19,
  },
  metaBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: spacing.sm,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
    paddingTop: 8,
  },
  verifyMethodText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.outline,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    backgroundColor: colors.surfaceContainerLowest,
  },
  btnPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  receiptBtnText: {
    ...typography.labelMd,
    fontSize: 11.5,
    color: colors.onSurface,
    fontWeight: '500',
  },
});
