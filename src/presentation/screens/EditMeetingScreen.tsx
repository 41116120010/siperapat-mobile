import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { FeedbackModal } from '../components/modals/FeedbackModal';
import { useMeetingStore } from '../store/useMeetingStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { MeetingType, MeetingStatus } from '../../domain/entities/types';
import {
  AgendaOptionModal,
  AgendaOption,
} from '../components/modals/AgendaOptionModal';
import {
  CalendarDatePickerModal,
  getJakartaDateKey,
  formatIndonesianDate,
} from '../components/modals/CalendarDatePickerModal';
import {
  CLASSIFICATION_OPTIONS,
  VENUE_OPTIONS,
  STATUS_OPTIONS,
} from '../constants/meetingOptions';
import * as DocumentPicker from 'expo-document-picker';
import { toIsoDateTime } from '../../data/mappers/apiMappers';
import { UploadFileRef } from '../../data/datasources/agendaApi';

interface EditMeetingScreenProps {
  meetingId: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

type ActiveModalType = 'none' | 'classification' | 'leader' | 'notulis' | 'venue' | 'date';

export const EditMeetingScreen: React.FC<EditMeetingScreenProps> = ({
  meetingId,
  onBack,
  onSuccess,
}) => {
  const {
    getMeetingById,
    updateMeeting,
    isLoading,
    formOptions,
    fetchAgendaFormOptions,
    isFormOptionsLoading,
  } = useMeetingStore();

  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Read-only meta
  const [meetingCode, setMeetingCode] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState('koordinasi');
  const [customClassification, setCustomClassification] = useState('');
  const [status, setStatus] = useState<'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'draft'>('scheduled');
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

  // Attachments
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<(UploadFileRef & { size: number }) | null>(null);

  // Modals & Feedback
  const [activeModal, setActiveModal] = useState<ActiveModalType>('none');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updatedSummary, setUpdatedSummary] = useState<{
    code: string;
    title: string;
    format: string;
    status: string;
  } | null>(null);

  // Load meeting data & options on mount
  const loadMeetingData = async () => {
    setIsInitializing(true);
    setInitError(null);
    try {
      void fetchAgendaFormOptions();
      const agenda = await getMeetingById(meetingId);
      if (agenda) {
        setMeetingCode(agenda.code);
        setTitle(agenda.title);

        // Classification
        const isPresetClass = CLASSIFICATION_OPTIONS.some(
          (c) => c.title.toLowerCase() === agenda.agendaDescription?.toLowerCase() || c.id === agenda.classification
        );
        if (isPresetClass) {
          const match = CLASSIFICATION_OPTIONS.find(
            (c) => c.title.toLowerCase() === agenda.agendaDescription?.toLowerCase() || c.id === agenda.classification
          );
          setClassification(match?.id || 'koordinasi');
          setCustomClassification('');
        } else {
          setClassification('custom');
          setCustomClassification(agenda.agendaDescription || '');
        }

        // Format & Status
        setFormatType(agenda.type);
        const mappedStatus = agenda.rawStatus || (agenda.status === 'upcoming' ? 'scheduled' : agenda.status);
        setStatus(mappedStatus as any);

        // Date & Times
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

        // Venue
        const isPresetVenue = VENUE_OPTIONS.some(
          (v) => v.title.toLowerCase() === agenda.venue?.toLowerCase()
        );
        if (isPresetVenue) {
          const match = VENUE_OPTIONS.find(
            (v) => v.title.toLowerCase() === agenda.venue?.toLowerCase()
          );
          setVenue(match?.title || agenda.venue);
          setVenueId(match?.id || '');
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

        // Leader
        setLeaderName(agenda.leader || '');
        setLeaderId(agenda.leaderId ? String(agenda.leaderId) : '');
        setLeaderRole('Pimpinan Rapat');

        // Notulis
        setNotulisName(agenda.notulis || '');
        setNotulisId(agenda.notulisId ? String(agenda.notulisId) : '');

        // Scope & Units
        setScopeUniversal(agenda.isAllUnits ?? true);
        setSelectedUnits(agenda.unitIds || []);

        // Attachment
        setExistingAttachmentUrl(agenda.invitationPdfUrl || null);
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

  // Selected Classification Memo
  const selectedClassification = useMemo(() => {
    if (classification === 'custom' && customClassification.trim()) {
      return {
        id: 'custom',
        title: customClassification.trim(),
        subtitle: 'Klasifikasi Rapat Kustom',
        badge: 'Kustom',
        icon: 'edit' as const,
      };
    }
    return (
      CLASSIFICATION_OPTIONS.find((c) => c.id === classification) ||
      CLASSIFICATION_OPTIONS[0]
    );
  }, [classification, customClassification]);

  const toggleUnit = (unitId: number) => {
    setSelectedUnits((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
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
    setAttachedFile({
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? 'application/octet-stream',
      size: asset.size ?? 0,
    });
  };

  const handlePreviewExistingEdaran = () => {
    if (existingAttachmentUrl) {
      void Linking.openURL(existingAttachmentUrl).catch(() => {
        useFeedbackStore.getState().showToast({
          type: 'error',
          message: 'Berkas surat edaran tidak dapat dibuka pada perangkat ini.',
        });
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
        status: status,
        lokasi_ruang: formatType === 'online' ? null : (venue === 'Pilih ruang rapat' ? null : venue),
        link_meeting: formatType === 'offline' ? null : zoomUrl || null,
        waktu_mulai: toIsoDateTime(dateIso, startTime),
        waktu_selesai: endTime.trim() ? toIsoDateTime(dateIso, endTime) : null,
        pimpinan_id: leaderId ? Number(leaderId) : null,
        notulis_id: notulisId ? Number(notulisId) : null,
        is_all_units: scopeUniversal,
        unit_ids: scopeUniversal ? [] : selectedUnits,
      },
      attachedFile ?? undefined
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
        message: currentError || 'Gagal memperbarui agenda rapat. Silakan periksa kembali isian formulir.',
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
          options: (formOptions?.users ?? []).map((user) => ({
            id: String(user.id),
            title: user.name,
            subtitle: `${user.role.label} • NIP. ${user.nip ?? '—'}`,
            badge: user.role.label,
            icon: 'person',
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
          options: (formOptions?.users ?? []).map((user) => ({
            id: String(user.id),
            title: user.name,
            subtitle: `${user.role.label} • NIP. ${user.nip ?? '—'}`,
            badge: user.role.label,
            icon: 'edit-note',
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
        return {
          title: '',
          subtitle: '',
          options: [],
          selectedId: '',
        };
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

  // Loading State
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

  // Error State
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
              <MaterialIcons name="event-note" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Status & Informasi Agenda</Text>
            </View>
            <View style={styles.codePill}>
              <Text style={styles.codePillText}>{meetingCode}</Text>
            </View>
          </View>

          {/* Perihal / Judul Rapat */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Perihal / Judul Agenda Rapat <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Contoh: Rapat Koordinasi Penjaminan Mutu Triwulan III"
              placeholderTextColor={colors.outline}
            />
          </View>

          {/* Status Penyelenggaraan Rapat */}
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
                    <MaterialIcons
                      name={opt.icon}
                      size={15}
                      color={isSelected ? colors.onPrimary : opt.color}
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

          {/* Klasifikasi / Jenis Rapat */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Klasifikasi / Jenis Rapat <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              onPress={() => setActiveModal('classification')}
              style={({ pressed }) => [
                styles.selectorTrigger,
                pressed && styles.pressedState,
              ]}
            >
              <View style={styles.selectorLeft}>
                <MaterialIcons
                  name={selectedClassification.icon || 'category'}
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.selectorValue} numberOfLines={1}>
                  {selectedClassification.title}
                </Text>
              </View>
              <View style={styles.selectorRight}>
                {selectedClassification.badge ? (
                  <View style={styles.selectorBadge}>
                    <Text style={styles.selectorBadgeText}>
                      {selectedClassification.badge}
                    </Text>
                  </View>
                ) : null}
                <MaterialIcons
                  name="expand-more"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </View>
            </Pressable>
          </View>

          {/* Segmented Format Buttons */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Format Penyelenggaraan Rapat <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.formatSegmentedGrid}>
              <Pressable
                onPress={() => setFormatType('offline')}
                style={[
                  styles.formatBtn,
                  formatType === 'offline' && styles.formatBtnActive,
                ]}
              >
                <MaterialIcons
                  name="apartment"
                  size={18}
                  color={formatType === 'offline' ? colors.onPrimary : colors.outline}
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
                style={[
                  styles.formatBtn,
                  formatType === 'online' && styles.formatBtnActive,
                ]}
              >
                <MaterialIcons
                  name="videocam"
                  size={18}
                  color={formatType === 'online' ? colors.onPrimary : colors.outline}
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
                style={[
                  styles.formatBtn,
                  formatType === 'hybrid' && styles.formatBtnActive,
                ]}
              >
                <MaterialIcons
                  name="devices"
                  size={18}
                  color={formatType === 'hybrid' ? colors.onPrimary : colors.outline}
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

          {/* Pimpinan Rapat Picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Pimpinan Rapat Kedinasan</Text>
            <Pressable
              onPress={() => setActiveModal('leader')}
              style={({ pressed }) => [
                styles.entityCard,
                pressed && styles.pressedState,
              ]}
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
                <MaterialIcons name="chevron-right" size={16} color={colors.primary} />
              </View>
            </Pressable>
          </View>

          {/* Notulis Picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Petugas Notulis / Risalah Rapat</Text>
            <Pressable
              onPress={() => setActiveModal('notulis')}
              style={({ pressed }) => [
                styles.entityCard,
                pressed && styles.pressedState,
              ]}
            >
              <View style={styles.notulisIconWrap}>
                <MaterialIcons name="edit-note" size={20} color={colors.primary} />
              </View>
              <View style={styles.entityInfo}>
                <Text style={styles.entityName}>{notulisName || 'Pilih Petugas Notulis'}</Text>
                <Text style={styles.entitySub}>
                  Petugas Notulensi Sidang Kedinasan
                </Text>
              </View>
              <View style={styles.actionPill}>
                <Text style={styles.actionPillText}>Ganti</Text>
                <MaterialIcons name="chevron-right" size={16} color={colors.primary} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* SECTION 2: Waktu & Tempat */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <MaterialIcons name="schedule" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Waktu & Tempat Pelaksanaan</Text>
            </View>
          </View>

          {/* Tanggal Modal Trigger */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Tanggal Rapat <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              onPress={() => setActiveModal('date')}
              style={({ pressed }) => [
                styles.selectorTrigger,
                pressed && styles.pressedState,
              ]}
            >
              <View style={styles.selectorLeft}>
                <MaterialIcons name="calendar-today" size={18} color={colors.primary} />
                <Text style={styles.selectorValue}>{date}</Text>
              </View>
              <MaterialIcons name="edit-calendar" size={18} color={colors.primary} />
            </Pressable>
          </View>

          {/* Jam Mulai & Jam Selesai */}
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Mulai (WIB) <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.timeInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={colors.outline}
              />
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Selesai (WIB)</Text>
              <TextInput
                style={styles.timeInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="12:00"
                placeholderTextColor={colors.outline}
              />
            </View>
          </View>

          {/* Venue Selector */}
          {formatType !== 'online' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Ruang Rapat / Lokasi <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                onPress={() => setActiveModal('venue')}
                style={({ pressed }) => [
                  styles.selectorTrigger,
                  pressed && styles.pressedState,
                ]}
              >
                <View style={styles.selectorLeft}>
                  <MaterialIcons name="meeting-room" size={18} color={colors.secondary} />
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
                  <MaterialIcons
                    name="expand-more"
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                </View>
              </Pressable>
            </View>
          ) : null}

          {/* Zoom URL (Online / Hybrid) */}
          {formatType !== 'offline' ? (
            <View style={styles.virtualMeetingBox}>
              <View style={styles.virtualHeader}>
                <MaterialIcons name="videocam" size={16} color={colors.primary} />
                <Text style={styles.virtualTitle}>Tautan Pertemuan Virtual</Text>
              </View>
              <TextInput
                style={styles.textInput}
                value={zoomUrl}
                onChangeText={setZoomUrl}
                placeholder="https://lldikti10.kemdikbud.go.id/zoom/..."
                placeholderTextColor={colors.outline}
                autoCapitalize="none"
              />
            </View>
          ) : null}
        </View>

        {/* SECTION 3: Sasaran Peserta & Unit Kerja */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <MaterialIcons name="groups" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Sasaran Peserta & Unit Kerja</Text>
            </View>
          </View>

          <Pressable
            onPress={() => setScopeUniversal(true)}
            style={[styles.radioCard, scopeUniversal && styles.radioCardActive]}
          >
            <MaterialIcons
              name={scopeUniversal ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={20}
              color={scopeUniversal ? colors.primary : colors.outline}
            />
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
            <MaterialIcons
              name={!scopeUniversal ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={20}
              color={!scopeUniversal ? colors.primary : colors.outline}
            />
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
                      style={[
                        styles.unitChip,
                        isChecked && styles.unitChipSelected,
                      ]}
                    >
                      <MaterialIcons
                        name={isChecked ? 'check-box' : 'check-box-outline-blank'}
                        size={16}
                        color={isChecked ? colors.primary : colors.outline}
                      />
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
              <MaterialIcons name="attach-file" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Dokumen Surat Undangan / Nota Dinas</Text>
            </View>
          </View>

          {/* Existing Attachment Display */}
          {existingAttachmentUrl && !attachedFile ? (
            <View style={styles.existingAttachmentCard}>
              <View style={styles.attachedLeft}>
                <View style={styles.attachedIconBox}>
                  <MaterialIcons name="picture-as-pdf" size={20} color={colors.error} />
                </View>
                <View style={styles.attachedInfo}>
                  <Text style={styles.attachedName} numberOfLines={1}>
                    Surat-Edaran_{meetingCode || 'Agenda'}.pdf
                  </Text>
                  <Text style={styles.attachedMeta}>Berkas Surat Resmi Terlampir di Server</Text>
                </View>
              </View>
              <Pressable
                onPress={handlePreviewExistingEdaran}
                style={styles.attachedActionBtn}
                accessibilityLabel="Pratinjau berkas saat ini"
              >
                <MaterialIcons name="visibility" size={18} color={colors.primary} />
              </Pressable>
            </View>
          ) : null}

          {/* Upload Dropzone / Replace Button */}
          <Pressable
            onPress={handleUploadFile}
            style={({ pressed }) => [
              styles.dropzone,
              pressed && styles.pressedState,
            ]}
          >
            <View style={styles.dropzoneIconWrap}>
              <MaterialIcons name="upload-file" size={22} color={colors.primary} />
            </View>
            <View style={styles.dropzoneTextWrap}>
              <Text style={styles.dropzoneTitle}>
                {existingAttachmentUrl ? 'Unggah Berkas Baru Pengganti' : 'Unggah Surat Undangan / Nota Dinas'}
              </Text>
              <Text style={styles.dropzoneSub}>
                Format PDF bertanda tangan digital (Maksimal 5 MB)
              </Text>
            </View>
          </Pressable>

          {/* Newly Selected File */}
          {attachedFile ? (
            <View style={styles.attachedCard}>
              <View style={styles.attachedLeft}>
                <View style={styles.attachedIconBox}>
                  <MaterialIcons name="picture-as-pdf" size={20} color={colors.error} />
                </View>
                <View style={styles.attachedInfo}>
                  <Text style={styles.attachedName} numberOfLines={1}>
                    {attachedFile.name} (Berkas Baru)
                  </Text>
                  <Text style={styles.attachedMeta}>
                    {(attachedFile.size / (1024 * 1024)).toFixed(2)} MB • Siap disimpan
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setAttachedFile(null)}
                style={styles.attachedActionBtn}
                accessibilityLabel="Hapus lampiran baru"
              >
                <MaterialIcons name="close" size={18} color={colors.error} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerGrid}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons name="arrow-back" size={18} color={colors.outline} />
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
              <MaterialIcons name="check-circle" size={18} color={colors.onPrimary} />
            )}
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Calendar Date Picker Modal */}
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

      {/* Agenda Option Modal */}
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

      {/* Success Feedback Modal */}
      <FeedbackModal
        visible={showSuccessModal}
        type="success"
        title="Agenda Berhasil Diperbarui"
        message="Perubahan data agenda rapat kedinasan telah berhasil disimpan ke server."
        detail={
          updatedSummary
            ? {
                'Kode Rapat': updatedSummary.code,
                'Perihal': updatedSummary.title,
                'Format': updatedSummary.format,
                'Status': updatedSummary.status,
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 110,
    gap: spacing.md,
  },
  centerStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  initLoadingTitle: {
    ...typography.headlineSm,
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  initLoadingSub: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: spacing.sm + 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#00236F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.25)',
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  codePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(0, 35, 111, 0.15)',
  },
  codePillText: {
    ...typography.labelSm,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },
  fieldGroup: {
    gap: 5,
  },
  label: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  required: {
    color: colors.error,
  },
  textInput: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 4,
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurface,
  },
  statusScroll: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingVertical: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  statusPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusPillText: {
    ...typography.labelSm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  statusPillTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  selectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 4,
    minHeight: 44,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
  },
  selectorValue: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurface,
    flex: 1,
  },
  selectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectorBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
  },
  selectorBadgeText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
  },
  formatSegmentedGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: 3,
    gap: 4,
  },
  formatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.xs + 3,
    borderRadius: rounded.sm,
  },
  formatBtnActive: {
    backgroundColor: colors.primary,
  },
  formatBtnText: {
    ...typography.labelSm,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.outline,
  },
  formatBtnTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  entityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    borderRadius: rounded.md,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  leaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderAvatarText: {
    ...typography.labelSm,
    fontWeight: '700',
    color: colors.primary,
    fontSize: 12,
  },
  notulisIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityInfo: {
    flex: 1,
  },
  entityName: {
    ...typography.bodyMd,
    fontWeight: '700',
    fontSize: 13,
    color: colors.onSurface,
  },
  entitySub: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainerLow,
  },
  actionPillText: {
    ...typography.labelSm,
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeCol: {
    flex: 1,
    gap: 5,
  },
  timeInput: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 3,
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurface,
    textAlign: 'center',
  },
  virtualMeetingBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: spacing.sm,
    gap: spacing.xs + 2,
  },
  virtualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  virtualTitle: {
    ...typography.labelSm,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  radioCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 35, 111, 0.03)',
  },
  radioTextWrap: {
    flex: 1,
  },
  radioTitle: {
    ...typography.bodyMd,
    fontWeight: '700',
    fontSize: 13,
    color: colors.onSurface,
  },
  radioSub: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 15,
  },
  unitSelectSection: {
    marginTop: spacing.xs,
    gap: spacing.xs + 2,
  },
  unitSelectHeader: {
    ...typography.labelSm,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  unitChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  unitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  unitChipSelected: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.primary,
  },
  unitChipText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  unitChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  existingAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    borderRadius: rounded.md,
    padding: spacing.sm,
  },
  dropzone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 35, 111, 0.35)',
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  dropzoneIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzoneTextWrap: {
    flex: 1,
  },
  dropzoneTitle: {
    ...typography.bodyMd,
    fontWeight: '700',
    fontSize: 12.5,
    color: colors.primary,
  },
  dropzoneSub: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: rounded.md,
    padding: spacing.sm,
  },
  attachedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 4,
    flex: 1,
  },
  attachedIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedInfo: {
    flex: 1,
  },
  attachedName: {
    ...typography.bodyMd,
    fontWeight: '600',
    fontSize: 12.5,
    color: colors.onSurface,
  },
  attachedMeta: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  attachedActionBtn: {
    padding: 6,
    borderRadius: 14,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.4)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs + 4,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
  },
  footerGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 44,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surfaceContainerLowest,
  },
  cancelButtonText: {
    ...typography.labelMd,
    fontSize: 13,
    fontWeight: '600',
    color: colors.outline,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    ...typography.labelMd,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  pressedState: {
    opacity: 0.8,
  },
});
