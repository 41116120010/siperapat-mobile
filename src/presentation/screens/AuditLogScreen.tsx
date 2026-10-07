import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';

interface AuditItem {
  id: string;
  tag: string;
  time: string;
  status: string;
  statusType: 'success' | 'info' | 'warning';
  actorName: string;
  actorNip: string;
  description: string;
  ip: string;
  meta: string;
  category: 'Login' | 'Agenda' | 'Presensi' | 'User';
}

const AUDIT_DATA: AuditItem[] = [
  {
    id: 'log-01',
    tag: 'AUTH_LOGIN',
    time: 'Hari Ini, 09:14 WIB',
    status: 'Berhasil',
    statusType: 'success',
    actorName: 'Afdalisma, SH, M.Pd',
    actorNip: '197012051992032002',
    description:
      'Masuk ke dalam sistem melalui portal administrasi pusat dengan otentikasi NIP ASN resmi.',
    ip: '180.252.164.218',
    meta: 'Chrome / Android',
    category: 'Login',
  },
  {
    id: 'log-02',
    tag: 'RECORD_PRESENSI',
    time: 'Hari Ini, 09:18 WIB',
    status: 'Terverifikasi',
    statusType: 'success',
    actorName: 'Ely Susanti, SE, MM',
    actorNip: '196708231991032001',
    description:
      'Merekam kehadiran pada Rapat Koordinasi Penjaminan Mutu (Agenda #1026) lengkap dengan swafoto & tanda tangan digital.',
    ip: '180.252.164.218',
    meta: 'Radius Geofence: 22m (Sesuai)',
    category: 'Presensi',
  },
  {
    id: 'log-03',
    tag: 'EXPORT_DOKUMEN',
    time: 'Hari Ini, 09:40 WIB',
    status: 'Unduh PDF',
    statusType: 'info',
    actorName: 'Afdalisma, SH, M.Pd',
    actorNip: '197012051992032002',
    description:
      'Mengunduh Berita Acara & Daftar Hadir resmi bertanda tangan elektronik untuk Agenda #1026.',
    ip: '180.252.164.218',
    meta: 'Format: BA-RAPAT/2026/0142',
    category: 'Agenda',
  },
  {
    id: 'log-04',
    tag: 'CREATE_AGENDA',
    time: '23 Okt 2026, 16:05 WIB',
    status: 'Agenda Baru',
    statusType: 'info',
    actorName: 'Ely Susanti, SE, MM',
    actorNip: '196708231991032001',
    description:
      "Menjadwalkan agenda rapat dinas 'Sosialisasi Kebijakan Beban Kerja Dosen (BKD)' dengan metode Daring Zoom.",
    ip: '180.252.164.218',
    meta: 'Target: Agenda #1027',
    category: 'Agenda',
  },
  {
    id: 'log-05',
    tag: 'SECURITY_RATE_LIMIT',
    time: '23 Okt 2026, 14:12 WIB',
    status: 'Terproteksi',
    statusType: 'warning',
    actorName: 'Sistem Proteksi Otomatis',
    actorNip: 'Proteksi Brute-Force',
    description:
      'Penangguhan akses login sementara (60 detik) pada akun NIP 198205142010121003 akibat 5 kali salah kata sandi.',
    ip: '36.72.115.94',
    meta: 'Jaringan Eksternal',
    category: 'Login',
  },
];

interface AuditLogScreenProps {
  onBack?: () => void;
}

export const AuditLogScreen: React.FC<AuditLogScreenProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  const categories = ['Semua', 'Login', 'Agenda', 'Presensi', 'User'];

  const filteredLogs = AUDIT_DATA.filter((log) => {
    const matchSearch =
      log.tag.toLowerCase().includes(search.toLowerCase()) ||
      log.actorName.toLowerCase().includes(search.toLowerCase()) ||
      log.actorNip.includes(search) ||
      log.description.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      selectedCategory === 'Semua' || log.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <View style={styles.container}>
      <Header
        title="Log Aktivitas Sistem"
        subtitle="Audit Trail & Rekam Jejak Kedinasan LLDIKTI X"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* RINGKASAN AKTIVITAS */}
        <View style={styles.integrityCard}>
          <View style={styles.integrityHeader}>
            <View style={styles.integrityTitleRow}>
              <MaterialIcons name="verified-user" size={18} color={colors.primary} />
              <Text style={styles.integrityTitle}>
                Ringkasan Aktivitas
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCol}>
              <Text style={styles.metricNumber}>1.482</Text>
              <Text style={styles.metricLabel}>Total Log</Text>
            </View>
            <View style={styles.metricCol}>
              <Text style={styles.metricNumber}>100%</Text>
              <Text style={styles.metricLabel}>Otentikasi Sah</Text>
            </View>
            <View style={styles.metricCol}>
              <Text style={styles.metricNumber}>0</Text>
              <Text style={styles.metricLabel}>Insiden</Text>
            </View>
          </View>
        </View>

        {/* SEARCH INPUT */}
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari NIP, nama, atau aktivitas..."
            placeholderTextColor={colors.outline}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Hapus pencarian"
            >
              <MaterialIcons name="close" size={18} color={colors.outline} />
            </Pressable>
          ) : null}
        </View>

        {/* FILTER PILLS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.filterPill,
                  active && styles.filterPillActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filter kategori ${cat}`}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* LIST SECTION HEADER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daftar Aktivitas</Text>
          <Text style={styles.sectionCountText}>
            {filteredLogs.length} Catatan
          </Text>
        </View>

        {/* LOG ITEMS */}
        {filteredLogs.length > 0 ? (
          <View style={styles.logsList}>
            {filteredLogs.map((item) => (
              <View key={item.id} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <View style={styles.logTagRow}>
                    <Text style={styles.logTag}>{item.tag}</Text>
                    <View style={styles.dotSeparator} />
                    <Text style={styles.logTime}>{item.time}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      item.statusType === 'success' && styles.statusPillSuccess,
                      item.statusType === 'warning' && styles.statusPillWarn,
                      item.statusType === 'info' && styles.statusPillInfo,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.statusType === 'success' && styles.statusPillTextSuccess,
                        item.statusType === 'warning' && styles.statusPillTextWarn,
                        item.statusType === 'info' && styles.statusPillTextInfo,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.actorRow}>
                  <Text style={styles.actorName}>{item.actorName}</Text>
                  <Text style={styles.actorNip}>{item.actorNip}</Text>
                </View>

                <Text style={styles.logDesc}>{item.description}</Text>

                <View style={styles.logFooter}>
                  <Text style={styles.ipText}>IP {item.ip}</Text>
                  <Text style={styles.metaText}>{item.meta}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="manage-search"
            title="Tidak Ada Log Ditemukan"
            description="Tidak ada catatan aktivitas yang cocok dengan kata kunci atau filter kategori yang dipilih."
            actionLabel="Atur Ulang Filter"
            onAction={() => {
              setSearch('');
              setSelectedCategory('Semua');
            }}
          />
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
  integrityCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  integrityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.3)',
    paddingBottom: spacing.sm,
  },
  integrityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  integrityTitle: {
    ...typography.labelMd,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    gap: 8,
  },
  metricCol: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: rounded.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.35)',
  },
  metricNumber: {
    ...typography.headlineMd,
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  metricLabel: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  searchBox: {
    height: 42,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    gap: 8,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurface,
    paddingVertical: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    ...typography.labelMd,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  sectionCountText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.outline,
    fontWeight: '500',
  },
  logsList: {
    gap: 8,
  },
  logCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    gap: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logTag: {
    ...typography.labelMono,
    fontSize: 10.5,
    fontWeight: '700',
    backgroundColor: colors.surfaceContainer,
    color: colors.onSurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.outlineVariant,
  },
  logTime: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.outline,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    backgroundColor: colors.surfaceContainerLow,
  },
  statusPillSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillWarn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusPillInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusPillText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  statusPillTextSuccess: {
    color: '#065F46',
  },
  statusPillTextWarn: {
    color: '#92400E',
  },
  statusPillTextInfo: {
    color: '#1E40AF',
  },
  actorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  actorName: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  actorNip: {
    ...typography.labelMono,
    fontSize: 10.5,
    color: colors.outline,
  },
  logDesc: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
    paddingTop: 6,
    marginTop: 2,
  },
  ipText: {
    ...typography.labelMono,
    fontSize: 10,
    color: colors.outline,
  },
  metaText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.outline,
  },
});
