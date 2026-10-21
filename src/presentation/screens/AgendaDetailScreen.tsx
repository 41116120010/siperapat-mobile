import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { rounded, spacing } from '../../core/theme/tokens';
import { Meeting } from '../../domain/entities/types';
import { Header } from '../components/common/Header';
import { ErrorState } from '../components/common/ErrorState';
import { useMeetingStore } from '../store/useMeetingStore';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';

interface AgendaDetailScreenProps { meetingId: string; onBack: () => void }

export const AgendaDetailScreen: React.FC<AgendaDetailScreenProps> = ({ meetingId, onBack }) => {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewerModalVisible, setIsViewerModalVisible] = useState(false);

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
            {meeting.invitationPdfUrl ? (
              <View style={styles.edaranRow}>
                <Text style={styles.label}>Surat edaran</Text>
                <Pressable
                  onPress={() => setIsViewerModalVisible(true)}
                  style={({ pressed }) => [styles.edaranBtn, pressed && styles.btnPressed]}
                  accessibilityLabel="Buka surat edaran rapat"
                >
                  <MaterialIcons
                    name={meeting.suratEdaran?.is_image ? 'image' : 'picture-as-pdf'}
                    size={16}
                    color={meeting.suratEdaran?.is_image ? colors.primary : '#DC2626'}
                  />
                  <Text style={styles.edaranBtnText} numberOfLines={1}>
                    Lihat Dokumen Digital
                  </Text>
                  <MaterialIcons name="chevron-right" size={16} color={colors.primary} />
                </Pressable>
              </View>
            ) : (
              <Detail label="Surat edaran" value="Tidak tersedia" />
            )}
          </View>
        </ScrollView>
      ) : null}

      {/* In-App Surat Edaran Viewer Modal */}
      <SuratEdaranViewerModal
        visible={isViewerModalVisible}
        onClose={() => setIsViewerModalVisible(false)}
        documentUrl={meeting?.invitationPdfUrl}
        fileName={`Surat-Edaran_${meeting?.code || 'Agenda'}.${meeting?.suratEdaran?.extension || (meeting?.suratEdaran?.is_image ? 'jpg' : 'pdf')}`}
        meetingTitle={meeting?.title}
        meetingCode={meeting?.code}
        meetingDate={`${meeting?.date} • ${meeting?.startTime}`}
        mimeType={meeting?.suratEdaran?.is_image ? 'image/jpeg' : 'application/pdf'}
      />
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
  edaranRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    paddingTop: spacing.sm,
    gap: 6,
  },
  edaranBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  edaranBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
});
