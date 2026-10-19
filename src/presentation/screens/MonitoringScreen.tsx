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

interface MonitoringScreenProps {
  meetingId?: string;
  onBack?: () => void;
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
  return html?.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').trim() || 'Notulensi belum tersedia di API.';
}

export const MonitoringScreen: React.FC<MonitoringScreenProps> = ({ onBack, meetingId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('verified');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPokja, setSelectedPokja] = useState('Semua Unit');
  const { getMeetingById } = useMeetingStore();
  const { agendaAttendances, agendaAttendancePage, fetchAgendaAttendances, isLoading, error } = useAttendanceStore();
  const [meeting, setMeeting] = useState<Awaited<ReturnType<typeof getMeetingById>> | null>(null);
  const [agendaError, setAgendaError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) return;
    void getMeetingById(meetingId).then((agenda) => { setMeeting(agenda); setAgendaError(null); }).catch((requestError: unknown) => {
      setMeeting(null);
      setAgendaError(requestError instanceof Error ? requestError.message : 'Gagal memuat detail agenda.');
    });
    void fetchAgendaAttendances(meetingId, 1);
  }, [meetingId, getMeetingById, fetchAgendaAttendances]);

  const handleCopyBANumber = () => {
    useFeedbackStore.getState().showToast({
      type: 'info',
      message: 'Nomor berita acara tidak disediakan oleh API.',
    });
  };

  const handleDownloadPdf = () => {
    useFeedbackStore.getState().showToast({
      type: 'info',
      message: 'Endpoint unduh berita acara belum tersedia di backend.',
    });
  };

  const handleDownloadWord = () => {
    useFeedbackStore.getState().showToast({
      type: 'info',
      message: 'Endpoint ekspor notulensi belum tersedia di backend.',
    });
  };

  const handleDownloadExcel = () => {
    useFeedbackStore.getState().showToast({
      type: 'info',
      message: 'Endpoint ekspor rekap kehadiran belum tersedia di backend.',
    });
  };

  const displayList: Participant[] = useMemo(() => activeTab === 'verified' ? agendaAttendances.map((record) => ({
    name: record.asnName || 'Nama tidak disediakan', role: record.asnJabatan || 'Pegawai', nip: record.asnNip || '',
    time: record.timestamp ? new Date(record.timestamp).toLocaleString('id-ID') : 'Waktu tidak tersedia',
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
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => meetingId && void fetchAgendaAttendances(meetingId, 1)} />}
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
                <Text style={[styles.metricValue, { color: colors.success }]}>{agendaAttendancePage?.total ?? '—'}</Text>
                <Text style={styles.metricUnit}>ASN</Text>
              </View>
              <Text style={[styles.metricFooter, { color: colors.success }]}>
                Jumlah dari API
              </Text>
            </View>

            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>Belum Hadir</Text>
              <View style={styles.metricValueRow}>
                <Text style={[styles.metricValue, { color: colors.error }]}>—</Text>
                <Text style={styles.metricUnit}>ASN</Text>
              </View>
              <Text style={[styles.metricFooter, { color: colors.error }]}>
                Daftar undangan tidak tersedia
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
              <Text style={styles.progressValue}>Rasio undangan tidak disediakan API</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '0%' }]} />
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
              onPress={() => setActiveTab('verified')}
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
                  {agendaAttendancePage?.total ?? '—'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('unverified')}
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
                  —
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('minutes')}
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
                  onChangeText={setSearchQuery}
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
                    onPress={() => setSelectedPokja(chip)}
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
              {error ? <Text style={styles.pRole}>{error}</Text> : activeTab === 'unverified' ? <Text style={styles.pRole}>API tidak menyediakan daftar undangan yang belum presensi.</Text> : filteredList.length === 0 ? <Text style={styles.pRole}>{isLoading ? 'Memuat kehadiran...' : 'Belum ada data kehadiran.'}</Text> : filteredList.map((p, idx) => (
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
                          styles.pStatusBadgeValid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pStatusText,
                            styles.pStatusTextValid,
                          ]}
                        >
                          Tercatat
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
              {activeTab === 'verified' && agendaAttendancePage && agendaAttendancePage.currentPage < agendaAttendancePage.lastPage ? <Pressable onPress={() => meetingId && void fetchAgendaAttendances(meetingId, agendaAttendancePage.currentPage + 1, true)}><Text style={styles.pRole}>Muat halaman berikutnya</Text></Pressable> : null}
            </View>
          </View>
        ) : null}

        {/* NOTULENSI & RTL DRAFT VIEW */}
        {activeTab === 'minutes' ? (
          <View style={styles.minutesCard}>
            <View style={styles.minutesHeader}>
              <View style={styles.minutesIconCircle}>
                <MaterialIcons name="edit-note" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.minutesTitle}>Notulensi Rapat</Text>
                <Text style={styles.minutesSubtitle}>
                  {meeting ? `Agenda: ${meeting.code}` : 'Data notulensi dari agenda'}
                </Text>
              </View>
            </View>
            <View style={styles.minutesDivider} />
            <Text style={styles.minutesBody}>{plainText(meeting?.minutesHtml)}</Text>
          </View>
        ) : null}

        {/* SECTION: EKSPOR DOKUMEN RAPAT */}
        <View style={styles.baCard}>
          <View style={styles.baHeader}>
            <MaterialIcons name="download" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.baTitle}>Ekspor Dokumen Rapat</Text>
              <Text style={styles.baSubtitle}>
                Unduh berita acara dan berkas rekapitulasi resmi
              </Text>
            </View>
          </View>

          {/* BA Number Box */}
          <View style={styles.baNumberBox}>
            <Text style={styles.baNumberLabel}>NOMOR BERITA ACARA</Text>
            <View style={styles.baNumberRow}>
              <Text style={styles.baNumberValue}>
                Tidak disediakan API
              </Text>
              <Pressable
                onPress={handleCopyBANumber}
                style={styles.copyBtn}
                hitSlop={8}
                accessibilityLabel="Salin nomor berita acara"
              >
                <MaterialIcons name="content-copy" size={16} color={colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* Export Buttons */}
          <View style={styles.baActionGrid}>
            <Button
              title="Unduh Berita Acara (PDF)"
              onPress={handleDownloadPdf}
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
              onPress={handleDownloadWord}
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
              onPress={handleDownloadExcel}
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
    gap: 8,
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
  },
  baNumberBox: {
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.3)',
    overflow: 'hidden',
  },
  baNumberLabel: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  baNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  baNumberValue: {
    ...typography.labelMono,
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  copyBtn: {
    padding: 4,
  },
  baActionGrid: {
    gap: spacing.xs + 2,
    paddingTop: 4,
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
});
