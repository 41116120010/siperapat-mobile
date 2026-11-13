import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  ArrowLeft,
  BarChart3,
  Building,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Clock,
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
  Paperclip,
  Pencil,
  Radio,
  RefreshCw,
  Scale,
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
import { resolveFileMimeType, UploadFileRef } from '../../data/datasources/agendaApi';
import { toIsoDateTime } from '../../data/mappers/apiMappers';
import { Meeting, MeetingType } from '../../domain/entities/types';
import { Header } from '../components/common/Header';
import { ErrorState } from '../components/common/ErrorState';
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
import { useFeedbackStore } from '../store/useFeedbackStore';
import { useMeetingStore } from '../store/useMeetingStore';

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
  const {
    getMeetingById,
    updateMeeting,
    isLoading,
    formOptions,
    fetchAgendaFormOptions,
  } = useMeetingStore();

  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [meetingCode, setMeetingCode] = useState('');

  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState('koordinasi');
  const [customClassification, setCustomClassification] = useState('');
  const [status, setStatus] = useState<
    'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'draft'
  >('scheduled');
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
  const [scopeUniversal, setScopeUniversal] = useState(true);
  const [selectedUnits, setSelectedUnits] = useState<number[]>([]);

  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | null>(null);
  const [existingAttachmentMeta, setExistingAttachmentMeta] = useState<
    Meeting['suratEdaran'] | null
  >(null);
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
      const agenda = await getMeetingById(meetingId);
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
        const mappedStatus =
          agenda.rawStatus || (agenda.status === 'upcoming' ? 'scheduled' : agenda.status);
        setStatus(mappedStatus as typeof status);

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
        setScopeUniversal(agenda.isAllUnits ?? true);
        setSelectedUnits(agenda.unitIds || []);
        setExistingAttachmentUrl(agenda.invitationPdfUrl || null);
        setExistingAttachmentMeta(agenda.suratEdaran || null);
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
    setSelectedUnits((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId],
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
    if (!scopeUniversal && selectedUnits.length === 0) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Pilih minimal satu unit kerja untuk agenda terbatas.',
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
        is_all_units: scopeUniversal,
        unit_ids: scopeUniversal ? [] : selectedUnits,
      },
      attachedFile ?? undefined,
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
          title="Ubah Agenda Rapat"
          subtitle="Administrasi & Presensi LLDIKTI X"
          showBack
          onBack={onBack}
        />
        <View style={styles.centerStateContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          title="Ubah Agenda Rapat"
          subtitle="Administrasi & Presensi LLDIKTI X"
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
        title="Ubah Agenda Rapat"
        subtitle={meetingCode ? `Kode: ${meetingCode}` : 'Administrasi & Presensi LLDIKTI X'}
        showBack
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: Status & Informasi Rapat */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <FileText size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Status & Informasi Agenda</Text>
            </View>
            <View style={styles.codePill}>
              <Text style={styles.codePillText}>{meetingCode}</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Perihal / Judul Agenda Rapat <Text style={styles.required}>*</Text>
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
              Status Penyelenggaraan Rapat <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusScroll}
            >
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = status === opt.id;
                const meta = getStatusMeta(opt.id);
                const StatusIcon = meta.icon;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setStatus(opt.id)}
                    style={({ pressed }) => [
                      styles.statusPill,
                      isSelected && styles.statusPillActive,
                      pressed && styles.pressedState,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <StatusIcon
                      size={15}
                      color={isSelected ? colors.onPrimary : meta.tint}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        isSelected && styles.statusPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Klasifikasi / Jenis Rapat <Text style={styles.required}>*</Text>
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
              Format Penyelenggaraan Rapat <Text style={styles.required}>*</Text>
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
                  Hybrid
                </Text>
              </Pressable>
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

        {/* SECTION 2: Waktu & Tempat */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <Clock size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Waktu & Tempat Pelaksanaan</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Tanggal Rapat <Text style={styles.required}>*</Text>
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
                Ruang Rapat / Lokasi <Text style={styles.required}>*</Text>
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
                <Text style={styles.virtualTitle}>Tautan Pertemuan Virtual</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={zoomUrl}
                onChangeText={setZoomUrl}
                placeholder="https://lldikti10.kemdikbud.go.id/zoom/..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>
          ) : null}
        </View>

        {/* SECTION 3: Sasaran Peserta & Unit Kerja */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <Users size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Sasaran Peserta & Unit Kerja</Text>
            </View>
          </View>

          <Pressable
            onPress={() => setScopeUniversal(true)}
            style={[styles.radioCard, scopeUniversal && styles.radioCardActive]}
          >
            {scopeUniversal ? (
              <CircleDot size={20} color={colors.primary} strokeWidth={2} />
            ) : (
              <Circle size={20} color={colors.textMuted} strokeWidth={2} />
            )}
            <View style={styles.radioTextWrap}>
              <Text style={styles.radioTitle}>Seluruh Pegawai LLDIKTI X</Text>
              <Text style={styles.radioSub}>
                Semua pegawai ASN pada 11 unit kerja berhak dan tercatat dalam daftar kehadiran.
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setScopeUniversal(false)}
            style={[styles.radioCard, !scopeUniversal && styles.radioCardActive]}
          >
            {!scopeUniversal ? (
              <CircleDot size={20} color={colors.primary} strokeWidth={2} />
            ) : (
              <Circle size={20} color={colors.textMuted} strokeWidth={2} />
            )}
            <View style={styles.radioTextWrap}>
              <Text style={styles.radioTitle}>Unit Kerja Tertentu</Text>
              <Text style={styles.radioSub}>
                Pilih bagian atau kelompok kerja yang diundang secara spesifik.
              </Text>
            </View>
          </Pressable>

          {!scopeUniversal ? (
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
          ) : null}
        </View>

        {/* SECTION 4: Berkas Surat Undangan / Nota Dinas */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <Paperclip size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Dokumen Surat Undangan / Nota Dinas</Text>
            </View>
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
                  <Text style={styles.attachedMeta}>Berkas Surat Resmi Terlampir di Server</Text>
                </View>
              </View>
              <Pressable
                onPress={handlePreviewExistingEdaran}
                style={styles.attachedActionBtn}
                accessibilityLabel="Pratinjau berkas saat ini"
              >
                <Eye size={18} color={colors.primary} strokeWidth={2} />
              </Pressable>
            </View>
          ) : null}

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
              <ActivityIndicator size="small" color={colors.onPrimary} />
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
});
