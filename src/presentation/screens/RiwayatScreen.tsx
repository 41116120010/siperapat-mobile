import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';
import { useAttendanceStore } from '../store/useAttendanceStore';

interface RiwayatScreenProps { onSelectReceipt: (id: string) => void }

export const RiwayatScreen: React.FC<RiwayatScreenProps> = ({ onSelectReceipt }) => {
  const { historyRecords, historyPage, fetchMyHistory, isLoading, error } = useAttendanceStore();
  const [search, setSearch] = useState('');
  useEffect(() => { void fetchMyHistory(1); }, [fetchMyHistory]);
  const filtered = useMemo(() => historyRecords.filter((item) => `${item.id} ${item.agendaId} ${item.signedAt ?? ''}`.toLowerCase().includes(search.toLowerCase())), [historyRecords, search]);
  const loadMore = () => { if (historyPage && historyPage.currentPage < historyPage.lastPage && !isLoading) void fetchMyHistory(historyPage.currentPage + 1, true); };

  return <View style={styles.container}><Header /><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading && historyRecords.length > 0} onRefresh={() => void fetchMyHistory(1)} />}>
    <View><Text style={styles.title}>Riwayat Presensi</Text><Text style={styles.subtitle}>Data kehadiran dari akun Anda.</Text></View>
    <View style={styles.card}><Text style={styles.label}>Total catatan</Text><Text style={styles.value}>{historyPage?.total ?? (isLoading ? '…' : 0)}</Text><Text style={styles.subtitle}>Status agenda dan jenis rapat tidak disertakan dalam response API riwayat.</Text></View>
    <View style={styles.search}><MaterialIcons name="search" size={20} color={colors.outline} /><TextInput style={styles.input} placeholder="Cari ID agenda atau tanggal" placeholderTextColor={colors.outline} value={search} onChangeText={setSearch} /></View>
    <Text style={styles.section}>DAFTAR CATATAN PRESENSI</Text>
    {error ? <View style={styles.notice}><Text style={styles.subtitle}>{error}</Text><Pressable onPress={() => void fetchMyHistory(1)}><Text style={styles.action}>Coba lagi</Text></Pressable></View> : null}
    {isLoading && historyRecords.length === 0 ? <ActivityIndicator color={colors.primary} /> : null}
    {filtered.length ? filtered.map((item) => <View key={item.id} style={styles.attendanceCard}>
      <Text style={styles.itemTitle}>Presensi #{item.id}</Text><Text style={styles.subtitle}>Agenda #{item.agendaId}</Text>
      <Text style={styles.meta}>Waktu: {item.signedAt ? new Date(item.signedAt).toLocaleString('id-ID') : 'Tidak tersedia'}</Text>
      <Text style={styles.meta}>Bukti selfie: {item.selfieUrl ? 'tersedia' : 'tidak tersedia'} · tanda tangan: {item.signatureUrl ? 'tersedia' : 'tidak tersedia'}</Text>
      <Pressable style={styles.actionRow} onPress={() => onSelectReceipt(item.id)}><MaterialIcons name="receipt-long" size={17} color={colors.primary} /><Text style={styles.action}>Lihat catatan API</Text></Pressable>
    </View>) : !isLoading ? <EmptyState icon="event-busy" title="Tidak Ada Riwayat Presensi" description={error ? 'Riwayat belum dapat dimuat.' : 'Tidak ada catatan yang cocok dengan pencarian.'} actionLabel="Muat ulang" onAction={() => void fetchMyHistory(1)} /> : null}
    {historyPage && historyPage.currentPage < historyPage.lastPage ? <Pressable style={styles.more} onPress={loadMore}><Text style={styles.action}>Muat halaman berikutnya</Text></Pressable> : null}
  </ScrollView></View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.md },
  title: { ...typography.headlineMd, fontSize: 20, fontWeight: '700', color: colors.onSurface }, subtitle: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 3 },
  card: { backgroundColor: colors.surfaceContainerLow, padding: spacing.md, borderRadius: rounded.lg, gap: 4 }, label: { ...typography.labelSm, color: colors.onSurfaceVariant }, value: { ...typography.headlineMd, color: colors.primary, fontWeight: '700' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: rounded.md, paddingHorizontal: spacing.sm }, input: { flex: 1, color: colors.onSurface, ...typography.bodySm }, section: { ...typography.labelSm, fontWeight: '700', color: colors.onSurfaceVariant },
  attendanceCard: { backgroundColor: colors.surfaceContainerLowest, padding: spacing.md, borderRadius: rounded.lg, borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.xs }, itemTitle: { ...typography.headlineSm, color: colors.onSurface, fontWeight: '700' }, meta: { ...typography.bodySm, color: colors.onSurfaceVariant },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs }, action: { ...typography.labelSm, color: colors.primary, fontWeight: '700' }, more: { alignItems: 'center', padding: spacing.md },
  notice: { padding: spacing.md, backgroundColor: colors.errorContainer, borderRadius: rounded.md, gap: spacing.xs },
});
