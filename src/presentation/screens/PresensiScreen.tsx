import React, { useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing, rounded } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { FaceOvalOverlay } from '../components/attendance/FaceOvalOverlay';
import { DigitalSignaturePad } from '../components/attendance/DigitalSignaturePad';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { useMeetingStore } from '../store/useMeetingStore';

interface PresensiScreenProps { meetingId: string; onBack: () => void; onSuccess: (attendanceId: string) => void }

export const PresensiScreen: React.FC<PresensiScreenProps> = ({ meetingId, onBack }) => {
  const { activeMeeting, meetings } = useMeetingStore();
  const { portal, fetchPortal, isLoading, error, clearError } = useAttendanceStore();
  const meeting = activeMeeting?.id === meetingId ? activeMeeting : meetings.find((item) => item.id === meetingId);
  useEffect(() => { clearError(); void fetchPortal(meetingId); }, [meetingId, fetchPortal, clearError]);

  return <View style={styles.container}>
    <Header title="Presensi Rapat Kedinasan" subtitle={portal?.agenda.judul_rapat ?? meeting?.title ?? 'Agenda'} showBack onBack={onBack} />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void fetchPortal(meetingId)} />}>
      {isLoading && !portal ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text><Pressable onPress={() => void fetchPortal(meetingId)}><Text style={styles.action}>Coba lagi</Text></Pressable></View> : null}
      {portal ? <View style={styles.card}>
        <Text style={styles.heading}>Status portal presensi</Text>
        <Text style={styles.row}>Agenda: {portal.agenda.status.label}</Text>
        <Text style={styles.row}>Presensi dibuka: {portal.is_ongoing ? 'Ya' : 'Tidak'}</Text>
        <Text style={styles.row}>Memenuhi syarat: {portal.is_eligible ? 'Ya' : 'Tidak'}</Text>
        <Text style={styles.row}>Sudah presensi: {portal.has_attended ? 'Ya' : 'Belum'}</Text>
      </View> : null}
      <FaceOvalOverlay onCapture={() => undefined} />
      <DigitalSignaturePad onSignatureChange={() => undefined} />
      <View style={styles.notice}>
        <MaterialIcons name="info-outline" size={18} color={colors.primary} />
        <Text style={styles.noticeText}>Presensi belum dapat dikirim. Backend mewajibkan selfie dan tanda tangan sebagai file gambar atau data URI. Komponen saat ini hanya menghasilkan mock URI dan SVG, sehingga data tersebut tidak dikirim.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.row}>Identitas, waktu, dan IP dicatat server.</Text>
        <Text style={styles.row}>Validasi GPS/geofence tidak tersedia pada kontrak API.</Text>
      </View>
      <Button title="Kirim Presensi" onPress={() => undefined} variant="primary" size="lg" fullWidth disabled style={styles.submit} icon={<MaterialIcons name="verified" size={20} color={colors.onPrimary} />} />
    </ScrollView>
  </View>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2, gap: spacing.md },
  card: { backgroundColor: colors.surfaceContainerLow, borderRadius: rounded.lg, padding: spacing.md, gap: spacing.xs },
  heading: { ...typography.headlineSm, color: colors.onSurface },
  row: { ...typography.bodySm, color: colors.onSurfaceVariant },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: rounded.md, backgroundColor: colors.surfaceContainerLow },
  noticeText: { ...typography.bodySm, color: colors.onSurface, flex: 1 },
  action: { ...typography.labelSm, color: colors.primary, fontWeight: '700' },
  submit: { backgroundColor: colors.primary },
});
