import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { ErrorState } from '../components/common/ErrorState';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { AttendanceRecord } from '../../domain/entities/types';

interface ReceiptScreenProps { attendanceId: string; onBack: () => void; onDone: () => void; onViewAgendaDetail?: (meetingId?: string) => void }
export const ReceiptScreen: React.FC<ReceiptScreenProps> = ({ attendanceId, onBack, onDone, onViewAgendaDetail }) => {
  const { lastReceipt, fetchReceipt } = useAttendanceStore();
  const [record, setRecord] = useState<AttendanceRecord | null>(lastReceipt?.id === attendanceId ? lastReceipt : null);
  const [loading, setLoading] = useState(!record);
  useEffect(() => { if (!record) void fetchReceipt(attendanceId).then((data) => setRecord(data)).finally(() => setLoading(false)); }, [attendanceId, fetchReceipt, record]);
  return <View style={styles.container}><Header title="Catatan Presensi" subtitle={record ? `Presensi #${record.id}` : 'Data presensi API'} showBack onBack={onBack} />
    <ScrollView contentContainerStyle={styles.content}>{loading ? <ActivityIndicator color={colors.primary} /> : record ? <View style={styles.card}>
      <Text style={styles.title}>Catatan kehadiran #{record.id}</Text><Text style={styles.row}>ID agenda: {record.agendaId}</Text><Text style={styles.row}>ID pengguna: {record.userId}</Text><Text style={styles.row}>Waktu tercatat: {record.signedAt ? new Date(record.signedAt).toLocaleString('id-ID') : 'Tidak tersedia'}</Text>
      <Text style={styles.note}>API riwayat tidak menyediakan nomor receipt, status verifikasi, atau data lokasi. URL media hanya menunjukkan ketersediaan; tampilan media memerlukan tahap integrasi terpisah.</Text>
      {onViewAgendaDetail ? <Pressable onPress={() => onViewAgendaDetail(record.agendaId)}><Text style={styles.action}>Buka agenda</Text></Pressable> : null}
      <Pressable onPress={onDone}><Text style={styles.action}>Selesai</Text></Pressable>
    </View> : <ErrorState title="Catatan tidak ditemukan" message="Data presensi tidak ditemukan pada riwayat akun." onRetry={onBack} />}</ScrollView>
  </View>;
};
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.md }, card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: rounded.lg, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.borderSubtle }, title: { ...typography.headlineSm, fontWeight: '700', color: colors.onSurface }, row: { ...typography.bodySm, color: colors.onSurfaceVariant }, note: { ...typography.bodySm, color: colors.onSurfaceVariant, padding: spacing.sm, backgroundColor: colors.surfaceContainerLow, borderRadius: rounded.md }, action: { ...typography.labelMd, color: colors.primary, fontWeight: '700' } });
