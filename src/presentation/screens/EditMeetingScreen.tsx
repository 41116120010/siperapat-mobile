import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft,
  BarChart3,
  Building,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Clock,
  DoorOpen,
  Download,
  Eye,
  FilePenLine,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Landmark,
  Lock,
  LucideIcon,
  Network,
  NotebookPen,
  Paperclip,
  Pencil,
  Radio,
  RefreshCw,
  Scale,
  Search,
  Square,
  Tag,
  Upload,
  User,
  Users,
  Video,
  X,
  XCircle,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { agendaApi, resolveFileMimeType, UploadFileRef } from '../../data/datasources/agendaApi';
import { ApiAgendaDto } from '../../data/datasources/apiTypes';
import { toIsoDateTime } from '../../data/mappers/apiMappers';
import { Meeting, MeetingType } from '../../domain/entities/types';
import { Header } from '../components/common/Header';
import { ErrorState } from '../components/common/ErrorState';
import { TutWuriLoader } from '../components/common/TutWuriLoader';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import {
  CalendarDatePickerModal,
  formatIndonesianDate,
  getJakartaDateKey,
} from '../components/modals/CalendarDatePickerModal';
import { FeedbackModal } from '../components/modals/FeedbackModal';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';
import {
  CLASSIFICATION_OPTIONS,
  STATUS_OPTIONS,
  VENUE_OPTIONS,
} from '../constants/meetingOptions';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { useMeetingStore } from '../store/useMeetingStore';

type AgendaStatusValue = 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

const DEFAULT_ALLOWED_TRANSITIONS: Record<AgendaStatusValue, AgendaStatusValue[]> = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['ongoing', 'draft', 'cancelled'],
  ongoing: ['completed', 'scheduled'],
  completed: [],
  cancelled: ['draft'],
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Respons dokumen tidak dapat dibaca.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('Format dokumen tidak valid.'));
      else resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

interface EditMeetingScreenProps {
  meetingId: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

type ActiveModalType = 'none' | 'classification' | 'leader' | 'notulis' | 'venue' | 'date';

const CLASSIFICATION_ICON_MAP: Record<string, LucideIcon> = {
  'sync-alt': RefreshCw,
  'account-balance': Landmark,
  assessment: BarChart3,
  school: GraduationCap,
  gavel: Scale,
  edit: Pencil,
};

function getClassificationIcon(icon: unknown): LucideIcon {
  if (typeof icon === 'function') return icon as LucideIcon;
  if (typeof icon === 'string' && CLASSIFICATION_ICON_MAP[icon]) {
    return CLASSIFICATION_ICON_MAP[icon];
  }
  return Tag;
}

function getStatusMeta(id: string): { icon: LucideIcon; tint: string } {
  switch (id) {
    case 'draft':
      return { icon: FilePenLine, tint: colors.textMuted };
    case 'scheduled':
      return { icon: Clock, tint: colors.infoText };
    case 'ongoing':
      return { icon: Radio, tint: colors.warningLight };
    case 'completed':
      return { icon: CheckCircle2, tint: colors.success };
    case 'cancelled':
      return { icon: XCircle, tint: colors.error };
    default:
      return { icon: Clock, tint: colors.primary };
  }
}

export const EditMeetingScreen: React.FC<EditMeetingScreenProps> = ({
  meetingId,
  onBack,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isAdministrator = user?.role === 'administrator';
  const {
    getMeetingDetailWithDto,
    updateMeeting,
    isLoading,
    formOptions,
    fetchAgendaFormOptions,
    userCandidates,
    isUserCandidatesLoading,
    userCandidatesError,
    fetchUserCandidates,
  } = useMeetingStore();

  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [meetingCode, setMeetingCode] = useState('');

  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState('koordinasi');
  const [customClassification, setCustomClassification] = useState('');
  const [status, setStatus] = useState<AgendaStatusValue>('scheduled');
  const [initialServerStatus, setInitialServerStatus] = useState<AgendaStatusValue>('scheduled');
  const [allowedTransitions, setAllowedTransitions] = useState<AgendaStatusValue[]>([]);
  const [attendancesCount, setAttendancesCount] = useState(0);
  const [formatType, setFormatType] = useState<MeetingType>('hybrid');

  const [leaderName, setLeaderName] = useState('');
  const [leaderNip, setLeaderNip] = useState('');
  const [leaderRole, setLeaderRole] = useState('');
  const [leaderId, setLeaderId] = useState('');

  const [notulisName, setNotulisName] = useState('');
  const [notulisId, setNotulisId] = useState('');

  const [date, setDate] = useState('Pilih tanggal rapat');
  const [dateIso, setDateIso] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');

  const [venue, setVenue] = useState('Pilih ruang rapat');
  const [venueId, setVenueId] = useState('');
  const [customVenue, setCustomVenue] = useState('');

  const [zoomUrl, setZoomUrl] = useState('');
  const [targetType, setTargetType] = useState<'all_units' | 'selected_units' | 'selected_users'>(
    'all_units'
  );
  const [selectedUnits, setSelectedUnits] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const [suratEdaranType, setSuratEdaranType] = useState<'upload' | 'digital'>('upload');
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | null>(null);
  const [existingAttachmentMeta, setExistingAttachmentMeta] = useState<{
    type?: 'upload' | 'digital';
    is_digital?: boolean;
    url: string | null;
    stream_url?: string | null;
    extension?: string | null;
    is_pdf?: boolean;
    is_image?: boolean;
  } | null>(null);
  const [isDownloadingEdaran, setIsDownloadingEdaran] = useState(false);
  const [attachedFile, setAttachedFile] = useState<(UploadFileRef & { size: number }) | null>(null);
  const [viewerModalConfig, setViewerModalConfig] = useState<{
    visible: boolean;
    url?: string | null;
    localUri?: string | null;
    name?: string;
    size?: number;
    mime?: string;
  }>({ visible: false });

  const [activeModal, setActiveModal] = useState<ActiveModalType>('none');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updatedSummary, setUpdatedSummary] = useState<{
    code: string;
    title: string;
    format: string;
    status: string;
  } | null>(null);

  const loadMeetingData = async () => {
    setIsInitializing(true);
    setInitError(null);
    try {
      void fetchAgendaFormOptions();
      const { meeting: agenda, raw } = await getMeetingDetailWithDto(meetingId);
      if (agenda) {
        setMeetingCode(agenda.code);
        setTitle(agenda.title);

        const matchClass = CLASSIFICATION_OPTIONS.find(
          (c) =>
            c.title.toLowerCase() === agenda.agendaDescription?.toLowerCase() ||
            c.id === agenda.classification,
        );
        if (matchClass) {
          setClassification(matchClass.id);
          setCustomClassification('');
        } else {
          setClassification('custom');
          setCustomClassification(agenda.agendaDescription || '');
        }

        setFormatType(agenda.type);
        const mappedStatus = (raw.status?.value ||
          agenda.rawStatus ||
          (agenda.status === 'upcoming' ? 'scheduled' : agenda.status)) as AgendaStatusValue;
        setStatus(mappedStatus);
        setInitialServerStatus(mappedStatus);
        setAllowedTransitions(
          raw.allowed_transitions ?? DEFAULT_ALLOWED_TRANSITIONS[mappedStatus] ?? []
        );
        setAttendancesCount(raw.attendances_count ?? raw.total_attended ?? agenda.totalAttended ?? 0);

        if (agenda.date) {
          setDateIso(agenda.date);
          try {
            setDate(formatIndonesianDate(agenda.date));
          } catch {
            setDate(agenda.date);
          }
        }
        setStartTime(agenda.startTime || '09:00');
        setEndTime(agenda.endTime || '12:00');

        const matchVenue = VENUE_OPTIONS.find(
          (v) => v.title.toLowerCase() === agenda.venue?.toLowerCase(),
        );
        if (matchVenue) {
          setVenue(matchVenue.title);
          setVenueId(matchVenue.id);
          setCustomVenue('');
        } else if (agenda.venue) {
          setVenue(agenda.venue);
          setVenueId('custom');
          setCustomVenue(agenda.venue);
        } else {
          setVenue('Pilih ruang rapat');
          setVenueId('');
          setCustomVenue('');
        }

        setZoomUrl(agenda.zoomUrl || '');
        setLeaderName(agenda.leader || '');
        setLeaderId(agenda.leaderId ? String(agenda.leaderId) : '');
        setLeaderRole('Pimpinan Rapat');
        setNotulisName(agenda.notulis || '');
        setNotulisId(agenda.notulisId ? String(agenda.notulisId) : '');

        const resolvedTargetType =
          raw.target_type ??
          agenda.targetType ??
          (agenda.isAllUnits ? 'all_units' : 'selected_units');
        setTargetType(
          !isAdministrator && resolvedTargetType === 'all_units'
            ? 'selected_units'
            : resolvedTargetType
        );
        setSelectedUnits(
          agenda.unitIds && agenda.unitIds.length > 0
            ? agenda.unitIds
            : !isAdministrator && user?.unitId
              ? [user.unitId]
              : []
        );
        setSelectedUserIds(
          (agenda.invitedUsers ?? [])
            .map((u) => Number(u.id))
            .filter((id) => Number.isFinite(id))
        );
        if (resolvedTargetType === 'selected_users') {
          void fetchUserCandidates();
        }

        setExistingAttachmentUrl(agenda.invitationPdfUrl || null);
        setExistingAttachmentMeta(raw.surat_edaran ?? agenda.suratEdaran ?? null);
        setSuratEdaranType(
          raw.surat_edaran?.is_digital || raw.surat_edaran?.type === 'digital'
            ? 'digital'
            : 'upload'
        );
      }
    } catch (err: unknown) {
      setInitError(err instanceof Error ? err.message : 'Gagal memuat data agenda rapat.');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    void loadMeetingData();
  }, [meetingId]);

  useEffect(() => {
    if (targetType === 'selected_users' && userCandidates.length === 0 && !isUserCandidatesLoading) {
      void fetchUserCandidates();
    }
  }, [targetType, userCandidates.length, isUserCandidatesLoading, fetchUserCandidates]);

  const filteredCandidates = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return userCandidates;
    return userCandidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.nip ?? '').toLowerCase().includes(q) ||
        (c.unit ?? '').toLowerCase().includes(q)
    );
  }, [userCandidates, userSearchQuery]);

  const selectableStatusOptions = useMemo(() => {
    const allowedSet = new Set<AgendaStatusValue>([
      initialServerStatus,
      ...allowedTransitions,
    ]);
    if (initialServerStatus === 'ongoing' && attendancesCount > 0) {
      allowedSet.add('scheduled');
    }
    return STATUS_OPTIONS.filter((opt) => allowedSet.has(opt.id));
  }, [initialServerStatus, allowedTransitions, attendancesCount]);

  const selectedClassification = useMemo(() => {
    if (classification === 'custom' && customClassification.trim()) {
      return {
        id: 'custom',
        title: customClassification.trim(),
        subtitle: 'Klasifikasi Rapat Kustom',
        badge: 'Kustom',
        icon: Pencil,
      };
    }
    return (
      CLASSIFICATION_OPTIONS.find((c) => c.id === classification) || CLASSIFICATION_OPTIONS[0]
    );
  }, [classification, customClassification]);

  const ClassificationIcon = getClassificationIcon(selectedClassification.icon);

  const toggleUnit = (unitId: number) => {
    if (!isAdministrator) return;
    setSelectedUnits((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId],
    );
  };

  const toggleUserCandidate = (candidateId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId],
    );
  };

  const handleUploadFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if ((asset.size ?? 0) > 5 * 1024 * 1024) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Ukuran lampiran melebihi batas sistem 5 MB.',
      });
      return;
    }
    const resolvedMime = resolveFileMimeType(asset.name, asset.mimeType ?? undefined);
    setAttachedFile({
      uri: asset.uri,
      name: asset.name,
      type: resolvedMime,
      size: asset.size ?? 0,
    });
  };

  const handlePreviewExistingEdaran = () => {
    if (existingAttachmentUrl) {
      const isImg = existingAttachmentMeta?.is_image ?? false;
      const ext = existingAttachmentMeta?.extension || (isImg ? 'jpg' : 'pdf');
      setViewerModalConfig({
        visible: true,
        url: existingAttachmentUrl,
        name: `Surat-Edaran_${meetingCode || 'Agenda'}.${ext}`,
        mime: isImg ? 'image/jpeg' : 'application/pdf',
      });
    }
  };

  const handleDownloadExistingEdaran = async () => {
    const downloadUrl = existingAttachmentMeta?.stream_url || existingAttachmentUrl;
    if (!downloadUrl || isDownloadingEdaran) return;

    setIsDownloadingEdaran(true);
    try {
      const res = await agendaApi.downloadSuratEdaran(downloadUrl);
      const base64 = await blobToBase64(res.blob);
      const isImg = existingAttachmentMeta?.is_image ?? false;
      const ext = existingAttachmentMeta?.extension || (isImg ? 'jpg' : 'pdf');
      const safeCode = (meetingCode || `agenda-${meetingId}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = res.filename || `Surat-Edaran_${safeCode}.${ext}`;
      const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!baseDir) {
        throw new Error('Direktori penyimpanan lokal tidak tersedia.');
      }
      const localUri = `${baseDir}${fileName}`;
      await FileSystem.writeAsStringAsync(localUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, {
          mimeType: res.contentType || (isImg ? 'image/jpeg' : 'application/pdf'),
          dialogTitle: `Unduh ${fileName}`,
          UTI: isImg ? 'public.image' : 'com.adobe.pdf',
        });
      } else {
        useFeedbackStore.getState().showToast({
          type: 'success',
          message: `Surat edaran disimpan di ${localUri}.`,
        });
      }
    } catch (err: unknown) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mengunduh berkas surat edaran.',
      });
    } finally {
      setIsDownloadingEdaran(false);
    }
  };

  const handlePreviewAttachedFile = () => {
    if (attachedFile) {
      setViewerModalConfig({
        visible: true,
        localUri: attachedFile.uri,
        name: attachedFile.name,
        size: attachedFile.size,
        mime: attachedFile.type,
      });
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Harap isi perihal agenda rapat kedinasan.',
      });
      return;
    }
    if (!dateIso) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Pilih tanggal rapat terlebih dahulu.',
      });
      return;
    }
    if (formatType !== 'online' && (!venue.trim() || venue === 'Pilih ruang rapat')) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Pilih ruang rapat terlebih dahulu.',
      });
      return;
    }
    if (formatType !== 'offline' && !zoomUrl.trim()) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Masukkan tautan rapat daring.',
      });
      return;
    }
    if (status === 'scheduled' && initialServerStatus === 'ongoing' && attendancesCount > 0) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Agenda yang sudah memiliki presensi masuk tidak dapat dikembalikan ke Terjadwal.',
      });
      return;
    }

    const effectiveTargetType =
      !isAdministrator && targetType === 'all_units' ? 'selected_units' : targetType;
    const effectiveUnitIds =
      effectiveTargetType === 'selected_units'
        ? !isAdministrator && user?.unitId
          ? [user.unitId]
          : selectedUnits
        : [];

    if (effectiveTargetType === 'selected_units' && effectiveUnitIds.length === 0) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Pilih minimal satu unit kerja untuk agenda terbatas.',
      });
      return;
    }
    if (effectiveTargetType === 'selected_users' && selectedUserIds.length === 0) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Pilih minimal satu ASN yang diundang pada sasaran pegawai tertentu.',
      });
      return;
    }

    const updated = await updateMeeting(
      meetingId,
      {
        judul_rapat: title.trim(),
        jenis_rapat: selectedClassification.title,
        tipe_rapat: formatType,
        status,
        lokasi_ruang:
          formatType === 'online' ? null : venue === 'Pilih ruang rapat' ? null : venue,
        link_meeting: formatType === 'offline' ? null : zoomUrl || null,
        waktu_mulai: toIsoDateTime(dateIso, startTime),
        waktu_selesai: endTime.trim() ? toIsoDateTime(dateIso, endTime) : null,
        pimpinan_id: leaderId ? Number(leaderId) : null,
        notulis_id: notulisId ? Number(notulisId) : null,
        target_type: effectiveTargetType,
        is_all_units: effectiveTargetType === 'all_units',
        unit_ids: effectiveUnitIds,
        user_ids: effectiveTargetType === 'selected_users' ? selectedUserIds : [],
        surat_edaran_type: suratEdaranType,
      },
      suratEdaranType === 'upload' ? (attachedFile ?? undefined) : undefined,
    );

    if (updated) {
      setUpdatedSummary({
        code: updated.code,
        title: updated.title,
        format: updated.type.toUpperCase(),
        status: (STATUS_OPTIONS.find((s) => s.id === status)?.label ?? status).toUpperCase(),
      });
      setShowSuccessModal(true);
    } else {
      const currentError = useMeetingStore.getState().error;
      useFeedbackStore.getState().showToast({
        type: 'error',
        message:
          currentError ||
          'Gagal memperbarui agenda rapat. Silakan periksa kembali isian formulir.',
      });
    }
  };

  const getModalConfig = (): {
    title: string;
    subtitle: string;
    options: AgendaOption[];
    selectedId: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    pageSize?: number;
    paginationLabel?: string;
    consistentHeight?: boolean;
    allowCustomOption?: boolean;
    customOptionLabel?: string;
    customOptionPlaceholder?: string;
    customInitialValue?: string;
  } => {
    switch (activeModal) {
      case 'classification':
        return {
          title: 'Pilih Klasifikasi Rapat',
          subtitle: 'Kategori agenda untuk administrasi dan kearsipan',
          options: CLASSIFICATION_OPTIONS,
          selectedId: classification,
          searchable: true,
          searchPlaceholder: 'Cari jenis atau klasifikasi rapat...',
          consistentHeight: true,
          allowCustomOption: true,
          customOptionLabel: 'Jenis Rapat',
          customOptionPlaceholder: 'Contoh: Rapat Senat Terbuka, FGD, Diskusi Panel...',
          customInitialValue: customClassification,
        };
      case 'leader':
        return {
          title: 'Pilih Pimpinan Rapat',
          subtitle: 'Penanggung jawab sidang kedinasan LLDIKTI Wilayah X',
          options: (formOptions?.users ?? []).map((u) => ({
            id: String(u.id),
            title: u.name,
            subtitle: `${u.role.label} • NIP. ${u.nip ?? '—'}`,
            badge: u.role.label,
            icon: User,
          })),
          selectedId: leaderId,
          searchable: true,
          searchPlaceholder: 'Cari nama atau NIP pimpinan rapat...',
          pageSize: 5,
          paginationLabel: 'pimpinan',
          consistentHeight: true,
        };
      case 'notulis':
        return {
          title: 'Pilih Petugas Notulis',
          subtitle: 'Petugas penyusun risalah dan notulensi sidang',
          options: (formOptions?.users ?? []).map((u) => ({
            id: String(u.id),
            title: u.name,
            subtitle: `${u.role.label} • NIP. ${u.nip ?? '—'}`,
            badge: u.role.label,
            icon: NotebookPen,
          })),
          selectedId: notulisId,
          searchable: true,
          searchPlaceholder: 'Cari nama atau NIP petugas notulis...',
          pageSize: 5,
          paginationLabel: 'notulis',
          consistentHeight: true,
        };
      case 'venue':
        return {
          title: 'Pilih Ruang Rapat',
          subtitle: 'Lokasi fisik ruang sidang di lingkungan kantor LLDIKTI X',
          options: VENUE_OPTIONS,
          selectedId: venueId,
          searchable: true,
          searchPlaceholder: 'Cari ruang sidang atau nama gedung...',
          consistentHeight: true,
          allowCustomOption: true,
          customOptionLabel: 'Ruang / Lokasi Rapat',
          customOptionPlaceholder: 'Contoh: Ruang Tamu Khusus Lt. 2, Hotel Mercure, dll...',
          customInitialValue: customVenue,
        };
      default:
        return { title: '', subtitle: '', options: [], selectedId: '' };
    }
  };

  const handleSelectOption = (option: AgendaOption) => {
    switch (activeModal) {
      case 'classification':
        setClassification(option.id);
        setCustomClassification('');
        break;
      case 'leader':
        setLeaderName(option.title);
        setLeaderId(option.id);
        setLeaderNip(formOptions?.users.find((u) => String(u.id) === option.id)?.nip ?? '');
        setLeaderRole(option.badge || 'Pimpinan Rapat');
        break;
      case 'notulis':
        setNotulisName(option.title);
        setNotulisId(option.id);
        break;
      case 'venue':
        setVenue(option.title);
        setVenueId(option.id);
        setCustomVenue('');
        break;
    }
    setActiveModal('none');
  };

  const handleSelectCustomOption = (customVal: string) => {
    const trimmed = customVal.trim();
    if (!trimmed) return;
    if (activeModal === 'classification') {
      setClassification('custom');
      setCustomClassification(trimmed);
    } else if (activeModal === 'venue') {
      setVenue(trimmed);
      setVenueId('custom');
      setCustomVenue(trimmed);
    }
    setActiveModal('none');
  };

  const modalConfig = getModalConfig();

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <Header
          title="Edit Agenda Rapat"
          subtitle="Memuat informasi agenda rapat..."
          showBack
          onBack={onBack}
        />
        <View style={styles.centerStateContainer}>
          <TutWuriLoader size="lg" />
          <Text style={styles.initLoadingTitle}>Memuat Data Agenda Rapat...</Text>
          <Text style={styles.initLoadingSub}>
            Mengambil data terkini dari server kedinasan LLDIKTI Wilayah X.
          </Text>
        </View>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={styles.container}>
        <Header
          title="Edit Agenda Rapat"
          subtitle="Perbarui informasi agenda rapat"
          showBack
          onBack={onBack}
        />
        <ErrorState message={initError} onRetry={loadMeetingData} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Edit Agenda Rapat"
        subtitle={
          meetingCode
            ? `Kode: ${meetingCode} • Perbarui informasi agenda`
            : 'Perbarui informasi agenda rapat'
        }
        showBack
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {initialServerStatus === 'ongoing' ? (
          <View style={styles.ongoingBanner}>
            <Radio size={18} color={colors.warningLight} strokeWidth={2} />
            <View style={styles.ongoingBannerContent}>
              <Text style={styles.ongoingBannerTitle}>
                Rapat Sedang Berlangsung ({attendancesCount} Presensi Masuk)
              </Text>
              <Text style={styles.ongoingBannerText}>
                Perubahan waktu, lokasi, atau sasaran peserta perlu memperhatikan presensi yang
                sudah tercatat. Status tidak dapat dikembalikan ke Terjadwal setelah presensi masuk.
              </Text>
            </View>
          </View>
        ) : null}

        {/* SECTION 1: Informasi Utama Rapat */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <FileText size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>1. Informasi Utama Pertemuan</Text>
            </View>
            <View style={styles.codePill}>
              <Text style={styles.codePillText}>{meetingCode}</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Judul / Perihal Pertemuan Rapat <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Contoh: Rapat Koordinasi Penjaminan Mutu Triwulan III"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Jenis Pertemuan <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              onPress={() => setActiveModal('classification')}
              style={({ pressed }) => [styles.selectorTrigger, pressed && styles.pressedState]}
            >
              <View style={styles.selectorLeft}>
                <ClassificationIcon size={18} color={colors.primary} strokeWidth={2} />
                <Text style={styles.selectorValue} numberOfLines={1}>
                  {selectedClassification.title}
                </Text>
              </View>
              <View style={styles.selectorRight}>
                {selectedClassification.badge ? (
                  <View style={styles.selectorBadge}>
                    <Text style={styles.selectorBadgeText}>{selectedClassification.badge}</Text>
                  </View>
                ) : null}
                <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
              </View>
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Format Pelaksanaan <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.formatSegmentedGrid}>
              <Pressable
                onPress={() => setFormatType('offline')}
                style={[styles.formatBtn, formatType === 'offline' && styles.formatBtnActive]}
              >
                <Building
                  size={17}
                  color={formatType === 'offline' ? colors.onPrimary : colors.textMuted}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.formatBtnText,
                    formatType === 'offline' && styles.formatBtnTextActive,
                  ]}
                >
                  Luring
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setFormatType('online')}
                style={[styles.formatBtn, formatType === 'online' && styles.formatBtnActive]}
              >
                <Video
                  size={17}
                  color={formatType === 'online' ? colors.onPrimary : colors.textMuted}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.formatBtnText,
                    formatType === 'online' && styles.formatBtnTextActive,
                  ]}
                >
                  Daring
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setFormatType('hybrid')}
                style={[styles.formatBtn, formatType === 'hybrid' && styles.formatBtnActive]}
              >
                <Network
                  size={17}
                  color={formatType === 'hybrid' ? colors.onPrimary : colors.textMuted}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.formatBtnText,
                    formatType === 'hybrid' && styles.formatBtnTextActive,
                  ]}
                >
                  Hibrida
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Waktu Pelaksanaan <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              onPress={() => setActiveModal('date')}
              style={({ pressed }) => [styles.selectorTrigger, pressed && styles.pressedState]}
            >
              <View style={styles.selectorLeft}>
                <Calendar size={18} color={colors.primary} strokeWidth={2} />
                <Text style={styles.selectorValue}>{date}</Text>
              </View>
              <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={styles.label}>
                Mulai (WIB) <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.timeInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Selesai (WIB)</Text>
              <TextInput
                style={styles.timeInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="12:00"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {formatType !== 'online' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Lokasi / Nama Ruang Rapat <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                onPress={() => setActiveModal('venue')}
                style={({ pressed }) => [styles.selectorTrigger, pressed && styles.pressedState]}
              >
                <View style={styles.selectorLeft}>
                  <DoorOpen size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {venue}
                  </Text>
                </View>
                <View style={styles.selectorRight}>
                  {venueId === 'custom' ? (
                    <View style={styles.selectorBadge}>
                      <Text style={styles.selectorBadgeText}>Kustom</Text>
                    </View>
                  ) : null}
                  <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
                </View>
              </Pressable>
            </View>
          ) : null}

          {formatType !== 'offline' ? (
            <View style={styles.virtualMeetingBox}>
              <View style={styles.virtualHeader}>
                <Video size={16} color={colors.primary} strokeWidth={2} />
                <Text style={styles.virtualTitle}>Tautan Daring (Zoom / GMeet)</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={zoomUrl}
                onChangeText={setZoomUrl}
                placeholder="https://zoom.us/j/... atau meet.google.com/..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>
          ) : null}
        </View>

        {/* SECTION 2: Sasaran Peserta & Unit Kerja */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <Users size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>2. Sasaran Peserta & Unit Kerja</Text>
            </View>
          </View>

          {isAdministrator ? (
            <Pressable
              onPress={() => setTargetType('all_units')}
              style={[styles.radioCard, targetType === 'all_units' && styles.radioCardActive]}
            >
              {targetType === 'all_units' ? (
                <CircleDot size={20} color={colors.primary} strokeWidth={2} />
              ) : (
                <Circle size={20} color={colors.textMuted} strokeWidth={2} />
              )}
              <View style={styles.radioTextWrap}>
                <Text style={styles.radioTitle}>Seluruh Unit Kerja (Pleno / Universal)</Text>
                <Text style={styles.radioSub}>
                  Semua pegawai ASN pada seluruh unit kerja berhak dan tercatat dalam daftar
                  kehadiran.
                </Text>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => setTargetType('selected_units')}
            style={[
              styles.radioCard,
              targetType === 'selected_units' && styles.radioCardActive,
            ]}
          >
            {targetType === 'selected_units' ? (
              <CircleDot size={20} color={colors.primary} strokeWidth={2} />
            ) : (
              <Circle size={20} color={colors.textMuted} strokeWidth={2} />
            )}
            <View style={styles.radioTextWrap}>
              <Text style={styles.radioTitle}>
                {isAdministrator ? 'Unit Kerja Tertentu' : 'Internal Unit Kerja'}
              </Text>
              <Text style={styles.radioSub}>
                {isAdministrator
                  ? 'Pilih bagian atau kelompok kerja yang diundang secara spesifik.'
                  : `Terbatas pada unit kerja Anda (${user?.unitKerja || 'Unit Anda'}).`}
              </Text>
            </View>
          </Pressable>

          {targetType === 'selected_units' ? (
            isAdministrator ? (
              <View style={styles.unitSelectSection}>
                <Text style={styles.unitSelectHeader}>Pilih Unit Kerja yang Diundang:</Text>
                <View style={styles.unitChipsWrap}>
                  {(formOptions?.units ?? []).map((unit) => {
                    const isChecked = selectedUnits.includes(unit.id);
                    return (
                      <Pressable
                        key={unit.id}
                        onPress={() => toggleUnit(unit.id)}
                        style={[styles.unitChip, isChecked && styles.unitChipSelected]}
                      >
                        {isChecked ? (
                          <CheckSquare size={16} color={colors.onPrimary} strokeWidth={2} />
                        ) : (
                          <Square size={16} color={colors.textMuted} strokeWidth={2} />
                        )}
                        <Text
                          style={[
                            styles.unitChipText,
                            isChecked && styles.unitChipTextSelected,
                          ]}
                        >
                          {unit.nama_unit}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={styles.lockedScopeNotice}>
                <Lock size={15} color={colors.infoText} strokeWidth={2} />
                <Text style={styles.lockedScopeText}>
                  Sasaran dikunci otomatis untuk unit kerja Anda: {user?.unitKerja || 'Unit Aktif'}
                </Text>
              </View>
            )
          ) : null}

          <Pressable
            onPress={() => setTargetType('selected_users')}
            style={[styles.radioCard, targetType === 'selected_users' && styles.radioCardActive]}
          >
            {targetType === 'selected_users' ? (
              <CircleDot size={20} color={colors.primary} strokeWidth={2} />
            ) : (
              <Circle size={20} color={colors.textMuted} strokeWidth={2} />
            )}
            <View style={styles.radioTextWrap}>
              <Text style={styles.radioTitle}>ASN / Pegawai Tertentu</Text>
              <Text style={styles.radioSub}>
                Undang pegawai ASN tertentu lintas bagian sesuai kebutuhan rapat.
              </Text>
            </View>
          </Pressable>

          {targetType === 'selected_users' ? (
            <View style={styles.candidateSection}>
              <View style={styles.candidateSearchRow}>
                <Search size={16} color={colors.textMuted} strokeWidth={2} />
                <TextInput
                  style={styles.candidateSearchInput}
                  value={userSearchQuery}
                  onChangeText={setUserSearchQuery}
                  placeholder="Cari nama, NIP, atau unit kerja ASN..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.candidateToolbar}>
                <Text style={styles.candidateCountText}>
                  {selectedUserIds.length} ASN dipilih
                </Text>
                <View style={styles.candidateBulkActions}>
                  <Pressable
                    onPress={() =>
                      setSelectedUserIds(filteredCandidates.map((c) => Number(c.id)))
                    }
                    style={styles.candidateBulkBtn}
                  >
                    <Text style={styles.candidateBulkText}>Pilih Semua</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelectedUserIds([])}
                    style={styles.candidateBulkBtn}
                  >
                    <Text style={styles.candidateBulkTextMuted}>Hapus Semua</Text>
                  </Pressable>
                </View>
              </View>

              {selectedUserIds.length === 0 ? (
                <Text style={styles.candidateHintText}>
                  Pastikan daftar ASN yang diundang telah dipilih sebelum menyimpan perubahan.
                </Text>
              ) : null}

              {isUserCandidatesLoading ? (
                <View style={styles.candidateStateBox}>
                  <TutWuriLoader size="md" />
                  <Text style={styles.candidateStateText}>Memuat daftar pegawai ASN...</Text>
                </View>
              ) : userCandidatesError ? (
                <View style={styles.candidateStateBox}>
                  <Text style={styles.candidateErrorText}>{userCandidatesError}</Text>
                  <Pressable
                    onPress={() => void fetchUserCandidates()}
                    style={styles.candidateRetryBtn}
                  >
                    <Text style={styles.candidateRetryText}>Muat Ulang</Text>
                  </Pressable>
                </View>
              ) : filteredCandidates.length === 0 ? (
                <Text style={styles.candidateStateText}>
                  Tidak ada pegawai ASN yang cocok dengan pencarian.
                </Text>
              ) : (
                <View style={styles.candidateList}>
                  {filteredCandidates.map((candidate) => {
                    const candidateId = Number(candidate.id);
                    const isChecked = selectedUserIds.includes(candidateId);
                    return (
                      <Pressable
                        key={candidate.id}
                        onPress={() => toggleUserCandidate(candidateId)}
                        style={[
                          styles.candidateRow,
                          isChecked && styles.candidateRowSelected,
                        ]}
                      >
                        <View style={styles.candidateInfo}>
                          <Text style={styles.candidateName}>{candidate.name}</Text>
                          <Text style={styles.candidateMeta} numberOfLines={1}>
                            {candidate.nip || '-'} • {candidate.unit || 'LLDIKTI X'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.candidateCheckBox,
                            isChecked && styles.candidateCheckBoxSelected,
                          ]}
                        >
                          {isChecked ? (
                            <Check size={14} color={colors.onPrimary} strokeWidth={2} />
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* SECTION 3: Penugasan Pimpinan & Notulis Rapat */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <NotebookPen size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>3. Penugasan Pimpinan & Notulis Rapat</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Pimpinan Rapat Kedinasan</Text>
            <Pressable
              onPress={() => setActiveModal('leader')}
              style={({ pressed }) => [styles.entityCard, pressed && styles.pressedState]}
            >
              <View style={styles.leaderAvatar}>
                <Text style={styles.leaderAvatarText}>
                  {leaderName
                    .split(' ')
                    .map((n) => n[0])
                    .filter((c) => /^[A-Z]$/i.test(c))
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'PJ'}
                </Text>
              </View>
              <View style={styles.entityInfo}>
                <Text style={styles.entityName}>{leaderName || 'Pilih Pimpinan Rapat'}</Text>
                <Text style={styles.entitySub}>
                  {leaderRole} {leaderNip ? `• NIP. ${leaderNip}` : ''}
                </Text>
              </View>
              <View style={styles.actionPill}>
                <Text style={styles.actionPillText}>Ganti</Text>
                <ChevronRight size={15} color={colors.primary} strokeWidth={2} />
              </View>
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Petugas Notulis / Risalah Rapat</Text>
            <Pressable
              onPress={() => setActiveModal('notulis')}
              style={({ pressed }) => [styles.entityCard, pressed && styles.pressedState]}
            >
              <View style={styles.notulisIconWrap}>
                <NotebookPen size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.entityInfo}>
                <Text style={styles.entityName}>{notulisName || 'Pilih Petugas Notulis'}</Text>
                <Text style={styles.entitySub}>Petugas Notulensi Sidang Kedinasan</Text>
              </View>
              <View style={styles.actionPill}>
                <Text style={styles.actionPillText}>Ganti</Text>
                <ChevronRight size={15} color={colors.primary} strokeWidth={2} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* SECTION 4: Surat Undangan / Edaran Resmi */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <Paperclip size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>4. Surat Undangan / Edaran Resmi</Text>
            </View>
          </View>

          <View style={styles.edaranSegmented}>
            <Pressable
              onPress={() => setSuratEdaranType('upload')}
              style={[
                styles.edaranSegmentBtn,
                suratEdaranType === 'upload' && styles.edaranSegmentBtnActive,
              ]}
            >
              <Upload
                size={15}
                color={suratEdaranType === 'upload' ? colors.onPrimary : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.edaranSegmentText,
                  suratEdaranType === 'upload' && styles.edaranSegmentTextActive,
                ]}
              >
                Unggah Berkas Fisik
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSuratEdaranType('digital')}
              style={[
                styles.edaranSegmentBtn,
                suratEdaranType === 'digital' && styles.edaranSegmentBtnActive,
              ]}
            >
              <FilePenLine
                size={15}
                color={suratEdaranType === 'digital' ? colors.onPrimary : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.edaranSegmentText,
                  suratEdaranType === 'digital' && styles.edaranSegmentTextActive,
                ]}
              >
                Buat Surat Digital Langsung
              </Text>
            </Pressable>
          </View>

          {existingAttachmentUrl && !attachedFile ? (
            <View style={styles.existingAttachmentCard}>
              <View style={styles.attachedLeft}>
                <View
                  style={[
                    styles.attachedIconBox,
                    existingAttachmentMeta?.is_image
                      ? styles.attachedBadgeImage
                      : styles.attachedBadgePdf,
                  ]}
                >
                  {existingAttachmentMeta?.is_image ? (
                    <ImageIcon size={18} color={colors.primary} strokeWidth={2} />
                  ) : (
                    <FileText size={18} color={colors.error} strokeWidth={2} />
                  )}
                </View>
                <View style={styles.attachedInfo}>
                  <Text style={styles.attachedName} numberOfLines={1}>
                    Surat-Edaran_{meetingCode || 'Agenda'}.
                    {existingAttachmentMeta?.extension ||
                      (existingAttachmentMeta?.is_image ? 'jpg' : 'pdf')}
                  </Text>
                  <Text style={styles.attachedMeta}>
                    {existingAttachmentMeta?.is_digital
                      ? 'Surat Edaran Digital Tersimpan di Server'
                      : 'Berkas Surat Resmi Terlampir di Server'}
                  </Text>
                </View>
              </View>
              <View style={styles.attachedActions}>
                <Pressable
                  onPress={handlePreviewExistingEdaran}
                  style={styles.attachedActionBtn}
                  accessibilityLabel="Pratinjau berkas saat ini"
                >
                  <Eye size={18} color={colors.primary} strokeWidth={2} />
                </Pressable>
                <Pressable
                  onPress={() => void handleDownloadExistingEdaran()}
                  disabled={isDownloadingEdaran}
                  style={styles.attachedDownloadBtn}
                  accessibilityLabel="Unduh surat edaran saat ini"
                >
                  {isDownloadingEdaran ? (
                    <TutWuriLoader size="sm" />
                  ) : (
                    <>
                      <Download size={15} color={colors.primary} strokeWidth={2} />
                      <Text style={styles.attachedDownloadText}>Unduh</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ) : null}

          {suratEdaranType === 'upload' ? (
            <>
              <Pressable
                onPress={handleUploadFile}
                style={({ pressed }) => [styles.dropzone, pressed && styles.pressedState]}
              >
                <View style={styles.dropzoneIconWrap}>
                  <Upload size={20} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.dropzoneTextWrap}>
                  <Text style={styles.dropzoneTitle}>
                    {existingAttachmentUrl
                      ? 'Unggah Berkas Baru Pengganti'
                      : 'Unggah Surat Undangan / Nota Dinas'}
                  </Text>
                  <Text style={styles.dropzoneSub}>
                    Format PDF atau gambar bertanda tangan digital (Maksimal 5 MB)
                  </Text>
                </View>
              </Pressable>

              {attachedFile ? (
                <View style={styles.attachedCard}>
                  <View style={styles.attachedLeft}>
                    <View
                      style={[
                        styles.attachedIconBox,
                        attachedFile.type.startsWith('image/')
                          ? styles.attachedBadgeImage
                          : styles.attachedBadgePdf,
                      ]}
                    >
                      {attachedFile.type.startsWith('image/') ? (
                        <ImageIcon size={18} color={colors.primary} strokeWidth={2} />
                      ) : (
                        <FileText size={18} color={colors.error} strokeWidth={2} />
                      )}
                    </View>
                    <View style={styles.attachedInfo}>
                      <Text style={styles.attachedName} numberOfLines={1}>
                        {attachedFile.name} (Berkas Baru)
                      </Text>
                      <Text style={styles.attachedMeta}>
                        {(attachedFile.size / (1024 * 1024)).toFixed(2)} MB •{' '}
                        {attachedFile.type.startsWith('image/') ? 'Format Gambar' : 'Dokumen PDF'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.attachedActions}>
                    <Pressable
                      onPress={handlePreviewAttachedFile}
                      style={styles.attachedActionBtn}
                      accessibilityLabel="Pratinjau lampiran baru"
                    >
                      <Eye size={18} color={colors.primary} strokeWidth={2} />
                    </Pressable>
                    <Pressable
                      onPress={() => setAttachedFile(null)}
                      style={styles.attachedActionBtn}
                      accessibilityLabel="Hapus lampiran baru"
                    >
                      <X size={18} color={colors.error} strokeWidth={2} />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.digitalNoticeCard}>
              <FilePenLine size={18} color={colors.infoText} strokeWidth={2} />
              <Text style={styles.digitalNoticeText}>
                Mode surat digital aktif. Dokumen surat edaran resmi disusun dan diterbitkan
                menggunakan templat digital terpadu tanpa unggahan PDF manual.
              </Text>
            </View>
          )}
        </View>

        {/* SECTION 5: Status Siklus Agenda (berdekatan dengan Simpan Perubahan) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <Clock size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Status Siklus Agenda</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Status Penyelenggaraan Rapat <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusScroll}
            >
              {selectableStatusOptions.map((opt) => {
                const isSelected = status === opt.id;
                const isLocked =
                  opt.id === 'scheduled' &&
                  initialServerStatus === 'ongoing' &&
                  attendancesCount > 0;
                const meta = getStatusMeta(opt.id);
                const StatusIcon = isLocked ? Lock : meta.icon;
                return (
                  <Pressable
                    key={opt.id}
                    disabled={isLocked}
                    onPress={() => setStatus(opt.id)}
                    style={({ pressed }) => [
                      styles.statusPill,
                      isSelected && styles.statusPillActive,
                      isLocked && styles.statusPillLocked,
                      pressed && !isLocked && styles.pressedState,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected, disabled: isLocked }}
                  >
                    <StatusIcon
                      size={15}
                      color={
                        isLocked
                          ? colors.textMuted
                          : isSelected
                            ? colors.onPrimary
                            : meta.tint
                      }
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        isSelected && styles.statusPillTextActive,
                        isLocked && styles.statusPillTextLocked,
                      ]}
                    >
                      {isLocked ? `${opt.label} (Terkunci: Presensi Masuk)` : opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
      <View
        style={[
          styles.stickyFooter,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View style={styles.footerGrid}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}
          >
            <ArrowLeft size={17} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.cancelButtonText}>Batal</Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.saveButton,
              isLoading && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {isLoading ? (
              <TutWuriLoader size="sm" />
            ) : (
              <CheckCircle2 size={17} color={colors.onPrimary} strokeWidth={2} />
            )}
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Text>
          </Pressable>
        </View>
      </View>

      <CalendarDatePickerModal
        visible={activeModal === 'date'}
        onClose={() => setActiveModal('none')}
        selectedDate={dateIso}
        onSelectDate={(newDateIso, formattedText) => {
          setDateIso(newDateIso);
          setDate(formattedText);
        }}
        minDate={getJakartaDateKey(new Date())}
      />

      <AgendaOptionModal
        visible={activeModal !== 'none' && activeModal !== 'date'}
        onClose={() => setActiveModal('none')}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        options={modalConfig.options}
        selectedId={modalConfig.selectedId}
        searchable={modalConfig.searchable}
        searchPlaceholder={modalConfig.searchPlaceholder}
        pageSize={modalConfig.pageSize}
        paginationLabel={modalConfig.paginationLabel}
        consistentHeight={modalConfig.consistentHeight}
        allowCustomOption={modalConfig.allowCustomOption}
        customOptionLabel={modalConfig.customOptionLabel}
        customOptionPlaceholder={modalConfig.customOptionPlaceholder}
        customInitialValue={modalConfig.customInitialValue}
        onSelect={handleSelectOption}
        onSelectCustom={handleSelectCustomOption}
      />

      <FeedbackModal
        visible={showSuccessModal}
        type="success"
        title="Agenda Berhasil Diperbarui"
        message="Perubahan data agenda rapat kedinasan telah berhasil disimpan ke server."
        detail={
          updatedSummary
            ? {
                'Kode Rapat': updatedSummary.code,
                Perihal: updatedSummary.title,
                Format: updatedSummary.format,
                Status: updatedSummary.status,
              }
            : undefined
        }
        confirmText="Kembali ke Detail"
        onConfirm={() => {
          setShowSuccessModal(false);
          if (onSuccess) onSuccess();
          else if (onBack) onBack();
        }}
        onClose={() => setShowSuccessModal(false)}
      />

      <SuratEdaranViewerModal
        visible={viewerModalConfig.visible}
        onClose={() => setViewerModalConfig({ visible: false })}
        documentUrl={viewerModalConfig.url}
        localFileUri={viewerModalConfig.localUri}
        fileName={viewerModalConfig.name}
        fileSize={viewerModalConfig.size}
        mimeType={viewerModalConfig.mime}
        meetingTitle={title.trim() || 'Agenda Rapat'}
        meetingCode={meetingCode}
        meetingDate={date && startTime ? `${date} • ${startTime}` : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  initLoadingTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  initLoadingSub: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  sectionCard: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.xs + 2,
  },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, flex: 1 },
  sectionTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  codePill: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  codePillText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    color: colors.primary,
  },
  fieldGroup: { gap: spacing.xs + 2 },
  label: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  required: { color: colors.error },
  textInput: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 4,
    color: colors.onSurface,
    backgroundColor: colors.surfaceCard,
  },

  statusScroll: { flexDirection: 'row', gap: spacing.xs + 2 },
  statusPill: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  statusPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
  },
  statusPillTextActive: { color: colors.onPrimary },

  selectorTrigger: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 4,
    backgroundColor: colors.surfaceCard,
  },
  selectorLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  selectorValue: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onSurface,
    flex: 1,
  },
  selectorRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  selectorBadge: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  selectorBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  pressedState: { opacity: 0.78 },

  formatSegmentedGrid: { flexDirection: 'row', gap: spacing.xs + 2 },
  formatBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  formatBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  formatBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
  },
  formatBtnTextActive: { color: colors.onPrimary },

  entityCard: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.sm + 4,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
  leaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderAvatarText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  notulisIconWrap: {
    width: 40,
    height: 40,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityInfo: { flex: 1, minWidth: 0 },
  entityName: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13.5,
    color: colors.onSurface,
  },
  entitySub: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
    marginTop: 1,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  actionPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },

  timeRow: { flexDirection: 'row', gap: spacing.sm },
  timeCol: { flex: 1, gap: spacing.xs + 2 },
  timeInput: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 4,
    backgroundColor: colors.surfaceCard,
    ...typography.labelMono,
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  virtualMeetingBox: {
    backgroundColor: colors.background,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.sm + 4,
    gap: spacing.xs + 2,
  },
  virtualHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  virtualTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },

  radioCard: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    padding: spacing.sm + 4,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  radioCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  radioTextWrap: { flex: 1, gap: 2 },
  radioTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  radioSub: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  unitSelectSection: { gap: spacing.xs + 2 },
  unitSelectHeader: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  unitChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  unitChip: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  unitChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
  },
  unitChipTextSelected: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },

  existingAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
  dropzone: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    padding: spacing.md,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
  dropzoneIconWrap: {
    width: 42,
    height: 42,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzoneTextWrap: { flex: 1, gap: 2 },
  dropzoneTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  dropzoneSub: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  attachedLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  attachedIconBox: {
    width: 38,
    height: 38,
    borderRadius: rounded.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedBadgeImage: { backgroundColor: colors.infoBg },
  attachedBadgePdf: { backgroundColor: colors.errorContainer },
  attachedInfo: { flex: 1, minWidth: 0 },
  attachedName: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  attachedMeta: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  attachedActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attachedActionBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded.md,
  },

  stickyFooter: {
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
  },
  footerGrid: { flexDirection: 'row', gap: spacing.sm },
  cancelButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
  },
  cancelButtonText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1.5,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
  },
  buttonDisabled: { opacity: 0.6 },
  saveButtonText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  buttonPressed: { opacity: 0.82 },

  ongoingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    backgroundColor: colors.warningContainer,
  },
  ongoingBannerContent: { flex: 1, gap: 3 },
  ongoingBannerTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onWarningContainer,
  },
  ongoingBannerText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.onWarningContainer,
  },
  statusPillLocked: {
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    opacity: 0.72,
  },
  statusPillTextLocked: { color: colors.textMuted },

  lockedScopeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    backgroundColor: colors.infoBg,
  },
  lockedScopeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.infoText,
    flex: 1,
  },
  candidateSection: { gap: spacing.xs + 2 },
  candidateSearchRow: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: colors.surfaceCard,
  },
  candidateSearchInput: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    color: colors.onSurface,
  },
  candidateToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  candidateCountText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
  },
  candidateBulkActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  candidateBulkBtn: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs + 2,
  },
  candidateBulkText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  candidateBulkTextMuted: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  candidateHintText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  candidateStateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm,
  },
  candidateStateText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  candidateErrorText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.error,
    flex: 1,
  },
  candidateRetryBtn: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
  },
  candidateRetryText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  candidateList: { gap: spacing.xs + 2 },
  candidateRow: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
  },
  candidateRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  candidateInfo: { flex: 1, minWidth: 0, gap: 2 },
  candidateName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  candidateMeta: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  candidateCheckBox: {
    width: 22,
    height: 22,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
  },
  candidateCheckBoxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  edaranSegmented: { flexDirection: 'row', gap: spacing.xs + 2 },
  edaranSegmentBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  edaranSegmentBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  edaranSegmentText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  edaranSegmentTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  attachedDownloadBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  attachedDownloadText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  digitalNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    backgroundColor: colors.infoBg,
  },
  digitalNoticeText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.infoText,
    flex: 1,
  },
});
