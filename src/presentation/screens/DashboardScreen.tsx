import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Calendar,
  CalendarCheck,
  Check,
  CheckSquare,
  ChevronRight,
  Clock,
  Users,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { MeetingCard } from '../components/cards/MeetingCard';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import {
  TutWuriRefreshBanner,
  useTutWuriRefreshControl,
} from '../components/common/TutWuriRefresh';
import { useAuthStore } from '../store/useAuthStore';
import { useMeetingStore } from '../store/useMeetingStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { Meeting } from '../../domain/entities/types';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';

interface DashboardScreenProps {
  onNavigatePresensi: (meetingId: string) => void;
  onNavigateDetail: (meetingId: string, isLeader?: boolean) => void;
  onNavigateAgenda?: () => void;
  onNavigateRiwayat?: () => void;
  onNavigateCreate?: () => void;
  onNavigateReceipt?: (attendanceId: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigatePresensi,
  onNavigateDetail,
  onNavigateAgenda,
  onNavigateRiwayat,
  onNavigateCreate,
  onNavigateReceipt,
}) => {
  const { user } = useAuthStore();
  const canManageMeetings = user?.role === 'administrator' || user?.role === 'admin';
  const {
    dashboardMeetings: meetings,
    dashboardStats,
    isLoading,
    error,
    fetchDashboard,
  } = useMeetingStore();

  const [selectedDocument, setSelectedDocument] = useState<Meeting | null>(null);

  const loadDashboardWithMeta = useCallback(async () => {
    await fetchDashboard();
  }, [fetchDashboard]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboardWithMeta();
    }, [loadDashboardWithMeta])
  );

  const ongoingCount = dashboardStats?.ongoing_agendas;
  const upcomingCount = dashboardStats?.upcoming_agendas;
  const agendaCount = dashboardStats?.total_agendas;
  const attendanceCount = dashboardStats?.my_attendances ?? dashboardStats?.total_attendances;

  const statCards = useMemo(() => {
    const fourthCard =
      user?.role === 'administrator'
        ? {
            key: 'total-users',
            label: 'Total Pengguna',
            value:
              dashboardStats?.total_users === undefined
                ? '—'
                : String(dashboardStats.total_users),
            unit: undefined as string | undefined,
            Icon: Users,
            isHighlight: false,
          }
        : user?.role === 'admin'
        ? {
            key: 'unit-users',
            label: 'Pegawai di Unit',
            value:
              dashboardStats?.total_users === undefined
                ? '—'
                : String(dashboardStats.total_users),
            unit: undefined as string | undefined,
            Icon: Users,
            isHighlight: false,
          }
        : {
            key: 'my-attendances',
            label: 'Riwayat Kehadiran',
            value: attendanceCount === undefined ? '—' : String(attendanceCount),
            unit: attendanceCount === undefined ? undefined : 'Kali',
            Icon: CheckSquare,
            isHighlight: false,
          };

    return [
      {
        key: 'total-agendas',
        label: 'Agenda Rapat',
        value: agendaCount === undefined ? '—' : String(agendaCount),
        unit: undefined as string | undefined,
        Icon: Calendar,
        isHighlight: false,
      },
      {
        key: 'ongoing-agendas',
        label: 'Sedang Berlangsung',
        value: ongoingCount === undefined ? '—' : String(ongoingCount),
        unit: undefined as string | undefined,
        Icon: Clock,
        isHighlight: (ongoingCount ?? 0) > 0,
      },
      {
        key: 'upcoming-agendas',
        label: 'Terjadwal Mendatang',
        value: upcomingCount === undefined ? '—' : String(upcomingCount),
        unit: undefined as string | undefined,
        Icon: CalendarCheck,
        isHighlight: false,
      },
      fourthCard,
    ];
  }, [
    user?.role,
    agendaCount,
    ongoingCount,
    upcomingCount,
    dashboardStats?.total_users,
    attendanceCount,
  ]);

  const handlePdfView = useCallback((meeting: Meeting) => {
    if (meeting.invitationPdfUrl) {
      setSelectedDocument(meeting);
    } else {
      useFeedbackStore
        .getState()
        .showToast({ type: 'info', message: 'Berkas undangan belum tersedia pada agenda ini.' });
    }
  }, []);

  const handleJoinLink = useCallback((url?: string) => {
    if (url) {
      void Linking.openURL(url).catch(() =>
        useFeedbackStore
          .getState()
          .showToast({ type: 'error', message: 'Tautan rapat tidak dapat dibuka.' })
      );
    } else {
      useFeedbackStore
        .getState()
        .showToast({ type: 'info', message: 'Tautan rapat belum tersedia pada agenda ini.' });
    }
  }, []);

  const isRefreshing = isLoading && meetings.length > 0;
  const refreshControl = useTutWuriRefreshControl(isRefreshing, () => {
    void loadDashboardWithMeta();
  });

  return (
    <View style={styles.container}>
      <Header />

      <View style={styles.scrollWrapper}>
        <TutWuriRefreshBanner refreshing={isRefreshing} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
        {/* Title Section (Web SSOT dashboard.blade.php:4-5) */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Dashboard Utama</Text>
          <Text style={styles.mainSubtitle}>
            Ringkasan Aktivitas dan Agenda Rapat Kedinasan
          </Text>
        </View>

        {/* 2x2 Gov-Tech Stat Cards */}
        <View style={styles.bentoGrid}>
          {statCards.map((stat) => {
            const IconComponent = stat.Icon;
            return (
              <View key={stat.key} style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <View style={styles.statValueRow}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    {stat.unit ? (
                      <Text style={styles.statUnit}>{stat.unit}</Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.statIconBox,
                      stat.isHighlight && styles.statIconBoxHighlight,
                    ]}
                  >
                    <IconComponent
                      size={17}
                      strokeWidth={2}
                      color={stat.isHighlight ? colors.success : colors.onPrimary}
                    />
                  </View>
                </View>
                <Text style={styles.statLabel} numberOfLines={2}>
                  {stat.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Active Agendas Header Row (Web SSOT dashboard.blade.php:76-92) */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Calendar size={18} strokeWidth={2} color={colors.onSurface} />
            <Text style={styles.sectionTitle}>Agenda Rapat Terkini</Text>
          </View>

          {(canManageMeetings && onNavigateAgenda) || (!canManageMeetings && onNavigateRiwayat) ? (
            <Pressable
              onPress={canManageMeetings ? onNavigateAgenda : onNavigateRiwayat}
              style={({ pressed }) => [
                styles.sectionCtaBtn,
                pressed && styles.secondaryBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                canManageMeetings ? 'Semua Agenda' : 'Lihat Riwayat Presensi Saya'
              }
            >
              <Text style={styles.sectionCtaText}>
                {canManageMeetings ? 'Semua Agenda' : 'Lihat Riwayat Presensi Saya'}
              </Text>
              {canManageMeetings ? (
                <ChevronRight size={14} strokeWidth={2} color={colors.primary} />
              ) : null}
            </Pressable>
          ) : null}
        </View>

        {error ? <ErrorState message={error} onRetry={loadDashboardWithMeta} /> : null}

        {/* Active Agendas List */}
        {meetings.length > 0 ? (
          <View style={styles.meetingList}>
            {meetings.map((meeting) => {
              const isOngoing = meeting.status === 'ongoing';
              const hasAttended = Boolean(meeting.hasAttended || meeting.myAttendanceId);

              const footerRight = isOngoing ? (
                hasAttended ? (
                  <View style={styles.footerStatusGroup}>
                    <View style={styles.attendedPill}>
                      <Check size={13} strokeWidth={2.5} color={colors.onSuccessContainer} />
                      <Text style={styles.attendedPillText}>Sudah Hadir</Text>
                    </View>
                    {meeting.myAttendanceId && onNavigateReceipt ? (
                      <Pressable
                        onPress={() => onNavigateReceipt(meeting.myAttendanceId!)}
                        style={({ pressed }) => [
                          styles.receiptLinkBtn,
                          pressed && styles.secondaryBtnPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Lihat bukti presensi ${meeting.title}`}
                      >
                        <Text style={styles.receiptLinkText}>Bukti</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <Pressable
                    onPress={() => onNavigatePresensi(meeting.id)}
                    style={({ pressed }) => [
                      styles.presensiNowBtn,
                      pressed && styles.presensiNowBtnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Presensi sekarang untuk ${meeting.title}`}
                  >
                    <CheckSquare size={14} strokeWidth={2} color={colors.onPrimary} />
                    <Text style={styles.presensiNowText}>Presensi Sekarang</Text>
                  </Pressable>
                )
              ) : (
                <Text style={styles.presensiClosedText}>Presensi belum dibuka</Text>
              );

              const isLeader = Boolean(
                user?.id && meeting.leaderId && String(meeting.leaderId) === String(user.id),
              );

              return (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  showAttendance={canManageMeetings}
                  onPressDetail={() => onNavigateDetail(meeting.id, isLeader)}
                  onPressPdf={() => handlePdfView(meeting)}
                  onPressJoinLink={() => handleJoinLink(meeting.zoomUrl)}
                  footerRight={footerRight}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="calendar"
              title="Tidak Ada Agenda Rapat Aktif"
              description="Saat ini tidak ada sesi rapat yang sedang berlangsung atau agenda terjadwal dalam waktu dekat."
              style={styles.emptyStateBox}
            />
            {canManageMeetings ? (
              <View style={styles.emptyActionsRow}>
                {onNavigateAgenda ? (
                  <Pressable
                    onPress={onNavigateAgenda}
                    style={({ pressed }) => [
                      styles.emptyArchiveBtn,
                      pressed && styles.secondaryBtnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Lihat Semua Arsip Agenda"
                  >
                    <Text style={styles.emptyArchiveBtnText}>Lihat Semua Arsip Agenda</Text>
                  </Pressable>
                ) : null}
                {onNavigateCreate ? (
                  <Pressable
                    onPress={onNavigateCreate}
                    style={({ pressed }) => [
                      styles.emptyCreateBtn,
                      pressed && styles.emptyCreateBtnPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Buat Agenda Baru"
                  >
                    <Text style={styles.emptyCreateBtnText}>+ Buat Agenda Baru</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
        </ScrollView>
      </View>

      <SuratEdaranViewerModal
        visible={selectedDocument !== null}
        onClose={() => setSelectedDocument(null)}
        documentUrl={selectedDocument?.invitationPdfUrl}
        fileName={`Surat-Edaran_${selectedDocument?.code || 'Agenda'}.${
          selectedDocument?.suratEdaran?.extension ||
          (selectedDocument?.suratEdaran?.is_image ? 'jpg' : 'pdf')
        }`}
        meetingTitle={selectedDocument?.title}
        meetingCode={selectedDocument?.code}
        meetingDate={`${selectedDocument?.date || ''} ${selectedDocument?.startTime || ''}`.trim()}
        mimeType={selectedDocument?.suratEdaran?.is_image ? 'image/jpeg' : 'application/pdf'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  scrollWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  titleSection: {
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  mainTitle: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 20,
    color: colors.primaryDarkest,
  },
  mainSubtitle: {
    ...typography.bodySm,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.xs,
  },
  statCard: {
    ...cardSurface,
    width: '48.2%',
    minHeight: 88,
    borderRadius: rounded.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
    gap: 8,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.monoBold,
    fontSize: 22,
    lineHeight: 26,
    color: colors.primary,
  },
  statUnit: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: rounded.md + 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconBoxHighlight: {
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  statLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm + 4,
    gap: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansExtraBold,
    color: colors.primaryDarkest,
    fontSize: 16,
  },
  sectionCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  sectionCtaText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primary,
  },
  secondaryBtnPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  meetingList: {
    gap: spacing.md,
  },
  footerStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  attendedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.md,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  attendedPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onSuccessContainer,
  },
  receiptLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  receiptLinkText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primary,
  },
  presensiNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    backgroundColor: colors.success,
  },
  presensiNowBtnPressed: {
    backgroundColor: colors.onSuccessContainer,
  },
  presensiNowText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },
  presensiClosedText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontStyle: 'italic',
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyWrap: {
    gap: spacing.sm,
  },
  emptyStateBox: {
    marginBottom: 0,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingTop: spacing.xs,
  },
  emptyArchiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  emptyArchiveBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primary,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
  },
  emptyCreateBtnPressed: {
    backgroundColor: colors.primaryContainer,
  },
  emptyCreateBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },
});
