import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
  RefreshControl,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { useMeetingStore } from '../store/useMeetingStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { AgendaExportRepository } from '../../data/repositories/AgendaExportRepository';
import { AgendaExportFormat } from '../../data/datasources/reportApi';
import { PaginationBar } from '../components/common/PaginationBar';
import { triggerPageTransition } from '../store/useTransitionStore';
import * as DocumentPicker from 'expo-document-picker';
import { useAuthStore } from '../store/useAuthStore';
import { canDeleteMeeting, canEditMeeting, canManageMinutes, canManageSuratEdaran } from '../utils/permissionUtils';
import { meetingToUpdateDto } from '../../data/mappers/apiMappers';
import { resolveFileMimeType, UploadFileRef } from '../../data/datasources/agendaApi';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';
import { UploadSuratEdaranModal } from '../components/modals/UploadSuratEdaranModal';

interface MonitoringScreenProps {
  meetingId?: string;
  onBack?: () => void;
  onNavigateEdit?: (meetingId: string) => void;
}

type TabType = 'verified' | 'unverified' | 'minutes';

interface Participant {
  name: string;
  role: string;
  nip: string;
  time: string;
  location: string;
  unit?: string;
  isOnline?: boolean;
}

function plainText(html?: string | null) {
  return html?.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').trim() || '';
}

export const MonitoringScreen: React.FC<MonitoringScreenProps> = ({
  onBack,
  meetingId,
  onNavigateEdit,
}) => {
  const exportRepository = useMemo(() => new AgendaExportRepository(), []);
  const [activeTab, setActiveTab] = useState<TabType>('verified');
  const [attendancePage, setAttendancePage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPokja, setSelectedPokja] = useState('Semua Unit');
  const { user } = useAuthStore();
  const { getMeetingById, deleteMeeting, updateMinutes, uploadSuratEdaran, isSavingMinutes } = useMeetingStore();
  const { agendaAttendances, agendaAttendancePage, fetchAgendaAttendances, isLoading, error } = useAttendanceStore();
  const [meeting, setMeeting] = useState<Awaited<ReturnType<typeof getMeetingById>> | null>(null);
  const [isEditingMinutes, setIsEditingMinutes] = useState(false);
  const [minutesDraft, setMinutesDraft] = useState('');
  const [conclusionDraft, setConclusionDraft] = useState('');
  const [isUploadingEdaran, setIsUploadingEdaran] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<AgendaExportFormat | null>(null);

  const userCanDelete = useMemo(() => canDeleteMeeting(user, meeting), [user, meeting]);
  const userCanEdit = useMemo(() => canEditMeeting(user, meeting), [user, meeting]);
  const userCanManageMinutes = useMemo(() => canManageMinutes(user, meeting), [user, meeting]);
  const userCanManageSuratEdaran = useMemo(() => canManageSuratEdaran(user, meeting), [user, meeting]);

  const isAppointedNotulis = useMemo(() => {
    return Boolean(user && meeting?.notulisId && String(meeting.notulisId) === String(user.id));
  }, [user, meeting]);

  const isAppointedLeader = useMemo(() => {
    return Boolean(user && meeting?.leaderId && String(meeting.leaderId) === String(user.id));
  }, [user, meeting]);

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
          if (onBack) {
            onBack();
          }
        } else {
          useFeedbackStore.getState().showModal({
            type: 'error',
            title: 'Penghapusan Agenda Ditolak',
            message: result.message || 'Gagal menghapus agenda rapat. Silakan periksa kembali integritas data.',
            confirmText: 'Mengerti',
          });
        }
      },
    });
  };

  useEffect(() => {
    if (!meetingId) return;
    void getMeetingById(meetingId).then((agenda) => { setMeeting(agenda); setAgendaError(null); }).catch((requestError: unknown) => {
      setMeeting(null);
      setAgendaError(requestError instanceof Error ? requestError.message : 'Gagal memuat detail agenda.');
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
  const [selectedEdaranFile, setSelectedEdaranFile] = useState<(UploadFileRef & { size?: number }) | null>(null);
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
      useFeedbackStore.getState().showToast({ type: 'success', message: `Berkas ${filename} siap dibagikan.` });
    } catch (requestError) {
      useFeedbackStore.getState().showToast({ type: 'error', message: requestError instanceof Error ? requestError.message : 'Gagal mengunduh berkas agenda.' });
    } finally { setExporting(null); }
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

    const updated = await updateMinutes(meetingId, {
      notulensi,
      kesimpulan,
    });
    if (!updated) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: useMeetingStore.getState().error || 'Notulensi dan kesimpulan gagal disimpan.',
      });
      return;
    }
    setMeeting(updated);
    setMinutesDraft(updated.minutesHtml ? plainText(updated.minutesHtml) : '');
    setConclusionDraft(updated.summaryHtml ? plainText(updated.summaryHtml) : '');
    setIsEditingMinutes(false);
    useFeedbackStore.getState().showToast({
      type: 'success',
      message: 'Notulensi dan kesimpulan rapat berhasil disimpan.',
    });
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
        message: pickerError instanceof Error ? pickerError.message : 'Gagal memilih berkas surat edaran.',
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
        meetingContext
      );

      if (!updated) {
        useFeedbackStore.getState().showToast({
          type: 'error',
          message: useMeetingStore.getState().error || 'Gagal mengunggah berkas surat edaran.',
        });
        return;
      }

      setMeeting(updated);
      setIsUploadModalVisible(false);
      setSelectedEdaranFile(null);
      useFeedbackStore.getState().showToast({
        type: 'success',
        message: 'Berkas surat edaran resmi berhasil diunggah.',
      });
    } catch (uploadError) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: uploadError instanceof Error ? uploadError.message : 'Gagal mengunggah berkas surat edaran.',
      });
    } finally {
      setIsUploadingEdaran(false);
    }
  };

  const displayList: Participant[] = useMemo(() => activeTab !== 'minutes' ? agendaAttendances.map((record) => ({
    name: record.asnName || 'Nama tidak disediakan', role: record.asnJabatan || 'Pegawai', nip: record.asnNip || '',
    time: activeTab === 'unverified' ? 'Belum melakukan presensi' : record.timestamp ? new Date(record.timestamp).toLocaleString('id-ID') : 'Waktu tidak tersedia',
    location: 'Lokasi tidak disediakan API', unit: record.asnUnitKerja,
  })) : [], [activeTab, agendaAttendances]);

  const filteredList = displayList.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nip.includes(searchQuery)
  ).filter((p) => selectedPokja === 'Semua Unit' || p.unit === selectedPokja);

  return (
    <View style={styles.container}>
      <Header
        title="Detail Agenda Rapat"
        subtitle="Administrasi & Presensi Kedinasan LLDIKTI X"
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              if (!meetingId) return;
              void getMeetingById(meetingId).then((agenda) => setMeeting(agenda)).catch(() => {});
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
        {/* AGENDA SUMMARY & STATUS HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCodeRow}>
              <Text style={styles.heroCode}>{meeting?.code ?? `Agenda #${meetingId ?? '—'}`}</Text>
              <Text style={styles.heroType}>{meeting?.type?.toUpperCase() ?? '—'}</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>{meeting ? meeting.status === 'ongoing' ? 'Presensi Dibuka' : `Status: ${meeting.status}` : 'Memuat status agenda'}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            {meeting?.title ?? (agendaError ? 'Detail agenda tidak dapat dimuat' : 'Memuat detail agenda...')}
          </Text>

          {/* Clean 2-Column Metadata Grid */}
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialIcons name="event" size={15} color={colors.primary} />
                <View style={styles.metaTextGroup}>
                  <Text style={styles.metaLabel}>Jadwal</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {meeting ? `${meeting.date} • ${meeting.startTime}–${meeting.endTime}` : '—'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialIcons name="videocam" size={15} color={colors.primary} />
                <View style={styles.metaTextGroup}>
                  <Text style={styles.metaLabel}>Format</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {meeting ? `${meeting.type.toUpperCase()} • ${meeting.venue || meeting.zoomUrl || 'Lokasi tidak tersedia'}` : '—'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.metaSplitRow}>
              <View style={styles.metaItem}>
                <MaterialIcons name="person" size={15} color={colors.primary} />
                <View style={styles.metaTextGroup}>
                  <Text style={styles.metaLabel}>Pimpinan Rapat</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {meeting?.leader || '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaItem}>
                <MaterialIcons name="edit-note" size={15} color={colors.primary} />
                <View style={styles.metaTextGroup}>
                  <Text style={styles.metaLabel}>Notulis</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {meeting ? meeting.notulis?.trim() || 'Belum ditugaskan' : agendaError ? 'Tidak dapat dimuat' : 'Memuat...'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* MANAGEMENT ACTIONS (EDIT & DELETE) - ROLE GATED */}
        {(userCanEdit || userCanDelete) ? (
          <View style={styles.managementBar}>
            {userCanEdit ? (
              <Pressable
                style={({ pressed }) => [
                  styles.editMeetingBtn,
                  pressed && styles.btnPressed,
                  !userCanDelete && { flex: 1 },
                ]}
                onPress={() => {
                  if (meetingId && onNavigateEdit) {
                    onNavigateEdit(meetingId);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel="Ubah Agenda Rapat"
              >
                <MaterialIcons name="edit" size={16} color={colors.primary} />
                <Text style={styles.editMeetingBtnText}>Ubah Agenda</Text>
              </Pressable>
            ) : null}

            {userCanDelete ? (
              <Pressable
                style={({ pressed }) => [
                  styles.deleteMeetingBtn,
                  pressed && styles.btnPressed,
                  !userCanEdit && { flex: 1 },
                ]}
                onPress={handleConfirmDelete}
                accessibilityRole="button"
                accessibilityLabel="Hapus Agenda Rapat"
              >
                <MaterialIcons name="delete-outline" size={16} color={colors.error} />
                <Text style={styles.deleteMeetingBtnText}>Hapus Agenda</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* LIVE ATTENDANCE METRICS & PROGRESS GRID */}
        <View style={styles.metricsCard}>
          <View style={styles.metricsHeader}>
            <Text style={styles.metricsTitle}>Rekapitulasi Kehadiran</Text>
          </View>

          {/* 3-Column Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Hadir Sah</Text>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, { color: colors.success }]}>{agendaAttendancePage?.summary.total_attended ?? '—'}</Text>
                <Text style={styles.metricUnit}>ASN</Text>
              </View>
              <Text style={[styles.metricFooter, { color: colors.success }]}>
                Jumlah dari API
              </Text>
            </View>

            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Belum Hadir</Text>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, { color: colors.error }]}>{agendaAttendancePage?.summary?.unattended_count ?? '—'}</Text>
                <Text style={styles.metricUnit}>ASN</Text>
              </View>
              <Text style={[styles.metricFooter, { color: colors.error }]}>
                Ringkasan dari API
              </Text>
            </View>

            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Target Undangan</Text>
              <View style={styles.metricValueRow}>
                <Text style={styles.metricValue}>{meeting?.totalInvited ?? '—'}</Text>
                <Text style={styles.metricUnit}>ASN</Text>
              </View>
              <Text style={[styles.metricFooter, { color: colors.onSurfaceVariant }]}>
                Total Undangan
              </Text>
            </View>
          </View>

          {/* Participation Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Partisipasi Kehadiran</Text>
              <Text style={styles.progressValue}>{agendaAttendancePage?.summary?.participation_rate_label ?? 'Rasio belum tersedia'}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.max(0, Math.min(100, agendaAttendancePage?.summary?.participation_rate ?? 0))}%` }]} />
            </View>
          </View>
        </View>

        {/* FULLY RESPONSIVE HORIZONTAL TAB NAVIGATION */}
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
              style={[
                styles.tabBtn,
                activeTab === 'verified' && styles.tabBtnActive,
              ]}
              accessibilityRole="tab"
              accessibilityLabel="Tab Terverifikasi Sah"
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'verified' && styles.tabBtnTextActive,
                ]}
              >
                Tercatat
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  activeTab === 'verified'
                    ? styles.tabBadgeVerifiedActive
                    : styles.tabBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === 'verified'
                      ? styles.tabBadgeTextWhite
                      : styles.tabBadgeTextInactive,
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
              style={[
                styles.tabBtn,
                activeTab === 'unverified' && styles.tabBtnActive,
              ]}
              accessibilityRole="tab"
              accessibilityLabel="Tab Belum Hadir"
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'unverified' && styles.tabBtnTextActive,
                ]}
              >
                Belum Hadir
              </Text>
              <View
                style={[
                  styles.tabBadge,
                  activeTab === 'unverified'
                    ? styles.tabBadgeUnverifiedActive
                    : styles.tabBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === 'unverified'
                      ? styles.tabBadgeTextWhite
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
              style={[
                styles.tabBtn,
                activeTab === 'minutes' && styles.tabBtnActive,
              ]}
              accessibilityRole="tab"
              accessibilityLabel="Tab Notulensi dan RTL"
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'minutes' && styles.tabBtnTextActive,
                ]}
              >
                Notulensi & RTL
              </Text>
              <View
                style={[
                  styles.tabBadgeDraft,
                  activeTab === 'minutes' && styles.tabBadgeDraftActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeTextDraft,
                    activeTab === 'minutes' && styles.tabBadgeTextDraftActive,
                  ]}
                >
                  Draft
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>

        {/* SEARCH & FILTER CONTROLS */}
        {activeTab !== 'minutes' ? (
          <View style={styles.filterSection}>
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <MaterialIcons name="search" size={18} color={colors.outline} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari nama atau NIP pegawai..."
                  placeholderTextColor={colors.outline}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    setAttendancePage(1);
                  }}
                />
              </View>
            </View>

            {/* Quick Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pokjaChipsRow}
            >
              {[
                'Semua Unit',
                ...Array.from(new Set(agendaAttendances.map((record) => record.asnUnitKerja).filter(Boolean))),
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
                      pressed && styles.chipPressed,
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

            {/* Clean Enterprise Participants Feed */}
            <View style={styles.participantFeed}>
              {error ? <Text style={styles.pRole}>{error}</Text> : filteredList.length === 0 ? <Text style={styles.pRole}>{isLoading ? 'Memuat kehadiran...' : activeTab === 'unverified' ? 'Semua undangan sudah presensi atau tidak ada data.' : 'Belum ada data kehadiran.'}</Text> : filteredList.map((p, idx) => (
                <View key={idx} style={styles.participantCard}>
                  <View style={styles.pAvatar}>
                    <MaterialIcons
                      name={p.isOnline ? 'videocam' : 'person'}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.pContent}>
                    <View style={styles.pTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pName}>{p.name}</Text>
                        <Text style={styles.pRole}>{p.role}</Text>
                      </View>
                      <View
                        style={[
                          styles.pStatusBadge,
                          activeTab === 'unverified'
                            ? styles.pStatusBadgeWait
                            : styles.pStatusBadgeValid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pStatusText,
                            activeTab === 'unverified'
                              ? styles.pStatusTextWait
                              : styles.pStatusTextValid,
                          ]}
                        >
                          {activeTab === 'unverified' ? 'Belum Hadir' : 'Tercatat'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.pMetaRow}>
                      <Text style={styles.pMetaText}>
                        NIP: <Text style={styles.pMetaValueMono}>{p.nip}</Text>
                      </Text>
                      <Text style={styles.pMetaDot}>•</Text>
                      <Text style={styles.pMetaText}>{p.location}</Text>
                      {activeTab === 'verified' ? (
                        <>
                          <Text style={styles.pMetaDot}>•</Text>
                          <Text style={styles.pMetaText}>{p.time}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))}

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

        {/* NOTULENSI & KESIMPULAN DUAL-CARD VIEW */}
        {activeTab === 'minutes' ? (
          <View style={styles.minutesSectionContainer}>
            {/* Appointed Role Official Banner */}
            {(isAppointedNotulis || isAppointedLeader) ? (
              <View style={styles.roleBannerContainer}>
                <View style={[styles.roleBannerIconBox, isAppointedNotulis ? styles.roleBannerNotulisIcon : styles.roleBannerLeaderIcon]}>
                  <MaterialIcons
                    name={isAppointedNotulis ? "assignment-ind" : "gavel"}
                    size={20}
                    color={isAppointedNotulis ? colors.primary : "#B45309"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleBannerTitle}>
                    {isAppointedNotulis ? 'Penugasan: Notulis Rapat Resmi' : 'Penugasan: Pimpinan Rapat'}
                  </Text>
                  <Text style={styles.roleBannerSubtitle}>
                    Anda memiliki wewenang kedinasan untuk menyusun dan memperbarui Notulensi serta Kesimpulan & Tindak Lanjut agenda ini.
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Header / Mode Indicator */}
            <View style={styles.minutesSectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.minutesSectionTitle}>Risalah & Dokumen Rapat</Text>
                <Text style={styles.minutesSectionSubtitle}>
                  {meeting ? `Kode Agenda: ${meeting.code}` : 'Dokumentasi resmi agenda'}
                </Text>
              </View>
              {userCanManageMinutes && (
                isEditingMinutes ? (
                  <Pressable
                    onPress={() => setIsEditingMinutes(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Batal mengubah risalah rapat"
                    hitSlop={8}
                    style={styles.minutesHeaderCancelBtn}
                  >
                    <Text style={styles.minutesHeaderCancelText}>Batal</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleEditMinutes}
                    accessibilityRole="button"
                    accessibilityLabel="Ubah risalah rapat"
                    hitSlop={8}
                    style={styles.minutesHeaderEditBtn}
                  >
                    <MaterialIcons name="edit" size={15} color={colors.primary} />
                    <Text style={styles.minutesHeaderEditText}>Ubah Risalah</Text>
                  </Pressable>
                )
              )}
            </View>

            {/* CARD 1: NOTULENSI JALANNYA RAPAT */}
            <View style={styles.minutesCard}>
              <View style={styles.minutesHeader}>
                <View style={styles.minutesIconCircle}>
                  <MaterialIcons name="edit-note" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.minutesTitle}>Notulensi Jalannya Rapat</Text>
                  <Text style={styles.minutesSubtitle}>
                    Catatan dinas pembahasan agenda, dinamika, dan masukan peserta
                  </Text>
                </View>
              </View>
              <View style={styles.minutesDivider} />
              {isEditingMinutes ? (
                <TextInput
                  multiline
                  textAlignVertical="top"
                  value={minutesDraft}
                  onChangeText={setMinutesDraft}
                  editable={!isSavingMinutes}
                  placeholder="Tuliskan jalannya rapat dan dinamika pembahasan secara lengkap..."
                  placeholderTextColor={colors.outline}
                  accessibilityLabel="Isi notulensi jalannya rapat"
                  style={styles.minutesInput}
                />
              ) : meeting?.minutesHtml && plainText(meeting.minutesHtml).length > 0 ? (
                <Text style={styles.minutesBody}>{plainText(meeting.minutesHtml)}</Text>
              ) : (
                <View style={styles.minutesEmptyBox}>
                  <MaterialIcons name="info-outline" size={18} color={colors.outline} />
                  <Text style={styles.minutesEmptyText}>
                    Belum ada catatan jalannya rapat yang didokumentasikan.
                  </Text>
                </View>
              )}
            </View>

            {/* CARD 2: KESIMPULAN & TINDAK LANJUT */}
            <View style={styles.minutesCard}>
              <View style={styles.minutesHeader}>
                <View style={[styles.minutesIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <MaterialIcons name="fact-check" size={18} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.minutesTitle}>Kesimpulan & Tindak Lanjut</Text>
                  <Text style={styles.minutesSubtitle}>
                    Poin kesepakatan, arahan pimpinan rapat, PIC, dan tenggat waktu
                  </Text>
                </View>
              </View>
              <View style={styles.minutesDivider} />
              {isEditingMinutes ? (
                <TextInput
                  multiline
                  textAlignVertical="top"
                  value={conclusionDraft}
                  onChangeText={setConclusionDraft}
                  editable={!isSavingMinutes}
                  placeholder="Tuliskan poin kesimpulan, arahan pimpinan, penanggung jawab (PIC), serta tenggat waktu pelaksanaan..."
                  placeholderTextColor={colors.outline}
                  accessibilityLabel="Isi kesimpulan dan rencana tindak lanjut"
                  style={styles.minutesInput}
                />
              ) : meeting?.summaryHtml && plainText(meeting.summaryHtml).length > 0 ? (
                <Text style={styles.minutesBody}>{plainText(meeting.summaryHtml)}</Text>
              ) : (
                <View style={styles.minutesEmptyBox}>
                  <MaterialIcons name="info-outline" size={18} color={colors.outline} />
                  <Text style={styles.minutesEmptyText}>
                    Belum ada kesimpulan & tindak lanjut yang didokumentasikan.
                  </Text>
                </View>
              )}
            </View>

            {/* EDIT ACTION BUTTONS */}
            {isEditingMinutes ? (
              <View style={styles.minutesActionRow}>
                <Button
                  title="Batal"
                  variant="outline"
                  size="md"
                  onPress={() => setIsEditingMinutes(false)}
                  disabled={isSavingMinutes}
                  style={{ flex: 1 }}
                />
                <Button
                  title={isSavingMinutes ? "Menyimpan..." : "Simpan Risalah Rapat"}
                  variant="primary"
                  size="md"
                  onPress={() => void handleSaveMinutes()}
                  disabled={isSavingMinutes || !meeting}
                  isLoading={isSavingMinutes}
                  icon={<MaterialIcons name="check-circle" size={18} color={colors.onPrimary} />}
                  style={{ flex: 2 }}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* SECTION: SURAT EDARAN RAPAT */}
        <View style={styles.edaranCard}>
          <View style={styles.edaranHeader}>
            <View style={styles.edaranIconCircle}>
              <MaterialIcons name="mail-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.edaranTitle}>Surat Edaran Rapat</Text>
              <Text style={styles.edaranSubtitle}>
                Dokumen kedinasan pemanggilan peserta dan agenda kerja
              </Text>
            </View>
          </View>

          {meeting?.invitationPdfUrl ? (
            <View style={styles.edaranContent}>
              <Pressable
                onPress={handlePreviewSuratEdaran}
                style={({ pressed }) => [styles.edaranDocPreview, pressed && styles.btnPressed]}
                accessibilityLabel="Lihat dokumen surat edaran rapat"
              >
                <View
                  style={[
                    styles.edaranPdfBadge,
                    meeting.suratEdaran?.is_image ? { backgroundColor: 'rgba(0, 102, 204, 0.08)' } : null,
                  ]}
                >
                  <MaterialIcons
                    name={meeting.suratEdaran?.is_image ? 'image' : 'picture-as-pdf'}
                    size={22}
                    color={meeting.suratEdaran?.is_image ? colors.primary : '#DC2626'}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.edaranDocName} numberOfLines={1} ellipsizeMode="tail">
                    Surat-Edaran_{meeting.code || 'Agenda'}.{meeting.suratEdaran?.extension || (meeting.suratEdaran?.is_image ? 'jpg' : 'pdf')}
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
                  icon={<MaterialIcons name="visibility" size={18} color={colors.onPrimary} />}
                />
                {userCanManageSuratEdaran ? (
                  <Button
                    title="Ganti Berkas Surat Edaran"
                    onPress={() => void handlePickSuratEdaran()}
                    disabled={isUploadingEdaran}
                    variant="outline"
                    size="md"
                    fullWidth
                    icon={<MaterialIcons name="cloud-upload" size={18} color={colors.primary} />}
                  />
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.edaranEmptyContent}>
              <View style={styles.edaranEmptyBox}>
                <MaterialIcons name="info-outline" size={20} color={colors.outline} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.edaranEmptyTitle}>Berkas Belum Dilampirkan</Text>
                  <Text style={styles.edaranEmptySub}>
                    {userCanManageSuratEdaran
                      ? 'Dokumen digital surat edaran belum dilampirkan. Unggah berkas surat edaran (PDF atau gambar) di bawah ini.'
                      : 'Sekretariat LLDIKTI X belum mengunggah dokumen digital surat edaran pada agenda ini.'}
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
                  icon={<MaterialIcons name="cloud-upload" size={18} color={colors.onPrimary} />}
                />
              ) : null}
            </View>
          )}
        </View>

        {/* SECTION: EKSPOR DOKUMEN RAPAT */}
        <View style={styles.baCard}>
          <View style={styles.baHeader}>
            <View style={styles.baIconCircle}>
              <MaterialIcons name="download" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.baTitle}>Ekspor Dokumen Rapat</Text>
              <Text style={styles.baSubtitle}>
                Unduh berita acara dan berkas rekapitulasi resmi
              </Text>
            </View>
          </View>

          {/* Export Buttons */}
          <View style={styles.baActionGrid}>
            <Button
              title="Unduh Berita Acara (PDF)"
              onPress={() => void handleExport('pdf')}
              disabled={Boolean(exporting)}
              isLoading={exporting === 'pdf'}
              variant="primary"
              size="md"
              fullWidth
              icon={
                <MaterialIcons
                  name="picture-as-pdf"
                  size={18}
                  color={colors.onPrimary}
                />
              }
            />

            <Button
              title="Unduh Risalah Sidang (DOCX)"
              onPress={() => void handleExport('word')}
              disabled={Boolean(exporting)}
              isLoading={exporting === 'word'}
              variant="outline"
              size="md"
              fullWidth
              icon={
                <MaterialIcons
                  name="description"
                  size={18}
                  color={colors.primary}
                />
              }
            />

            <Pressable
              onPress={() => void handleExport('csv')}
              style={({ pressed }) => [
                styles.excelBtn,
                pressed && styles.excelBtnPressed,
              ]}
              hitSlop={6}
            >
              <MaterialIcons name="table-chart" size={15} color={colors.primary} />
              <Text style={styles.excelBtnText}>
                Unduh Tabulasi Kehadiran (Excel)
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* MODAL 1: In-App Surat Edaran Viewer */}
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

      {/* MODAL 2: Upload / Ganti Berkas Confirmation */}
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
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  heroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    gap: spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCode: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.primary,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    fontWeight: '700',
  },
  heroType: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveBadgeText: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSuccessContainer,
  },
  heroTitle: {
    ...typography.headlineSm,
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    lineHeight: 22,
  },
  metaContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.3)',
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    width: '100%',
  },
  metaSplitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  metaTextGroup: {
    flex: 1,
  },
  metaLabel: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '600',
    color: colors.outline,
  },
  metaValue: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: '500',
    marginTop: 1,
  },
  metricsCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    gap: spacing.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  metricsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricsTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metricCol: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.3)',
    overflow: 'hidden',
  },
  metricLabel: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  metricValue: {
    ...typography.headlineLg,
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  metricUnit: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  metricFooter: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  progressSection: {
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  progressValue: {
    ...typography.labelMono,
    fontSize: 11,
    fontWeight: '700',
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
  tabBarWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.4)',
  },
  tabScrollContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 2,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabBtnText: {
    ...typography.labelMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabBadgeVerifiedActive: {
    backgroundColor: colors.primary,
  },
  tabBadgeUnverifiedActive: {
    backgroundColor: colors.error,
  },
  tabBadgeInactive: {
    backgroundColor: colors.surfaceContainer,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tabBadgeTextWhite: {
    color: '#FFFFFF',
  },
  tabBadgeTextInactive: {
    color: colors.onSurfaceVariant,
  },
  tabBadgeDraft: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  tabBadgeDraftActive: {
    backgroundColor: colors.primary,
  },
  tabBadgeTextDraft: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  tabBadgeTextDraftActive: {
    color: '#FFFFFF',
  },
  filterSection: {
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.55)',
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    gap: 8,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurface,
  },
  pokjaChipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  pokjaChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pokjaChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pokjaChipInactive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  chipPressed: {
    opacity: 0.85,
  },
  pokjaChipText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  pokjaChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  participantFeed: {
    gap: spacing.xs + 2,
  },
  participantCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.lg,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  pAvatar: {
    width: 36,
    height: 36,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pContent: {
    flex: 1,
  },
  pTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pName: {
    ...typography.headlineSm,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  pRole: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  pStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pStatusBadgeValid: {
    backgroundColor: colors.successContainer,
    borderColor: 'rgba(5, 150, 105, 0.25)',
  },
  pStatusBadgeWait: {
    backgroundColor: colors.errorContainer,
    borderColor: 'rgba(186, 26, 26, 0.25)',
  },
  pStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pStatusTextValid: {
    color: colors.onSuccessContainer,
  },
  pStatusTextWait: {
    color: colors.onErrorContainer,
  },
  pMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pMetaText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  pMetaValueMono: {
    ...typography.labelMono,
    fontSize: 10.5,
    color: colors.onSurface,
    fontWeight: '600',
  },
  pMetaDot: {
    fontSize: 10,
    color: colors.outline,
  },
  minutesSectionContainer: {
    gap: spacing.sm,
  },
  roleBannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 35, 111, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  roleBannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBannerNotulisIcon: {
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
  },
  roleBannerLeaderIcon: {
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
  },
  roleBannerTitle: {
    ...typography.headlineSm,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  roleBannerSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 15,
  },
  minutesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 2,
    marginBottom: 2,
  },
  minutesSectionTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  minutesSectionSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  minutesHeaderEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(0, 35, 111, 0.15)',
  },
  minutesHeaderEditText: {
    ...typography.labelSm,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  minutesHeaderCancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  minutesHeaderCancelText: {
    ...typography.labelSm,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  minutesCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    gap: spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  minutesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  minutesIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minutesTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  minutesSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  minutesDivider: {
    height: 1,
    backgroundColor: 'rgba(197, 197, 211, 0.3)',
    marginVertical: 2,
  },
  minutesBody: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurface,
    lineHeight: 18,
  },
  minutesEmptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
  },
  minutesEmptyText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.outline,
    flex: 1,
    fontStyle: 'italic',
  },
  minutesInput: {
    ...typography.bodySm,
    minHeight: 110,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.md,
    padding: spacing.md,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    fontSize: 12,
    lineHeight: 18,
  },
  minutesActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  edaranCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    gap: spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  edaranHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  edaranIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  edaranTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  edaranSubtitle: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  edaranContent: {
    gap: spacing.sm,
    marginTop: 2,
  },
  edaranEmptyContent: {
    gap: spacing.sm,
    marginTop: 2,
  },
  edaranDocPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.35)',
  },
  edaranPdfBadge: {
    width: 38,
    height: 38,
    borderRadius: rounded.sm,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  edaranDocName: {
    ...typography.bodySm,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  edaranDocMeta: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  edaranStatusBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  edaranStatusText: {
    ...typography.labelSm,
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.success,
  },
  edaranBtnGroup: {
    gap: spacing.xs,
    marginTop: 2,
  },
  edaranEmptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.3)',
    borderStyle: 'dashed',
    marginTop: 2,
  },
  edaranEmptyTitle: {
    ...typography.labelSm,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  edaranEmptySub: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 15,
  },
  baCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    gap: spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  baHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  baIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  baSubtitle: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  baActionGrid: {
    gap: spacing.xs + 2,
    paddingTop: 2,
  },
  excelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: rounded.sm,
    overflow: 'hidden',
  },
  excelBtnPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  excelBtnText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  managementBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  editMeetingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 35, 111, 0.25)',
  },
  editMeetingBtnText: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteMeetingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    backgroundColor: 'rgba(186, 26, 26, 0.06)',
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.25)',
  },
  deleteMeetingBtnText: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.error,
  },
  btnPressed: {
    opacity: 0.75,
  },
});
