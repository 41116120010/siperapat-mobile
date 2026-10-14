import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/tokens';
import { Meeting } from '../../domain/entities/types';
import { Header } from '../components/common/Header';
import { ErrorState } from '../components/common/ErrorState';
import { useMeetingStore } from '../store/useMeetingStore';

interface AgendaDetailScreenProps { meetingId: string; onBack: () => void }

export const AgendaDetailScreen: React.FC<AgendaDetailScreenProps> = ({ meetingId, onBack }) => {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMeeting(null);
    try { setMeeting(await useMeetingStore.getState().getMeetingById(meetingId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memuat detail agenda.'); }
    finally { setLoading(false); }
  }, [meetingId]);
  useEffect(() => { void load(); }, [load]);

  return (
    <View style={styles.container}>
      <Header title="Detail Agenda Rapat" showBack onBack={onBack} />
      {loading && !meeting ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : null}
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {meeting ? (
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[colors.primary]} />}>
          <View style={styles.card}>
            <View style={styles.status}><Text style={styles.statusText}>{statusLabel(meeting.status)}</Text></View>
            <Text style={styles.title}>{meeting.title}</Text>
            <Text style={styles.code}>{meeting.code}</Text>
            <Detail label="Jenis rapat" value={meeting.agendaDescription.split(' • ')[0]} />
            <Detail label="Format" value={meeting.type.toUpperCase()} />
            <Detail label="Waktu mulai" value={`${meeting.date} • ${meeting.startTime}`} />
            <Detail label="Waktu selesai" value={meeting.endTime} />
            <Detail label={meeting.type === 'online' ? 'Tautan rapat' : 'Lokasi'} value={meeting.venue || 'Tidak tersedia'} />
            <Detail label="Pimpinan" value={meeting.leader} />
            <Detail label="Peserta/unit" value={meeting.targetAudience || 'Tidak tersedia'} />
            <Detail label="Presensi tercatat" value={String(meeting.totalAttended)} />
            <Detail label="Surat edaran" value={meeting.invitationPdfUrl || 'Tidak tersedia'} />
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
};

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>
);

function statusLabel(status: Meeting['status']): string {
  return ({ draft: 'Draf', upcoming: 'Akan datang', ongoing: 'Berlangsung', completed: 'Selesai', cancelled: 'Dibatalkan' })[status];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  loader: { marginTop: spacing.xl },
  card: { padding: spacing.md, backgroundColor: colors.surfaceContainerLowest, borderRadius: 14, gap: spacing.sm },
  status: { alignSelf: 'flex-start', backgroundColor: colors.surfaceContainerLow, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  title: { color: colors.onSurface, fontSize: 19, fontWeight: '700' },
  code: { color: colors.onSurfaceVariant, fontSize: 12, marginBottom: spacing.sm },
  row: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.outlineVariant, paddingTop: spacing.sm, gap: 3 },
  label: { color: colors.onSurfaceVariant, fontSize: 12 },
  value: { color: colors.onSurface, fontSize: 14 },
});
