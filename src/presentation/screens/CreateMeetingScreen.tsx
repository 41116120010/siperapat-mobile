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
import {
  BarChart3,
  Building,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  DoorOpen,
  Eye,
  FilePenLine,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Landmark,
  LucideIcon,
  Network,
  NotebookPen,
  Pencil,
  RefreshCw,
  Save,
  Scale,
  Search,
  Square,
  Tag,
  Trash2,
  Upload,
  User,
  Users,
  Video,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { resolveFileMimeType, UploadFileRef } from '../../data/datasources/agendaApi';
import { toIsoDateTime } from '../../data/mappers/apiMappers';
import { MeetingType } from '../../domain/entities/types';
import { Header } from '../components/common/Header';
import { AutoScrollText } from '../components/common/AutoScrollText';
import { PaginationBar } from '../components/common/PaginationBar';
import { TutWuriLoader } from '../components/common/TutWuriLoader';
import {
  validateWibSchedule,
  WibScheduleSection,
} from '../components/forms/WibScheduleSection';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { CalendarDatePickerModal, getJakartaDateKey } from '../components/modals/CalendarDatePickerModal';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { useMeetingStore } from '../store/useMeetingStore';

interface CreateMeetingScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

type ActiveModalType =
  | 'none'
  | 'classification'
  | 'leader'
  | 'notulis'
  | 'date'
  | 'venue';

const UNITS_PAGE_SIZE = 6;
const USERS_PAGE_SIZE = 6;

const CLASSIFICATION_OPTIONS: AgendaOption[] = [
  {
    id: 'koordinasi',
    title: 'Rapat Koordinasi (Rakor Antar-Unit)',
    subtitle: 'Penyelarasan program kerja lintas kelompok kerja dan bagian',
    badge: 'Rutin',
    icon: RefreshCw,
  },
  {
    id: 'pleno',
    title: 'Rapat Pleno Pimpinan LLDIKTI X',
    subtitle: 'Sidang pleno pejabat struktural dan ketua tim kerja',
    badge: 'Pimpinan',
    icon: Landmark,
  },
  {
    id: 'evaluasi',
    title: 'Rapat Evaluasi Kinerja & Anggaran',
    subtitle: 'Tinjauan capaian kinerja triwulanan dan serapan anggaran DIPA',
    badge: 'Prioritas',
    icon: BarChart3,
  },
  {
    id: 'bimtek',
    title: 'Sosialisasi & Bimbingan Teknis PTS',
    subtitle: 'Pembinaan kelembagaan dan peningkatan mutu perguruan tinggi',
    badge: 'Eksternal',
    icon: GraduationCap,
  },
  {
    id: 'disiplin',
    title: 'Sidang Penegakan Disiplin Pegawai ASN',
    subtitle: 'Majelis kode etik dan pembinaan aparatur sipil negara',
    badge: 'Internal',
    icon: Scale,
  },
];

const VENUE_OPTIONS: AgendaOption[] = [
  {
    id: 'utama',
    title: 'Ruang Sidang Utama Gedung A',
    subtitle: 'Kapasitas 80 Orang • Sound System & Video Wall • AC Central',
    badge: 'Kapasitas 80',
    icon: DoorOpen,
  },
  {
    id: 'pimpinan',
    title: 'Ruang Rapat Pimpinan Lt. 2',
    subtitle: 'Kapasitas 25 Orang • Smart Screen Interactive',
    badge: 'Kapasitas 25',
    icon: DoorOpen,
  },
  {
    id: 'pokja',
    title: 'Ruang Rapat Pokja Penjaminan Mutu',
    subtitle: 'Kapasitas 20 Orang • Gedung B Lantai 1',
    badge: 'Kapasitas 20',
    icon: DoorOpen,
  },
  {
    id: 'aula',
    title: 'Aula Ki Hadjar Dewantara',
    subtitle: 'Kapasitas 150 Orang • Khusus Pertemuan Pleno Besar',
    badge: 'Kapasitas 150',
    icon: Building,
  },
  {
    id: 'akademik',
    title: 'Ruang Rapat Akademik Gedung B',
    subtitle: 'Kapasitas 35 Orang • LCD Proyektor & Geofence Valid',
    badge: 'Kapasitas 35',
    icon: DoorOpen,
  },
];

export const CreateMeetingScreen: React.FC<CreateMeetingScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const isAdministrator = user?.role === 'administrator';
  const {
    createMeeting,
    isLoading,
    error,
    formOptions,
    fetchAgendaFormOptions,
    userCandidates,
    isUserCandidatesLoading,
    userCandidatesError,
    fetchUserCandidates,
  } = useMeetingStore();
  useEffect(() => {
    void fetchAgendaFormOptions();
  }, [fetchAgendaFormOptions]);
  useEffect(() => {
    if (error) useFeedbackStore.getState().showToast({ type: 'error', message: error });
  }, [error]);

  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState('koordinasi');
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
  const [isUntilFinished, setIsUntilFinished] = useState(false);
  const [venue, setVenue] = useState('Pilih ruang rapat');
  const [venueId, setVenueId] = useState('');
  const [customClassification, setCustomClassification] = useState('');
  const [customVenue, setCustomVenue] = useState('');
  const [zoomUrl, setZoomUrl] = useState('');
  const [meetingIdInput] = useState('');
  const [passcode] = useState('');

  const [targetType, setTargetType] = useState<'all_units' | 'selected_units' | 'selected_users'>(
    isAdministrator ? 'all_units' : 'selected_units'
  );
  const [selectedUnits, setSelectedUnits] = useState<number[]>(
    !isAdministrator && user?.unitId ? [user.unitId] : []
  );
  const [unitPage, setUnitPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [suratEdaranType, setSuratEdaranType] = useState<'upload' | 'digital'>('upload');
  const [attachedFile, setAttachedFile] = useState<(UploadFileRef & { size: number }) | null>(null);
  const [isViewerModalVisible, setIsViewerModalVisible] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState<'draft' | 'scheduled' | null>(null);

  const [activeModal, setActiveModal] = useState<ActiveModalType>('none');

  useEffect(() => {
    if (!isAdministrator) {
      setTargetType((prev) => (prev === 'all_units' ? 'selected_units' : prev));
      if (user?.unitId) {
        setSelectedUnits((prev) => (prev.length === 0 ? [user.unitId!] : prev));
      }
    }
  }, [isAdministrator, user?.unitId]);

  useEffect(() => {
    if (targetType === 'selected_users' && userCandidates.length === 0 && !isUserCandidatesLoading) {
      void fetchUserCandidates();
    }
  }, [targetType, userCandidates.length, isUserCandidatesLoading, fetchUserCandidates]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearchQuery]);

  const allUnits = useMemo(() => formOptions?.units ?? [], [formOptions?.units]);
  const unitTotalPages = Math.max(1, Math.ceil(allUnits.length / UNITS_PAGE_SIZE));
  const safeUnitPage = Math.min(Math.max(1, unitPage), unitTotalPages);
  const paginatedUnits = useMemo(() => {
    const start = (safeUnitPage - 1) * UNITS_PAGE_SIZE;
    return allUnits.slice(start, start + UNITS_PAGE_SIZE);
  }, [allUnits, safeUnitPage]);

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

  const userTotalPages = Math.max(1, Math.ceil(filteredCandidates.length / USERS_PAGE_SIZE));
  const safeUserPage = Math.min(Math.max(1, userPage), userTotalPages);
  const paginatedCandidates = useMemo(() => {
    const start = (safeUserPage - 1) * USERS_PAGE_SIZE;
    return filteredCandidates.slice(start, start + USERS_PAGE_SIZE);
  }, [filteredCandidates, safeUserPage]);

  const isLeaderInvited =
    targetType === 'selected_users' &&
    Boolean(leaderId) &&
    selectedUserIds.includes(Number(leaderId));
  const isNotulisInvited =
    targetType === 'selected_users' &&
    Boolean(notulisId) &&
    selectedUserIds.includes(Number(notulisId));

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

  const ClassificationIcon: LucideIcon =
    typeof selectedClassification.icon === 'function' ? selectedClassification.icon : Tag;

  const toggleUnit = (unitId: number) => {
    setSelectedUnits((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId],
    );
  };

  const toggleUserCandidate = (candidateId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId],
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
        message: 'Ukuran lampiran melebihi batas backend 5 MB.',
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

  const handleSubmit = async (targetStatus: 'draft' | 'scheduled') => {
    if (!title.trim()) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Harap isi perihal agenda rapat kedinasan.',
      });
      return;
    }
    if (!dateIso) {
      useFeedbackStore
        .getState()
        .showToast({ type: 'warning', message: 'Pilih tanggal rapat terlebih dahulu.' });
      return;
    }
    const scheduleCheck = validateWibSchedule({
      dateIso,
      startTime,
      endTime,
      isUntilFinished,
    });
    if (!scheduleCheck.valid) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: scheduleCheck.errorMessage || 'Periksa kembali jam mulai dan selesai WIB.',
      });
      return;
    }
    if (formatType !== 'online' && venueId === '') {
      useFeedbackStore
        .getState()
        .showToast({ type: 'warning', message: 'Pilih ruang rapat terlebih dahulu.' });
      return;
    }
    if (formatType !== 'offline' && !zoomUrl.trim()) {
      useFeedbackStore
        .getState()
        .showToast({ type: 'warning', message: 'Masukkan tautan rapat daring.' });
      return;
    }
    const effectiveUnitIds =
      targetType === 'selected_units'
        ? isAdministrator
          ? selectedUnits
          : selectedUnits.length > 0
            ? selectedUnits
            : user?.unitId
              ? [user.unitId]
              : []
        : [];
    if (targetType === 'selected_units' && effectiveUnitIds.length === 0) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Pilih minimal satu unit kerja untuk agenda terbatas.',
      });
      return;
    }
    if (targetType === 'selected_users' && selectedUserIds.length === 0) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Pilih minimal satu pegawai ASN yang diundang.',
      });
      return;
    }

    setSubmittingStatus(targetStatus);
    const created = await createMeeting(
      {
        judul_rapat: title.trim(),
        jenis_rapat: selectedClassification.title,
        tipe_rapat: formatType,
        lokasi_ruang: formatType === 'online' || venue === 'Pilih ruang rapat' ? null : venue,
        link_meeting: formatType === 'offline' ? null : zoomUrl || null,
        waktu_mulai: toIsoDateTime(dateIso, scheduleCheck.normalizedStart),
        waktu_selesai: scheduleCheck.normalizedEnd
          ? toIsoDateTime(dateIso, scheduleCheck.normalizedEnd)
          : null,
        pimpinan_id: leaderId ? Number(leaderId) : null,
        notulis_id: notulisId ? Number(notulisId) : null,
        target_type: targetType,
        is_all_units: targetType === 'all_units',
        unit_ids: effectiveUnitIds,
        user_ids: targetType === 'selected_users' ? selectedUserIds : [],
        surat_edaran_type: suratEdaranType,
        status: targetStatus,
      },
      suratEdaranType === 'upload' ? (attachedFile ?? undefined) : undefined,
    );
    setSubmittingStatus(null);

    if (created) {
      const isDraft = targetStatus === 'draft';
      useFeedbackStore.getState().showModal({
        type: 'success',
        title: isDraft ? 'Konsep Agenda Rapat Tersimpan' : 'Agenda Rapat Berhasil Diterbitkan',
        message: isDraft
          ? 'Agenda rapat berhasil disimpan sebagai draf/konsep di server.'
          : 'Agenda rapat berhasil dibuat dan diterbitkan ke server.',
        detail: {
          'Kode Rapat': created.code,
          Perihal: title,
          Format: formatType.toUpperCase(),
          Status: isDraft ? 'KONSEP / DRAF' : 'TERJADWAL',
        },
        confirmText: 'Kembali ke Agenda',
        onConfirm: onSuccess,
      });
    } else {
      const currentError = useMeetingStore.getState().error;
      useFeedbackStore.getState().showToast({
        type: 'error',
        message:
          currentError || 'Gagal menyimpan agenda rapat. Periksa kembali isian formulir.',
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
    prioritizeOptionIds?: Array<number | string>;
    prioritizeDefaultTab?: 'invited' | 'all';
    prioritizeTabLabel?: string;
    allTabLabel?: string;
    prioritizeBadgeLabel?: string;
  } => {
    const priorityProps =
      selectedUserIds.length > 0
        ? {
            prioritizeOptionIds: selectedUserIds,
            prioritizeDefaultTab:
              targetType === 'selected_users' ? ('invited' as const) : ('all' as const),
            prioritizeTabLabel: 'Peserta Terpilih',
            allTabLabel: 'Semua Pegawai',
            prioritizeBadgeLabel: 'Peserta',
          }
        : {};

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
          ...priorityProps,
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
          ...priorityProps,
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

  return (
    <View style={styles.container}>
      <Header
        title="Buat Agenda Rapat Baru"
        subtitle="Jadwalkan pertemuan kedinasan, tentukan sasaran unit kerja, dan lampirkan surat edaran"
        showBack
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: Informasi Utama Pertemuan */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Informasi Utama Pertemuan</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Judul / Perihal Pertemuan Rapat <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              value={title}
              onChangeText={setTitle}
              multiline
              numberOfLines={3}
              placeholder="Contoh: Rapat Koordinasi Evaluasi Beban Kerja Dosen (BKD)"
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
                <AutoScrollText style={styles.selectorValue}>
                  {selectedClassification.title}
                </AutoScrollText>
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

          <WibScheduleSection
            dateLabel={date}
            dateIso={dateIso}
            onPressDate={() => setActiveModal('date')}
            startTime={startTime}
            onChangeStartTime={setStartTime}
            endTime={endTime}
            onChangeEndTime={setEndTime}
            isUntilFinished={isUntilFinished}
            onToggleUntilFinished={(checked) => {
              setIsUntilFinished(checked);
              if (!checked && !endTime.trim()) {
                setEndTime('12:00');
              }
            }}
          />

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
                  <AutoScrollText style={styles.selectorValue}>
                    {venue}
                  </AutoScrollText>
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
                <View style={styles.virtualHeaderLeft}>
                  <Video size={16} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.virtualTitle}>Tautan Daring (Zoom / GMeet)</Text>
                </View>
                <View style={styles.virtualBadge}>
                  <Text style={styles.virtualBadgeText}>Video Conference</Text>
                </View>
              </View>

              <TextInput
                style={styles.virtualInput}
                value={zoomUrl}
                onChangeText={setZoomUrl}
                placeholder="https://zoom.us/j/... atau meet.google.com/..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              {meetingIdInput || passcode ? (
                <View style={styles.virtualMetaRow}>
                  <View style={styles.virtualMetaCol}>
                    <Text style={styles.virtualMetaLabel}>Meeting ID</Text>
                    <Text style={styles.virtualMetaValue}>{meetingIdInput}</Text>
                  </View>
                  <View style={styles.virtualMetaCol}>
                    <Text style={styles.virtualMetaLabel}>Passcode</Text>
                    <Text style={styles.virtualMetaValue}>{passcode}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* SECTION 2: Sasaran Peserta & Unit Kerja */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. Sasaran Peserta & Unit Kerja</Text>
          </View>

          {isAdministrator ? (
            <>
              <Pressable
                onPress={() => setTargetType('all_units')}
                style={[styles.radioCard, targetType === 'all_units' && styles.radioCardActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: targetType === 'all_units' }}
              >
                {targetType === 'all_units' ? (
                  <CircleDot size={20} color={colors.primary} strokeWidth={2} />
                ) : (
                  <Circle size={20} color={colors.textMuted} strokeWidth={2} />
                )}
                <View style={styles.radioTextWrap}>
                  <Text style={styles.radioTitle}>
                    Terbuka untuk Seluruh Unit Kerja (Pleno / Universal)
                  </Text>
                  <Text style={styles.radioSub}>
                    Seluruh pegawai dari semua bagian/Pokja LLDIKTI berhak mengikuti rapat.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setTargetType('selected_units')}
                style={[
                  styles.radioCard,
                  targetType === 'selected_units' && styles.radioCardActive,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: targetType === 'selected_units' }}
              >
                {targetType === 'selected_units' ? (
                  <CircleDot size={20} color={colors.primary} strokeWidth={2} />
                ) : (
                  <Circle size={20} color={colors.textMuted} strokeWidth={2} />
                )}
                <View style={styles.radioTextWrap}>
                  <Text style={styles.radioTitle}>Terbatas untuk Unit Kerja Tertentu</Text>
                  <Text style={styles.radioSub}>
                    Hanya pegawai dari unit kerja terpilih yang dapat mengisi presensi.
                  </Text>
                </View>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => setTargetType('selected_units')}
              style={[
                styles.radioCard,
                targetType === 'selected_units' && styles.radioCardActive,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: targetType === 'selected_units' }}
            >
              {targetType === 'selected_units' ? (
                <CircleDot size={20} color={colors.primary} strokeWidth={2} />
              ) : (
                <Circle size={20} color={colors.textMuted} strokeWidth={2} />
              )}
              <View style={styles.radioTextWrap}>
                <Text style={styles.radioTitle}>
                  Internal Unit Kerja: {user?.unitKerja || 'Unit Anda'}
                </Text>
                <Text style={styles.radioSub}>
                  Agenda ditujukan khusus untuk seluruh pegawai di lingkungan unit kerja Anda.
                </Text>
              </View>
            </Pressable>
          )}

          <Pressable
            onPress={() => setTargetType('selected_users')}
            style={[
              styles.radioCard,
              targetType === 'selected_users' && styles.radioCardActive,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: targetType === 'selected_users' }}
          >
            {targetType === 'selected_users' ? (
              <CircleDot size={20} color={colors.primary} strokeWidth={2} />
            ) : (
              <Circle size={20} color={colors.textMuted} strokeWidth={2} />
            )}
            <View style={styles.radioTextWrap}>
              <Text style={styles.radioTitle}>Khusus Pegawai ASN Tertentu</Text>
              <Text style={styles.radioSub}>
                Hanya pegawai ASN yang dipilih secara spesifik yang dapat melihat dan mengisi
                presensi rapat.
              </Text>
            </View>
          </Pressable>

          {targetType === 'all_units' ? (
            <View style={styles.universalNoticeBox}>
              <Users size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.universalNoticeText}>
                Seluruh pegawai aktif di lingkungan LLDIKTI Wilayah X otomatis terdaftar sebagai
                peserta agenda ini.
              </Text>
            </View>
          ) : null}

          {targetType === 'selected_units' && isAdministrator ? (
            <View style={styles.unitSelectSection}>
              <View style={styles.selectionHeaderRow}>
                <Text style={styles.unitSelectHeader}>
                  Pilih Unit Kerja ({selectedUnits.length} dipilih):
                </Text>
                <View style={styles.selectionQuickActions}>
                  <Pressable
                    onPress={() => setSelectedUnits(allUnits.map((u) => u.id))}
                    style={styles.quickLinkBtn}
                  >
                    <Text style={styles.quickLinkText}>Pilih Semua</Text>
                  </Pressable>
                  <Pressable onPress={() => setSelectedUnits([])} style={styles.quickLinkBtn}>
                    <Text style={styles.quickLinkMutedText}>Hapus Semua</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.chipsWrap}>
                {paginatedUnits.map((unit) => {
                  const selected = selectedUnits.includes(unit.id);
                  return (
                    <Pressable
                      key={unit.id}
                      onPress={() => toggleUnit(unit.id)}
                      style={[styles.unitChip, selected && styles.unitChipSelected]}
                    >
                      {selected ? (
                        <Check size={14} color={colors.onPrimary} strokeWidth={2.5} />
                      ) : null}
                      <AutoScrollText
                        style={[styles.unitChipText, selected && styles.unitChipTextSelected]}
                      >
                        {unit.kode_unit} — {unit.nama_unit}
                      </AutoScrollText>
                    </Pressable>
                  );
                })}
              </View>
              {allUnits.length > UNITS_PAGE_SIZE ? (
                <PaginationBar
                  currentPage={safeUnitPage}
                  lastPage={unitTotalPages}
                  total={allUnits.length}
                  label="unit kerja"
                  onPageChange={setUnitPage}
                  containerStyle={styles.inlinePaginationBar}
                />
              ) : null}
            </View>
          ) : null}

          {targetType === 'selected_units' && !isAdministrator ? (
            <View style={styles.universalNoticeBox}>
              <Building size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.universalNoticeText}>
                Sasaran dikunci ke unit kerja Anda ({user?.unitKerja || 'Unit Kerja Terkait'}).
              </Text>
            </View>
          ) : null}

          {targetType === 'selected_users' ? (
            <View style={styles.unitSelectSection}>
              <View style={styles.selectionHeaderRow}>
                <Text style={styles.unitSelectHeader}>
                  Pilih Pegawai ASN ({selectedUserIds.length} dipilih):
                </Text>
                <View style={styles.selectionQuickActions}>
                  <Pressable
                    onPress={() =>
                      setSelectedUserIds(
                        filteredCandidates
                          .map((u) => Number(u.id))
                          .filter((id) => Number.isFinite(id))
                      )
                    }
                    style={styles.quickLinkBtn}
                  >
                    <Text style={styles.quickLinkText}>Pilih Semua</Text>
                  </Pressable>
                  <Pressable onPress={() => setSelectedUserIds([])} style={styles.quickLinkBtn}>
                    <Text style={styles.quickLinkMutedText}>Hapus Semua</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.candidateSearchBox}>
                <Search size={15} color={colors.textMuted} strokeWidth={2} />
                <TextInput
                  value={userSearchQuery}
                  onChangeText={setUserSearchQuery}
                  placeholder="Cari nama, NIP, atau unit kerja ASN..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.candidateSearchInput}
                />
                {userSearchQuery.length > 0 ? (
                  <Pressable
                    onPress={() => setUserSearchQuery('')}
                    style={styles.candidateSearchClear}
                    accessibilityLabel="Bersihkan pencarian pegawai"
                  >
                    <X size={15} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>

              {isUserCandidatesLoading ? (
                <View style={styles.candidateStateBox}>
                  <TutWuriLoader size="md" />
                  <Text style={styles.candidateStateText}>Memuat daftar pegawai ASN...</Text>
                </View>
              ) : userCandidatesError ? (
                <View style={styles.candidateStateBox}>
                  <Text style={styles.candidateErrorText}>{userCandidatesError}</Text>
                  <Pressable onPress={() => void fetchUserCandidates()} style={styles.retryBtn}>
                    <Text style={styles.retryBtnText}>Muat Ulang</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.candidateListBox}>
                  <View style={styles.candidateListContent}>
                    {paginatedCandidates.map((candidate) => {
                      const numericId = Number(candidate.id);
                      const isChecked = selectedUserIds.includes(numericId);
                      return (
                        <Pressable
                          key={candidate.id}
                          onPress={() => toggleUserCandidate(numericId)}
                          style={[
                            styles.candidateRow,
                            isChecked && styles.candidateRowSelected,
                          ]}
                        >
                          {isChecked ? (
                            <CheckSquare size={18} color={colors.primary} strokeWidth={2} />
                          ) : (
                            <Square size={18} color={colors.textMuted} strokeWidth={2} />
                          )}
                          <View style={styles.candidateInfo}>
                            <AutoScrollText style={styles.candidateName}>
                              {candidate.name}
                            </AutoScrollText>
                            <AutoScrollText style={styles.candidateSub}>
                              {candidate.nip ? `NIP. ${candidate.nip}` : 'NIP tidak tersedia'}
                              {candidate.unit ? ` • ${candidate.unit}` : ''}
                            </AutoScrollText>
                          </View>
                        </Pressable>
                      );
                    })}
                    {filteredCandidates.length === 0 ? (
                      <Text style={styles.candidateEmptyText}>
                        Tidak ada pegawai ASN yang cocok dengan pencarian.
                      </Text>
                    ) : null}
                  </View>
                  {filteredCandidates.length > USERS_PAGE_SIZE ? (
                    <PaginationBar
                      currentPage={safeUserPage}
                      lastPage={userTotalPages}
                      total={filteredCandidates.length}
                      label="pegawai ASN"
                      onPageChange={setUserPage}
                      containerStyle={styles.inlinePaginationBar}
                    />
                  ) : null}
                </View>
              )}
            </View>
          ) : null}
        </View>

        {/* SECTION 3: Penugasan Pimpinan & Notulis Rapat */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>3. Penugasan Pimpinan & Notulis Rapat</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Penanggung Jawab / Pimpinan Rapat <Text style={styles.required}>*</Text>
            </Text>
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
                <View style={styles.entityNameRow}>
                  <AutoScrollText style={styles.entityName}>
                    {leaderName || 'Pilih Pimpinan Rapat'}
                  </AutoScrollText>
                  {isLeaderInvited ? (
                    <View style={styles.invitedRoleBadge}>
                      <Text style={styles.invitedRoleBadgeText}>Peserta Terpilih</Text>
                    </View>
                  ) : null}
                </View>
                <AutoScrollText style={styles.entitySub}>
                  {leaderRole || 'Pimpinan Rapat'} {leaderNip ? `• NIP. ${leaderNip}` : ''}
                </AutoScrollText>
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
                <View style={styles.entityNameRow}>
                  <AutoScrollText style={styles.entityName}>
                    {notulisName || 'Pilih Petugas Notulis'}
                  </AutoScrollText>
                  {isNotulisInvited ? (
                    <View style={styles.invitedRoleBadge}>
                      <Text style={styles.invitedRoleBadgeText}>Peserta Terpilih</Text>
                    </View>
                  ) : null}
                </View>
                <AutoScrollText style={styles.entitySub}>
                  Petugas Notulensi Sidang Kedinasan
                </AutoScrollText>
              </View>
              <View style={styles.actionPill}>
                <Text style={styles.actionPillText}>Pilih</Text>
                <ChevronRight size={15} color={colors.primary} strokeWidth={2} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* SECTION 4: Surat Undangan / Edaran Resmi */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>4. Surat Undangan / Edaran Resmi</Text>
          </View>

          <View style={styles.modeSegmentedRow}>
            <Pressable
              onPress={() => setSuratEdaranType('upload')}
              style={[
                styles.modeSegmentedBtn,
                suratEdaranType === 'upload' && styles.modeSegmentedBtnActive,
              ]}
            >
              <Upload
                size={15}
                color={suratEdaranType === 'upload' ? colors.onPrimary : colors.textSecondary}
                strokeWidth={2}
              />
              <AutoScrollText
                style={[
                  styles.modeSegmentedText,
                  suratEdaranType === 'upload' && styles.modeSegmentedTextActive,
                ]}
              >
                Unggah Berkas Fisik
              </AutoScrollText>
            </Pressable>
            <Pressable
              onPress={() => setSuratEdaranType('digital')}
              style={[
                styles.modeSegmentedBtn,
                suratEdaranType === 'digital' && styles.modeSegmentedBtnActive,
              ]}
            >
              <FilePenLine
                size={15}
                color={suratEdaranType === 'digital' ? colors.onPrimary : colors.textSecondary}
                strokeWidth={2}
              />
              <AutoScrollText
                style={[
                  styles.modeSegmentedText,
                  suratEdaranType === 'digital' && styles.modeSegmentedTextActive,
                ]}
              >
                Surat Digital
              </AutoScrollText>
            </Pressable>
          </View>

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
                  <Text style={styles.dropzoneTitle}>Unggah Surat Undangan / Nota Dinas</Text>
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
                      <AutoScrollText style={styles.attachedName}>
                        {attachedFile.name}
                      </AutoScrollText>
                      <Text style={styles.attachedMeta}>
                        {(attachedFile.size / (1024 * 1024)).toFixed(2)} MB •{' '}
                        {attachedFile.type.startsWith('image/') ? 'Format Gambar' : 'Dokumen PDF'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.attachedActions}>
                    <Pressable
                      onPress={() => setIsViewerModalVisible(true)}
                      style={styles.attachedActionBtn}
                      accessibilityLabel="Pratinjau lampiran"
                    >
                      <Eye size={18} color={colors.primary} strokeWidth={2} />
                    </Pressable>
                    <Pressable
                      onPress={() => setAttachedFile(null)}
                      style={styles.attachedActionBtn}
                      accessibilityLabel="Hapus lampiran"
                    >
                      <Trash2 size={18} color={colors.error} strokeWidth={2} />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.digitalNoticeCard}>
              <FilePenLine size={18} color={colors.primary} strokeWidth={2} />
              <View style={styles.digitalNoticeBody}>
                <View style={styles.digitalNoticeHeaderRow}>
                  <Text style={styles.digitalNoticeTitle}>
                    Naskah Surat Undangan Digital (Kop Resmi LLDIKTI X)
                  </Text>
                  <View style={styles.webOnlyBadge}>
                    <Text style={styles.webOnlyBadgeText}>Khusus Website (Naskah Digital)</Text>
                  </View>
                </View>
                <Text style={styles.digitalNoticeSub}>
                  Pembuatan, penyuntingan isi naskah surat undangan digital (kop resmi & penomoran
                  dinas), serta edit konfigurasi laporan atau agenda lanjutan hanya dapat dilakukan
                  melalui portal Website SIPERAPAT. Di aplikasi mobile Anda tetap dapat memilih mode
                  digital atau mengunggah berkas PDF/gambar fisik.
                </Text>
              </View>
            </View>
          )}
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
            onPress={() => void handleSubmit('draft')}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.draftButton,
              isLoading && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Save size={17} color={colors.textSecondary} strokeWidth={2} />
            <Text style={styles.draftButtonText}>
              {isLoading && submittingStatus === 'draft' ? 'Menyimpan...' : 'Simpan Konsep'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void handleSubmit('scheduled')}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.publishButton,
              isLoading && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <CheckCircle2 size={17} color={colors.onPrimary} strokeWidth={2} />
            <Text style={styles.publishButtonText}>
              {isLoading && submittingStatus === 'scheduled'
                ? 'Menyimpan...'
                : 'Simpan Agenda Rapat'}
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
        prioritizeOptionIds={modalConfig.prioritizeOptionIds}
        prioritizeDefaultTab={modalConfig.prioritizeDefaultTab}
        prioritizeTabLabel={modalConfig.prioritizeTabLabel}
        allTabLabel={modalConfig.allTabLabel}
        prioritizeBadgeLabel={modalConfig.prioritizeBadgeLabel}
        onSelect={handleSelectOption}
        onSelectCustom={handleSelectCustomOption}
      />

      <SuratEdaranViewerModal
        visible={isViewerModalVisible}
        onClose={() => setIsViewerModalVisible(false)}
        localFileUri={attachedFile?.uri}
        fileName={attachedFile?.name}
        fileSize={attachedFile?.size}
        mimeType={attachedFile?.type}
        meetingTitle={title.trim() || 'Pratinjau Agenda Baru'}
        meetingDate={date && startTime ? `${date} • ${startTime}` : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.xs + 2,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  fieldGroup: { gap: spacing.xs + 2 },
  label: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  required: { color: colors.error },
  textArea: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    minHeight: 84,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    padding: spacing.sm + 4,
    color: colors.onSurface,
    backgroundColor: colors.surfaceCard,
    textAlignVertical: 'top',
  },
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
  entityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  entityName: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13.5,
    color: colors.onSurface,
    flexShrink: 1,
  },
  invitedRoleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: rounded.full,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    flexShrink: 0,
  },
  invitedRoleBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    color: colors.infoText,
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

  virtualMeetingBox: {
    backgroundColor: colors.background,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.sm + 4,
    gap: spacing.sm,
  },
  virtualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  virtualHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  virtualTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  virtualBadge: {
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.sm,
  },
  virtualBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.infoText,
  },
  virtualInput: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 4,
    backgroundColor: colors.surfaceCard,
    ...typography.bodySm,
    fontFamily: fontFamilies.monoRegular,
    color: colors.onSurface,
  },
  virtualMetaRow: { flexDirection: 'row', gap: spacing.sm },
  virtualMetaCol: { flex: 1 },
  virtualMetaLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  virtualMetaValue: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
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
  universalNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 4,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  universalNoticeText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    flex: 1,
  },
  unitSelectSection: { gap: spacing.xs + 2 },
  unitSelectHeader: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  unitChip: {
    maxWidth: '100%',
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
  unitChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  unitChipTextSelected: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
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
  draftButton: {
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
  draftButtonText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.textSecondary,
  },
  publishButton: {
    flex: 1.5,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
  },
  publishButtonText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonPressed: { opacity: 0.82 },
  selectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  selectionQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quickLinkBtn: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  quickLinkText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.infoText,
  },
  quickLinkMutedText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textMuted,
  },
  candidateSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceCard,
  },
  candidateSearchInput: {
    ...typography.bodySm,
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    color: colors.onSurface,
  },
  candidateSearchClear: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candidateStateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  candidateStateText: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  candidateErrorText: {
    ...typography.bodySm,
    color: colors.error,
    flex: 1,
  },
  retryBtn: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
  },
  retryBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  candidateListBox: {
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  inlinePaginationBar: {
    marginTop: spacing.xs,
  },
  candidateListContent: {
    padding: spacing.xs + 2,
    gap: spacing.xs + 2,
  },
  candidateRow: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
  },
  candidateRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  candidateInfo: { flex: 1, minWidth: 0 },
  candidateName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  candidateSub: {
    ...typography.labelSm,
    color: colors.textMuted,
  },
  candidateEmptyText: {
    ...typography.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    padding: spacing.md,
  },
  modeSegmentedRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    padding: 4,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
  },
  modeSegmentedBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: rounded.md,
  },
  modeSegmentedBtnActive: {
    backgroundColor: colors.primary,
  },
  modeSegmentedText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.textSecondary,
    textAlign: 'center',
    flexShrink: 1,
  },
  modeSegmentedTextActive: {
    color: colors.onPrimary,
  },
  digitalNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    backgroundColor: colors.infoBg,
  },
  digitalNoticeBody: { flex: 1, gap: 6, minWidth: 0 },
  digitalNoticeHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  digitalNoticeTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.infoText,
    flexShrink: 1,
  },
  webOnlyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  webOnlyBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    color: colors.primary,
  },
  digitalNoticeSub: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
