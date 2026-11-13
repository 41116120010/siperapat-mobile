import React, { useEffect, useMemo, useState } from 'react';
import {
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
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  CloudUpload,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Info,
  Mail,
  NotebookPen,
  Pencil,
  Plus,
  Scale,
  Search,
  Trash2,
  User,
  Users,
  Video,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Button } from '../components/common/Button';
import { PaginationBar } from '../components/common/PaginationBar';
import { SimpleHtmlView } from '../components/common/SimpleHtmlView';
import { StatusPill, StatusPillType } from '../components/common/StatusPill';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';
import { UploadSuratEdaranModal } from '../components/modals/UploadSuratEdaranModal';
import { resolveFileMimeType, UploadFileRef } from '../../data/datasources/agendaApi';
import { AgendaExportFormat } from '../../data/datasources/reportApi';
import { meetingToUpdateDto } from '../../data/mappers/apiMappers';
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

interface MonitoringScreenProps {
  meetingId?: string;
  onBack?: () => void;
  onNavigateEdit?: (meetingId: string) => void;
}

type TabType = 'verified' | 'unverified' | 'minutes';

interface DocumentationItem {
  id: number | string;
  url: string;
  caption?: string | null;
}

type MeetingWithDocs = Meeting & {
  documentations?: DocumentationItem[];
};

interface Participant {
  name: string;
  role: string;
  nip: string;
  time: string;
  location: string;
  unit?: string;
  isOnline?: boolean;
  status: AttendanceStatus;
}

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
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const [minutesDraft, setMinutesDraft] = useState('');
  const [conclusionDraft, setConclusionDraft] = useState('');
  const [isUploadingEdaran, setIsUploadingEdaran] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<AgendaExportFormat | null>(null);
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

  useEffect(() => {
    if (!meetingId) return;
    void getMeetingById(meetingId)
      .then((agenda) => {
        setMeeting(agenda as MeetingWithDocs);
        setAgendaError(null);
      })
      .catch((requestError: unknown) => {
        setMeeting(null);
        setAgendaError(
          requestError instanceof Error ? requestError.message : 'Gagal memuat detail agenda.',
        );
      });
  }, [meetingId, getMeetingById]);

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
            name: record.asnName || 'Nama tidak disediakan',
            role: record.asnJabatan || 'Pegawai',
            nip: record.asnNip || '',
            time:
              record.status === 'belum_hadir'
                ? 'Belum melakukan presensi'
                : record.timestamp
                  ? new Date(record.timestamp).toLocaleString('id-ID')
                  : 'Waktu tidak tersedia',
            location: record.asnUnitKerja || 'LLDIKTI Wilayah X',
            unit: record.asnUnitKerja,
            status: record.status,
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Dark Slate Hero Banner matching show.blade.php */}
      <View
        style={[
          styles.heroBanner,
          { paddingTop: Math.max(insets.top, spacing.sm) + spacing.sm },
        ]}
      >
        <View style={styles.heroTopBar}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [styles.heroBackBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Kembali ke Daftar Agenda"
            >
              <ArrowLeft size={16} color={colors.onPrimary} strokeWidth={2} />
              <Text style={styles.heroBackText}>Daftar Agenda</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <StatusPill status={toPillStatus(meeting?.status)} />
        </View>

        <View style={styles.heroCodeRow}>
          <Text style={styles.heroCode}>{meeting?.code ?? `Agenda #${meetingId ?? '-'}`}</Text>
          {capacityBadgeLabel ? (
            <View style={styles.capacityPill}>
              <Text style={styles.capacityPillText}>{capacityBadgeLabel}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.heroTitle} numberOfLines={3}>
          {meeting?.title ??
            (agendaError ? 'Detail agenda tidak dapat dimuat' : 'Memuat detail agenda...')}
        </Text>

        <View style={styles.heroMetaGrid}>
          <View style={styles.heroMetaRow}>
            <Calendar size={14} color={colors.borderStrong} strokeWidth={2} />
            <Text style={styles.heroMetaText} numberOfLines={1}>
              {meeting
                ? `${meeting.date} • ${meeting.startTime}–${meeting.endTime || 'Selesai'} WIB`
                : '-'}
            </Text>
          </View>
          <View style={styles.heroMetaRow}>
            <Video size={14} color={colors.borderStrong} strokeWidth={2} />
            <Text style={styles.heroMetaText} numberOfLines={1}>
              {meeting
                ? `[${formatTipeLabel(meeting.type)}] ${meeting.venue || meeting.zoomUrl || 'Lokasi belum ditentukan'}`
                : '-'}
            </Text>
          </View>
          <View style={styles.heroPeopleRow}>
            <View style={styles.heroPersonItem}>
              <User size={13} color={colors.borderStrong} strokeWidth={2} />
              <Text style={styles.heroPersonText} numberOfLines={1}>
                Pimpinan: <Text style={styles.heroPersonBold}>{meeting?.leader || '-'}</Text>
              </Text>
            </View>
            <View style={styles.heroPersonItem}>
              <NotebookPen size={13} color={colors.borderStrong} strokeWidth={2} />
              <Text style={styles.heroPersonText} numberOfLines={1}>
                Notulis:{' '}
                <Text style={styles.heroPersonBold}>
                  {meeting ? meeting.notulis?.trim() || 'Belum ditugaskan' : '-'}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              if (!meetingId) return;
              void getMeetingById(meetingId)
                .then((agenda) => setMeeting(agenda as MeetingWithDocs))
                .catch(() => {});
              if (activeTab !== 'minutes') {
                void fetchAgendaAttendances(meetingId, attendancePage, false, {
                  status: activeTab === 'unverified' ? 'unattended' : 'attended',
                  search: searchQuery,
                });
              }
            }}
            colors={[colors.primary]}
          />
        }
      >
        {/* MANAGEMENT QUICK ACTIONS BAR */}
        {userCanEdit || userCanDelete ? (
          <View style={styles.managementGrid}>
            {userCanEdit ? (
              <Pressable
                style={({ pressed }) => [styles.actionBtnNeutral, pressed && styles.pressed]}
                onPress={() => {
                  if (meetingId && onNavigateEdit) onNavigateEdit(meetingId);
                }}
                accessibilityRole="button"
                accessibilityLabel="Ubah Agenda Rapat"
              >
                <Pencil size={15} color={colors.primary} strokeWidth={2} />
                <Text style={styles.actionBtnNeutralText}>Ubah Agenda</Text>
              </Pressable>
            ) : null}

            {userCanEdit ? (
              <Pressable
                style={({ pressed }) => [styles.actionBtnNeutral, pressed && styles.pressed]}
                onPress={handleOpenRolesModal}
                accessibilityRole="button"
                accessibilityLabel="Tugaskan Peran Pimpinan dan Notulis"
              >
                <Users size={15} color={colors.primary} strokeWidth={2} />
                <Text style={styles.actionBtnNeutralText}>Tugaskan Peran</Text>
              </Pressable>
            ) : null}

            {userCanDelete ? (
              <Pressable
                style={({ pressed }) => [styles.actionBtnDanger, pressed && styles.pressed]}
                onPress={handleConfirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Hapus Agenda Rapat"
              >
                <Trash2 size={15} color={colors.error} strokeWidth={2} />
                <Text style={styles.actionBtnDangerText}>Hapus Agenda</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* ZOOM / ONLINE MEETING LINK */}
        {meeting?.zoomUrl ? (
          <View style={styles.zoomCard}>
            <View style={styles.zoomLeft}>
              <View style={styles.zoomIconBox}>
                <Video size={18} color={colors.onPrimary} strokeWidth={2} />
              </View>
              <View style={styles.flexOne}>
                <Text style={styles.zoomTitle}>Tautan Pertemuan Daring</Text>
                <Text style={styles.zoomUrlText} numberOfLines={1}>
                  {meeting.zoomUrl}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={() => void Linking.openURL(meeting.zoomUrl!)}
              style={({ pressed }) => [styles.zoomOpenBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Buka Tautan Daring"
            >
              <Text style={styles.zoomOpenText}>Buka</Text>
              <ExternalLink size={14} color={colors.onPrimary} strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}

        {/* LIVE ATTENDANCE METRICS & PROGRESS */}
        <View style={styles.panelCard}>
          <Text style={styles.panelTitle}>Rekapitulasi Kehadiran</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Hadir Sah</Text>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, styles.metricValueSuccess]}>
                  {agendaAttendancePage?.summary.total_attended ?? meeting?.totalAttended ?? '—'}
                </Text>
                <Text style={styles.metricUnit}>ASN</Text>
              </View>
            </View>
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Belum Hadir</Text>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, styles.metricValueError]}>
                  {agendaAttendancePage?.summary?.unattended_count ?? '—'}
                </Text>
                <Text style={styles.metricUnit}>ASN</Text>
              </View>
            </View>
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Target</Text>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>{meeting?.totalInvited ?? '—'}</Text>
                <Text style={styles.metricUnit}>ASN</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Partisipasi Kehadiran</Text>
              <Text style={styles.progressValue}>
                {agendaAttendancePage?.summary?.participation_rate_label ?? 'Rasio belum tersedia'}
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.max(0, Math.min(100, agendaAttendancePage?.summary?.participation_rate ?? 0))}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContainer}
          >
            <Pressable
              onPress={() => {
                if (activeTab !== 'verified') {
                  setActiveTab('verified');
                  setAttendancePage(1);
                }
              }}
              style={[styles.tabBtn, activeTab === 'verified' && styles.tabBtnActive]}
              accessibilityRole="tab"
              accessibilityLabel="Tab Tercatat"
            >
              <Text style={[styles.tabBtnText, activeTab === 'verified' && styles.tabBtnTextActive]}>
                Tercatat
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  activeTab === 'verified' ? styles.tabBadgePrimary : styles.tabBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === 'verified' ? styles.tabBadgeTextOnDark : styles.tabBadgeTextInactive,
                  ]}
                >
                  {agendaAttendancePage?.summary.total_attended ?? '—'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                if (activeTab !== 'unverified') {
                  setActiveTab('unverified');
                  setAttendancePage(1);
                }
              }}
              style={[styles.tabBtn, activeTab === 'unverified' && styles.tabBtnActive]}
              accessibilityRole="tab"
              accessibilityLabel="Tab Belum Hadir"
            >
              <Text
                style={[styles.tabBtnText, activeTab === 'unverified' && styles.tabBtnTextActive]}
              >
                Belum Hadir
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  activeTab === 'unverified' ? styles.tabBadgeDanger : styles.tabBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === 'unverified'
                      ? styles.tabBadgeTextOnDark
                      : styles.tabBadgeTextInactive,
                  ]}
                >
                  {agendaAttendancePage?.summary.unattended_count ?? '—'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                if (activeTab !== 'minutes') {
                  setActiveTab('minutes');
                  setAttendancePage(1);
                }
              }}
              style={[styles.tabBtn, activeTab === 'minutes' && styles.tabBtnActive]}
              accessibilityRole="tab"
              accessibilityLabel="Tab Notulensi dan Dokumentasi"
            >
              <Text style={[styles.tabBtnText, activeTab === 'minutes' && styles.tabBtnTextActive]}>
                Notulensi & Foto
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* ATTENDANCE TAB CONTENT */}
        {activeTab !== 'minutes' ? (
          <View style={styles.filterSection}>
            <View style={styles.searchBox}>
              <Search size={18} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama atau NIP pegawai..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setAttendancePage(1);
                }}
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pokjaChipsRow}
            >
              {[
                'Semua Unit',
                ...Array.from(
                  new Set(agendaAttendances.map((record) => record.asnUnitKerja).filter(Boolean)),
                ),
              ].map((chip) => {
                const active = selectedPokja === chip;
                return (
                  <Pressable
                    key={chip}
                    onPress={() => {
                      setSelectedPokja(chip);
                      setAttendancePage(1);
                    }}
                    style={({ pressed }) => [
                      styles.pokjaChip,
                      active ? styles.pokjaChipActive : styles.pokjaChipInactive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pokjaChipText,
                        active && styles.pokjaChipTextActive,
                      ]}
                    >
                      {chip}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.participantFeed}>
              {error ? (
                <Text style={styles.pRole}>{error}</Text>
              ) : filteredList.length === 0 ? (
                <Text style={styles.pRole}>
                  {isLoading
                    ? 'Memuat kehadiran...'
                    : activeTab === 'unverified'
                      ? 'Semua undangan sudah presensi atau tidak ada data.'
                      : 'Belum ada data kehadiran.'}
                </Text>
              ) : (
                filteredList.map((p, idx) => (
                  <View key={`${p.nip}-${idx}`} style={styles.participantCard}>
                    <View style={styles.pAvatar}>
                      {p.isOnline ? (
                        <Video size={18} color={colors.primary} strokeWidth={2} />
                      ) : (
                        <User size={18} color={colors.primary} strokeWidth={2} />
                      )}
                    </View>
                    <View style={styles.flexOne}>
                      <View style={styles.pTopRow}>
                        <View style={styles.flexOne}>
                          <Text style={styles.pName}>{p.name}</Text>
                          <Text style={styles.pRole}>{p.role}</Text>
                        </View>
                        <View
                          style={[
                            styles.pStatusBadge,
                            p.status === 'belum_hadir'
                              ? styles.pStatusBadgeWait
                              : styles.pStatusBadgeValid,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pStatusText,
                              p.status === 'belum_hadir'
                                ? styles.pStatusTextWait
                                : styles.pStatusTextValid,
                            ]}
                          >
                            {p.status === 'belum_hadir' ? 'Belum Hadir' : 'Tercatat'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.pMetaRow}>
                        <Text style={styles.pMetaText}>
                          NIP: <Text style={styles.pMetaValueMono}>{p.nip || '-'}</Text>
                        </Text>
                        <Text style={styles.pMetaDot}>•</Text>
                        <Text style={styles.pMetaText} numberOfLines={1}>
                          {p.location}
                        </Text>
                        {activeTab === 'verified' ? (
                          <>
                            <Text style={styles.pMetaDot}>•</Text>
                            <Text style={styles.pMetaText}>{p.time}</Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))
              )}

              {agendaAttendancePage && agendaAttendancePage.total > 0 ? (
                <PaginationBar
                  currentPage={agendaAttendancePage.currentPage}
                  lastPage={agendaAttendancePage.lastPage}
                  total={agendaAttendancePage.total}
                  label={activeTab === 'unverified' ? 'belum hadir' : 'peserta'}
                  isLoading={isLoading}
                  onPageChange={handlePageChange}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {/* MINUTES & DOCUMENTATION TAB */}
        {activeTab === 'minutes' ? (
          <View style={styles.minutesSectionContainer}>
            {isAppointedNotulis || isAppointedLeader ? (
              <View style={styles.roleBannerContainer}>
                <View
                  style={[
                    styles.roleBannerIconBox,
                    isAppointedNotulis ? styles.roleBannerNotulisIcon : styles.roleBannerLeaderIcon,
                  ]}
                >
                  {isAppointedNotulis ? (
                    <NotebookPen size={18} color={colors.primary} strokeWidth={2} />
                  ) : (
                    <Scale size={18} color={colors.onWarningContainer} strokeWidth={2} />
                  )}
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.roleBannerTitle}>
                    {isAppointedNotulis
                      ? 'Penugasan: Notulis Rapat Resmi'
                      : 'Penugasan: Pimpinan Rapat'}
                  </Text>
                  <Text style={styles.roleBannerSubtitle}>
                    Anda memiliki wewenang menyusun Notulensi, Kesimpulan (RTL), dan Dokumentasi Foto rapat ini.
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.minutesSectionHeader}>
              <View style={styles.flexOne}>
                <Text style={styles.panelTitle}>Risalah & Dokumen Rapat</Text>
                <Text style={styles.panelSubtitle}>
                  {meeting ? `Kode Agenda: ${meeting.code}` : 'Dokumentasi resmi agenda'}
                </Text>
              </View>
              {userCanManageMinutes ? (
                isEditingMinutes ? (
                  <Pressable
                    onPress={() => setIsEditingMinutes(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Batal mengubah risalah rapat"
                    style={({ pressed }) => [styles.minutesHeaderBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.minutesHeaderCancelText}>Batal</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleEditMinutes}
                    accessibilityRole="button"
                    accessibilityLabel="Ubah risalah rapat"
                    style={({ pressed }) => [styles.minutesHeaderBtn, pressed && styles.pressed]}
                  >
                    <Pencil size={15} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.minutesHeaderEditText}>Ubah Risalah</Text>
                  </Pressable>
                )
              ) : null}
            </View>

            {/* NOTULENSI CARD */}
            <View style={styles.panelCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.iconCircle}>
                  <NotebookPen size={18} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.panelTitle}>Notulensi Jalannya Rapat</Text>
                  <Text style={styles.panelSubtitle}>
                    Catatan dinas pembahasan agenda, dinamika, dan masukan peserta
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              {isEditingMinutes ? (
                <TextInput
                  multiline
                  textAlignVertical="top"
                  value={minutesDraft}
                  onChangeText={setMinutesDraft}
                  editable={!isSavingMinutes}
                  placeholder="Tuliskan jalannya rapat dan dinamika pembahasan secara lengkap..."
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Isi notulensi jalannya rapat"
                  style={styles.minutesInput}
                />
              ) : meeting?.minutesHtml && plainText(meeting.minutesHtml).length > 0 ? (
                <SimpleHtmlView html={meeting.minutesHtml} />
              ) : (
                <View style={styles.emptyInfoRow}>
                  <Info size={18} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.emptyItalicText}>
                    Belum ada catatan jalannya rapat yang didokumentasikan.
                  </Text>
                </View>
              )}
            </View>

            {/* KESIMPULAN CARD */}
            <View style={styles.panelCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
                  <CheckCircle2 size={18} color={colors.success} strokeWidth={2} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.panelTitle}>Kesimpulan & Tindak Lanjut</Text>
                  <Text style={styles.panelSubtitle}>
                    Poin kesepakatan, arahan pimpinan rapat, PIC, dan tenggat waktu
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              {isEditingMinutes ? (
                <TextInput
                  multiline
                  textAlignVertical="top"
                  value={conclusionDraft}
                  onChangeText={setConclusionDraft}
                  editable={!isSavingMinutes}
                  placeholder="Tuliskan poin kesimpulan, arahan pimpinan, PIC, dan tenggat waktu..."
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Isi kesimpulan dan rencana tindak lanjut"
                  style={styles.minutesInput}
                />
              ) : meeting?.summaryHtml && plainText(meeting.summaryHtml).length > 0 ? (
                <SimpleHtmlView html={meeting.summaryHtml} />
              ) : (
                <View style={styles.emptyInfoRow}>
                  <Info size={18} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.emptyItalicText}>
                    Belum ada kesimpulan & tindak lanjut yang didokumentasikan.
                  </Text>
                </View>
              )}
            </View>

            {isEditingMinutes ? (
              <View style={styles.minutesActionRow}>
                <Button
                  title="Batal"
                  variant="outline"
                  size="md"
                  onPress={() => setIsEditingMinutes(false)}
                  disabled={isSavingMinutes}
                  style={styles.flexOne}
                />
                <Button
                  title={isSavingMinutes ? 'Menyimpan...' : 'Simpan Risalah'}
                  variant="primary"
                  size="md"
                  onPress={() => void handleSaveMinutes()}
                  disabled={isSavingMinutes || !meeting}
                  isLoading={isSavingMinutes}
                  icon={<CheckCircle2 size={18} color={colors.onPrimary} strokeWidth={2} />}
                  style={styles.flexTwo}
                />
              </View>
            ) : null}

            {/* DOKUMENTASI FOTO RAPAT */}
            <View style={styles.panelCard}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.iconCircle}>
                  <Camera size={18} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.panelTitle}>Dokumentasi Foto ({docs.length})</Text>
                  <Text style={styles.panelSubtitle}>Bukti visual pelaksanaan rapat kedinasan</Text>
                </View>
                {userCanManageMinutes ? (
                  <Pressable
                    onPress={() => void handleUploadDocumentationPhoto()}
                    disabled={isUploadingPhoto}
                    style={({ pressed }) => [styles.minutesHeaderBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Unggah foto dokumentasi rapat"
                  >
                    <Plus size={15} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.minutesHeaderEditText}>
                      {isUploadingPhoto ? 'Mengunggah...' : 'Unggah Foto'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.divider} />
              {docs.length > 0 ? (
                <View style={styles.docsGrid}>
                  {docs.map((doc) => (
                    <Pressable
                      key={String(doc.id)}
                      onPress={() => setZoomDoc(doc)}
                      style={({ pressed }) => [styles.docCard, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Pratinjau ${doc.caption || 'Dokumentasi Rapat'}`}
                    >
                      <Image source={{ uri: doc.url }} style={styles.docThumb} resizeMode="cover" />
                      <Text style={styles.docCaption} numberOfLines={1}>
                        {doc.caption || 'Dokumentasi Rapat'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyInfoRow}>
                  <Info size={18} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.emptyItalicText}>
                    Belum ada foto dokumentasi yang diunggah untuk agenda ini.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* SECTION: SURAT EDARAN RAPAT */}
        <View style={styles.panelCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconCircle}>
              <Mail size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.panelTitle}>Surat Edaran Rapat</Text>
              <Text style={styles.panelSubtitle}>
                Dokumen kedinasan pemanggilan peserta dan agenda kerja
              </Text>
            </View>
          </View>

          {meeting?.invitationPdfUrl ? (
            <View style={styles.edaranContent}>
              <Pressable
                onPress={handlePreviewSuratEdaran}
                style={({ pressed }) => [styles.edaranDocPreview, pressed && styles.pressed]}
                accessibilityLabel="Lihat dokumen surat edaran rapat"
              >
                <View
                  style={[
                    styles.edaranPdfBadge,
                    meeting.suratEdaran?.is_image
                      ? styles.edaranBadgeInfo
                      : styles.edaranBadgePdf,
                  ]}
                >
                  {meeting.suratEdaran?.is_image ? (
                    <ImageIcon size={20} color={colors.primary} strokeWidth={2} />
                  ) : (
                    <FileText size={20} color={colors.error} strokeWidth={2} />
                  )}
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.edaranDocName} numberOfLines={1} ellipsizeMode="tail">
                    Surat-Edaran_{meeting.code || 'Agenda'}.
                    {meeting.suratEdaran?.extension ||
                      (meeting.suratEdaran?.is_image ? 'jpg' : 'pdf')}
                  </Text>
                  <Text style={styles.edaranDocMeta}>
                    Dokumen Resmi LLDIKTI Wilayah X • Ketuk untuk melihat
                  </Text>
                </View>
                <View style={styles.edaranStatusBadge}>
                  <Text style={styles.edaranStatusText}>Tersedia</Text>
                </View>
              </Pressable>

              <View style={styles.edaranBtnGroup}>
                <Button
                  title="Lihat Surat Edaran"
                  onPress={handlePreviewSuratEdaran}
                  variant="primary"
                  size="md"
                  fullWidth
                  icon={<Eye size={18} color={colors.onPrimary} strokeWidth={2} />}
                />
                {userCanManageSuratEdaran ? (
                  <Button
                    title="Ganti Berkas Surat Edaran"
                    onPress={() => void handlePickSuratEdaran()}
                    disabled={isUploadingEdaran}
                    variant="outline"
                    size="md"
                    fullWidth
                    icon={<CloudUpload size={18} color={colors.primary} strokeWidth={2} />}
                  />
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.edaranContent}>
              <View style={styles.edaranEmptyBox}>
                <Info size={20} color={colors.textMuted} strokeWidth={2} />
                <View style={styles.flexOne}>
                  <Text style={styles.edaranEmptyTitle}>Berkas Belum Dilampirkan</Text>
                  <Text style={styles.edaranEmptySub}>
                    {userCanManageSuratEdaran
                      ? 'Unggah berkas surat edaran resmi (PDF atau gambar).'
                      : 'Sekretariat LLDIKTI X belum mengunggah dokumen surat edaran.'}
                  </Text>
                </View>
              </View>
              {userCanManageSuratEdaran ? (
                <Button
                  title="Unggah Surat Edaran (PDF/Gambar)"
                  onPress={() => void handlePickSuratEdaran()}
                  disabled={isUploadingEdaran}
                  variant="primary"
                  size="md"
                  fullWidth
                  icon={<CloudUpload size={18} color={colors.onPrimary} strokeWidth={2} />}
                />
              ) : null}
            </View>
          )}
        </View>

        {/* SECTION: EKSPOR DOKUMEN RAPAT */}
        <View style={styles.panelCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconCircle}>
              <Download size={18} color={colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.flexOne}>
              <Text style={styles.panelTitle}>Ekspor Dokumen Rapat</Text>
              <Text style={styles.panelSubtitle}>
                Unduh berita acara dan berkas rekapitulasi resmi
              </Text>
            </View>
          </View>

          <View style={styles.baActionGrid}>
            <Button
              title="Unduh Berita Acara (PDF)"
              onPress={() => void handleExport('pdf')}
              disabled={Boolean(exporting)}
              isLoading={exporting === 'pdf'}
              variant="primary"
              size="md"
              fullWidth
              icon={<FileText size={18} color={colors.onPrimary} strokeWidth={2} />}
            />
            <Button
              title="Unduh Risalah Sidang (DOCX)"
              onPress={() => void handleExport('word')}
              disabled={Boolean(exporting)}
              isLoading={exporting === 'word'}
              variant="outline"
              size="md"
              fullWidth
              icon={<FileText size={18} color={colors.primary} strokeWidth={2} />}
            />
            <Pressable
              onPress={() => void handleExport('csv')}
              style={({ pressed }) => [styles.excelBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Unduh Tabulasi Kehadiran Excel"
            >
              <FileSpreadsheet size={16} color={colors.primary} strokeWidth={2} />
              <Text style={styles.excelBtnText}>Unduh Tabulasi Kehadiran (Excel)</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

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
        canManage={userCanManageSuratEdaran}
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

      {/* MODAL 3: Tugaskan Peran (Pimpinan & Notulis) */}
      <Modal
        visible={isRolesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRolesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rolesModalCard}>
            <View style={styles.rolesModalHeader}>
              <Text style={styles.panelTitle}>Tugaskan Pemimpin & Notulis</Text>
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
              <Text style={styles.roleFieldLabel}>Pemimpin Rapat</Text>
              <Pressable
                onPress={() => setRolePickerTarget('leader')}
                style={({ pressed }) => [styles.roleSelectorBtn, pressed && styles.pressed]}
              >
                <User size={16} color={colors.primary} strokeWidth={2} />
                <Text style={styles.roleSelectorText} numberOfLines={1}>
                  {selectedLeaderLabel}
                </Text>
              </Pressable>

              <Text style={[styles.roleFieldLabel, styles.roleFieldGap]}>Notulis Rapat</Text>
              <Pressable
                onPress={() => setRolePickerTarget('notulis')}
                style={({ pressed }) => [styles.roleSelectorBtn, pressed && styles.pressed]}
              >
                <NotebookPen size={16} color={colors.primary} strokeWidth={2} />
                <Text style={styles.roleSelectorText} numberOfLines={1}>
                  {selectedNotulisLabel}
                </Text>
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

      {/* MODAL 4: Documentation Zoom */}
      <Modal
        visible={Boolean(zoomDoc)}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomDoc(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rolesModalCard}>
            <View style={styles.rolesModalHeader}>
              <Text style={styles.panelTitle} numberOfLines={1}>
                {zoomDoc?.caption || 'Dokumentasi Rapat'}
              </Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flexOne: { flex: 1, minWidth: 0 },
  flexTwo: { flex: 2, minWidth: 0 },
  pressed: { opacity: 0.78 },

  heroBanner: {
    backgroundColor: colors.primaryDarkest,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryContainer,
    gap: spacing.xs + 2,
  },
  heroTopBar: {
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
  heroCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  heroCode: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    color: colors.borderStrong,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
  },
  capacityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  capacityPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onPrimary,
  },
  heroTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 17,
    lineHeight: 23,
    color: colors.onPrimary,
  },
  heroMetaGrid: { gap: 4 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  heroMetaText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.borderStrong,
    flex: 1,
  },
  heroPeopleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 2 },
  heroPersonItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  heroPersonText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.borderStrong,
  },
  heroPersonBold: { fontFamily: fontFamilies.sansBold, color: colors.onPrimary },

  scrollContent: { padding: spacing.md, gap: spacing.md },

  managementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  actionBtnNeutral: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexGrow: 1,
  },
  actionBtnNeutralText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },
  actionBtnDanger: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    flexGrow: 1,
  },
  actionBtnDangerText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.error,
  },

  zoomCard: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  zoomLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  zoomIconBox: {
    width: 38,
    height: 38,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomTitle: {
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

  panelCard: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: spacing.sm,
  },
  panelTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  panelSubtitle: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
    marginTop: 1,
  },

  metricsGrid: { flexDirection: 'row', gap: spacing.sm },
  metricCol: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: rounded.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  metricLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
    marginBottom: 4,
  },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  metricValue: {
    ...typography.headlineLg,
    fontFamily: fontFamilies.sansBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  metricValueSuccess: { color: colors.success },
  metricValueError: { color: colors.error },
  metricUnit: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  progressSection: { gap: 4 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  progressValue: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    color: colors.onSurface,
  },
  progressBarBg: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainer,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },

  tabBarWrapper: { borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  tabScrollContainer: { flexDirection: 'row', gap: spacing.xs + 2 },
  tabBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 4,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: colors.primary },
  tabBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgePrimary: { backgroundColor: colors.primary },
  tabBadgeDanger: { backgroundColor: colors.error },
  tabBadgeInactive: { backgroundColor: colors.surfaceContainer },
  tabBadgeText: { ...typography.labelSm, fontFamily: fontFamilies.sansBold, fontSize: 10 },
  tabBadgeTextOnDark: { color: colors.onPrimary },
  tabBadgeTextInactive: { color: colors.textMuted },

  filterSection: { gap: spacing.sm },
  searchBox: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.onSurface,
    paddingVertical: spacing.xs + 2,
  },
  pokjaChipsRow: { flexDirection: 'row', gap: spacing.xs + 2 },
  pokjaChip: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: rounded.full,
    borderWidth: 1,
  },
  pokjaChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pokjaChipInactive: { backgroundColor: colors.surfaceCard, borderColor: colors.borderStrong },
  pokjaChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
  },
  pokjaChipTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },

  participantFeed: { gap: spacing.xs + 2 },
  participantCard: {
    ...cardSurface,
    borderRadius: rounded.lg,
    borderColor: colors.borderStrong,
    padding: spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  pAvatar: {
    width: 38,
    height: 38,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  pName: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  pRole: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  pStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm,
    borderWidth: 1,
  },
  pStatusBadgeValid: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  pStatusBadgeWait: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.errorBorder,
  },
  pStatusText: { ...typography.labelSm, fontFamily: fontFamilies.sansBold, fontSize: 10 },
  pStatusTextValid: { color: colors.onSuccessContainer },
  pStatusTextWait: { color: colors.onErrorContainer },
  pMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  pMetaText: { ...typography.bodySm, fontFamily: fontFamilies.sansRegular, fontSize: 11, color: colors.textMuted },
  pMetaValueMono: { ...typography.labelMono, fontFamily: fontFamilies.monoSemiBold, fontSize: 10.5, color: colors.onSurface },
  pMetaDot: { ...typography.labelSm, color: colors.borderStrong },

  minutesSectionContainer: { gap: spacing.sm },
  roleBannerContainer: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.infoBorder,
    backgroundColor: colors.infoBg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  roleBannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBannerNotulisIcon: { backgroundColor: colors.surfaceCard },
  roleBannerLeaderIcon: { backgroundColor: colors.warningContainer },
  roleBannerTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  roleBannerSubtitle: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  minutesSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  minutesHeaderBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  minutesHeaderEditText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  minutesHeaderCancelText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textMuted,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSuccess: { backgroundColor: colors.successContainer },
  divider: { height: 1, backgroundColor: colors.borderSubtle },
  minutesInput: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    minHeight: 110,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    padding: spacing.md,
    color: colors.onSurface,
    backgroundColor: colors.background,
  },
  emptyInfoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  emptyItalicText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
    flex: 1,
  },
  minutesActionRow: { flexDirection: 'row', gap: spacing.sm },

  docsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  docCard: {
    width: '48.5%',
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  docThumb: { width: '100%', height: 100, backgroundColor: colors.surfaceContainer },
  docCaption: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
    padding: spacing.xs + 2,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },

  edaranContent: { gap: spacing.sm },
  edaranDocPreview: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  edaranPdfBadge: {
    width: 38,
    height: 38,
    borderRadius: rounded.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  edaranBadgeInfo: { backgroundColor: colors.infoBg },
  edaranBadgePdf: { backgroundColor: colors.errorContainer },
  edaranDocName: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  edaranDocMeta: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  edaranStatusBadge: {
    backgroundColor: colors.successContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  edaranStatusText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSuccessContainer,
  },
  edaranBtnGroup: { gap: spacing.xs + 2 },
  edaranEmptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    padding: spacing.sm + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
  },
  edaranEmptyTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  edaranEmptySub: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
    marginTop: 2,
  },

  baActionGrid: { gap: spacing.xs + 2 },
  excelBtn: {
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
  excelBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.scrimNeutralTop,
    justifyContent: 'center',
    padding: spacing.md,
  },
  rolesModalCard: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  rolesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  rolesModalBody: { padding: spacing.md },
  roleFieldLabel: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    marginBottom: 6,
  },
  roleFieldGap: { marginTop: spacing.md },
  roleSelectorBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  roleSelectorText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onSurface,
    flex: 1,
  },
  rolesModalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
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
});
