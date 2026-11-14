import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import {
  BookOpen,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Image as ImageIcon,
  MapPin,
  Maximize2,
  NotebookPen,
  Plus,
  ShieldCheck,
  User,
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
import { Header } from '../components/common/Header';
import { SimpleHtmlView } from '../components/common/SimpleHtmlView';
import { TutWuriLoader } from '../components/common/TutWuriLoader';
import { TutWuriRefreshBanner, useTutWuriRefreshControl } from '../components/common/TutWuriRefresh';
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
  pimpinanId?: number | string | null;
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

function formatStatusLabel(status: Meeting['status'], rawLabel?: string): string {
  if (rawLabel) return rawLabel;
  switch (status) {
    case 'ongoing':
      return 'Sedang Berlangsung';
    case 'upcoming':
      return 'Terjadwal';
    case 'completed':
      return 'Selesai';
    case 'cancelled':
      return 'Dibatalkan';
    case 'draft':
    default:
      return 'Draf / Konsep';
  }
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
        <ShieldCheck size={20} color={colors.success} strokeWidth={2} />
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
      if (
        (!mapped.invitedUsers || mapped.invitedUsers.length === 0) &&
        Array.isArray(raw.invited_users) &&
        raw.invited_users.length > 0
      ) {
        mapped.invitedUsers = raw.invited_users.map((u: any) => ({
          id: String(u.id),
          name: u.name ?? '',
          nip: u.nip ?? '',
          unit: u.unit?.nama_unit ?? u.unit?.kode_unit ?? '',
        }));
      }

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
  const creator = rawAgenda?.creator as
    | { name?: string; unit?: { kode_unit?: string | null } | null }
    | undefined;

  const isAssignedLeader = Boolean(
    user?.id &&
      (String(rawAgenda?.pimpinan_id ?? meeting?.pimpinanId ?? '') === String(user.id) ||
        (user.name && meeting?.leader && meeting.leader === user.name))
  );
  const isAssignedNotulis = Boolean(
    user?.id &&
      (String(rawAgenda?.notulis_id ?? meeting?.notulisId ?? '') === String(user.id) ||
        (user.name && meeting?.notulis && meeting.notulis === user.name))
  );
  const allowManageMinutes = Boolean(
    rawAgenda?.permissions?.can_manage_minutes ??
      canManageMinutes(user, meeting) ??
      (isAssignedLeader || isAssignedNotulis)
  );
  const isOngoing = meeting?.status === 'ongoing';
  const canEditMinutesNow = allowManageMinutes && isOngoing;

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
  const isEdaranPdf = Boolean(
    suratEdaranMeta?.is_digital ||
      suratEdaranMeta?.is_pdf ||
      (!suratEdaranMeta?.is_image && (suratEdaranMeta?.extension === 'pdf' || !suratEdaranMeta?.extension))
  );

  const hasMinutesContent = Boolean(
    (meeting?.minutesHtml && meeting.minutesHtml.trim().length > 0) ||
      (meeting?.summaryHtml && meeting.summaryHtml.trim().length > 0)
  );
  const isPullRefreshing = loading && meeting !== null;
  const refreshControl = useTutWuriRefreshControl(isPullRefreshing, load);

  return (
    <View style={styles.container}>
      <Header />

      {loading && !meeting ? (
        <TutWuriLoader size="lg" style={styles.loader} />
      ) : null}
      {error && !meeting ? <ErrorState message={error} onRetry={load} /> : null}

      {meeting ? (
        <View style={styles.refreshArea}>
          <TutWuriRefreshBanner refreshing={isPullRefreshing} />
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg },
            ]}
            refreshControl={refreshControl}
            showsVerticalScrollIndicator={false}
          >
          {/* Page Heading & Subtitle (staff_show.blade.php:4-5) */}
          <View style={styles.titleSection}>
            <Text style={styles.pageTitle}>Detail Agenda Rapat</Text>
            <Text style={styles.pageSubtitle}>
              Informasi pelaksanaan rapat kedinasan, dokumen undangan, notulensi, dan dokumentasi
            </Text>
          </View>

          {/* Top Dark Hero Card (staff_show.blade.php:10-97) */}
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>{meeting.title}</Text>

            <View style={styles.heroMetaList}>
              {/* 1. Jenis Rapat */}
              <View style={styles.heroMetaRow}>
                <BookOpen size={15} color={colors.borderStrong} strokeWidth={2} />
                <Text style={styles.heroMetaText}>
                  {rawAgenda?.jenis_rapat || meeting.classification || 'Rapat Koordinasi'}
                </Text>
              </View>

              {/* 2. Status & Jadwal */}
              <View style={styles.heroMetaRow}>
                <Clock size={15} color={colors.borderStrong} strokeWidth={2} />
                <Text style={styles.heroMetaText}>
                  <Text style={styles.heroMetaStrong}>
                    {formatStatusLabel(meeting.status, rawAgenda?.status?.label)}
                  </Text>
                  {` • ${meeting.date} • ${meeting.startTime} ${
                    meeting.endTime ? `- ${meeting.endTime} WIB` : 'WIB s.d. Selesai'
                  }`}
                </Text>
              </View>

              {/* 3. Lokasi & Format */}
              <View style={styles.heroMetaRow}>
                <MapPin size={15} color={colors.borderStrong} strokeWidth={2} />
                <Text style={styles.heroMetaText}>
                  [{formatTipeLabel(meeting.type)}]{' '}
                  {meeting.venue ||
                    (meeting.type === 'online'
                      ? 'Ruang Virtual / Tautan Rapat'
                      : 'Lokasi belum ditentukan')}
                </Text>
              </View>

              {/* 4. Penyelenggara */}
              <View style={styles.heroMetaRow}>
                <Users size={15} color={colors.borderStrong} strokeWidth={2} />
                <Text style={styles.heroMetaText}>
                  Penyelenggara: {creator?.name || 'Penyelenggara Rapat'} (
                  {creator?.unit?.kode_unit || 'Pusat'})
                </Text>
              </View>

              {/* 5. Pimpinan */}
              <View style={styles.heroMetaRowWrap}>
                <User size={15} color={colors.borderStrong} strokeWidth={2} />
                <Text style={styles.heroMetaTextInline}>
                  Pimpinan: <Text style={styles.heroMetaStrong}>{meeting.leader || '-'}</Text>
                </Text>
                {isAssignedLeader ? (
                  <View style={styles.heroSelfAmberPill}>
                    <Text style={styles.heroSelfAmberText}>Anda</Text>
                  </View>
                ) : null}
              </View>

              {/* 6. Notulis */}
              <View style={styles.heroMetaRowWrap}>
                <NotebookPen size={15} color={colors.borderStrong} strokeWidth={2} />
                <Text style={styles.heroMetaTextInline}>
                  Notulis: <Text style={styles.heroMetaStrong}>{meeting.notulis || '-'}</Text>
                </Text>
                {isAssignedNotulis ? (
                  <View style={styles.heroSelfAmberPill}>
                    <Text style={styles.heroSelfAmberText}>Anda</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Bottom Action Toolbar (staff_show.blade.php:63-96) */}
            <View style={styles.heroToolbar}>
              <Pressable
                onPress={onBack}
                style={({ pressed }) => [styles.heroBackBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Kembali ke Dashboard"
              >
                <ChevronLeft size={16} color={colors.onPrimary} strokeWidth={2} />
                <Text style={styles.heroBackBtnText}>Kembali ke Dashboard</Text>
              </Pressable>

              <View style={styles.heroRightActions}>
                {canEditMinutesNow ? (
                  <Pressable
                    onPress={openMinutesEditor}
                    style={({ pressed }) => [styles.heroAmberBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Kelola Notulensi Rapat"
                  >
                    <NotebookPen size={15} color={colors.primaryDarkest} strokeWidth={2} />
                    <Text style={styles.heroAmberBtnText}>Kelola Notulensi Rapat</Text>
                  </Pressable>
                ) : null}

                {isOngoing ? (
                  hasAttended ? (
                    <>
                      <View style={styles.heroAttendedBadge}>
                        <Check size={15} color={colors.primaryDarkest} strokeWidth={2.5} />
                        <Text style={styles.heroAttendedBadgeText}>Sudah Mengisi Presensi</Text>
                      </View>
                      <Pressable
                        onPress={handleOpenReceiptOrEvidence}
                        style={({ pressed }) => [styles.heroBackBtn, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityLabel="Bukti Presensi"
                      >
                        <Text style={styles.heroBackBtnText}>Bukti Presensi</Text>
                      </Pressable>
                    </>
                  ) : (
                    <Pressable
                      onPress={handleStartAttendance}
                      style={({ pressed }) => [styles.heroGreenBtn, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Isi Presensi Sekarang"
                    >
                      <CheckSquare size={15} color={colors.onPrimary} strokeWidth={2} />
                      <Text style={styles.heroGreenBtnText}>Isi Presensi Sekarang</Text>
                    </Pressable>
                  )
                ) : null}
              </View>
            </View>
          </View>

          {/* 1. Tautan Pertemuan Daring (staff_show.blade.php:104-119) */}
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
                accessibilityLabel="Buka Zoom atau GMeet"
              >
                <Text style={styles.zoomOpenText}>Buka Zoom / GMeet</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 2. Notice Notulis (staff_show.blade.php:122-138) */}
          {canEditMinutesNow ? (
            <View style={styles.notulisNoticeCard}>
              <View style={styles.notulisNoticeTop}>
                <View style={styles.notulisNoticeIconBox}>
                  <NotebookPen size={19} color={colors.primaryDarkest} strokeWidth={2} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.notulisNoticeTitle}>
                    Anda Ditugaskan Sebagai Notulis Rapat
                  </Text>
                  <Text style={styles.notulisNoticeDesc}>
                    Selama rapat berlangsung, Anda memiliki akses penuh untuk mencatat poin
                    pembahasan, kesimpulan/tindak lanjut, serta mengunggah foto dokumentasi rapat.
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={openMinutesEditor}
                style={({ pressed }) => [styles.notulisNoticeBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Buka Formulir Notulensi"
              >
                <Text style={styles.notulisNoticeBtnText}>Buka Formulir Notulensi</Text>
                <ChevronRight size={15} color={colors.onPrimary} strokeWidth={2} />
              </Pressable>
            </View>
          ) : null}

          {/* 3. Panel Notulensi & Kesimpulan Rapat (staff_show.blade.php:141-183) */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <FileText size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>Notulensi & Kesimpulan Rapat</Text>
              {canEditMinutesNow ? (
                <Pressable
                  onPress={openMinutesEditor}
                  style={({ pressed }) => [styles.panelHeaderActionBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Edit Notulensi"
                >
                  <NotebookPen size={14} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.panelHeaderActionText}>Edit Notulensi</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.panelBody}>
              {!hasMinutesContent ? (
                <View style={styles.dashedEmptyBox}>
                  <Text style={styles.emptyItalicText}>
                    Notulensi dan kesimpulan rapat belum diinput oleh penyelenggara atau notulis
                    rapat.
                  </Text>
                  {canEditMinutesNow ? (
                    <Pressable
                      onPress={openMinutesEditor}
                      style={({ pressed }) => [styles.inlineDarkActionBtn, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Input Notulensi Sekarang"
                    >
                      <Text style={styles.inlineDarkActionText}>Input Notulensi Sekarang</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <>
                  <Text style={styles.subSectionLabel}>Poin-Poin Pembahasan (Notulensi):</Text>
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
                    Kesimpulan & Rencana Tindak Lanjut (RTL):
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
                </>
              )}
            </View>
          </View>

          {/* 4. Panel Dokumentasi Foto Rapat (staff_show.blade.php:186-251) */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <ImageIcon size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>
                Dokumentasi Foto Rapat ({docs.length})
              </Text>
              {canEditMinutesNow ? (
                <Pressable
                  onPress={openMinutesEditor}
                  style={({ pressed }) => [styles.panelHeaderActionBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Kelola Foto"
                >
                  <Plus size={14} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.panelHeaderActionText}>Kelola Foto</Text>
                </Pressable>
              ) : null}
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
                        <Image
                          source={{ uri: imgUri }}
                          style={styles.docThumb}
                          resizeMode="cover"
                        />
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
                <View style={styles.emptyDocWrap}>
                  <Text style={styles.emptyCenterText}>
                    Belum ada foto dokumentasi rapat yang diunggah.
                  </Text>
                  {canEditMinutesNow ? (
                    <Pressable
                      onPress={openMinutesEditor}
                      style={({ pressed }) => [styles.inlineDarkActionBtn, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Kelola Foto Dokumentasi"
                    >
                      <Text style={styles.inlineDarkActionText}>Kelola Foto</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          {/* 5. Panel Status Presensi Anda (staff_show.blade.php:257-339) */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <CheckCircle2 size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>Status Presensi Anda</Text>
            </View>
            <View style={styles.panelBody}>
              {hasAttended && myAttendance ? (
                <View style={styles.myAttendedWrap}>
                  <View style={styles.myAttendedGreenBox}>
                    <View style={styles.myAttendedHeaderRow}>
                      <View style={styles.myAttendedVerifiedLeft}>
                        <Check size={16} color={colors.onSuccessContainer} strokeWidth={2.5} />
                        <Text style={styles.myAttendedTitle}>Presensi Sah Terverifikasi</Text>
                      </View>
                      <View style={styles.hadirBadge}>
                        <Text style={styles.hadirBadgeText}>HADIR</Text>
                      </View>
                    </View>

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
                        <Text style={styles.myAttendedTime}>
                          {myAttendance.checked_in_at
                            ? `${formatTanggalIndonesia(myAttendance.checked_in_at)} • ${formatWaktuWIB(
                                myAttendance.checked_in_at
                              )}`
                            : 'Tercatat dalam sistem'}
                        </Text>
                        <Text style={styles.myAttendedHint}>Foto Selfie Terekam</Text>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    onPress={handleOpenReceiptOrEvidence}
                    style={({ pressed }) => [styles.fullSecondaryBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Lihat Bukti Presensi Digital"
                  >
                    <FileText size={15} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.fullSecondaryBtnText}>Lihat Bukti Presensi Digital</Text>
                  </Pressable>
                </View>
              ) : isOngoing ? (
                <View style={styles.myAttendedWrap}>
                  <View style={styles.myPendingAmberCard}>
                    <Text style={styles.myPendingTitle}>Sesi Presensi Sedang Dibuka</Text>
                    <Text style={styles.myPendingDesc}>
                      Anda belum mengisi daftar hadir untuk agenda pertemuan ini. Silakan isi
                      presensi dengan foto selfie wajah dan tanda tangan digital.
                    </Text>
                  </View>
                  <Pressable
                    onPress={handleStartAttendance}
                    style={({ pressed }) => [styles.fullEmeraldBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Isi Presensi Sekarang"
                  >
                    <CheckSquare size={15} color={colors.onPrimary} strokeWidth={2} />
                    <Text style={styles.fullEmeraldBtnText}>Isi Presensi Sekarang</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.myClosedCard}>
                  <Text style={styles.myClosedDesc}>
                    {meeting.status === 'upcoming' || meeting.status === 'draft'
                      ? 'Sesi presensi belum dibuka oleh penyelenggara rapat.'
                      : 'Sesi presensi untuk rapat ini telah ditutup.'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 6. Panel Surat Edaran / Undangan (staff_show.blade.php:342) */}
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
                  <Text style={styles.seConfigTitle}>
                    {seConfig.perihal || meeting.title}
                  </Text>
                  <Text style={styles.seConfigMeta}>
                    <Text style={styles.seConfigStrong}>Nomor:</Text>{' '}
                    {seConfig.nomor_surat || '-'}
                  </Text>
                  <Text style={styles.seConfigMeta}>
                    <Text style={styles.seConfigStrong}>Tanggal:</Text>{' '}
                    {seConfig.tanggal_surat || '-'}
                  </Text>
                  <Text style={styles.seConfigMeta}>
                    <Text style={styles.seConfigStrong}>Tujuan:</Text>{' '}
                    {seConfig.tujuan_surat || '-'}
                  </Text>
                </View>
              ) : null}

              {resolvedEdaranUrl ? (
                <View style={styles.edaranButtonsCol}>
                  <Pressable
                    onPress={() => setIsViewerModalVisible(true)}
                    style={({ pressed }) => [styles.fullDarkBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Pratinjau Layar Penuh"
                  >
                    <Maximize2 size={15} color={colors.onPrimary} strokeWidth={2} />
                    <Text style={styles.fullDarkBtnText}>Pratinjau Layar Penuh</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => void handleDownloadSuratEdaran()}
                    disabled={isDownloadingEdaran}
                    style={({ pressed }) => [styles.fullSecondaryBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={isEdaranPdf ? 'Unduh PDF' : 'Unduh File'}
                  >
                    {isDownloadingEdaran ? (
                      <TutWuriLoader size="sm" />
                    ) : (
                      <>
                        <Download size={15} color={colors.error} strokeWidth={2} />
                        <Text style={styles.fullSecondaryBtnText}>
                          {isEdaranPdf ? 'Unduh PDF' : 'Unduh File'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.dashedEmptyBox}>
                  <Text style={styles.emptyItalicText}>
                    Tidak ada berkas surat edaran atau undangan terlampir.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 7. Panel Target Partisipan Rapat (staff_show.blade.php:345-398) */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Users size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>Target Partisipan Rapat</Text>
            </View>
            <View style={styles.panelBody}>
              {meeting.targetType === 'selected_users' ? (
                <View style={styles.targetList}>
                  <View style={styles.targetBannerNeutralRow}>
                    <View style={styles.targetBannerLeft}>
                      <Users size={15} color={colors.onSurfaceVariant} strokeWidth={2} />
                      <Text style={styles.targetBannerText}>Khusus Pegawai ASN Tertentu</Text>
                    </View>
                    <View style={styles.targetCountPill}>
                      <Text style={styles.targetCountPillText}>
                        {meeting.invitedUsers?.length ?? meeting.totalInvited ?? 0} Pegawai
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.targetSubLabel}>Daftar Pegawai yang Diundang:</Text>

                  {(meeting.invitedUsers ?? []).length > 0 ? (
                    (meeting.invitedUsers ?? []).map((u) => {
                      const isCurrentUser = Boolean(
                        user?.id && String(u.id) === String(user.id)
                      );
                      return (
                        <View
                          key={u.id}
                          style={[
                            styles.invitedUserRow,
                            isCurrentUser && styles.invitedUserRowSelf,
                          ]}
                        >
                          <View style={styles.invitedUserTopRow}>
                            <Text style={styles.invitedUserName}>{u.name}</Text>
                            {isCurrentUser ? (
                              <View style={styles.selfBadge}>
                                <Text style={styles.selfBadgeText}>Anda</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.invitedUserMeta}>
                            NIP: {u.nip || '-'} • {u.unit || 'Pusat'}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyItalicText}>Belum ada ASN yang ditugaskan.</Text>
                  )}
                </View>
              ) : meeting.isAllUnits || meeting.targetType === 'all_units' ? (
                <View style={styles.targetBannerEmerald}>
                  <CheckCircle2 size={16} color={colors.onSuccessContainer} strokeWidth={2} />
                  <View style={styles.flexOne}>
                    <Text style={styles.targetBannerEmeraldText}>
                      Terbuka untuk Seluruh Unit LLDIKTI
                    </Text>
                    <Text style={styles.targetBannerEmeraldSub}>Seluruh Pegawai ASN</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.targetList}>
                  <Text style={styles.targetSubLabel}>Hanya unit kerja berikut:</Text>
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
                </View>
              )}
            </View>
          </View>
          </ScrollView>
        </View>
      ) : null}

      <SuratEdaranViewerModal
        visible={isViewerModalVisible}
        onClose={() => setIsViewerModalVisible(false)}
        documentUrl={resolvedEdaranUrl}
        fileName={`Surat-Edaran_${meeting?.code || 'Agenda'}.${
          suratEdaranMeta?.extension || (suratEdaranMeta?.is_image ? 'jpg' : 'pdf')
        }`}
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
              <Text style={styles.subSectionLabel}>Poin-Poin Pembahasan (Notulensi)</Text>
              <TextInput
                value={notulensiDraft}
                onChangeText={setNotulensiDraft}
                multiline
                placeholder="Catat poin pembahasan jalannya rapat..."
                placeholderTextColor={colors.textMuted}
                style={styles.minutesTextInput}
                textAlignVertical="top"
              />

              <Text style={styles.subSectionLabel}>Kesimpulan & Rencana Tindak Lanjut (RTL)</Text>
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
                <Text style={styles.subSectionLabel}>
                  Unggah Foto Dokumentasi ({photoDrafts.length})
                </Text>
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
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoDraftThumb}
                    resizeMode="cover"
                  />
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
  refreshArea: { flex: 1, overflow: 'hidden' },
  flexOne: { flex: 1, minWidth: 0 },
  loader: { marginTop: spacing.xl, alignSelf: 'center' },
  pressed: { opacity: 0.78 },

  content: { padding: spacing.md, gap: spacing.md },

  titleSection: {
    marginTop: 2,
  },
  pageTitle: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 20,
    color: colors.primaryDarkest,
  },
  pageSubtitle: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },

  heroCard: {
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    gap: 14,
  },
  heroTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.onPrimary,
  },
  heroMetaList: { gap: 8 },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  heroMetaRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroMetaText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.borderStrong,
    flex: 1,
  },
  heroMetaTextInline: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: colors.borderStrong,
    flexShrink: 1,
  },
  heroMetaStrong: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  heroSelfAmberPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    backgroundColor: colors.warningSoftBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  heroSelfAmberText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    color: colors.warningSoftText,
  },
  heroToolbar: {
    borderTopWidth: 1,
    borderTopColor: colors.primaryContainer,
    paddingTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroRightActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  heroBackBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: rounded.md,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  heroBackBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },
  heroAmberBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: rounded.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  heroAmberBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 12,
    color: colors.primaryDarkest,
  },
  heroAttendedBadge: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: rounded.md,
    backgroundColor: colors.successLight,
  },
  heroAttendedBadgeText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primaryDarkest,
  },
  heroGreenBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: rounded.md,
    backgroundColor: colors.successLight,
  },
  heroGreenBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },

  panel: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: spacing.xs + 4,
    columnGap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  panelHeaderTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    color: colors.onSurface,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  panelBody: { padding: spacing.md, gap: spacing.xs + 4 },
  sectionGapTop: { marginTop: spacing.sm },

  zoomCard: {
    padding: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  zoomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 180,
  },
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
    fontSize: 12,
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
    justifyContent: 'center',
    gap: 6,
  },
  zoomOpenText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },

  notulisNoticeCard: {
    padding: spacing.md,
    borderRadius: rounded.xl,
    backgroundColor: colors.warningContainer,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    gap: spacing.sm + 2,
  },
  notulisNoticeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
  },
  notulisNoticeIconBox: {
    width: 40,
    height: 40,
    borderRadius: rounded.lg,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notulisNoticeTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    color: colors.onWarningContainer,
  },
  notulisNoticeDesc: {
    ...typography.bodySm,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.onWarningContainer,
    marginTop: 2,
  },
  notulisNoticeBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.lg,
    backgroundColor: colors.primaryDarkest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  notulisNoticeBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },

  subSectionLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    letterSpacing: 0.3,
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
  dashedEmptyBox: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: rounded.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineDarkActionBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineDarkActionText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },
  emptyItalicText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyDocWrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  emptyCenterText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
    textAlign: 'center',
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
  docTimestamp: {
    ...typography.labelSm,
    fontFamily: fontFamilies.monoRegular,
    color: colors.textMuted,
    fontSize: 10,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    backgroundColor: colors.surfaceCard,
  },

  myAttendedWrap: {
    gap: spacing.sm,
  },
  myAttendedGreenBox: {
    padding: spacing.md,
    borderRadius: rounded.lg,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    gap: spacing.sm,
  },
  myAttendedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  myAttendedVerifiedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  hadirBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  hadirBadgeText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    color: colors.onSuccessContainer,
    fontSize: 10,
  },
  myAttendedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mySelfiePress: {
    width: 48,
    height: 48,
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
    backgroundColor: colors.surfaceCard,
  },
  myAttendedTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onSuccessContainer,
  },
  myAttendedTime: {
    ...typography.bodySm,
    fontFamily: fontFamilies.monoSemiBold,
    color: colors.onSuccessContainer,
    fontSize: 11.5,
  },
  myAttendedHint: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.success,
    fontSize: 11,
    marginTop: 2,
  },
  myPendingAmberCard: {
    gap: 4,
    padding: spacing.md,
    borderRadius: rounded.lg,
    backgroundColor: colors.warningContainer,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  myPendingTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onWarningContainer,
  },
  myPendingDesc: {
    ...typography.bodySm,
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.onWarningContainer,
  },
  myClosedCard: {
    padding: spacing.md,
    borderRadius: rounded.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
  },
  myClosedDesc: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  fullDarkBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.lg,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  fullDarkBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },
  fullSecondaryBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  fullSecondaryBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primary,
  },
  fullEmeraldBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.lg,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  fullEmeraldBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },

  edaranTypeBadge: {
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 3,
    borderRadius: rounded.full,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  edaranTypeBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.monoBold,
    fontSize: 10,
    color: colors.infoText,
  },
  seConfigBox: {
    padding: spacing.sm + 4,
    borderRadius: rounded.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: 3,
  },
  seConfigTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 12.5,
    color: colors.onSurface,
    marginBottom: 2,
  },
  seConfigMeta: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  seConfigStrong: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  edaranButtonsCol: {
    gap: spacing.xs + 2,
  },

  targetList: { gap: spacing.xs + 4 },
  targetBannerNeutralRow: {
    padding: spacing.sm + 2,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  targetBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  targetBannerText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  targetCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  targetCountPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.onSurface,
  },
  targetSubLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  invitedUserRow: {
    padding: spacing.sm,
    borderRadius: rounded.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 2,
  },
  invitedUserRowSelf: {
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder,
  },
  invitedUserTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  invitedUserName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onSurface,
    flex: 1,
  },
  selfBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  selfBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.infoText,
    fontSize: 10,
  },
  invitedUserMeta: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoRegular,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  targetBannerEmerald: {
    padding: spacing.sm + 4,
    borderRadius: rounded.lg,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  targetBannerEmeraldText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onSuccessContainer,
  },
  targetBannerEmeraldSub: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
    color: colors.success,
    marginTop: 1,
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
    fontSize: 11.5,
    color: colors.onSurface,
  },

  panelHeaderActionBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  panelHeaderActionText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11.5,
    color: colors.primary,
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
