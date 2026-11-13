import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  MapPin,
  NotebookPen,
  Plus,
  ShieldCheck,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { formatTanggalIndonesia, formatWaktuWIB } from '../../core/utils/dateFormatter';
import { resolveAttendanceMediaUrl, resolveSuratEdaranUrl } from '../../core/utils/mediaUrl';
import { agendaApi, UploadFileRef } from '../../data/datasources/agendaApi';
import { apiClient } from '../../data/datasources/apiClient';
import { authTokenStore } from '../../data/datasources/authTokenStore';
import { toMeeting } from '../../data/mappers/apiMappers';
import { Meeting } from '../../domain/entities/types';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { SimpleHtmlView } from '../components/common/SimpleHtmlView';
import { StatusPill, StatusPillType } from '../components/common/StatusPill';
import { EvidenceViewerModal } from '../components/modals/EvidenceViewerModal';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { canManageMinutes } from '../utils/permissionUtils';

interface DocumentationItem {
  id: number | string;
  url?: string | null;
  file_url?: string | null;
  caption?: string | null;
  created_at?: string | null;
}

interface RawAttendanceRecord {
  id: number | string;
  checked_in_at?: string | null;
  selfie_url?: string | null;
  signature_url?: string | null;
  verification_token?: string | null;
  ip_address?: string | null;
  device_info?: string | null;
  user?: {
    id?: number | string;
    name?: string;
    nip?: string | null;
  } | null;
}

interface SeConfigMeta {
  perihal?: string | null;
  nomor_surat?: string | null;
  tanggal_surat?: string | null;
  tujuan_surat?: string | null;
}

type MeetingWithDocs = Meeting & {
  documentations?: DocumentationItem[];
  hasAttended?: boolean;
};

interface AgendaDetailScreenProps {
  meetingId: string;
  onBack: () => void;
  onNavigatePresensi?: (meetingId: string) => void;
  onNavigateReceipt?: (attendanceId: string) => void;
}

function formatTipeLabel(type: Meeting['type']): string {
  if (type === 'online') return 'Daring';
  if (type === 'hybrid') return 'Hybrid';
  return 'Luring';
}

function toPillStatus(status: Meeting['status']): StatusPillType {
  if (status === 'ongoing' || status === 'completed' || status === 'upcoming' || status === 'cancelled') {
    return status;
  }
  return 'upcoming';
}

function htmlToPlainText(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Berkas tidak dapat dibaca.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('Format berkas tidak valid.'));
      else resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function formatDocDate(iso?: string | null): string | null {
  if (!iso) return null;
  const datePart = formatTanggalIndonesia(iso);
  const timePart = formatWaktuWIB(iso);
  if (!datePart && !timePart) return null;
  return timePart ? `${datePart} • ${timePart}` : datePart;
}

const AuthSelfieThumbnail: React.FC<{
  attendanceId: string;
  selfieUrl?: string | null;
}> = ({ attendanceId, selfieUrl }) => {
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const resolved = resolveAttendanceMediaUrl(selfieUrl, attendanceId, 'selfie');
    if (!resolved) {
      setFailed(true);
      return;
    }
    if (resolved.startsWith('data:image/') || resolved.startsWith('file://')) {
      setCachedUri(resolved);
      return;
    }

    (async () => {
      try {
        const token = await authTokenStore.get();
        const cacheDir = FileSystem.cacheDirectory ?? '';
        const dest = `${cacheDir}selfie_detail_${attendanceId}.jpg`;
        const res = await FileSystem.downloadAsync(resolved, dest, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!active) return;
        if (res.status >= 200 && res.status < 300) {
          setCachedUri(`${res.uri}?t=${Date.now()}`);
          setFailed(false);
        } else {
          setFailed(true);
        }
      } catch {
        if (active) setFailed(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [attendanceId, selfieUrl]);

  if (failed || !cachedUri) {
    return (
      <View style={styles.mySelfieFallback}>
        <ShieldCheck size={22} color={colors.success} strokeWidth={2} />
      </View>
    );
  }

  return <Image source={{ uri: cachedUri }} style={styles.mySelfieThumb} resizeMode="cover" />;
};

export const AgendaDetailScreen: React.FC<AgendaDetailScreenProps> = ({
  meetingId,
  onBack,
  onNavigatePresensi,
  onNavigateReceipt,
}) => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [meeting, setMeeting] = useState<MeetingWithDocs | null>(null);
  const [rawAgenda, setRawAgenda] = useState<Record<string, any> | null>(null);
  const [seConfig, setSeConfig] = useState<SeConfigMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewerModalVisible, setIsViewerModalVisible] = useState(false);
  const [isEvidenceModalVisible, setIsEvidenceModalVisible] = useState(false);
  const [isDownloadingEdaran, setIsDownloadingEdaran] = useState(false);
  const [zoomDoc, setZoomDoc] = useState<DocumentationItem | null>(null);

  // Notulensi editor state
  const [isMinutesModalVisible, setIsMinutesModalVisible] = useState(false);
  const [notulensiDraft, setNotulensiDraft] = useState('');
  const [kesimpulanDraft, setKesimpulanDraft] = useState('');
  const [photoDrafts, setPhotoDrafts] = useState<UploadFileRef[]>([]);
  const [photoCaptions, setPhotoCaptions] = useState<string[]>([]);
  const [savingMinutes, setSavingMinutes] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await agendaApi.detail(meetingId);
      const raw = response.data as unknown as Record<string, any>;
      const mapped = toMeeting(response.data) as MeetingWithDocs;
      const mappedDocs: DocumentationItem[] = (raw.documentations ?? []).map((doc: any) => ({
        id: doc.id,
        url: doc.file_url ?? doc.url ?? null,
        file_url: doc.file_url ?? doc.url ?? null,
        caption: doc.caption ?? null,
        created_at: doc.created_at ?? null,
      }));
      mapped.documentations = mappedDocs;
      mapped.hasAttended = Boolean(raw.has_attended || raw.my_attendance);

      setRawAgenda(raw);
      setMeeting(mapped);

      if (raw.surat_edaran?.is_digital) {
        try {
          const seRes = await apiClient.get<{ data?: { config?: SeConfigMeta } }>(
            `/agendas/${encodeURIComponent(meetingId)}/surat-edaran/digital`
          );
          setSeConfig(seRes.data?.config ?? null);
        } catch {
          setSeConfig(null);
        }
      } else {
        setSeConfig(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat detail agenda.');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpenZoom = async () => {
    if (!meeting?.zoomUrl) return;
    try {
      await Linking.openURL(meeting.zoomUrl);
    } catch {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: 'Tidak dapat membuka tautan pertemuan daring.',
      });
    }
  };

  const handleStartAttendance = () => {
    if (!meeting) return;
    if (onNavigatePresensi) {
      onNavigatePresensi(meeting.id);
      return;
    }
    useFeedbackStore.getState().showToast({
      type: 'info',
      message: 'Silakan buka menu Presensi dari Dashboard untuk mengisi daftar hadir.',
    });
  };

  const handleOpenReceiptOrEvidence = () => {
    const myAtt = rawAgenda?.my_attendance as RawAttendanceRecord | null | undefined;
    if (myAtt?.id && onNavigateReceipt) {
      onNavigateReceipt(String(myAtt.id));
      return;
    }
    setIsEvidenceModalVisible(true);
  };

  const handleDownloadSuratEdaran = async () => {
    const streamPath =
      rawAgenda?.surat_edaran?.stream_url ??
      rawAgenda?.surat_edaran?.url ??
      meeting?.invitationPdfUrl;
    if (!streamPath) return;

    setIsDownloadingEdaran(true);
    try {
      const response = await agendaApi.downloadSuratEdaran(streamPath);
      const directory = FileSystem.cacheDirectory;
      if (!directory) throw new Error('Penyimpanan sementara perangkat tidak tersedia.');
      const ext =
        rawAgenda?.surat_edaran?.extension ||
        (rawAgenda?.surat_edaran?.is_image ? 'jpg' : 'pdf');
      const fallbackName = `Surat-Edaran_${meeting?.code || meetingId}.${ext}`;
      const safeName = (response.filename || fallbackName).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
      const destUri = `${directory}${safeName}`;
      const base64 = await blobToBase64(response.blob);
      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Fitur berbagi berkas tidak tersedia pada perangkat ini.');
      }
      await Sharing.shareAsync(destUri, {
        mimeType: response.contentType ?? undefined,
        dialogTitle: 'Unduh / Bagikan Surat Edaran',
      });
    } catch (cause) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: cause instanceof Error ? cause.message : 'Gagal mengunduh surat edaran.',
      });
    } finally {
      setIsDownloadingEdaran(false);
    }
  };

  const openMinutesEditor = () => {
    setNotulensiDraft(htmlToPlainText(meeting?.minutesHtml));
    setKesimpulanDraft(htmlToPlainText(meeting?.summaryHtml));
    setPhotoDrafts([]);
    setPhotoCaptions([]);
    setIsMinutesModalVisible(true);
  };

  const handlePickDocumentationPhotos = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        useFeedbackStore.getState().showToast({
          type: 'warning',
          message: 'Izin galeri diperlukan untuk mengunggah foto dokumentasi.',
        });
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (picked.canceled || !picked.assets.length) return;
      const newFiles: UploadFileRef[] = picked.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `dokumentasi_${Date.now()}_${index + 1}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      }));
      setPhotoDrafts((prev) => [...prev, ...newFiles]);
      setPhotoCaptions((prev) => [...prev, ...newFiles.map(() => '')]);
    } catch {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: 'Gagal memilih foto dari galeri.',
      });
    }
  };

  const handleSaveMinutes = async () => {
    if (!meeting) return;
    setSavingMinutes(true);
    try {
      await agendaApi.updateMinutes(meeting.id, {
        notulensi: notulensiDraft.trim(),
        kesimpulan: kesimpulanDraft.trim(),
        photos: photoDrafts.length > 0 ? photoDrafts : undefined,
        captions: photoDrafts.length > 0 ? photoCaptions : undefined,
      });
      setIsMinutesModalVisible(false);
      useFeedbackStore.getState().showToast({
        type: 'success',
        message: 'Notulensi dan dokumentasi rapat berhasil diperbarui.',
      });
      await load();
    } catch (cause) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: cause instanceof Error ? cause.message : 'Gagal menyimpan notulensi.',
      });
    } finally {
      setSavingMinutes(false);
    }
  };

  const docs = meeting?.documentations ?? [];
  const myAttendance = (rawAgenda?.my_attendance ?? null) as RawAttendanceRecord | null;
  const hasAttended = Boolean(meeting?.hasAttended || rawAgenda?.has_attended || myAttendance);
  const creator = rawAgenda?.creator as { name?: string; unit?: { kode_unit?: string | null } | null } | undefined;
  const allowManageMinutes = Boolean(
    rawAgenda?.permissions?.can_manage_minutes ?? canManageMinutes(user, meeting)
  );
  const canEditMinutesNow =
    allowManageMinutes && (meeting?.status === 'ongoing' || meeting?.status === 'completed');

  const suratEdaranMeta = rawAgenda?.surat_edaran ?? meeting?.suratEdaran;
  const resolvedEdaranUrl =
    resolveSuratEdaranUrl(
      suratEdaranMeta?.stream_url ?? suratEdaranMeta?.url ?? meeting?.invitationPdfUrl
    ) ?? meeting?.invitationPdfUrl;
  const edaranBadgeLabel = suratEdaranMeta?.is_digital
    ? 'SURAT DIGITAL'
    : suratEdaranMeta?.is_image
    ? 'GAMBAR'
    : 'PDF';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Dark Slate Hero Banner matching staff_show.blade.php */}
      <View style={[styles.heroBanner, { paddingTop: Math.max(insets.top, spacing.sm) + spacing.sm }]}>
        <View style={styles.heroTopRow}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.heroBackBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <ArrowLeft size={16} color={colors.onPrimary} strokeWidth={2} />
            <Text style={styles.heroBackText}>Kembali</Text>
          </Pressable>
          {meeting ? <StatusPill status={toPillStatus(meeting.status)} /> : null}
        </View>

        <Text style={styles.heroTitle} numberOfLines={3}>
          {meeting?.title ?? (loading ? 'Memuat Detail Agenda...' : 'Detail Agenda Rapat')}
        </Text>

        {meeting ? (
          <View style={styles.heroMetaList}>
            <View style={styles.heroMetaRow}>
              <BookOpen size={14} color={colors.borderStrong} strokeWidth={2} />
              <Text style={styles.heroMetaText} numberOfLines={1}>
                {meeting.classification || meeting.agendaDescription}
              </Text>
            </View>
            <View style={styles.heroMetaRow}>
              <Clock size={14} color={colors.borderStrong} strokeWidth={2} />
              <Text style={styles.heroMetaText} numberOfLines={2}>
                {meeting.date} • {meeting.startTime} {meeting.endTime ? `- ${meeting.endTime} WIB` : 'WIB s.d. Selesai'}
              </Text>
            </View>
            <View style={styles.heroMetaRow}>
              <MapPin size={14} color={colors.borderStrong} strokeWidth={2} />
              <Text style={styles.heroMetaText} numberOfLines={2}>
                [{formatTipeLabel(meeting.type)}] {meeting.venue || (meeting.type === 'online' ? 'Ruang Virtual / Tautan Rapat' : 'Lokasi belum ditentukan')}
              </Text>
            </View>
            <View style={styles.heroPeopleRow}>
              <View style={styles.heroPersonChip}>
                <UserCheck size={13} color={colors.borderStrong} strokeWidth={2} />
                <Text style={styles.heroPersonText} numberOfLines={1}>
                  Penyelenggara:{' '}
                  <Text style={styles.heroPersonStrong}>
                    {creator?.name || '-'} ({creator?.unit?.kode_unit || 'Pusat'})
                  </Text>
                </Text>
              </View>
              <View style={styles.heroPersonChip}>
                <Users size={13} color={colors.borderStrong} strokeWidth={2} />
                <Text style={styles.heroPersonText} numberOfLines={1}>
                  Pimpinan: <Text style={styles.heroPersonStrong}>{meeting.leader || '-'}</Text>
                </Text>
              </View>
              <View style={styles.heroPersonChip}>
                <NotebookPen size={13} color={colors.borderStrong} strokeWidth={2} />
                <Text style={styles.heroPersonText} numberOfLines={1}>
                  Notulis: <Text style={styles.heroPersonStrong}>{meeting.notulis || '-'}</Text>
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {meeting && meeting.status === 'ongoing' && !hasAttended ? (
          <View style={styles.heroCtaWrap}>
            <Button
              title="Isi Presensi Saya"
              variant="success"
              size="md"
              fullWidth
              onPress={handleStartAttendance}
              icon={<FileCheck2 size={18} color={colors.onPrimary} strokeWidth={2} />}
            />
          </View>
        ) : null}

        {meeting && hasAttended ? (
          <View style={styles.heroAttendedRow}>
            <View style={styles.attendedPill}>
              <CheckCircle2 size={16} color={colors.successLight} strokeWidth={2} />
              <Text style={styles.attendedPillText}>Anda Sudah Mengisi Presensi</Text>
            </View>
            <Pressable
              onPress={handleOpenReceiptOrEvidence}
              style={({ pressed }) => [styles.heroReceiptBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Buka bukti presensi"
            >
              <FileCheck2 size={15} color={colors.onPrimary} strokeWidth={2} />
              <Text style={styles.heroReceiptBtnText}>Bukti Presensi</Text>
            </Pressable>
          </View>
        ) : null}

        {meeting && canEditMinutesNow ? (
          <Pressable
            onPress={openMinutesEditor}
            style={({ pressed }) => [styles.heroMinutesBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Kelola Notulensi Rapat"
          >
            <NotebookPen size={16} color={colors.primary} strokeWidth={2} />
            <Text style={styles.heroMinutesBtnText}>Kelola Notulensi Rapat</Text>
          </Pressable>
        ) : null}
      </View>

      {loading && !meeting ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : null}
      {error && !meeting ? <ErrorState message={error} onRetry={load} /> : null}

      {meeting ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[colors.primary]} />}
        >
          {/* Status Presensi Anda Panel (staff_show.blade.php:257-339) */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <ShieldCheck size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>Status Presensi Anda</Text>
              {hasAttended ? (
                <View style={styles.hadirBadge}>
                  <Text style={styles.hadirBadgeText}>HADIR</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.panelBody}>
              {hasAttended && myAttendance ? (
                <View style={styles.myAttendedCard}>
                  <View style={styles.myAttendedTop}>
                    <Pressable
                      onPress={() => setIsEvidenceModalVisible(true)}
                      style={({ pressed }) => [styles.mySelfiePress, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Perbesar foto selfie presensi"
                    >
                      <AuthSelfieThumbnail
                        attendanceId={String(myAttendance.id)}
                        selfieUrl={myAttendance.selfie_url}
                      />
                    </Pressable>
                    <View style={styles.flexOne}>
                      <Text style={styles.myAttendedTitle}>Presensi Sah Terverifikasi</Text>
                      <Text style={styles.myAttendedTime}>
                        {myAttendance.checked_in_at
                          ? `${formatTanggalIndonesia(myAttendance.checked_in_at)} • ${formatWaktuWIB(myAttendance.checked_in_at)}`
                          : 'Tercatat dalam sistem'}
                      </Text>
                      <Text style={styles.myAttendedHint}>
                        Ketuk foto untuk pratinjau biometrik & tanda tangan.
                      </Text>
                    </View>
                  </View>
                  <Button
                    title="Lihat Bukti Presensi Digital"
                    variant="primary"
                    size="sm"
                    fullWidth
                    onPress={handleOpenReceiptOrEvidence}
                    icon={<FileCheck2 size={16} color={colors.onPrimary} strokeWidth={2} />}
                  />
                </View>
              ) : meeting.status === 'ongoing' ? (
                <View style={styles.myPendingCard}>
                  <Text style={styles.myPendingTitle}>Sesi Presensi Sedang Dibuka</Text>
                  <Text style={styles.myPendingDesc}>
                    Silakan lengkapi foto swafoto (selfie) dan tanda tangan digital untuk mencatat kehadiran Anda.
                  </Text>
                  <Button
                    title="Isi Presensi Sekarang"
                    variant="success"
                    size="md"
                    fullWidth
                    onPress={handleStartAttendance}
                    icon={<FileCheck2 size={17} color={colors.onPrimary} strokeWidth={2} />}
                  />
                </View>
              ) : (
                <View style={styles.myClosedCard}>
                  <Text style={styles.myClosedTitle}>
                    {meeting.status === 'upcoming'
                      ? 'Sesi Presensi Belum Dibuka'
                      : meeting.status === 'cancelled'
                      ? 'Agenda Rapat Dibatalkan'
                      : 'Sesi Presensi Telah Ditutup'}
                  </Text>
                  <Text style={styles.myClosedDesc}>
                    {meeting.status === 'upcoming'
                      ? 'Presensi baru dapat diisi ketika rapat telah dibuka oleh penyelenggara.'
                      : 'Tidak ada catatan kehadiran Anda pada agenda rapat ini.'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {canEditMinutesNow ? (
            <View style={styles.delegationBanner}>
              <NotebookPen size={16} color={colors.onWarningContainer} strokeWidth={2} />
              <Text style={styles.delegationText}>
                Anda memiliki wewenang mengelola Notulensi, Kesimpulan, & Dokumentasi untuk agenda rapat ini.
              </Text>
            </View>
          ) : null}
          {/* Online Meeting Link */}
          {meeting.zoomUrl ? (
            <View style={[styles.panel, styles.zoomCard]}>
              <View style={styles.zoomLeft}>
                <View style={styles.zoomIconBox}>
                  <Video size={18} color={colors.onPrimary} strokeWidth={2} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.sectionTitle}>Tautan Pertemuan Daring</Text>
                  <Text style={styles.zoomUrlText} numberOfLines={1}>
                    {meeting.zoomUrl}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => void handleOpenZoom()}
                style={({ pressed }) => [styles.zoomOpenBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Buka Zoom atau Google Meet"
              >
                <Text style={styles.zoomOpenText}>Buka</Text>
                <ExternalLink size={14} color={colors.onPrimary} strokeWidth={2} />
              </Pressable>
            </View>
          ) : null}

          {/* Notulensi & Kesimpulan */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <FileText size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>Notulensi & Kesimpulan Rapat</Text>
              {canEditMinutesNow ? (
                <Pressable
                  onPress={openMinutesEditor}
                  style={({ pressed }) => [styles.panelHeaderActionBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit notulensi rapat"
                >
                  <NotebookPen size={14} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.panelHeaderActionText}>Edit</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.panelBody}>
              <Text style={styles.subSectionLabel}>POIN-POIN PEMBAHASAN (NOTULENSI)</Text>
              {meeting.minutesHtml && meeting.minutesHtml.trim().length > 0 ? (
                <View style={styles.htmlBoxNeutral}>
                  <SimpleHtmlView html={meeting.minutesHtml} />
                </View>
              ) : (
                <View style={styles.htmlBoxNeutral}>
                  <Text style={styles.emptyItalicText}>
                    Notulensi jalannya rapat belum diinput oleh pengelola rapat.
                  </Text>
                </View>
              )}

              <Text style={[styles.subSectionLabel, styles.sectionGapTop]}>
                KESIMPULAN & RENCANA TINDAK LANJUT (RTL)
              </Text>
              {meeting.summaryHtml && meeting.summaryHtml.trim().length > 0 ? (
                <View style={styles.htmlBoxEmerald}>
                  <SimpleHtmlView html={meeting.summaryHtml} />
                </View>
              ) : (
                <View style={styles.htmlBoxNeutral}>
                  <Text style={styles.emptyItalicText}>Kesimpulan rapat belum diinput.</Text>
                </View>
              )}
            </View>
          </View>

          {/* Dokumentasi Foto Rapat */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <ImageIcon size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>
                Dokumentasi Foto Rapat ({docs.length})
              </Text>
            </View>
            <View style={styles.panelBody}>
              {docs.length > 0 ? (
                <View style={styles.docsGrid}>
                  {docs.map((doc) => {
                    const imgUri = doc.file_url ?? doc.url ?? '';
                    const docDate = formatDocDate(doc.created_at);
                    return (
                      <Pressable
                        key={String(doc.id)}
                        onPress={() => setZoomDoc({ ...doc, url: imgUri })}
                        style={({ pressed }) => [styles.docCard, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Lihat foto ${doc.caption || 'Dokumentasi Rapat'}`}
                      >
                        <Image source={{ uri: imgUri }} style={styles.docThumb} resizeMode="cover" />
                        <Text style={styles.docCaption} numberOfLines={1}>
                          {doc.caption || 'Dokumentasi Rapat'}
                        </Text>
                        {docDate ? (
                          <Text style={styles.docTimestamp} numberOfLines={1}>
                            {docDate}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.emptyCenterText}>
                  Belum ada foto dokumentasi yang diunggah untuk agenda ini.
                </Text>
              )}
            </View>
          </View>

          {/* Surat Edaran */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <FileText size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>Surat Edaran / Undangan</Text>
              {resolvedEdaranUrl ? (
                <View style={styles.edaranTypeBadge}>
                  <Text style={styles.edaranTypeBadgeText}>{edaranBadgeLabel}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.panelBody}>
              {seConfig ? (
                <View style={styles.seConfigBox}>
                  {seConfig.nomor_surat ? (
                    <Text style={styles.seConfigMeta}>
                      Nomor: <Text style={styles.seConfigStrong}>{seConfig.nomor_surat}</Text>
                    </Text>
                  ) : null}
                  {seConfig.perihal ? (
                    <Text style={styles.seConfigMeta}>
                      Perihal: <Text style={styles.seConfigStrong}>{seConfig.perihal}</Text>
                    </Text>
                  ) : null}
                  {seConfig.tanggal_surat ? (
                    <Text style={styles.seConfigMeta}>
                      Tanggal: <Text style={styles.seConfigStrong}>{seConfig.tanggal_surat}</Text>
                    </Text>
                  ) : null}
                  {seConfig.tujuan_surat ? (
                    <Text style={styles.seConfigMeta}>
                      Tujuan: <Text style={styles.seConfigStrong}>{seConfig.tujuan_surat}</Text>
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {resolvedEdaranUrl ? (
                <View style={styles.edaranActionRow}>
                  <Pressable
                    onPress={() => setIsViewerModalVisible(true)}
                    style={({ pressed }) => [styles.edaranBtn, styles.flexOne, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Buka surat edaran rapat"
                  >
                    {suratEdaranMeta?.is_image ? (
                      <ImageIcon size={18} color={colors.primary} strokeWidth={2} />
                    ) : (
                      <FileText size={18} color={colors.error} strokeWidth={2} />
                    )}
                    <Text style={styles.edaranBtnText} numberOfLines={1}>
                      Lihat Dokumen Digital
                    </Text>
                    <ChevronRight size={18} color={colors.primary} strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={() => void handleDownloadSuratEdaran()}
                    disabled={isDownloadingEdaran}
                    style={({ pressed }) => [styles.edaranDownloadBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Unduh surat edaran"
                  >
                    {isDownloadingEdaran ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <>
                        <Download size={16} color={colors.onPrimary} strokeWidth={2} />
                        <Text style={styles.edaranDownloadText}>Unduh</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.emptyItalicText}>Berkas surat edaran belum dilampirkan.</Text>
              )}
            </View>
          </View>

          {/* Target Partisipan Rapat */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Users size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>Target Partisipan Rapat</Text>
            </View>
            <View style={styles.panelBody}>
              {meeting.targetType === 'selected_users' ? (
                <View style={styles.targetList}>
                  <View style={styles.targetBannerNeutral}>
                    <Text style={styles.targetBannerText}>
                      Khusus Pegawai ASN Tertentu ({meeting.invitedUsers?.length ?? meeting.totalInvited ?? 0} Pegawai)
                    </Text>
                  </View>
                  {(meeting.invitedUsers ?? []).map((u) => {
                    const isCurrentUser = user?.id && String(u.id) === String(user.id);
                    return (
                      <View
                        key={u.id}
                        style={[styles.invitedUserRow, isCurrentUser && styles.invitedUserRowSelf]}
                      >
                        <View style={styles.invitedUserTopRow}>
                          <Text style={styles.invitedUserName}>{u.name}</Text>
                          {isCurrentUser ? (
                            <View style={styles.selfBadge}>
                              <Text style={styles.selfBadgeText}>(Anda)</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.invitedUserMeta}>
                          NIP: {u.nip || '-'} • {u.unit || 'Pusat'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : meeting.isAllUnits || meeting.targetType === 'all_units' ? (
                <View style={styles.targetBannerEmerald}>
                  <CheckCircle2 size={16} color={colors.onSuccessContainer} strokeWidth={2} />
                  <Text style={styles.targetBannerEmeraldText}>
                    Terbuka untuk Seluruh Unit LLDIKTI
                  </Text>
                </View>
              ) : (
                <View style={styles.unitChipsWrap}>
                  {(meeting.unitsList ?? []).length > 0 ? (
                    meeting.unitsList!.map((unit) => (
                      <View key={unit.id} style={styles.unitChip}>
                        <Text style={styles.unitChipText}>
                          {unit.kode_unit} — {unit.nama_unit}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyItalicText}>
                      {meeting.targetAudience || 'Unit kerja terpilih'}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      ) : null}

      <SuratEdaranViewerModal
        visible={isViewerModalVisible}
        onClose={() => setIsViewerModalVisible(false)}
        documentUrl={resolvedEdaranUrl}
        fileName={`Surat-Edaran_${meeting?.code || 'Agenda'}.${suratEdaranMeta?.extension || (suratEdaranMeta?.is_image ? 'jpg' : 'pdf')}`}
        meetingTitle={meeting?.title}
        meetingCode={meeting?.code}
        meetingDate={`${meeting?.date} • ${meeting?.startTime}`}
        mimeType={suratEdaranMeta?.is_image ? 'image/jpeg' : 'application/pdf'}
      />

      <EvidenceViewerModal
        visible={isEvidenceModalVisible}
        onClose={() => setIsEvidenceModalVisible(false)}
        attendanceId={myAttendance ? String(myAttendance.id) : undefined}
        selfieUrl={myAttendance?.selfie_url}
        signatureUrl={myAttendance?.signature_url}
        participantName={myAttendance?.user?.name ?? user?.name}
        participantNip={myAttendance?.user?.nip ?? user?.nip}
        meetingTitle={meeting?.title}
        verificationToken={myAttendance?.verification_token ?? undefined}
        signedAt={myAttendance?.checked_in_at ?? undefined}
        ipAddress={myAttendance?.ip_address ?? undefined}
        deviceInfo={myAttendance?.device_info ?? undefined}
      />

      {/* Notulensi & Dokumentasi Editor Modal */}
      <Modal
        visible={isMinutesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMinutesModalVisible(false)}
      >
        <View style={styles.zoomOverlay}>
          <View style={styles.minutesModalCard}>
            <View style={styles.zoomModalHeader}>
              <Text style={styles.zoomModalTitle}>Kelola Notulensi & Dokumentasi</Text>
              <Pressable
                onPress={() => setIsMinutesModalVisible(false)}
                style={({ pressed }) => [styles.zoomCloseBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Tutup editor notulensi"
              >
                <X size={20} color={colors.onSurface} strokeWidth={2} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.minutesModalBody}>
              <Text style={styles.subSectionLabel}>POIN PEMBAHASAN (NOTULENSI)</Text>
              <TextInput
                value={notulensiDraft}
                onChangeText={setNotulensiDraft}
                multiline
                placeholder="Catat poin pembahasan jalannya rapat..."
                placeholderTextColor={colors.textMuted}
                style={styles.minutesTextInput}
                textAlignVertical="top"
              />

              <Text style={styles.subSectionLabel}>KESIMPULAN & TINDAK LANJUT (RTL)</Text>
              <TextInput
                value={kesimpulanDraft}
                onChangeText={setKesimpulanDraft}
                multiline
                placeholder="Catat kesimpulan akhir & rencana tindak lanjut..."
                placeholderTextColor={colors.textMuted}
                style={styles.minutesTextInput}
                textAlignVertical="top"
              />

              <View style={styles.photoPickerRow}>
                <Text style={styles.subSectionLabel}>UNGGAH FOTO DOKUMENTASI ({photoDrafts.length})</Text>
                <Pressable
                  onPress={() => void handlePickDocumentationPhotos()}
                  style={({ pressed }) => [styles.pickPhotoBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Tambah foto dokumentasi"
                >
                  <Plus size={15} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.pickPhotoText}>Tambah Foto</Text>
                </Pressable>
              </View>

              {photoDrafts.map((photo, idx) => (
                <View key={`${photo.uri}_${idx}`} style={styles.photoDraftRow}>
                  <Image source={{ uri: photo.uri }} style={styles.photoDraftThumb} resizeMode="cover" />
                  <TextInput
                    value={photoCaptions[idx] ?? ''}
                    onChangeText={(txt) =>
                      setPhotoCaptions((prev) => prev.map((c, i) => (i === idx ? txt : c)))
                    }
                    placeholder="Keterangan foto (opsional)"
                    placeholderTextColor={colors.textMuted}
                    style={styles.photoCaptionInput}
                  />
                  <Pressable
                    onPress={() => {
                      setPhotoDrafts((prev) => prev.filter((_, i) => i !== idx));
                      setPhotoCaptions((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    style={({ pressed }) => [styles.zoomCloseBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Hapus foto terpilih"
                  >
                    <X size={16} color={colors.error} strokeWidth={2} />
                  </Pressable>
                </View>
              ))}

              <Button
                title={savingMinutes ? 'Menyimpan...' : 'Simpan Notulensi'}
                variant="primary"
                size="md"
                fullWidth
                isLoading={savingMinutes}
                onPress={() => void handleSaveMinutes()}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Documentation Zoom Modal */}
      <Modal
        visible={Boolean(zoomDoc)}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomDoc(null)}
      >
        <View style={styles.zoomOverlay}>
          <View style={styles.zoomModalCard}>
            <View style={styles.zoomModalHeader}>
              <Text style={styles.zoomModalTitle} numberOfLines={1}>
                {zoomDoc?.caption || 'Dokumentasi Rapat'}
              </Text>
              <Pressable
                onPress={() => setZoomDoc(null)}
                style={({ pressed }) => [styles.zoomCloseBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Tutup pratinjau foto"
              >
                <X size={20} color={colors.onSurface} strokeWidth={2} />
              </Pressable>
            </View>
            {zoomDoc && (zoomDoc.file_url ?? zoomDoc.url) ? (
              <Image
                source={{ uri: (zoomDoc.file_url ?? zoomDoc.url) as string }}
                style={styles.zoomFullImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flexOne: { flex: 1, minWidth: 0 },
  loader: { marginTop: spacing.xl },
  pressed: { opacity: 0.78 },

  heroBanner: {
    backgroundColor: colors.primaryDarkest,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryContainer,
    gap: spacing.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroBackBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: rounded.md,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  heroBackText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  heroTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onPrimary,
  },
  heroMetaList: { gap: spacing.xs + 2 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  heroMetaText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.borderStrong,
    flex: 1,
  },
  heroPeopleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 2,
  },
  heroPersonChip: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  heroPersonText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.borderStrong,
  },
  heroPersonStrong: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  heroCtaWrap: {
    paddingTop: spacing.xs,
  },
  attendedPill: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.primaryContainer,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.successLight,
    paddingHorizontal: spacing.md,
  },
  attendedPillText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },

  content: { padding: spacing.md, gap: spacing.md },
  panel: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  panelHeaderTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    flex: 1,
  },
  panelBody: { padding: spacing.md, gap: spacing.xs + 2 },
  sectionGapTop: { marginTop: spacing.sm },

  zoomCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  zoomLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  zoomIconBox: {
    width: 40,
    height: 40,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  zoomUrlText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.monoRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  zoomOpenBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoomOpenText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },

  subSectionLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    letterSpacing: 0.5,
    color: colors.onSurface,
  },
  htmlBoxNeutral: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.lg,
    padding: spacing.sm + 4,
  },
  htmlBoxEmerald: {
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: rounded.lg,
    padding: spacing.sm + 4,
  },
  emptyItalicText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  emptyCenterText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  docsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  docCard: {
    width: '48.5%',
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  docThumb: {
    width: '100%',
    height: 110,
    backgroundColor: colors.surfaceContainer,
  },
  docCaption: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
    padding: spacing.xs + 2,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },

  edaranBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  edaranBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
    flex: 1,
  },

  targetList: { gap: spacing.xs + 2 },
  targetBannerNeutral: {
    padding: spacing.sm + 2,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  targetBannerText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  invitedUserRow: {
    padding: spacing.sm,
    borderRadius: rounded.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 2,
  },
  invitedUserName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  invitedUserMeta: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  targetBannerEmerald: {
    padding: spacing.sm + 2,
    borderRadius: rounded.lg,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  targetBannerEmeraldText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSuccessContainer,
    flex: 1,
  },
  unitChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  unitChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  unitChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },

  zoomOverlay: {
    flex: 1,
    backgroundColor: colors.scrimNeutralTop,
    justifyContent: 'center',
    padding: spacing.md,
  },
  zoomModalCard: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  zoomModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  zoomModalTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    flex: 1,
  },
  zoomCloseBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomFullImage: {
    width: '100%',
    height: 360,
    backgroundColor: colors.surfaceSoft,
  },
  heroAttendedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flexWrap: 'wrap',
  },
  heroReceiptBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: rounded.md,
    backgroundColor: colors.success,
  },
  heroReceiptBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  heroMinutesBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
  },
  heroMinutesBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  hadirBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: rounded.full,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  hadirBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSuccessContainer,
    fontSize: 10,
  },
  myAttendedCard: { gap: spacing.sm },
  myAttendedTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mySelfiePress: {
    width: 60,
    height: 60,
    borderRadius: rounded.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.successBorder,
    backgroundColor: colors.surfaceSoft,
  },
  mySelfieThumb: { width: '100%', height: '100%' },
  mySelfieFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successContainer,
  },
  myAttendedTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSuccessContainer,
  },
  myAttendedTime: {
    ...typography.bodySm,
    fontFamily: fontFamilies.monoRegular,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  myAttendedHint: {
    ...typography.labelSm,
    color: colors.textMuted,
    marginTop: 2,
  },
  myPendingCard: {
    gap: spacing.xs + 2,
    padding: spacing.sm + 2,
    borderRadius: rounded.lg,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  myPendingTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.infoText,
  },
  myPendingDesc: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  myClosedCard: {
    gap: 4,
    padding: spacing.sm + 2,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  myClosedTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  myClosedDesc: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  delegationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    padding: spacing.sm + 2,
    borderRadius: rounded.lg,
    backgroundColor: colors.warningContainer,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  delegationText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onWarningContainer,
    flex: 1,
  },
  panelHeaderActionBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  panelHeaderActionText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  docTimestamp: {
    ...typography.labelSm,
    fontFamily: fontFamilies.monoRegular,
    color: colors.textMuted,
    fontSize: 10,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  edaranTypeBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 3,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  edaranTypeBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.monoBold,
    fontSize: 10,
    color: colors.primary,
  },
  seConfigBox: {
    padding: spacing.sm,
    borderRadius: rounded.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 3,
    marginBottom: spacing.xs,
  },
  seConfigMeta: {
    ...typography.bodySm,
    color: colors.textMuted,
    fontSize: 12,
  },
  seConfigStrong: {
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  edaranActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  edaranDownloadBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
  },
  edaranDownloadText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  invitedUserRowSelf: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  invitedUserTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  selfBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    backgroundColor: colors.success,
  },
  selfBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
    fontSize: 10,
  },
  minutesModalCard: {
    ...cardSurface,
    maxHeight: '88%',
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  minutesModalBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  minutesTextInput: {
    minHeight: 96,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    padding: spacing.sm,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  photoPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pickPhotoBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
  },
  pickPhotoText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  photoDraftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    padding: spacing.xs,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.background,
  },
  photoDraftThumb: {
    width: 44,
    height: 44,
    borderRadius: rounded.sm,
  },
  photoCaptionInput: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.xs + 2,
    ...typography.bodySm,
    color: colors.onSurface,
  },
});
