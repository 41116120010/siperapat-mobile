import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  CloudUpload,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Info,
  Mail,
  MapPin,
  Monitor,
  NotebookPen,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  User,
  Users,
  Video,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import {
  formatRentangWaktu,
  formatTanggalIndonesia,
  formatTanggalWaktuWIB,
  formatWaktuWIB,
} from '../../core/utils/dateFormatter';
import { resolveAuthenticatedMediaFile } from '../../core/utils/authenticatedMediaCache';
import { resolveAttendanceMediaUrl, resolveSuratEdaranUrl } from '../../core/utils/mediaUrl';
import { AutoScrollText } from '../components/common/AutoScrollText';
import { BiometricPrivacyPlaceholder } from '../components/common/BiometricPrivacyPlaceholder';
import { Button } from '../components/common/Button';
import { Header } from '../components/common/Header';
import { PaginationBar } from '../components/common/PaginationBar';
import { SimpleHtmlView } from '../components/common/SimpleHtmlView';
import { StatusPill, StatusPillType } from '../components/common/StatusPill';
import { TutWuriLoader } from '../components/common/TutWuriLoader';
import { TutWuriRefreshBanner, useTutWuriRefreshControl } from '../components/common/TutWuriRefresh';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { EvidenceViewerModal } from '../components/modals/EvidenceViewerModal';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';
import { UploadSuratEdaranModal } from '../components/modals/UploadSuratEdaranModal';
import { agendaApi, resolveFileMimeType, UploadFileRef } from '../../data/datasources/agendaApi';
import { apiClient } from '../../data/datasources/apiClient';
import { attendanceApi } from '../../data/datasources/attendanceApi';
import { AgendaExportFormat } from '../../data/datasources/reportApi';
import { meetingToUpdateDto, toMeeting } from '../../data/mappers/apiMappers';
import { AgendaExportRepository } from '../../data/repositories/AgendaExportRepository';
import { AttendanceStatus, Meeting } from '../../domain/entities/types';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { useMeetingStore } from '../store/useMeetingStore';
import { triggerPageTransition } from '../store/useTransitionStore';
import {
  canDeleteMeeting,
  canEditMeeting,
  canManageMinutes,
  canManageSuratEdaran,
} from '../utils/permissionUtils';

export interface MonitoringScreenProps {
  meetingId?: string;
  onBack?: () => void;
  onNavigateEdit?: (meetingId: string) => void;
  onNavigatePresensi?: (meetingId: string) => void;
  onNavigateReceipt?: (meetingId: string, attendanceId?: string) => void;
}

type TabType = 'verified' | 'unverified' | 'minutes';

interface DocumentationItem {
  id: number | string;
  url: string;
  file_url?: string | null;
  caption?: string | null;
  created_at?: string | null;
}

interface SeConfigMeta {
  perihal?: string | null;
  nomor_surat?: string | null;
  tanggal_surat?: string | null;
  tujuan_surat?: string | null;
}

interface SignerAttendanceRecord {
  id: string;
  userId?: string;
  name: string;
  nip: string;
  signedAt?: string | null;
  selfieUrl?: string | null;
  signatureUrl?: string | null;
  canViewBiometrics?: boolean;
  hasSelfie?: boolean;
  hasSignature?: boolean;
}

type MeetingWithDocs = Meeting & {
  documentations?: DocumentationItem[];
};

interface Participant {
  id?: string;
  name: string;
  role: string;
  nip: string;
  time: string;
  signedAt?: string | null;
  location: string;
  unit?: string;
  isOnline?: boolean;
  status: AttendanceStatus;
  selfieUrl?: string | null;
  signatureUrl?: string | null;
  canViewBiometrics?: boolean;
  hasSelfie?: boolean;
  hasSignature?: boolean;
  verificationToken?: string;
  ipAddress?: string;
  deviceInfo?: string;
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

function resolveDocExtension(url?: string | null): 'pdf' | 'vid' | 'img' {
  const lower = (url ?? '').split('?')[0].toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm')) return 'vid';
  return 'img';
}

const AuthMediaThumbnail: React.FC<{
  attendanceId: string;
  rawUrl?: string | null;
  mediaType: 'selfie' | 'signature';
  style: object;
  fallback?: React.ReactNode;
}> = ({ attendanceId, rawUrl, mediaType, style, fallback }) => {
  const [cachedUri, setCachedUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const resolved = resolveAttendanceMediaUrl(rawUrl, attendanceId, mediaType);
    if (!resolved) {
      setFailed(true);
      setCachedUri(null);
      return;
    }

    setFailed(false);
    void resolveAuthenticatedMediaFile(resolved, {
      cachePrefix: `mon_${mediaType}`,
      cacheKey: attendanceId,
      ext: mediaType === 'signature' ? 'png' : 'jpg',
    }).then((localUri) => {
      if (!active) return;
      if (localUri) {
        setCachedUri(localUri);
        setFailed(false);
      } else {
        setCachedUri(null);
        setFailed(true);
      }
    });

    return () => {
      active = false;
    };
  }, [attendanceId, rawUrl, mediaType]);

  if (failed || !cachedUri) {
    return <>{fallback ?? null}</>;
  }

  return (
    <Image
      source={{ uri: cachedUri }}
      style={style}
      resizeMode={mediaType === 'signature' ? 'contain' : 'cover'}
    />
  );
};

function plainText(html?: string | null) {
  return (
    html
      ?.replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .trim() || ''
  );
}

function toPillStatus(status?: Meeting['status']): StatusPillType {
  if (
    status === 'ongoing' ||
    status === 'completed' ||
    status === 'upcoming' ||
    status === 'cancelled'
  ) {
    return status;
  }
  return 'upcoming';
}

function formatTipeLabel(type?: Meeting['type']): string {
  if (type === 'online') return 'Daring';
  if (type === 'hybrid') return 'Hybrid';
  return 'Luring';
}

export const MonitoringScreen: React.FC<MonitoringScreenProps> = ({
  onBack,
  meetingId,
  onNavigateEdit,
  onNavigatePresensi,
  onNavigateReceipt,
}) => {
  const insets = useSafeAreaInsets();
  const exportRepository = useMemo(() => new AgendaExportRepository(), []);
  const [activeTab, setActiveTab] = useState<TabType>('verified');
  const [attendancePage, setAttendancePage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPokja, setSelectedPokja] = useState('Semua Unit');
  const { user } = useAuthStore();
  const {
    getMeetingById,
    deleteMeeting,
    updateMinutes,
    updateMeeting,
    uploadSuratEdaran,
    formOptions,
    fetchAgendaFormOptions,
    isSavingMinutes,
  } = useMeetingStore();
  const { agendaAttendances, agendaAttendancePage, fetchAgendaAttendances, isLoading, error } =
    useAttendanceStore();

  const [meeting, setMeeting] = useState<MeetingWithDocs | null>(null);
  const [rawAgenda, setRawAgenda] = useState<Record<string, any> | null>(null);
  const [seConfig, setSeConfig] = useState<SeConfigMeta | null>(null);
  const [signerAttendances, setSignerAttendances] = useState<SignerAttendanceRecord[]>([]);
  const [evidenceParticipant, setEvidenceParticipant] = useState<Participant | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDownloadingEdaran, setIsDownloadingEdaran] = useState(false);
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const [minutesDraft, setMinutesDraft] = useState('');
  const [conclusionDraft, setConclusionDraft] = useState('');
  const [isUploadingEdaran, setIsUploadingEdaran] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<AgendaExportFormat | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [zoomDoc, setZoomDoc] = useState<DocumentationItem | null>(null);

  // Role assignment modal state
  const [isRolesModalVisible, setIsRolesModalVisible] = useState(false);
  const [rolePickerTarget, setRolePickerTarget] = useState<'none' | 'leader' | 'notulis'>('none');
  const [pendingLeaderId, setPendingLeaderId] = useState('');
  const [pendingNotulisId, setPendingNotulisId] = useState('');
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  const userCanDelete = useMemo(() => canDeleteMeeting(user, meeting), [user, meeting]);
  const userCanEdit = useMemo(() => canEditMeeting(user, meeting), [user, meeting]);
  const userCanManageMinutes = useMemo(() => canManageMinutes(user, meeting), [user, meeting]);
  const userCanManageSuratEdaran = useMemo(
    () => canManageSuratEdaran(user, meeting),
    [user, meeting],
  );

  const isAppointedNotulis = useMemo(
    () => Boolean(user && meeting?.notulisId && String(meeting.notulisId) === String(user.id)),
    [user, meeting],
  );
  const isAppointedLeader = useMemo(
    () => Boolean(user && meeting?.leaderId && String(meeting.leaderId) === String(user.id)),
    [user, meeting],
  );

  const capacityBadgeLabel = useMemo(() => {
    if (!user || !meeting) return null;
    const role = (user.role ?? '').toLowerCase();
    if (role === 'administrator') return 'Administrator Sistem';
    if (
      String(meeting.creatorId ?? '') === String(user.id) ||
      (user.unitId != null && meeting.creatorUnitId === user.unitId)
    ) {
      return 'Unit Penyelenggara';
    }
    if (isAppointedLeader) return 'Pimpinan Rapat Bertugas';
    if (isAppointedNotulis) return 'Notulis Rapat Bertugas';
    return 'Mode Pemantauan';
  }, [user, meeting, isAppointedLeader, isAppointedNotulis]);

  const userOptions: AgendaOption[] = useMemo(
    () =>
      (formOptions?.users ?? []).map((u) => ({
        id: String(u.id),
        title: u.name,
        subtitle: `${u.jabatan || u.role?.label || 'Pegawai'}${u.unit?.nama_unit ? ` • ${u.unit.nama_unit}` : ''}`,
        badge: u.nip || undefined,
        icon: User,
      })),
    [formOptions],
  );

  const handleConfirmDelete = () => {
    if (!meeting) return;
    useFeedbackStore.getState().showModal({
      type: 'confirm',
      confirmVariant: 'destructive',
      title: 'Hapus Agenda Rapat',
      message: `Apakah Anda yakin ingin menghapus agenda "${meeting.title}" (${meeting.code})? Tindakan ini akan menghapus data kehadiran dan berkas terkait secara permanen.`,
      confirmText: 'Hapus Agenda',
      cancelText: 'Batal',
      onConfirm: async () => {
        const result = await deleteMeeting(meeting.id);
        if (result.success) {
          useFeedbackStore.getState().showToast({
            type: 'success',
            message: `Agenda "${meeting.title}" berhasil dihapus.`,
          });
          if (onBack) onBack();
        } else {
          useFeedbackStore.getState().showModal({
            type: 'error',
            title: 'Penghapusan Agenda Ditolak',
            message:
              result.message ||
              'Gagal menghapus agenda rapat. Silakan periksa kembali integritas data.',
            confirmText: 'Mengerti',
          });
        }
      },
    });
  };

  const loadAgendaDetail = useCallback(async () => {
    if (!meetingId) return;
    try {
      const response = await agendaApi.detail(meetingId);
      const raw = response.data as unknown as Record<string, any>;
      const mapped = toMeeting(response.data) as MeetingWithDocs;
      mapped.documentations = (raw.documentations ?? []).map((doc: any) => ({
        id: doc.id,
        url: doc.file_url ?? doc.url ?? '',
        file_url: doc.file_url ?? doc.url ?? null,
        caption: doc.caption ?? null,
        created_at: doc.created_at ?? null,
      }));
      mapped.suratEdaran = raw.surat_edaran ?? mapped.suratEdaran;
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
      setAgendaError(null);

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

      try {
        const attRes = await attendanceApi.agendaAttendances(meetingId, 1, 50, { status: 'attended' });
        const rows = (attRes.data ?? []).map((item: any) => ({
          id: String(item.id),
          userId: item.user?.id !== undefined ? String(item.user.id) : undefined,
          name: item.user?.name ?? '',
          nip: item.user?.nip ?? '',
          signedAt: item.checked_in_at ?? item.signed_at ?? null,
          selfieUrl: item.selfie_url ?? null,
          signatureUrl: item.signature_url ?? null,
          canViewBiometrics: item.can_view_biometrics !== false,
          hasSelfie: Boolean(item.has_selfie ?? item.selfie_url),
          hasSignature: Boolean(item.has_signature ?? item.signature_url),
        }));
        setSignerAttendances(rows);
      } catch {
        setSignerAttendances([]);
      }
    } catch (requestError: unknown) {
      setMeeting(null);
      setRawAgenda(null);
      setAgendaError(
        requestError instanceof Error ? requestError.message : 'Gagal memuat detail agenda.',
      );
    }
  }, [meetingId]);

  useEffect(() => {
    void loadAgendaDetail();
  }, [loadAgendaDetail]);

  const handleTransitionStatus = (
    nextStatus: 'draft' | 'scheduled' | 'ongoing' | 'completed',
    title: string,
    message: string,
    confirmText: string,
  ) => {
    if (!meeting || isUpdatingStatus) return;
    useFeedbackStore.getState().showModal({
      type: 'confirm',
      title,
      message,
      confirmText,
      cancelText: 'Batal',
      onConfirm: async () => {
        setIsUpdatingStatus(true);
        try {
          await agendaApi.updateStatus(meeting.id, nextStatus);
          useFeedbackStore.getState().showToast({
            type: 'success',
            message: 'Status agenda rapat berhasil diperbarui.',
          });
          await loadAgendaDetail();
        } catch (err) {
          useFeedbackStore.getState().showModal({
            type: 'error',
            title: 'Perubahan Status Ditolak',
            message:
              err instanceof Error
                ? err.message
                : 'Tidak dapat mengubah status agenda rapat saat ini.',
            confirmText: 'Mengerti',
          });
        } finally {
          setIsUpdatingStatus(false);
        }
      },
    });
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
      const fallbackName = `Surat-Edaran_${meeting?.code || meetingId || 'Agenda'}.${ext}`;
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
        dialogTitle: 'Unduh Surat Edaran',
      });
    } catch (err) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mengunduh surat edaran.',
      });
    } finally {
      setIsDownloadingEdaran(false);
    }
  };

  const handleDownloadDocumentation = async (doc: DocumentationItem) => {
    const fileUrl = doc.file_url ?? doc.url;
    if (!fileUrl) return;
    try {
      const ext = resolveDocExtension(fileUrl);
      if (ext !== 'img') {
        await Linking.openURL(fileUrl);
        return;
      }
      const cleanPath = fileUrl.split('?')[0].split('#')[0].toLowerCase();
      const imageExt = cleanPath.endsWith('.png')
        ? 'png'
        : cleanPath.endsWith('.webp')
          ? 'webp'
          : 'jpg';
      const cacheDir = FileSystem.cacheDirectory ?? '';
      const dest = `${cacheDir}doc_${doc.id}_${Date.now()}.${imageExt}`;
      const res = await FileSystem.downloadAsync(fileUrl, dest);
      if (res.status < 200 || res.status >= 300) {
        await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
        throw new Error(`HTTP ${res.status}`);
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(res.uri, { dialogTitle: 'Unduh Dokumentasi Rapat' });
      } else {
        await Linking.openURL(fileUrl);
      }
    } catch {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: 'Tidak dapat mengunduh berkas dokumentasi.',
      });
    }
  };

  useEffect(() => {
    if (!meetingId || activeTab === 'minutes') return;
    const timer = setTimeout(() => {
      void fetchAgendaAttendances(meetingId, attendancePage, false, {
        status: activeTab === 'unverified' ? 'unattended' : 'attended',
        search: searchQuery,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [meetingId, activeTab, searchQuery, attendancePage, fetchAgendaAttendances]);

  const handlePageChange = (page: number) => {
    if (!meetingId || page === attendancePage || isLoading) return;
    triggerPageTransition(350);
    setAttendancePage(page);
  };

  const [isViewerModalVisible, setIsViewerModalVisible] = useState(false);
  const [selectedEdaranFile, setSelectedEdaranFile] = useState<
    (UploadFileRef & { size?: number }) | null
  >(null);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);

  const handlePreviewSuratEdaran = () => {
    if (meeting?.invitationPdfUrl) {
      setIsViewerModalVisible(true);
    } else {
      useFeedbackStore.getState().showToast({
        type: 'info',
        message: 'Berkas surat edaran belum tersedia pada agenda ini.',
      });
    }
  };

  const handleExport = async (format: AgendaExportFormat) => {
    if (!meetingId || exporting) return;
    setExporting(format);
    try {
      const filename = await exportRepository.downloadAndShare(meetingId, format);
      useFeedbackStore.getState().showToast({
        type: 'success',
        message: `Berkas ${filename} siap dibagikan.`,
      });
    } catch (requestError) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message:
          requestError instanceof Error
            ? requestError.message
            : 'Gagal mengunduh berkas agenda.',
      });
    } finally {
      setExporting(null);
    }
  };

  const handleOpenRolesModal = () => {
    if (!meeting) return;
    setPendingLeaderId(meeting.leaderId ? String(meeting.leaderId) : '');
    setPendingNotulisId(meeting.notulisId ? String(meeting.notulisId) : '');
    setIsRolesModalVisible(true);
    if (!formOptions) {
      void fetchAgendaFormOptions();
    }
  };

  const handleSaveRoles = async () => {
    if (!meetingId || !meeting || isSavingRoles) return;
    setIsSavingRoles(true);
    try {
      const dto = {
        ...meetingToUpdateDto(meeting),
        pimpinan_id: pendingLeaderId ? Number(pendingLeaderId) : null,
        notulis_id: pendingNotulisId ? Number(pendingNotulisId) : null,
      };
      const updated = await updateMeeting(meetingId, dto);
      if (!updated) {
        useFeedbackStore.getState().showToast({
          type: 'error',
          message: useMeetingStore.getState().error || 'Gagal memperbarui peran rapat.',
        });
        return;
      }
      setMeeting(updated as MeetingWithDocs);
      setIsRolesModalVisible(false);
      useFeedbackStore.getState().showToast({
        type: 'success',
        message: 'Penugasan Pimpinan dan Notulis rapat berhasil disimpan.',
      });
    } finally {
      setIsSavingRoles(false);
    }
  };

  const handleEditMinutes = () => {
    setMinutesDraft(meeting?.minutesHtml ? plainText(meeting.minutesHtml) : '');
    setConclusionDraft(meeting?.summaryHtml ? plainText(meeting.summaryHtml) : '');
    setIsEditingMinutes(true);
  };

  const handleSaveMinutes = async () => {
    if (!meetingId || !meeting || isSavingMinutes) return;
    const notulensi = minutesDraft.trim() || null;
    const kesimpulan = conclusionDraft.trim() || null;

    const updated = await updateMinutes(meetingId, { notulensi, kesimpulan });
    if (!updated) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message:
          useMeetingStore.getState().error || 'Notulensi dan kesimpulan gagal disimpan.',
      });
      return;
    }
    setMeeting(updated as MeetingWithDocs);
    setMinutesDraft(updated.minutesHtml ? plainText(updated.minutesHtml) : '');
    setConclusionDraft(updated.summaryHtml ? plainText(updated.summaryHtml) : '');
    setIsEditingMinutes(false);
    useFeedbackStore.getState().showToast({
      type: 'success',
      message: 'Notulensi dan kesimpulan rapat berhasil disimpan.',
    });
  };

  const handleUploadDocumentationPhoto = async () => {
    if (!meetingId || !meeting || isUploadingPhoto) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        useFeedbackStore.getState().showToast({
          type: 'warning',
          message: 'Izin galeri diperlukan untuk mengunggah foto dokumentasi rapat.',
        });
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      const fileName = asset.fileName || `dokumentasi_${Date.now()}.jpg`;
      const mimeType = resolveFileMimeType(fileName, asset.mimeType ?? 'image/jpeg');
      setIsUploadingPhoto(true);
      const updated = await updateMinutes(meetingId, {
        notulensi: meeting.minutesHtml ? plainText(meeting.minutesHtml) : undefined,
        kesimpulan: meeting.summaryHtml ? plainText(meeting.summaryHtml) : undefined,
        photos: [{ uri: asset.uri, name: fileName, type: mimeType }],
        captions: [`Dokumentasi ${meeting.title}`],
      });
      if (!updated) {
        useFeedbackStore.getState().showToast({
          type: 'error',
          message: useMeetingStore.getState().error || 'Gagal mengunggah foto dokumentasi.',
        });
        return;
      }
      setMeeting(updated as MeetingWithDocs);
      useFeedbackStore.getState().showToast({
        type: 'success',
        message: 'Foto dokumentasi rapat berhasil diunggah.',
      });
    } catch (uploadErr) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message:
          uploadErr instanceof Error
            ? uploadErr.message
            : 'Gagal mengunggah foto dokumentasi.',
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePickSuratEdaran = async () => {
    if (!meetingId || !meeting || isUploadingEdaran) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.size ?? 0) > 5 * 1024 * 1024) {
        useFeedbackStore.getState().showToast({
          type: 'warning',
          message: 'Ukuran berkas surat edaran melebihi batas sistem 5 MB.',
        });
        return;
      }
      const resolvedMime = resolveFileMimeType(asset.name, asset.mimeType ?? undefined);
      setSelectedEdaranFile({
        uri: asset.uri,
        name: asset.name,
        type: resolvedMime,
        size: asset.size ?? 0,
      });
      setIsUploadModalVisible(true);
    } catch (pickerError) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message:
          pickerError instanceof Error
            ? pickerError.message
            : 'Gagal memilih berkas surat edaran.',
      });
    }
  };

  const handleConfirmUploadSuratEdaran = async () => {
    if (!meetingId || !meeting || !selectedEdaranFile || isUploadingEdaran) return;
    setIsUploadingEdaran(true);
    try {
      const meetingContext = meetingToUpdateDto(meeting);
      const updated = await uploadSuratEdaran(
        meetingId,
        {
          uri: selectedEdaranFile.uri,
          name: selectedEdaranFile.name,
          type: selectedEdaranFile.type,
        },
        meetingContext,
      );
      if (!updated) {
        useFeedbackStore.getState().showToast({
          type: 'error',
          message:
            useMeetingStore.getState().error || 'Gagal mengunggah berkas surat edaran.',
        });
        return;
      }
      setMeeting(updated as MeetingWithDocs);
      setIsUploadModalVisible(false);
      setSelectedEdaranFile(null);
      useFeedbackStore.getState().showToast({
        type: 'success',
        message: 'Berkas surat edaran resmi berhasil diunggah.',
      });
    } catch (uploadError) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message:
          uploadError instanceof Error
            ? uploadError.message
            : 'Gagal mengunggah berkas surat edaran.',
      });
    } finally {
      setIsUploadingEdaran(false);
    }
  };

  const displayList: Participant[] = useMemo(
    () =>
      activeTab !== 'minutes'
        ? agendaAttendances.map((record) => ({
            id: record.id ? String(record.id) : undefined,
            name: record.asnName || 'Nama tidak disediakan',
            role: record.asnJabatan || 'Pegawai',
            nip: record.asnNip || '',
            time:
              record.status === 'belum_hadir'
                ? 'Belum melakukan presensi'
                : record.timestamp
                  ? formatTanggalWaktuWIB(record.timestamp)
                  : 'Waktu tidak tersedia',
            signedAt: record.timestamp || null,
            location: record.asnUnitKerja || 'LLDIKTI Wilayah X',
            unit: record.asnUnitKerja,
            status: record.status,
            selfieUrl: record.selfieUrl ?? null,
            signatureUrl: record.signatureUrl ?? null,
            canViewBiometrics: record.canViewBiometrics !== false,
            hasSelfie: Boolean(record.hasSelfie ?? record.selfieUrl),
            hasSignature: Boolean(record.hasSignature ?? record.signatureUrl),
            verificationToken: record.verificationToken,
            ipAddress: record.ipAddress,
            deviceInfo: record.deviceInfo,
          }))
        : [],
    [activeTab, agendaAttendances],
  );

  const filteredList = displayList
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nip.includes(searchQuery),
    )
    .filter((p) => selectedPokja === 'Semua Unit' || p.unit === selectedPokja);

  const docs = meeting?.documentations ?? [];
  const selectedLeaderLabel =
    userOptions.find((u) => u.id === pendingLeaderId)?.title ||
    meeting?.leader ||
    'Pilih Pimpinan Rapat';
  const selectedNotulisLabel =
    userOptions.find((u) => u.id === pendingNotulisId)?.title ||
    meeting?.notulis ||
    'Pilih Notulis Rapat';

  const roleLower = (user?.role ?? '').toLowerCase();
  const isAdministrator = roleLower === 'administrator';
  const isAdminUnit = roleLower === 'admin';
  const rawUnitId = rawAgenda?.unit_id ?? rawAgenda?.creator?.unit_id ?? meeting?.creatorUnitId;
  const rawCreatedBy = rawAgenda?.created_by ?? rawAgenda?.creator?.id ?? meeting?.creatorId;
  const rawStatus = String(
    rawAgenda?.status?.value ?? rawAgenda?.status ?? meeting?.rawStatus ?? 'scheduled',
  );
  const isHostUnit =
    isAdminUnit &&
    Boolean(user?.unitId != null && rawUnitId != null && String(user.unitId) === String(rawUnitId));
  const isCreator = Boolean(
    user?.id && rawCreatedBy != null && String(user.id) === String(rawCreatedBy),
  );

  const canUpdate = Boolean(
    rawAgenda?.permissions?.can_update ??
      userCanEdit ??
      (isAdministrator || (isAdminUnit && (isHostUnit || isCreator))),
  );
  const canManageStatus = Boolean(
    rawAgenda?.permissions?.can_manage_status ?? (canUpdate || isAppointedLeader),
  );
  const canManageCircular = Boolean(
    rawAgenda?.permissions?.can_manage_circular ?? userCanManageSuratEdaran ?? canUpdate,
  );
  const canManageMinutesFlag = Boolean(
    rawAgenda?.permissions?.can_manage_minutes ??
      userCanManageMinutes ??
      (canUpdate || ((isAppointedLeader || isAppointedNotulis) && rawStatus === 'ongoing')),
  );
  const attendeesTotal = Number(
    agendaAttendancePage?.summary?.total_attended ??
      rawAgenda?.attendances_count ??
      meeting?.totalAttended ??
      filteredList.length ??
      0,
  );
  const canDelete = Boolean(
    (rawAgenda?.permissions?.can_delete ?? userCanDelete ?? canUpdate) && attendeesTotal === 0,
  );

  const statusLabelText = useMemo(() => {
    if (typeof rawAgenda?.status?.label === 'string' && rawAgenda.status.label.trim()) {
      return rawAgenda.status.label;
    }
    switch (rawStatus) {
      case 'draft':
        return 'Konsep (Draft)';
      case 'ongoing':
        return 'Sedang Berlangsung';
      case 'completed':
        return 'Selesai';
      case 'cancelled':
        return 'Dibatalkan';
      default:
        return 'Terjadwal';
    }
  }, [rawAgenda?.status?.label, rawStatus]);

  const myAtt = rawAgenda?.my_attendance as
    | {
        id?: number | string;
        checked_in_at?: string;
        selfie_url?: string;
        signature_url?: string;
        verification_token?: string;
      }
    | null
    | undefined;
  const hasAttended = Boolean(rawAgenda?.has_attended || myAtt);
  const canStartNow = rawAgenda?.can_start_now ?? true;
  const earliestStartAt = rawAgenda?.earliest_start_at as string | null | undefined;

  const handlePullRefresh = useCallback(async () => {
    if (!meetingId) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadAgendaDetail(),
        fetchAgendaAttendances(meetingId, attendancePage, false, {
          status: 'attended',
          search: searchQuery,
        }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [meetingId, loadAgendaDetail, fetchAgendaAttendances, attendancePage, searchQuery]);

  const refreshControl = useTutWuriRefreshControl(isRefreshing, () => {
    void handlePullRefresh();
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Header
        title="Detail Agenda Rapat"
        subtitle="Informasi pelaksanaan, dokumen edaran, notulensi, dan daftar hadir"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <View style={styles.refreshArea}>
        <TutWuriRefreshBanner refreshing={isRefreshing} />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
        {/* 1. HERO BANNER GELAP (1:1 show.blade.php:10-253) */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>
            {meeting?.title ??
              (agendaError ? 'Detail agenda tidak dapat dimuat' : 'Memuat detail agenda...')}
          </Text>

          <View style={styles.heroMetaList}>
            {/* Item 1: Jenis Rapat */}
            <View style={styles.heroMetaItem}>
              <BookOpen size={15} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.heroMetaText}>
                {rawAgenda?.jenis_rapat || 'Rapat Koordinasi'}
              </Text>
            </View>

            {/* Item 2: Status + Tanggal + Waktu */}
            <View style={styles.heroMetaItem}>
              <Clock size={15} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.heroMetaText}>
                <Text style={styles.heroMetaWhiteBold}>{statusLabelText}</Text>
                {meeting
                  ? ` • ${meeting.date} • ${rawAgenda?.rentang_waktu || formatRentangWaktu(meeting.startTime, meeting.endTime)}`
                  : ''}
              </Text>
            </View>

            {/* Item 3: Tipe & Lokasi */}
            <View style={styles.heroMetaItem}>
              <MapPin size={15} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.heroMetaText}>
                {meeting
                  ? `[${formatTipeLabel(meeting.type)}] ${meeting.venue || meeting.zoomUrl || 'Lokasi belum ditentukan'}`
                  : '-'}
              </Text>
            </View>

            {/* Item 4: Oleh Creator (Kode Unit) */}
            <View style={styles.heroMetaItem}>
              <Users size={15} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.heroMetaText}>
                Oleh: {rawAgenda?.creator?.name || 'Administrator'} (
                {rawAgenda?.creator?.unit?.kode_unit || 'Pusat'})
              </Text>
            </View>
          </View>

          {/* Bottom Action Toolbar inside Dark Hero Card */}
          <View style={styles.heroToolbarDivider}>
            {/* Left Group: < Daftar Agenda + Capacity Badge (only for Admin Unit) */}
            <View style={styles.heroToolbarRow}>
              {onBack ? (
                <Pressable
                  onPress={onBack}
                  style={({ pressed }) => [styles.heroBtnDark, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Kembali ke Daftar Agenda"
                >
                  <ArrowLeft size={14} color={colors.onPrimaryContainer} strokeWidth={2} />
                  <Text style={styles.heroBtnDarkText}>Daftar Agenda</Text>
                </Pressable>
              ) : null}

              {isAdminUnit && !isAdministrator ? (
                canUpdate ? (
                  <View style={styles.capBadgeBlue}>
                    <ShieldCheck size={13} color={colors.infoText} strokeWidth={2} />
                    <Text style={styles.capBadgeBlueText}>Unit Penyelenggara</Text>
                  </View>
                ) : isAppointedLeader || isAppointedNotulis ? (
                  <View style={styles.capBadgeAmber}>
                    <NotebookPen size={13} color={colors.onWarningContainer} strokeWidth={2} />
                    <Text style={styles.capBadgeAmberText}>
                      {isAppointedLeader ? 'Pimpinan Rapat Bertugas' : 'Notulis Rapat Bertugas'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.capBadgeSlate}>
                    <Eye size={13} color={colors.onPrimaryContainer} strokeWidth={2} />
                    <Text style={styles.capBadgeSlateText}>
                      Mode Pemantauan (Unit Partisipan)
                    </Text>
                  </View>
                )
              ) : null}
            </View>

            {/* Right Group: Action Buttons matching show.blade.php:60-250 */}
            <View style={styles.heroActionsWrap}>
              {canUpdate && meeting ? (
                <Pressable
                  onPress={() => onNavigateEdit?.(meeting.id)}
                  style={({ pressed }) => [styles.heroBtnDark, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Pencil size={14} color={colors.onPrimary} strokeWidth={2} />
                  <Text style={styles.heroBtnWhiteText}>Edit Agenda</Text>
                </Pressable>
              ) : null}

              {canManageCircular && meeting ? (
                <Pressable
                  onPress={() => {
                    if (onNavigateEdit) onNavigateEdit(meeting.id);
                    else void handlePickSuratEdaran();
                  }}
                  style={({ pressed }) => [styles.heroBtnDark, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <FileText size={14} color={colors.onPrimary} strokeWidth={2} />
                  <Text style={styles.heroBtnWhiteText}>Naskah Surat Dinas</Text>
                </Pressable>
              ) : null}

              <Pressable
                disabled={Boolean(exporting)}
                onPress={() => void handleExport('pdf')}
                style={({ pressed }) => [
                  styles.heroBtnDark,
                  Boolean(exporting) && styles.heroBtnDisabled,
                  pressed && !exporting && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                {exporting === 'pdf' ? (
                  <TutWuriLoader size="sm" />
                ) : (
                  <FileText size={14} color={colors.error} strokeWidth={2} />
                )}
                <Text style={styles.heroBtnWhiteText}>
                  {exporting === 'pdf' ? 'Mengekspor...' : 'Ekspor PDF'}
                </Text>
              </Pressable>

              <Pressable
                disabled={Boolean(exporting)}
                onPress={() => void handleExport('word')}
                style={({ pressed }) => [
                  styles.heroBtnDark,
                  Boolean(exporting) && styles.heroBtnDisabled,
                  pressed && !exporting && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                {exporting === 'word' ? (
                  <TutWuriLoader size="sm" />
                ) : (
                  <FileText size={14} color={colors.infoText} strokeWidth={2} />
                )}
                <Text style={styles.heroBtnWhiteText}>
                  {exporting === 'word' ? 'Mengekspor...' : 'Ekspor Word'}
                </Text>
              </Pressable>

              {canManageStatus && rawStatus === 'draft' ? (
                <Pressable
                  disabled={isUpdatingStatus}
                  onPress={() =>
                    handleTransitionStatus(
                      'scheduled',
                      'Terbitkan Agenda',
                      'Terbitkan agenda konsep ini menjadi Terjadwal agar terlihat oleh pegawai dan siap dilaksanakan?',
                      'Terbitkan Agenda',
                    )
                  }
                  style={({ pressed }) => [styles.heroBtnBlue, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Send size={14} color={colors.onPrimary} strokeWidth={2} />
                  <Text style={styles.heroBtnWhiteText}>Terbitkan Agenda</Text>
                </Pressable>
              ) : null}

              {canManageStatus && rawStatus === 'cancelled' ? (
                <Pressable
                  disabled={isUpdatingStatus}
                  onPress={() =>
                    handleTransitionStatus(
                      'draft',
                      'Buka Kembali sebagai Konsep',
                      'Buka kembali agenda yang dibatalkan ini sebagai Konsep (Draft)?',
                      'Buka Kembali',
                    )
                  }
                  style={({ pressed }) => [styles.heroBtnDark, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <RotateCcw size={14} color={colors.onPrimary} strokeWidth={2} />
                  <Text style={styles.heroBtnWhiteText}>Buka Kembali sebagai Konsep</Text>
                </Pressable>
              ) : null}

              {canManageStatus && rawStatus === 'scheduled' ? (
                <Pressable
                  disabled={isUpdatingStatus || !canStartNow}
                  onPress={() =>
                    handleTransitionStatus(
                      'ongoing',
                      'Mulai Rapat',
                      'Mulai rapat dan buka sesi pengisian presensi sekarang?',
                      'Mulai Rapat',
                    )
                  }
                  style={({ pressed }) => [
                    canStartNow ? styles.heroBtnAmber : styles.heroBtnDisabled,
                    pressed && canStartNow && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Play
                    size={14}
                    color={canStartNow ? colors.onPrimary : colors.textMuted}
                    strokeWidth={2}
                  />
                  <Text
                    style={
                      canStartNow ? styles.heroBtnWhiteText : styles.heroBtnDisabledText
                    }
                  >
                    Mulai Rapat
                  </Text>
                </Pressable>
              ) : null}

              {canManageStatus && rawStatus === 'ongoing' ? (
                <Pressable
                  disabled={isUpdatingStatus}
                  onPress={() =>
                    handleTransitionStatus(
                      'completed',
                      'Tutup Rapat & Selesaikan',
                      'Tutup sesi presensi dan tandai agenda rapat telah Selesai?',
                      'Tutup & Selesaikan',
                    )
                  }
                  style={({ pressed }) => [styles.heroBtnGreen, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <CheckCircle2 size={14} color={colors.onPrimary} strokeWidth={2} />
                  <Text style={styles.heroBtnWhiteText}>Tutup Rapat & Selesaikan</Text>
                </Pressable>
              ) : null}

              {canUpdate ? (
                <Pressable
                  onPress={handleOpenRolesModal}
                  style={({ pressed }) => [styles.heroBtnDark, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Users size={14} color={colors.onPrimary} strokeWidth={2} />
                  <Text style={styles.heroBtnWhiteText}>Tugaskan Peran</Text>
                </Pressable>
              ) : null}

              {canManageMinutesFlag ? (
                <Pressable
                  onPress={handleEditMinutes}
                  style={({ pressed }) => [styles.heroBtnDark, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <NotebookPen size={14} color={colors.onPrimary} strokeWidth={2} />
                  <Text style={styles.heroBtnWhiteText}>Notulensi & Foto</Text>
                </Pressable>
              ) : null}

              {canDelete ? (
                <Pressable
                  onPress={handleConfirmDelete}
                  style={({ pressed }) => [styles.heroBtnRed, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Trash2 size={14} color={colors.onPrimary} strokeWidth={2} />
                  <Text style={styles.heroBtnWhiteText}>Hapus Agenda</Text>
                </Pressable>
              ) : null}

              {hasAttended ? (
                <Pressable
                  onPress={() => {
                    if (onNavigateReceipt && meeting) {
                      onNavigateReceipt(
                        meeting.id,
                        myAtt?.id !== undefined ? String(myAtt.id) : undefined,
                      );
                    } else if (myAtt?.id) {
                      setEvidenceParticipant({
                        id: String(myAtt.id),
                        name: user?.name ?? 'Pegawai',
                        role: user?.jabatan ?? 'ASN',
                        nip: user?.nip ?? '',
                        time: myAtt.checked_in_at ?? '',
                        signedAt: myAtt.checked_in_at ?? null,
                        location: user?.unitKerja ?? 'LLDIKTI Wilayah X',
                        status: 'tercatat',
                        selfieUrl: myAtt.selfie_url ?? null,
                        signatureUrl: myAtt.signature_url ?? null,
                        verificationToken: myAtt.verification_token,
                      });
                    }
                  }}
                  style={({ pressed }) => [styles.heroBtnGreen, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <Check size={14} color={colors.onPrimary} strokeWidth={2} />
                  <Text style={styles.heroBtnWhiteText}>Anda Sudah Hadir</Text>
                </Pressable>
              ) : rawStatus === 'ongoing' && meeting && onNavigatePresensi ? (
                <Pressable
                  onPress={() => onNavigatePresensi(meeting.id)}
                  style={({ pressed }) => [styles.heroBtnGreen, pressed && styles.pressed]}
                  accessibilityRole="button"
                >
                  <FileCheck2 size={14} color={colors.onPrimary} strokeWidth={2} />
                  <Text style={styles.heroBtnWhiteText}>Isi Presensi Saya</Text>
                </Pressable>
              ) : null}
            </View>

            {canManageStatus && rawStatus === 'scheduled' && !canStartNow ? (
              <Text style={styles.earliestStartHint}>
                Rapat baru dapat dimulai 15 menit sebelum jadwal
                {earliestStartAt ? ` (${formatWaktuWIB(earliestStartAt)})` : ''}.
              </Text>
            ) : null}
          </View>
        </View>

        {/* 2. METADATA INFO BAR 3 KOLOM (1:1 show.blade.php:256-271) */}
        <View style={styles.metaInfoBar}>
          <View style={styles.metaInfoCol}>
            <Text style={styles.metaInfoLabel}>MPI No.</Text>
            <AutoScrollText style={styles.metaInfoMonoValue}>
              {rawAgenda?.slug || meeting?.code || '-'}
            </AutoScrollText>
          </View>
          <View style={styles.metaInfoDivider} />
          <View style={styles.metaInfoCol}>
            <Text style={styles.metaInfoLabel}>Pemimpin Rapat</Text>
            <AutoScrollText style={styles.metaInfoBoldValue}>
              {rawAgenda?.pimpinan?.name ||
                rawAgenda?.nama_pimpinan ||
                meeting?.leader ||
                '-'}
            </AutoScrollText>
          </View>
          <View style={styles.metaInfoDivider} />
          <View style={styles.metaInfoCol}>
            <Text style={styles.metaInfoLabel}>Notulis Rapat</Text>
            <AutoScrollText style={styles.metaInfoBoldValue}>
              {rawAgenda?.notulis?.name ||
                rawAgenda?.nama_notulis ||
                meeting?.notulis ||
                '-'}
            </AutoScrollText>
          </View>
        </View>

        {/* 3. TAUTAN PERTEMUAN DARING (1:1 show.blade.php:274-289) */}
        {meeting?.zoomUrl ? (
          <View style={styles.zoomCard}>
            <View style={styles.zoomLeft}>
              <View style={styles.zoomIconBox}>
                <Video size={20} color={colors.onPrimary} strokeWidth={2} />
              </View>
              <View style={styles.flexOne}>
                <Text style={styles.zoomTitle}>Tautan Pertemuan Daring</Text>
                <AutoScrollText style={styles.zoomUrlText}>
                  {meeting.zoomUrl}
                </AutoScrollText>
              </View>
            </View>
            <Pressable
              onPress={() => void Linking.openURL(meeting.zoomUrl!)}
              style={({ pressed }) => [styles.zoomOpenBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Buka Zoom atau Google Meet"
            >
              <ExternalLink size={14} color={colors.onPrimary} strokeWidth={2} />
              <Text style={styles.zoomOpenText}>Buka Zoom / GMeet</Text>
            </Pressable>
          </View>
        ) : null}

        {/* 4. PANEL PESERTA HADIR (1:1 show.blade.php:297-391) */}
        <View style={styles.webPanel}>
          <View style={styles.webPanelToolbar}>
            <View style={styles.webPanelTitleWrap}>
              <Users size={17} color={colors.onSurface} strokeWidth={2} />
              <Text style={styles.webPanelTitle}>Peserta Hadir</Text>
            </View>
            <View style={styles.webCountPill}>
              <Text style={styles.webCountPillText}>
                {attendeesTotal} / {attendeesTotal}
              </Text>
            </View>
          </View>

          <View style={styles.attendeeSubBar}>
            <View style={styles.attendeeSubPills}>
              <View style={styles.hadirDarkPill}>
                <Text style={styles.hadirDarkPillText}>✓ Hadir: {attendeesTotal}</Text>
              </View>
              <View style={styles.absenNeutralPill}>
                <Text style={styles.absenNeutralPillText}>Absen: 0</Text>
              </View>
            </View>

            {canManageMinutesFlag ? (
              <Pressable
                onPress={handleEditMinutes}
                style={({ pressed }) => [styles.subBarLinkBtn, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Plus size={12} color={colors.textSecondary} strokeWidth={2} />
                <Text style={styles.subBarLinkText}>Unggah Foto</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.attendeeListBody}>
            {filteredList.length === 0 ? (
              <View style={styles.emptyBoxSimple}>
                <Text style={styles.emptyBoxSimpleText}>
                  {isLoading
                    ? 'Memuat daftar hadir...'
                    : 'Belum ada peserta yang melakukan presensi.'}
                </Text>
              </View>
            ) : (
              filteredList.map((p, idx) => {
                const canInspectEvidence = Boolean(p.id);
                const canViewBiometrics = p.canViewBiometrics !== false;
                const initials = (p.name || 'AS')
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase();

                return (
                  <View
                    key={`${p.id ?? p.nip}-${idx}`}
                    style={[
                      styles.attendeeCompactRow,
                      idx === filteredList.length - 1 && styles.attendeeCompactRowLast,
                    ]}
                  >
                    <View style={styles.attendeeCompactLeft}>
                      <View style={styles.attendeeAvatarCircle}>
                        {canInspectEvidence && !canViewBiometrics ? (
                          <BiometricPrivacyPlaceholder variant="avatar" />
                        ) : canInspectEvidence ? (
                          <AuthMediaThumbnail
                            attendanceId={p.id!}
                            rawUrl={p.selfieUrl}
                            mediaType="selfie"
                            style={styles.attendeeAvatarImg}
                            fallback={
                              <Text style={styles.attendeeInitialsText}>{initials}</Text>
                            }
                          />
                        ) : (
                          <Text style={styles.attendeeInitialsText}>{initials}</Text>
                        )}
                      </View>
                      <View style={styles.flexOne}>
                        <AutoScrollText style={styles.attendeeCompactName}>
                          {p.name}
                        </AutoScrollText>
                        <AutoScrollText style={styles.attendeeCompactUnit}>
                          {p.unit || 'LLDIKTI'}
                        </AutoScrollText>
                      </View>
                    </View>

                    {canInspectEvidence && !canViewBiometrics ? (
                      <BiometricPrivacyPlaceholder variant="compactBtn" />
                    ) : canInspectEvidence ? (
                      <Pressable
                        onPress={() => setEvidenceParticipant(p)}
                        style={({ pressed }) => [
                          styles.attendeeCameraBtn,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Lihat bukti kehadiran ${p.name}`}
                      >
                        <Camera size={15} color={colors.textSecondary} strokeWidth={2} />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>

          {agendaAttendancePage && agendaAttendancePage.total > 10 ? (
            <View style={styles.webPanelFooter}>
              <PaginationBar
                currentPage={agendaAttendancePage.currentPage}
                lastPage={agendaAttendancePage.lastPage}
                total={agendaAttendancePage.total}
                label="peserta"
                isLoading={isLoading}
                onPageChange={handlePageChange}
              />
            </View>
          ) : null}
        </View>

        {/* 5. PANEL SURAT EDARAN / UNDANGAN (1:1 surat_edaran_preview.blade.php) */}
        {(() => {
          const suratEdaranMeta = rawAgenda?.surat_edaran ?? meeting?.suratEdaran;
          const isDigitalCircular = Boolean(
            suratEdaranMeta?.is_digital || rawAgenda?.surat_edaran_type === 'digital',
          );
          const resolvedEdaranUrl =
            resolveSuratEdaranUrl(
              suratEdaranMeta?.stream_url ??
                suratEdaranMeta?.url ??
                meeting?.invitationPdfUrl,
            ) ?? meeting?.invitationPdfUrl;
          const badgeLabel = isDigitalCircular
            ? 'SURAT DIGITAL'
            : suratEdaranMeta?.is_image
              ? 'GAMBAR'
              : 'PDF';
          const digitalMeta = seConfig ?? rawAgenda?.surat_edaran_data ?? null;

          return (
            <View style={styles.webPanel}>
              <View style={styles.webPanelToolbar}>
                <View style={styles.webPanelTitleWrap}>
                  <FileText size={17} color={colors.onSurface} strokeWidth={2} />
                  <Text style={styles.webPanelTitle}>Surat Edaran / Undangan</Text>
                </View>
                {resolvedEdaranUrl || isDigitalCircular ? (
                  <View
                    style={[
                      styles.circularTypeBadge,
                      isDigitalCircular || suratEdaranMeta?.is_image
                        ? styles.circularTypeBadgeBlue
                        : styles.circularTypeBadgeRose,
                    ]}
                  >
                    <Text
                      style={[
                        styles.circularTypeBadgeText,
                        isDigitalCircular || suratEdaranMeta?.is_image
                          ? styles.circularTypeBadgeTextBlue
                          : styles.circularTypeBadgeTextRose,
                      ]}
                    >
                      {badgeLabel}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.webPanelBody}>
                {digitalMeta ? (
                  <View style={styles.digitalMetaBox}>
                    <View style={styles.digitalMetaLeft}>
                      <AutoScrollText style={styles.digitalMetaTitle}>
                        {digitalMeta.perihal || meeting?.title || 'Undangan Rapat'}
                      </AutoScrollText>
                      <Text style={styles.digitalMetaLine}>
                        <Text style={styles.digitalMetaStrong}>Nomor:</Text>{' '}
                        {digitalMeta.nomor_surat || '-'}
                      </Text>
                      <Text style={styles.digitalMetaLine}>
                        <Text style={styles.digitalMetaStrong}>Tanggal:</Text>{' '}
                        {digitalMeta.tanggal_surat || '-'}
                      </Text>
                      <Text style={styles.digitalMetaLine} numberOfLines={2}>
                        <Text style={styles.digitalMetaStrong}>Tujuan:</Text>{' '}
                        {(digitalMeta as any).tujuan_surat ||
                          (digitalMeta as any).kepada_yth ||
                          '-'}
                      </Text>
                    </View>
                    <View style={styles.digitalMetaIconBox}>
                      <FileText size={20} color={colors.onPrimary} strokeWidth={2} />
                    </View>
                  </View>
                ) : null}

                {resolvedEdaranUrl ? (
                  <View style={styles.circularActionsStack}>
                    <Pressable
                      onPress={handlePreviewSuratEdaran}
                      style={({ pressed }) => [
                        styles.circularPrimaryBtn,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                    >
                      <Eye size={16} color={colors.onPrimary} strokeWidth={2} />
                      <Text style={styles.circularPrimaryBtnText}>
                        Pratinjau Layar Penuh
                      </Text>
                    </Pressable>

                    <View style={styles.circularSecondaryRow}>
                      <Pressable
                        disabled={isDownloadingEdaran}
                        onPress={() => void handleDownloadSuratEdaran()}
                        style={({ pressed }) => [
                          styles.circularSecondaryBtn,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                      >
                        <Download size={14} color={colors.error} strokeWidth={2} />
                        <Text style={styles.circularSecondaryBtnText}>
                          {isDownloadingEdaran
                            ? 'Mengunduh...'
                            : isDigitalCircular
                              ? 'Unduh PDF'
                              : 'Unduh File'}
                        </Text>
                      </Pressable>

                      {canManageCircular ? (
                        <Pressable
                          disabled={isUploadingEdaran}
                          onPress={() => {
                            if (isDigitalCircular && meeting && onNavigateEdit) {
                              onNavigateEdit(meeting.id);
                            } else {
                              void handlePickSuratEdaran();
                            }
                          }}
                          style={({ pressed }) => [
                            styles.circularSecondaryBtn,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="button"
                        >
                          <Pencil size={14} color={colors.onSurface} strokeWidth={2} />
                          <Text style={styles.circularSecondaryBtnText}>
                            {isDigitalCircular ? 'Edit Naskah' : 'Ganti Berkas'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  <View style={styles.circularDashedEmpty}>
                    <View style={styles.circularEmptyCircle}>
                      <FileText size={18} color={colors.textMuted} strokeWidth={2} />
                    </View>
                    <Text style={styles.circularEmptyText}>
                      Tidak ada berkas surat edaran atau undangan terlampir.
                    </Text>
                    {canManageCircular ? (
                      <Pressable
                        onPress={() => void handlePickSuratEdaran()}
                        style={({ pressed }) => [
                          styles.circularSecondaryBtn,
                          pressed && styles.pressed,
                        ]}
                        accessibilityRole="button"
                      >
                        <CloudUpload size={14} color={colors.onSurface} strokeWidth={2} />
                        <Text style={styles.circularSecondaryBtnText}>
                          Unggah Surat Edaran
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}

                {isDigitalCircular ? (
                  <View style={styles.webOnlyNoticeBox}>
                    <Monitor size={15} color={colors.infoText} strokeWidth={2} />
                    <Text style={styles.webOnlyNoticeText}>
                      Pembuatan dan penyuntingan naskah surat undangan digital resmi dilakukan
                      melalui portal Website SIPERAPAT.
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })()}

        {/* 6. PANEL TARGET PARTISIPAN RAPAT (1:1 show.blade.php:397-445) */}
        {meeting ? (
          <View style={styles.webPanel}>
            <View style={styles.webPanelToolbar}>
              <View style={styles.webPanelTitleWrap}>
                <Building2 size={17} color={colors.onSurface} strokeWidth={2} />
                <Text style={styles.webPanelTitle}>Target Partisipan Rapat</Text>
              </View>
            </View>

            <View style={styles.webPanelBody}>
              {meeting.targetType === 'selected_users' ? (
                <View style={styles.targetSectionStack}>
                  <View style={styles.targetSelectedHeaderBox}>
                    <View style={styles.targetSelectedHeaderLeft}>
                      <View style={styles.targetDarkCheckCircle}>
                        <Users size={12} color={colors.onPrimary} strokeWidth={2} />
                      </View>
                      <Text style={styles.targetSelectedHeaderTitle}>
                        Khusus Pegawai ASN Tertentu
                      </Text>
                    </View>
                    <View style={styles.targetCountBadge}>
                      <Text style={styles.targetCountBadgeText}>
                        {meeting.invitedUsers?.length ?? meeting.totalInvited ?? 0} Pegawai
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.targetUpperCaption}>
                    Daftar Pegawai yang Diundang:
                  </Text>

                  <View style={styles.targetUsersList}>
                    {(meeting.invitedUsers ?? []).map((u) => {
                      const uInitials = (u.name || 'AS')
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase();
                      return (
                        <View key={u.id} style={styles.targetInvitedRow}>
                          <View style={styles.targetInvitedAvatar}>
                            <Text style={styles.targetInvitedAvatarText}>{uInitials}</Text>
                          </View>
                          <View style={styles.flexOne}>
                            <AutoScrollText style={styles.targetInvitedName}>
                              {u.name}
                            </AutoScrollText>
                            <AutoScrollText style={styles.targetInvitedSub}>
                              NIP: {u.nip || '-'}
                              {u.unit ? ` • ${u.unit}` : ''}
                            </AutoScrollText>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : meeting.isAllUnits || meeting.targetType === 'all_units' ? (
                <View style={styles.targetAllUnitsBox}>
                  <View style={styles.targetDarkCheckCircle}>
                    <Check size={12} color={colors.onPrimary} strokeWidth={2} />
                  </View>
                  <Text style={styles.targetAllUnitsText}>
                    Terbuka untuk Seluruh Unit LLDIKTI
                  </Text>
                </View>
              ) : (
                <View style={styles.targetSectionStack}>
                  <Text style={styles.targetUpperCaption}>Hanya unit kerja berikut:</Text>
                  <View style={styles.targetChipsWrap}>
                    {(meeting.unitsList ?? []).length > 0 ? (
                      meeting.unitsList!.map((unit) => (
                        <View key={unit.id} style={styles.targetUnitChip}>
                          <Text style={styles.targetUnitChipText}>
                            {unit.kode_unit} - {unit.nama_unit}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyItalicText}>
                        {meeting.targetAudience || 'Tidak ada unit yang dipilih.'}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* 7. PANEL NOTULENSI RAPAT (1:1 show.blade.php:451-598) */}
        {(() => {
          const findSigner = (
            targetId?: number | string | null,
            targetName?: string | null,
          ): SignerAttendanceRecord | undefined => {
            if (targetId !== null && targetId !== undefined) {
              const byId = signerAttendances.find((a) => a.userId === String(targetId));
              if (byId) return byId;
            }
            if (targetName && targetName.trim().length > 0) {
              const norm = targetName.trim().toLowerCase();
              return signerAttendances.find((a) => a.name.trim().toLowerCase() === norm);
            }
            return undefined;
          };

          const pimpinanName =
            rawAgenda?.pimpinan?.name ||
            rawAgenda?.nama_pimpinan ||
            meeting?.leader ||
            '-';
          const pimpinanNip =
            rawAgenda?.pimpinan?.nip || rawAgenda?.nip_pimpinan || '-';
          const notulisName =
            rawAgenda?.notulis?.name ||
            rawAgenda?.nama_notulis ||
            meeting?.notulis ||
            '-';
          const notulisNip = rawAgenda?.notulis?.nip || '-';

          const pimpinanAtt = findSigner(
            rawAgenda?.pimpinan_id ?? meeting?.leaderId,
            pimpinanName,
          );
          const notulisAtt = findSigner(
            rawAgenda?.notulis_id ?? meeting?.notulisId,
            notulisName,
          );

          const hasMinutesContent = Boolean(
            meeting?.minutesHtml && plainText(meeting.minutesHtml).length > 0,
          );
          const hasSummaryContent = Boolean(
            meeting?.summaryHtml && plainText(meeting.summaryHtml).length > 0,
          );

          const renderWebSignatureCol = (
            roleTitle: string,
            personName: string,
            personNip: string,
            att?: SignerAttendanceRecord,
          ) => (
            <View style={styles.webSigCol}>
              <Text style={styles.webSigRoleLabel}>{roleTitle}</Text>
              <View style={styles.webSigCanvasWrap}>
                {att && att.canViewBiometrics === false && att.hasSignature ? (
                  <BiometricPrivacyPlaceholder
                    variant="signature"
                    label="Tanda Tangan Terlindungi"
                  />
                ) : att && att.signatureUrl ? (
                  <AuthMediaThumbnail
                    attendanceId={att.id}
                    rawUrl={att.signatureUrl}
                    mediaType="signature"
                    style={styles.webSigImage}
                    fallback={
                      <Text style={styles.webSigFallbackItalic}>
                        Hadir (Tanpa Tanda Tangan)
                      </Text>
                    }
                  />
                ) : att ? (
                  <Text style={styles.webSigFallbackItalic}>
                    Hadir (Tanpa Tanda Tangan)
                  </Text>
                ) : (
                  <View style={styles.webSigPendingDashed}>
                    <Text style={styles.webSigPendingText}>Belum Mengisi Presensi</Text>
                  </View>
                )}
              </View>
              <View style={styles.webSigUnderline}>
                <Text style={styles.webSigPersonName}>{personName}</Text>
              </View>
              <Text style={styles.webSigPersonNip}>NIP {att?.nip || personNip || '-'}</Text>
              {att ? (
                <View style={styles.webSigHadirBadge}>
                  <Text style={styles.webSigHadirBadgeText}>
                    ✓ Hadir ({att.signedAt ? formatWaktuWIB(att.signedAt) : 'Tercatat'})
                  </Text>
                </View>
              ) : null}
            </View>
          );

          return (
            <View style={styles.webPanel}>
              <View style={styles.webPanelToolbar}>
                <View style={styles.webPanelTitleWrap}>
                  <NotebookPen size={17} color={colors.onSurface} strokeWidth={2} />
                  <Text style={styles.webPanelTitle}>Notulensi Rapat</Text>
                </View>

                {canManageMinutesFlag ? (
                  <Pressable
                    onPress={handleEditMinutes}
                    style={({ pressed }) => [
                      styles.toolbarOutlineBtn,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Pencil size={13} color={colors.onSurface} strokeWidth={2} />
                    <Text style={styles.toolbarOutlineBtnText}>Edit Notulensi</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.webPanelBody}>
                {/* Block P: Pembahasan */}
                <View style={styles.notulenBlock}>
                  <View style={styles.notulenHeadingRow}>
                    <View style={styles.notulenCircleBadge}>
                      <Text style={styles.notulenCircleBadgeText}>P</Text>
                    </View>
                    <Text style={styles.notulenHeadingText}>Pembahasan</Text>
                  </View>
                  <View style={styles.notulenContentCard}>
                    {hasMinutesContent ? (
                      <SimpleHtmlView html={meeting!.minutesHtml!} />
                    ) : (
                      <Text style={styles.emptyItalicText}>
                        Notulensi jalannya rapat belum diinput oleh pengelola rapat.
                      </Text>
                    )}
                  </View>
                </View>

                {/* Block K: Keputusan & Tindak Lanjut */}
                <View style={styles.notulenBlock}>
                  <View style={styles.notulenHeadingRow}>
                    <View style={styles.notulenCircleBadge}>
                      <Text style={styles.notulenCircleBadgeText}>K</Text>
                    </View>
                    <Text style={styles.notulenHeadingText}>
                      Keputusan & Tindak Lanjut
                    </Text>
                  </View>
                  <View style={styles.notulenContentCard}>
                    {hasSummaryContent ? (
                      <SimpleHtmlView html={meeting!.summaryHtml!} />
                    ) : (
                      <Text style={styles.emptyItalicText}>
                        Kesimpulan rapat belum diinput.
                      </Text>
                    )}
                  </View>
                </View>

                {/* Block ✓: Penutup */}
                <View style={styles.notulenBlock}>
                  <View style={styles.notulenHeadingRow}>
                    <View style={styles.notulenCircleBadge}>
                      <Text style={styles.notulenCircleBadgeText}>✓</Text>
                    </View>
                    <Text style={styles.notulenHeadingText}>Penutup</Text>
                  </View>
                  <View style={styles.notulenContentCard}>
                    <Text style={styles.penutupMainText}>
                      {meeting?.endTime
                        ? `Rapat ditutup pada pukul ${meeting.endTime} WIB.`
                        : 'Rapat telah selesai diselenggarakan.'}
                    </Text>
                    <Text style={styles.penutupSubText}>
                      Notulen ini disusun oleh Sekretaris/PJ dan telah diverifikasi oleh
                      pihak terkait.
                    </Text>
                  </View>
                </View>

                {/* 2-Column Signature Verification Grid (show.blade.php:529-597) */}
                <View style={styles.webSigSectionDivider}>
                  <View style={styles.webSigGrid}>
                    {renderWebSignatureCol(
                      'Pemimpin Rapat',
                      pimpinanName,
                      pimpinanNip,
                      pimpinanAtt,
                    )}
                    {renderWebSignatureCol(
                      'Notulis Rapat',
                      notulisName,
                      notulisNip,
                      notulisAtt,
                    )}
                  </View>
                </View>

                {(canManageMinutesFlag || canManageStatus) ? (
                  <View style={styles.webOnlyNoticeBox}>
                    <Monitor size={15} color={colors.infoText} strokeWidth={2} />
                    <Text style={styles.webOnlyNoticeText}>
                      Penyesuaian lanjutan dokumen laporan agenda dan penyuntingan naskah surat
                      digital dapat dilakukan melalui portal Website SIPERAPAT.
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })()}

        {/* 8. PANEL DOKUMENTASI FOTO & LAMPIRAN (1:1 show.blade.php:603-728) */}
        <View style={styles.webPanel}>
          <View style={styles.webPanelToolbar}>
            <View style={styles.webPanelTitleWrap}>
              <ImageIcon size={17} color={colors.onSurface} strokeWidth={2} />
              <Text style={styles.webPanelTitle}>Dokumentasi Foto & Lampiran</Text>
            </View>

            <View style={styles.docToolbarRight}>
              {canManageMinutesFlag ? (
                <Pressable
                  onPress={handleEditMinutes}
                  style={({ pressed }) => [
                    styles.toolbarOutlineBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                >
                  <Plus size={13} color={colors.onSurface} strokeWidth={2} />
                  <Text style={styles.toolbarOutlineBtnText}>Kelola Foto / Notulen</Text>
                </Pressable>
              ) : null}
              <View style={styles.webCountPill}>
                <Text style={styles.webCountPillText}>{docs.length} File</Text>
              </View>
            </View>
          </View>

          <View style={styles.webPanelBody}>
            {docs.length > 0 ? (
              <View style={styles.docsGrid}>
                {docs.map((doc) => {
                  const ext = resolveDocExtension(doc.file_url ?? doc.url);
                  const isImage = ext === 'img';
                  return (
                    <View key={doc.id} style={styles.docCard}>
                      {isImage ? (
                        <Pressable
                          onPress={() => setZoomDoc(doc)}
                          style={styles.docPreviewWrap}
                          accessibilityRole="button"
                        >
                          <Image
                            source={{ uri: doc.file_url ?? doc.url }}
                            style={styles.docPreviewImage}
                            resizeMode="cover"
                          />
                        </Pressable>
                      ) : (
                        <View style={styles.docPreviewFallback}>
                          <FileText size={28} color={colors.primary} strokeWidth={2} />
                          <Text style={styles.docPreviewExtText}>
                            {ext.toUpperCase()}
                          </Text>
                        </View>
                      )}

                      <View style={styles.docCardFooter}>
                        <Text style={styles.docCaptionText} numberOfLines={2}>
                          {doc.caption || 'Dokumentasi Rapat'}
                        </Text>
                        <View style={styles.docActionRow}>
                          <Pressable
                            onPress={() => {
                              if (isImage) setZoomDoc(doc);
                              else if (doc.file_url ?? doc.url) {
                                void Linking.openURL((doc.file_url ?? doc.url)!);
                              }
                            }}
                            style={({ pressed }) => [
                              styles.docActionBtn,
                              pressed && styles.pressed,
                            ]}
                            accessibilityRole="button"
                          >
                            <Eye size={13} color={colors.primary} strokeWidth={2} />
                            <Text style={styles.docActionText}>Pratinjau</Text>
                          </Pressable>

                          <Pressable
                            onPress={() => void handleDownloadDocumentation(doc)}
                            style={({ pressed }) => [
                              styles.docActionBtn,
                              pressed && styles.pressed,
                            ]}
                            accessibilityRole="button"
                          >
                            <Download size={13} color={colors.primary} strokeWidth={2} />
                            <Text style={styles.docActionText}>Unduh</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.circularDashedEmpty}>
                <View style={styles.circularEmptyCircle}>
                  <ImageIcon size={18} color={colors.textMuted} strokeWidth={2} />
                </View>
                <Text style={styles.circularEmptyText}>
                  Belum ada foto dokumentasi yang diunggah untuk agenda ini.
                </Text>
                {canManageMinutesFlag ? (
                  <Pressable
                    disabled={isUploadingPhoto}
                    onPress={() => void handleUploadDocumentationPhoto()}
                    style={({ pressed }) => [
                      styles.circularSecondaryBtn,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Plus size={14} color={colors.onSurface} strokeWidth={2} />
                    <Text style={styles.circularSecondaryBtnText}>
                      {isUploadingPhoto
                        ? 'Mengunggah...'
                        : 'Unggah Foto Dokumentasi Pertama'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        </View>
        </ScrollView>
      </View>

      {/* MODAL 1: Surat Edaran Viewer */}
      <SuratEdaranViewerModal
        visible={isViewerModalVisible}
        onClose={() => setIsViewerModalVisible(false)}
        documentUrl={meeting?.invitationPdfUrl}
        fileName={`Surat-Edaran_${meeting?.code || 'Agenda'}.${meeting?.suratEdaran?.extension || (meeting?.suratEdaran?.is_image ? 'jpg' : 'pdf')}`}
        meetingTitle={meeting?.title}
        meetingCode={meeting?.code}
        meetingDate={`${meeting?.date} • ${meeting?.startTime}`}
        mimeType={meeting?.suratEdaran?.is_image ? 'image/jpeg' : 'application/pdf'}
        canManage={canManageCircular}
        onReplaceFile={() => void handlePickSuratEdaran()}
      />

      {/* MODAL 2: Upload Surat Edaran Confirmation */}
      <UploadSuratEdaranModal
        visible={isUploadModalVisible}
        onClose={() => {
          setIsUploadModalVisible(false);
          setSelectedEdaranFile(null);
        }}
        file={selectedEdaranFile}
        meetingTitle={meeting?.title || 'Agenda Rapat'}
        meetingDate={`${meeting?.date} • ${meeting?.startTime}`}
        isUploading={isUploadingEdaran}
        onConfirmUpload={handleConfirmUploadSuratEdaran}
        onPickDifferentFile={() => void handlePickSuratEdaran()}
      />

      {/* MODAL 3: Tugaskan Pemimpin & Notulis (1:1 show.blade.php:733-809) */}
      <Modal
        visible={isRolesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRolesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rolesModalCard}>
            <View style={styles.rolesModalHeader}>
              <View style={styles.rolesHeaderTitleRow}>
                <View style={styles.rolesHeaderIconBox}>
                  <Users size={18} color={colors.onPrimary} strokeWidth={2} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.rolesModalTitle}>Tugaskan Pemimpin & Notulis</Text>
                  <Text style={styles.rolesModalSubtitle}>
                    Penugasan peran resmi rapat kedinasan SIPERAPAT
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setIsRolesModalVisible(false)}
                style={styles.zoomCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Tutup modal penugasan peran"
              >
                <X size={20} color={colors.onSurface} strokeWidth={2} />
              </Pressable>
            </View>

            <View style={styles.rolesModalBody}>
              {/* Hybrid Assignment Info Box (show.blade.php:757-765) */}
              <View style={styles.hybridInfoBox}>
                <Info size={16} color={colors.infoText} strokeWidth={2} />
                <View style={styles.flexOne}>
                  <Text style={styles.hybridInfoTitle}>
                    Sistem Penugasan Fleksibel (Hybrid)
                  </Text>
                  <Text style={styles.hybridInfoDesc}>
                    Anda dapat menugaskan Pegawai ASN dari lintas unit kerja sebagai
                    Pemimpin Rapat maupun Notulis. Pegawai yang ditugaskan akan otomatis
                    memperoleh hak akses kelola notulensi selama rapat berlangsung.
                  </Text>
                </View>
              </View>

              <Text style={styles.roleFieldLabel}>
                Pemimpin Rapat (Penanggung Jawab Acara)
              </Text>
              <Pressable
                onPress={() => setRolePickerTarget('leader')}
                style={({ pressed }) => [styles.roleSelectorBtn, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <User size={16} color={colors.primary} strokeWidth={2} />
                <AutoScrollText style={styles.roleSelectorText}>
                  {selectedLeaderLabel}
                </AutoScrollText>
              </Pressable>

              <Text style={[styles.roleFieldLabel, styles.roleFieldGap]}>
                Notulis Rapat (Pencatat Notulensi & Dokumentasi)
              </Text>
              <Pressable
                onPress={() => setRolePickerTarget('notulis')}
                style={({ pressed }) => [styles.roleSelectorBtn, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <NotebookPen size={16} color={colors.primary} strokeWidth={2} />
                <AutoScrollText style={styles.roleSelectorText}>
                  {selectedNotulisLabel}
                </AutoScrollText>
              </Pressable>
            </View>

            <View style={styles.rolesModalFooter}>
              <Button
                title="Batal"
                variant="outline"
                size="md"
                onPress={() => setIsRolesModalVisible(false)}
                style={styles.flexOne}
              />
              <Button
                title={isSavingRoles ? 'Menyimpan...' : 'Simpan Penugasan'}
                variant="primary"
                size="md"
                isLoading={isSavingRoles}
                onPress={() => void handleSaveRoles()}
                style={styles.flexTwo}
              />
            </View>
          </View>
        </View>
      </Modal>

      <AgendaOptionModal
        visible={rolePickerTarget !== 'none'}
        onClose={() => setRolePickerTarget('none')}
        title={rolePickerTarget === 'leader' ? 'Pilih Pemimpin Rapat' : 'Pilih Notulis Rapat'}
        subtitle="Daftar Pegawai ASN Aktif LLDIKTI X"
        options={userOptions}
        selectedId={rolePickerTarget === 'leader' ? pendingLeaderId : pendingNotulisId}
        searchable
        searchPlaceholder="Cari nama atau NIP pegawai..."
        onSelect={(option) => {
          if (rolePickerTarget === 'leader') setPendingLeaderId(option.id);
          else setPendingNotulisId(option.id);
          setRolePickerTarget('none');
        }}
      />

      {/* MODAL 4: Edit Notulensi & Unggah Foto Dokumentasi */}
      <Modal
        visible={isEditingMinutes}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingMinutes(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rolesModalCard}>
            <View style={styles.rolesModalHeader}>
              <View style={styles.rolesHeaderTitleRow}>
                <View style={styles.rolesHeaderIconBox}>
                  <NotebookPen size={18} color={colors.onPrimary} strokeWidth={2} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.rolesModalTitle}>Kelola Notulensi & Dokumentasi</Text>
                  <Text style={styles.rolesModalSubtitle}>
                    Perbarui pembahasan, kesimpulan, dan foto dokumentasi rapat
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setIsEditingMinutes(false)}
                style={styles.zoomCloseBtn}
                accessibilityRole="button"
              >
                <X size={20} color={colors.onSurface} strokeWidth={2} />
              </Pressable>
            </View>

            <ScrollView style={styles.minutesModalScroll}>
              <View style={styles.rolesModalBody}>
                <Text style={styles.roleFieldLabel}>Pembahasan Jalannya Rapat</Text>
                <TextInput
                  multiline
                  textAlignVertical="top"
                  value={minutesDraft}
                  onChangeText={setMinutesDraft}
                  editable={!isSavingMinutes}
                  placeholder="Tuliskan jalannya rapat dan dinamika pembahasan secara lengkap..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.minutesModalInput}
                />

                <Text style={[styles.roleFieldLabel, styles.roleFieldGap]}>
                  Keputusan & Tindak Lanjut (Kesimpulan)
                </Text>
                <TextInput
                  multiline
                  textAlignVertical="top"
                  value={conclusionDraft}
                  onChangeText={setConclusionDraft}
                  editable={!isSavingMinutes}
                  placeholder="Tuliskan poin keputusan, arahan pimpinan, PIC, dan tenggat waktu..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.minutesModalInput}
                />

                <View style={styles.uploadPhotoModalRow}>
                  <Pressable
                    disabled={isUploadingPhoto}
                    onPress={() => void handleUploadDocumentationPhoto()}
                    style={({ pressed }) => [
                      styles.circularSecondaryBtn,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                  >
                    <Camera size={15} color={colors.onSurface} strokeWidth={2} />
                    <Text style={styles.circularSecondaryBtnText}>
                      {isUploadingPhoto
                        ? 'Mengunggah Foto...'
                        : 'Tambah Foto Dokumentasi dari Galeri'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <View style={styles.rolesModalFooter}>
              <Button
                title="Batal"
                variant="outline"
                size="md"
                onPress={() => setIsEditingMinutes(false)}
                disabled={isSavingMinutes}
                style={styles.flexOne}
              />
              <Button
                title={isSavingMinutes ? 'Menyimpan...' : 'Simpan Notulensi'}
                variant="primary"
                size="md"
                isLoading={isSavingMinutes}
                onPress={() => void handleSaveMinutes()}
                style={styles.flexTwo}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: Documentation Zoom */}
      <Modal
        visible={Boolean(zoomDoc)}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomDoc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rolesModalCard}>
            <View style={styles.rolesModalHeader}>
              <AutoScrollText style={styles.rolesModalTitle} containerStyle={styles.flexOne}>
                {zoomDoc?.caption || 'Dokumentasi Rapat'}
              </AutoScrollText>
              <Pressable
                onPress={() => setZoomDoc(null)}
                style={styles.zoomCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Tutup pratinjau foto"
              >
                <X size={20} color={colors.onSurface} strokeWidth={2} />
              </Pressable>
            </View>
            {zoomDoc ? (
              <Image
                source={{ uri: zoomDoc.url }}
                style={styles.zoomFullImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* MODAL 6: Participant Biometric & Signature Evidence */}
      <EvidenceViewerModal
        visible={Boolean(evidenceParticipant)}
        onClose={() => setEvidenceParticipant(null)}
        attendanceId={evidenceParticipant?.id}
        selfieUrl={evidenceParticipant?.selfieUrl}
        signatureUrl={evidenceParticipant?.signatureUrl}
        participantName={evidenceParticipant?.name}
        participantNip={evidenceParticipant?.nip}
        meetingTitle={meeting?.title}
        verificationToken={evidenceParticipant?.verificationToken}
        signedAt={evidenceParticipant?.signedAt ?? undefined}
        ipAddress={evidenceParticipant?.ipAddress}
        deviceInfo={evidenceParticipant?.deviceInfo}
        canViewBiometrics={evidenceParticipant?.canViewBiometrics}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  refreshArea: {
    flex: 1,
    overflow: 'hidden',
  },
  flexOne: {
    flex: 1,
    minWidth: 0,
  },
  flexTwo: {
    flex: 2,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.8,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },

  // 1. Dark Hero Card (show.blade.php:10-253)
  heroCard: {
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: 12,
  },
  heroTitle: {
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 18,
    lineHeight: 25,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  heroMetaList: {
    gap: 8,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroMetaText: {
    flex: 1,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    lineHeight: 18,
    color: colors.onPrimaryContainer,
    includeFontPadding: false,
  },
  heroMetaWhiteBold: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  heroToolbarDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    paddingTop: 14,
    marginTop: 4,
    gap: 10,
  },
  heroToolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  heroActionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  heroBtnDark: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: rounded.lg,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBtnDarkText: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimaryContainer,
    includeFontPadding: false,
  },
  heroBtnWhiteText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  heroBtnBlue: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.lg,
    backgroundColor: colors.infoText,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBtnAmber: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.lg,
    backgroundColor: colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBtnGreen: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.lg,
    backgroundColor: colors.successLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBtnRed: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: rounded.lg,
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBtnDisabled: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: rounded.lg,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.65,
  },
  heroBtnDisabledText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  capBadgeBlue: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.lg,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capBadgeBlueText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.infoText,
    includeFontPadding: false,
  },
  capBadgeAmber: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.lg,
    backgroundColor: colors.warningContainer,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capBadgeAmberText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.onWarningContainer,
    includeFontPadding: false,
  },
  capBadgeSlate: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.lg,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capBadgeSlateText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.onPrimaryContainer,
    includeFontPadding: false,
  },
  earliestStartHint: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
    lineHeight: 16,
    color: colors.warningLight,
    includeFontPadding: false,
  },

  // 2. Metadata Info Bar 3 Kolom (show.blade.php:256-271)
  metaInfoBar: {
    ...cardSurface,
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metaInfoCol: {
    flex: 1,
    minWidth: 90,
    gap: 2,
  },
  metaInfoDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderSubtle,
  },
  metaInfoLabel: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  metaInfoMonoValue: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  metaInfoBoldValue: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurface,
    includeFontPadding: false,
  },

  // 3. Tautan Pertemuan Daring
  zoomCard: {
    ...cardSurface,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  zoomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 180,
  },
  zoomIconBox: {
    width: 40,
    height: 40,
    borderRadius: rounded.lg,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomTitle: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  zoomUrlText: {
    fontFamily: fontFamilies.monoRegular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  zoomOpenBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.lg,
    backgroundColor: colors.primaryDarkest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoomOpenText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimary,
    includeFontPadding: false,
  },

  // Shared Web Panel Card
  webPanel: {
    ...cardSurface,
    overflow: 'hidden',
  },
  webPanelToolbar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 8,
  },
  webPanelTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
    flexGrow: 1,
  },
  webPanelTitle: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    includeFontPadding: false,
    flexShrink: 1,
  },
  webCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  webCountPillText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  webPanelBody: {
    padding: 16,
    gap: 14,
  },
  webPanelFooter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSoft,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  toolbarOutlineBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  toolbarOutlineBtnText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurface,
    includeFontPadding: false,
  },

  // 4. Panel Peserta Hadir
  attendeeSubBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  attendeeSubPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hadirDarkPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
    backgroundColor: colors.primaryDarkest,
  },
  hadirDarkPillText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  absenNeutralPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  absenNeutralPillText: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  subBarLinkBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subBarLinkText: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  attendeeListBody: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  attendeeCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 10,
  },
  attendeeCompactRowLast: {
    borderBottomWidth: 0,
  },
  attendeeCompactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  attendeeAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: rounded.full,
    backgroundColor: colors.primaryDarkest,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: rounded.full,
  },
  attendeeInitialsText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  attendeeCompactName: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  attendeeCompactUnit: {
    fontFamily: fontFamilies.monoRegular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  attendeeCameraBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBoxSimple: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyBoxSimpleText: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    includeFontPadding: false,
  },

  // 5. Panel Surat Edaran / Undangan
  circularTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  circularTypeBadgeBlue: {
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder,
  },
  circularTypeBadgeRose: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.errorBorder,
  },
  circularTypeBadgeText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    lineHeight: 14,
    includeFontPadding: false,
  },
  circularTypeBadgeTextBlue: {
    color: colors.infoText,
  },
  circularTypeBadgeTextRose: {
    color: colors.onErrorContainer,
  },
  digitalMetaBox: {
    padding: 14,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  digitalMetaLeft: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  digitalMetaTitle: {
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  digitalMetaLine: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  digitalMetaStrong: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  digitalMetaIconBox: {
    width: 40,
    height: 40,
    borderRadius: rounded.lg,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularActionsStack: {
    gap: 8,
  },
  circularPrimaryBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.lg,
    backgroundColor: colors.primaryDarkest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  circularPrimaryBtnText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  circularSecondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  circularSecondaryBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  circularSecondaryBtnText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  circularDashedEmpty: {
    paddingVertical: 22,
    paddingHorizontal: 16,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    gap: 10,
  },
  circularEmptyCircle: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularEmptyText: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    includeFontPadding: false,
  },

  // 6. Panel Target Partisipan Rapat
  targetSectionStack: {
    gap: 10,
  },
  targetSelectedHeaderBox: {
    padding: 12,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  targetSelectedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  targetDarkCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: rounded.full,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetSelectedHeaderTitle: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  targetCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.full,
    backgroundColor: colors.primaryDarkest,
  },
  targetCountBadgeText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  targetUpperCaption: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  targetUsersList: {
    gap: 6,
  },
  targetInvitedRow: {
    padding: 10,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  targetInvitedAvatar: {
    width: 28,
    height: 28,
    borderRadius: rounded.full,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetInvitedAvatarText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  targetInvitedName: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  targetInvitedSub: {
    fontFamily: fontFamilies.monoRegular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  targetAllUnitsBox: {
    padding: 12,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  targetAllUnitsText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  targetChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  targetUnitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  targetUnitChipText: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.onSurface,
    includeFontPadding: false,
  },

  // 7. Panel Notulensi Rapat & Signature Verification
  notulenBlock: {
    gap: 8,
  },
  notulenHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notulenCircleBadge: {
    width: 24,
    height: 24,
    borderRadius: rounded.full,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notulenCircleBadgeText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.onPrimary,
    includeFontPadding: false,
  },
  notulenHeadingText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  notulenContentCard: {
    padding: 14,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 4,
  },
  emptyItalicText: {
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  penutupMainText: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  penutupSubText: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  webSigSectionDivider: {
    marginTop: 6,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  webSigGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  webSigCol: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
  },
  webSigRoleLabel: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    marginBottom: 8,
    includeFontPadding: false,
  },
  webSigCanvasWrap: {
    height: 76,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  webSigImage: {
    width: 140,
    height: 68,
  },
  webSigFallbackItalic: {
    fontFamily: fontFamilies.sansMedium,
    fontStyle: 'italic',
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  webSigPendingDashed: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  webSigPendingText: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  webSigUnderline: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
    paddingBottom: 4,
    alignItems: 'center',
  },
  webSigPersonName: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurface,
    textAlign: 'center',
    includeFontPadding: false,
  },
  webSigPersonNip: {
    fontFamily: fontFamilies.monoRegular,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textSecondary,
    marginTop: 4,
    includeFontPadding: false,
  },
  webSigHadirBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  webSigHadirBadgeText: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10,
    lineHeight: 14,
    color: colors.onSuccessContainer,
    includeFontPadding: false,
  },

  // 8. Panel Dokumentasi Foto & Lampiran
  docToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flexShrink: 0,
  },
  docsGrid: {
    gap: 12,
  },
  docCard: {
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  docPreviewWrap: {
    width: '100%',
    height: 170,
    backgroundColor: colors.surfaceContainer,
  },
  docPreviewImage: {
    width: '100%',
    height: '100%',
  },
  docPreviewFallback: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  docPreviewExtText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    color: colors.primary,
    includeFontPadding: false,
  },
  docCardFooter: {
    padding: 12,
    backgroundColor: colors.surfaceCard,
    gap: 8,
  },
  docCaptionText: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  docActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docActionBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  docActionText: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.primary,
    includeFontPadding: false,
  },

  // Modals (Tugaskan Peran & Edit Notulensi)
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.scrimNeutralTop,
    justifyContent: 'center',
    padding: 16,
  },
  rolesModalCard: {
    ...cardSurface,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  rolesModalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  rolesHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rolesHeaderIconBox: {
    width: 36,
    height: 36,
    borderRadius: rounded.lg,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolesModalTitle: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  rolesModalSubtitle: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  zoomCloseBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded.md,
  },
  rolesModalBody: {
    padding: 16,
    gap: 8,
  },
  hybridInfoBox: {
    padding: 12,
    borderRadius: rounded.lg,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  hybridInfoTitle: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.infoText,
    includeFontPadding: false,
  },
  hybridInfoDesc: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.infoText,
    marginTop: 2,
    includeFontPadding: false,
  },
  roleFieldLabel: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  roleFieldGap: {
    marginTop: 8,
  },
  roleSelectorBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleSelectorText: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  rolesModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surfaceSoft,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  minutesModalScroll: {
    maxHeight: 420,
  },
  minutesModalInput: {
    minHeight: 110,
    padding: 12,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    fontFamily: fontFamilies.sansRegular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.onSurface,
    includeFontPadding: false,
  },
  uploadPhotoModalRow: {
    marginTop: 8,
  },
  zoomFullImage: {
    width: '100%',
    height: 360,
    backgroundColor: colors.primaryDarkest,
  },
  webOnlyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: rounded.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  webOnlyNoticeText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.infoText,
    flex: 1,
    minWidth: 0,
    lineHeight: 18,
  },
});
