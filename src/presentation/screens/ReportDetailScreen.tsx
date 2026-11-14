import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageStyle,
  Linking,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FilePenLine,
  FileText,
  Globe,
  Image as ImageIcon,
  Link2,
  MapPin,
  Monitor,
  PenTool,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { formatTanggalIndonesia, formatWaktuWIB } from '../../core/utils/dateFormatter';
import { resolveAttendanceMediaUrl, resolveSuratEdaranUrl } from '../../core/utils/mediaUrl';
import { authTokenStore } from '../../data/datasources/authTokenStore';
import {
  ApiAgendaDto,
  ApiAttendanceDto,
  ApiPaginationMeta,
} from '../../data/datasources/apiTypes';
import { attendanceApi } from '../../data/datasources/attendanceApi';
import {
  AgendaExportFormat,
  ApiReportAgendaRecapDto,
  reportApi,
} from '../../data/datasources/reportApi';
import { AgendaExportRepository } from '../../data/repositories/AgendaExportRepository';
import { AutoScrollText } from '../components/common/AutoScrollText';
import { ErrorState } from '../components/common/ErrorState';
import { Header } from '../components/common/Header';
import { PaginationBar } from '../components/common/PaginationBar';
import { SimpleHtmlView } from '../components/common/SimpleHtmlView';
import { StatusPill, StatusPillType } from '../components/common/StatusPill';
import { TutWuriLoader } from '../components/common/TutWuriLoader';
import {
  TutWuriRefreshBanner,
  useTutWuriRefreshControl,
} from '../components/common/TutWuriRefresh';
import { EvidenceViewerModal } from '../components/modals/EvidenceViewerModal';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';
import { useFeedbackStore } from '../store/useFeedbackStore';

export interface ReportDetailScreenProps {
  meetingId: string;
  onBack: () => void;
  onNavigateMonitoring: (meetingId: string) => void;
}

const ATT_COL_WIDTHS = {
  no: 46,
  pegawai: 205,
  unit: 170,
  waktu: 140,
  selfie: 110,
  signature: 120,
} as const;

const ATT_TABLE_MIN_WIDTH =
  ATT_COL_WIDTHS.no +
  ATT_COL_WIDTHS.pegawai +
  ATT_COL_WIDTHS.unit +
  ATT_COL_WIDTHS.waktu +
  ATT_COL_WIDTHS.selfie +
  ATT_COL_WIDTHS.signature;

function mapAgendaStatusToPill(value: ApiAgendaDto['status']['value']): StatusPillType {
  switch (value) {
    case 'ongoing':
      return 'ongoing';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'upcoming';
  }
}

function formatMeetingTypeLabel(tipe: ApiAgendaDto['tipe_rapat']): string {
  switch (tipe) {
    case 'offline':
      return 'Tatap Muka (Luring)';
    case 'online':
      return 'Daring (Virtual)';
    case 'hybrid':
      return 'Hibrida';
    default:
      return tipe;
  }
}

const BearerImage: React.FC<{
  rawUrl?: string | null;
  attendanceId?: number;
  mediaKind?: 'selfie' | 'signature' | 'asset';
  style: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover';
  fallbackLabel?: string;
}> = ({
  rawUrl,
  attendanceId,
  mediaKind = 'asset',
  style,
  resizeMode = 'contain',
  fallbackLabel = 'Media tidak tersedia',
}) => {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const resolved = useMemo(() => {
    if (attendanceId != null && (mediaKind === 'selfie' || mediaKind === 'signature')) {
      return resolveAttendanceMediaUrl(rawUrl, String(attendanceId), mediaKind);
    }
    return resolveSuratEdaranUrl(rawUrl);
  }, [rawUrl, attendanceId, mediaKind]);

  useEffect(() => {
    let active = true;
    if (!resolved) {
      setLocalUri(null);
      setFailed(true);
      return () => {
        active = false;
      };
    }

    if (
      resolved.startsWith('data:image/') ||
      resolved.startsWith('file://') ||
      resolved.startsWith('content://')
    ) {
      setLocalUri(resolved);
      setFailed(false);
      return () => {
        active = false;
      };
    }

    setFailed(false);
    setLocalUri(null);

    const load = async () => {
      try {
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) {
          if (active) setFailed(true);
          return;
        }
        const token = authTokenStore.get();
        const safeKey = resolved.replace(/[^a-zA-Z0-9]/g, '_').slice(-48);
        const dest = `${cacheDir}rep_detail_${mediaKind}_${safeKey}.png`;
        const result = await FileSystem.downloadAsync(resolved, dest, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!active) return;
        if (result.status >= 200 && result.status < 300) {
          setLocalUri(result.uri);
        } else {
          setFailed(true);
        }
      } catch {
        if (active) setFailed(true);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [resolved, mediaKind]);

  if (localUri) {
    return <Image source={{ uri: localUri }} style={style} resizeMode={resizeMode} />;
  }

  return (
    <View style={[style, styles.bearerImageFallback]}>
      {failed ? (
        <Text style={styles.bearerFallbackText} numberOfLines={2}>
          {fallbackLabel}
        </Text>
      ) : (
        <TutWuriLoader size="md" />
      )}
    </View>
  );
};

export const ReportDetailScreen: React.FC<ReportDetailScreenProps> = ({
  meetingId,
  onBack,
  onNavigateMonitoring,
}) => {
  const { showToast } = useFeedbackStore();
  const exportRepoRef = useRef(new AgendaExportRepository());

  const [recapDetail, setRecapDetail] = useState<ApiReportAgendaRecapDto | null>(null);
  const [attendances, setAttendances] = useState<ApiAttendanceDto[]>([]);
  const [attMeta, setAttMeta] = useState<ApiPaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [attPage, setAttPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAttLoading, setIsAttLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<AgendaExportFormat | null>(null);

  const [suratModalVisible, setSuratModalVisible] = useState(false);
  const [evidenceState, setEvidenceState] = useState<{
    visible: boolean;
    initialTab: 'selfie' | 'signature';
    attendance: ApiAttendanceDto | null;
  }>({
    visible: false,
    initialTab: 'selfie',
    attendance: null,
  });

  const loadDetail = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const [recapRes, attRes] = await Promise.all([
          reportApi.getAgendaRecap(meetingId),
          attendanceApi
            .agendaAttendances(meetingId, 1, 10, { status: 'attended' })
            .catch(() => null),
        ]);

        setRecapDetail(recapRes.data);
        if (attRes) {
          setAttendances(attRes.data ?? []);
          setAttMeta(
            attRes.meta ?? {
              current_page: 1,
              last_page: 1,
              per_page: 10,
              total: attRes.data?.length ?? 0,
            },
          );
          setAttPage(attRes.meta?.current_page ?? 1);
        } else {
          const fallbackAtt = recapRes.data.agenda.attendances ?? [];
          setAttendances(fallbackAtt);
          setAttMeta({
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: fallbackAtt.length,
          });
          setAttPage(1);
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Gagal memuat detail rekapitulasi laporan rapat.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [meetingId],
  );

  useEffect(() => {
    void loadDetail('initial');
  }, [loadDetail]);

  const handleAttPageChange = async (nextPage: number) => {
    if (isAttLoading || nextPage < 1 || nextPage > attMeta.last_page) return;
    setIsAttLoading(true);
    try {
      const attRes = await attendanceApi.agendaAttendances(meetingId, nextPage, 10, {
        status: 'attended',
      });
      setAttendances(attRes.data ?? []);
      setAttMeta(
        attRes.meta ?? {
          current_page: nextPage,
          last_page: 1,
          per_page: 10,
          total: attRes.data?.length ?? 0,
        },
      );
      setAttPage(attRes.meta?.current_page ?? nextPage);
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal memuat halaman daftar hadir.',
      });
    } finally {
      setIsAttLoading(false);
    }
  };

  const handleExport = async (format: AgendaExportFormat) => {
    if (exportingFormat) return;
    setExportingFormat(format);
    try {
      const filename = await exportRepoRef.current.downloadAndShare(meetingId, format);
      showToast({
        type: 'success',
        message: `Dokumen ${filename} siap dibagikan.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : `Gagal mengekspor dokumen ${format.toUpperCase()}.`,
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        showToast({ type: 'error', message: 'Tautan tidak dapat dibuka pada perangkat ini.' });
        return;
      }
      await Linking.openURL(url);
    } catch {
      showToast({ type: 'error', message: 'Gagal membuka tautan rapat daring.' });
    }
  };

  const agenda = recapDetail?.agenda ?? null;
  const allKnownAttendances = useMemo(() => {
    const merged = [...attendances, ...(agenda?.attendances ?? [])];
    const map = new Map<number, ApiAttendanceDto>();
    merged.forEach((item) => {
      if (!map.has(item.id)) map.set(item.id, item);
    });
    return Array.from(map.values());
  }, [attendances, agenda?.attendances]);

  const pimpinanAttendance = useMemo(() => {
    if (!agenda?.pimpinan?.id) return null;
    return allKnownAttendances.find((a) => a.user_id === agenda.pimpinan?.id) ?? null;
  }, [agenda?.pimpinan?.id, allKnownAttendances]);

  const notulisAttendance = useMemo(() => {
    if (!agenda?.notulis?.id) return null;
    return allKnownAttendances.find((a) => a.user_id === agenda.notulis?.id) ?? null;
  }, [agenda?.notulis?.id, allKnownAttendances]);

  const penutupText =
    typeof recapDetail?.report_config?.penutup === 'string' &&
    recapDetail.report_config.penutup.trim().length > 0
      ? recapDetail.report_config.penutup.trim()
      : 'Demikian notulensi rapat kedinasan ini disusun secara sah sebagai bagian dari dokumentasi administrasi rapat di lingkungan LLDIKTI Wilayah X.';

  const suratUrl = agenda?.surat_edaran?.stream_url || agenda?.surat_edaran?.url || null;
  const totalAttended = agenda?.total_attended ?? agenda?.attendances_count ?? attMeta.total ?? 0;
  const totalInvited = agenda?.total_invited ?? 0;
  const docsCount = agenda?.documentations?.length ?? 0;
  const creatorUnitCode = agenda?.creator?.unit?.kode_unit || 'Pusat';
  const pimpinanName = agenda?.nama_pimpinan || agenda?.pimpinan?.name || '-';
  const notulisName = agenda?.nama_notulis || agenda?.notulis?.name || '-';

  const handleRefresh = useCallback(() => {
    void loadDetail('refresh');
  }, [loadDetail]);

  const refreshControl = useTutWuriRefreshControl(isRefreshing, handleRefresh);

  return (
    <View style={styles.root}>
      <Header
        title="Rekapitulasi Kehadiran & Dokumen Rapat"
        subtitle="Detail rekapitulasi kehadiran resmi, notulensi rapat, dokumen edaran, dan dokumentasi"
        showBack={true}
        onBack={onBack}
      />

      {isLoading ? (
        <View style={styles.loadingState}>
          <TutWuriLoader size="lg" />
          <Text style={styles.loadingText}>Memuat detail laporan rapat...</Text>
        </View>
      ) : errorMessage || !agenda ? (
        <View style={styles.errorContainer}>
          <ErrorState
            title="Gagal Memuat Detail Laporan"
            message={errorMessage || 'Data rekapitulasi agenda tidak ditemukan.'}
            onRetry={() => loadDetail('initial')}
          />
        </View>
      ) : (
        <View style={styles.scrollWrapper}>
          <TutWuriRefreshBanner refreshing={isRefreshing} />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {/* 1. HERO BANNER (1:1 reports/show.blade.php:10-102) */}
            <View style={styles.heroCard}>
              <View style={styles.heroBadgeRow}>
                <StatusPill
                  status={mapAgendaStatusToPill(agenda.status.value)}
                  label={agenda.status.label}
                />
                <View style={styles.heroFormatPill}>
                  <Text style={styles.heroFormatPillText}>
                    {formatMeetingTypeLabel(agenda.tipe_rapat)}
                  </Text>
                </View>
                {agenda.jenis_rapat ? (
                  <View style={styles.heroJenisPill}>
                    <Text style={styles.heroJenisPillText}>{agenda.jenis_rapat}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.heroTitle}>{agenda.judul_rapat}</Text>

              <View style={styles.heroMetaList}>
                <View style={styles.heroMetaItem}>
                  <Clock size={15} strokeWidth={2} color={colors.borderSubtle} />
                  <Text style={styles.heroMetaText}>
                    {agenda.jadwal_lengkap ||
                      `${formatTanggalIndonesia(agenda.waktu_mulai)}${
                        agenda.rentang_waktu ? ` • ${agenda.rentang_waktu}` : ''
                      }`}
                  </Text>
                </View>

                <View style={styles.heroMetaItem}>
                  {agenda.tipe_rapat === 'online' ? (
                    <Globe size={15} strokeWidth={2} color={colors.borderSubtle} />
                  ) : (
                    <MapPin size={15} strokeWidth={2} color={colors.borderSubtle} />
                  )}
                  <Text style={styles.heroMetaText}>
                    {agenda.lokasi_ruang || 'Daring / Ruang Virtual'}
                  </Text>
                </View>

                <View style={styles.heroMetaItem}>
                  <Users size={15} strokeWidth={2} color={colors.borderSubtle} />
                  <Text style={styles.heroMetaText}>
                    Penyelenggara: {agenda.creator?.name || 'Penyelenggara Rapat'} ({creatorUnitCode})
                  </Text>
                </View>
              </View>

              {/* ACTION TOOLBAR */}
              <View style={styles.heroToolbar}>
                <Pressable
                  onPress={onBack}
                  style={({ pressed }) => [styles.heroGhostBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Kembali ke Daftar Rekapitulasi"
                >
                  <ArrowLeft size={14} strokeWidth={2} color={colors.onPrimary} />
                  <Text style={styles.heroGhostBtnText}>Daftar Rekapitulasi</Text>
                </Pressable>

                {agenda.permissions?.can_manage_minutes ? (
                  <Pressable
                    onPress={() => onNavigateMonitoring(meetingId)}
                    style={({ pressed }) => [styles.heroAmberBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Notulensi dan Format Dokumen"
                  >
                    <FilePenLine size={14} strokeWidth={2} color={colors.primaryDarkest} />
                    <Text style={styles.heroAmberBtnText}>Notulensi & Format Dokumen</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={() => handleExport('pdf')}
                  disabled={exportingFormat !== null}
                  style={({ pressed }) => [styles.heroExportPdfBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Unduh PDF"
                >
                  {exportingFormat === 'pdf' ? (
                    <TutWuriLoader size="sm" />
                  ) : (
                    <FileText size={14} strokeWidth={2} color={colors.onPrimary} />
                  )}
                  <Text style={styles.heroExportPdfBtnText}>Unduh PDF (.pdf)</Text>
                </Pressable>

                <Pressable
                  onPress={() => handleExport('word')}
                  disabled={exportingFormat !== null}
                  style={({ pressed }) => [styles.heroGhostBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Unduh Format Word"
                >
                  {exportingFormat === 'word' ? (
                    <TutWuriLoader size="sm" />
                  ) : (
                    <Download size={14} strokeWidth={2} color={colors.onPrimary} />
                  )}
                  <Text style={styles.heroGhostBtnText}>Unduh Format Word (.docx)</Text>
                </Pressable>

                <Pressable
                  onPress={() => onNavigateMonitoring(meetingId)}
                  style={({ pressed }) => [styles.heroPrimaryWhiteBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Kelola Agenda"
                >
                  <Settings size={14} strokeWidth={2} color={colors.primary} />
                  <Text style={styles.heroPrimaryWhiteBtnText}>Kelola Agenda</Text>
                </Pressable>
              </View>
            </View>

            {/* 2. 5-ITEM METADATA INFO BAR (1:1 reports/show.blade.php:105-138) */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>Ringkasan Administrasi Rapat</Text>
              <View style={styles.metaGrid}>
                <View style={styles.metaTile}>
                  <Text style={styles.metaLabel}>MPI No. / Kode</Text>
                  <Text style={styles.metaValueMono}>
                    {agenda.slug || `AGENDA-${agenda.id}`}
                  </Text>
                </View>

                <View style={styles.metaTile}>
                  <Text style={styles.metaLabel}>Penyelenggara</Text>
                  <Text style={styles.metaValue}>
                    {agenda.creator?.name || 'Penyelenggara'} ({creatorUnitCode})
                  </Text>
                </View>

                <View style={styles.metaTile}>
                  <View style={styles.metaLabelRow}>
                    <Text style={styles.metaLabel}>Pemimpin Rapat</Text>
                    {agenda.pimpinan?.id ? (
                      <View style={styles.khususBadge}>
                        <Text style={styles.khususBadgeText}>Khusus</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.metaValue}>{pimpinanName}</Text>
                </View>

                <View style={styles.metaTile}>
                  <View style={styles.metaLabelRow}>
                    <Text style={styles.metaLabel}>Notulis Rapat</Text>
                    {agenda.notulis?.id ? (
                      <View style={styles.khususBadge}>
                        <Text style={styles.khususBadgeText}>Khusus</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.metaValue}>{notulisName}</Text>
                </View>

                <View style={styles.metaTile}>
                  <Text style={styles.metaLabel}>Total Kehadiran</Text>
                  <Text style={styles.metaValueMono}>
                    {attMeta.total || totalAttended} Pegawai Hadir
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. ONLINE MEETING LINK CARD (1:1 reports/show.blade.php:141-156) */}
            {agenda.link_meeting ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <Link2 size={17} strokeWidth={2} color={colors.primary} />
                  <Text style={styles.sectionHeading}>Tautan Pertemuan Daring</Text>
                </View>
                <AutoScrollText style={styles.linkUrlText}>{agenda.link_meeting}</AutoScrollText>
                <Pressable
                  onPress={() => handleOpenLink(agenda.link_meeting!)}
                  style={({ pressed }) => [styles.primarySmallBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Buka Zoom atau Google Meet"
                >
                  <Text style={styles.primarySmallBtnText}>Buka Zoom / GMeet</Text>
                </Pressable>
              </View>
            ) : null}

            {/* 4. SURAT EDARAN / UNDANGAN RESMI */}
            {suratUrl ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionTitleRow}>
                  <FileText size={17} strokeWidth={2} color={colors.primary} />
                  <Text style={styles.sectionHeading}>Surat Edaran & Undangan Resmi</Text>
                </View>
                <Text style={styles.helperSubText}>
                  {agenda.surat_edaran?.is_digital
                    ? 'Surat Edaran Digital Resmi SIPERAPAT'
                    : `Dokumen Lampiran (${(agenda.surat_edaran?.extension || 'PDF').toUpperCase()})`}
                </Text>
                <Pressable
                  onPress={() => setSuratModalVisible(true)}
                  style={({ pressed }) => [styles.secondaryActionBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Pratinjau Surat Edaran"
                >
                  <FileText size={15} strokeWidth={2} color={colors.primary} />
                  <Text style={styles.secondaryActionBtnText}>Lihat / Bagikan Surat Edaran</Text>
                </Pressable>
                {agenda.surat_edaran?.is_digital ? (
                  <View style={styles.webOnlyNoticeBox}>
                    <Monitor size={15} strokeWidth={2} color={colors.infoText} />
                    <Text style={styles.webOnlyNoticeText}>
                      Pembuatan dan penyuntingan isi naskah surat undangan digital resmi dilakukan
                      melalui portal Website SIPERAPAT.
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* 5. TARGET PARTISIPAN RAPAT (1:1 reports/show.blade.php:166-214) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Building2 size={17} strokeWidth={2} color={colors.primary} />
                <Text style={styles.sectionHeading}>Target Partisipan Rapat</Text>
              </View>
              {agenda.target_type === 'selected_users' ? (
                <View style={styles.targetSelectedWrap}>
                  <View style={styles.targetSelectedHeader}>
                    <View style={styles.targetSelectedHeaderLeft}>
                      <Users size={15} strokeWidth={2} color={colors.textSecondary} />
                      <Text style={styles.targetSelectedTitle}>
                        Khusus Pegawai ASN Tertentu
                      </Text>
                    </View>
                    <View style={styles.targetCountBadge}>
                      <Text style={styles.targetCountBadgeText}>
                        {(agenda.invited_users ?? []).length || totalInvited} Pegawai
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.targetSubLabel}>Daftar Pegawai yang Diundang:</Text>

                  {(agenda.invited_users ?? []).length > 0 ? (
                    <View style={styles.invitedUsersList}>
                      {(agenda.invited_users ?? []).map((u) => (
                        <View key={u.id} style={styles.invitedUserCard}>
                          <AutoScrollText style={styles.invitedUserName}>
                            {u.name}
                          </AutoScrollText>
                          <AutoScrollText style={styles.invitedUserMeta}>
                            NIP: {u.nip || '-'} • {u.unit?.kode_unit || 'Pusat'}
                          </AutoScrollText>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.targetEmptyItalic}>
                      Belum ada ASN yang ditugaskan.
                    </Text>
                  )}
                </View>
              ) : agenda.is_all_units || agenda.target_type === 'all_units' ? (
                <View style={styles.targetAllUnitsBanner}>
                  <CheckCircle2 size={16} strokeWidth={2} color={colors.onSuccessContainer} />
                  <Text style={styles.targetAllUnitsText}>
                    Terbuka untuk Seluruh Unit LLDIKTI
                  </Text>
                </View>
              ) : (
                <View style={styles.targetUnitsWrap}>
                  <Text style={styles.targetSubLabel}>Hanya unit kerja berikut:</Text>
                  <View style={styles.chipWrap}>
                    {(agenda.units ?? []).map((u) => (
                      <View key={u.id} style={styles.targetChip}>
                        <Text style={styles.targetChipText}>
                          {u.kode_unit} — {u.nama_unit}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* 6. STATUS REKAPITULASI (1:1 reports/show.blade.php:217-235) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <ShieldCheck size={17} strokeWidth={2} color={colors.primary} />
                <Text style={styles.sectionHeading}>Status Rekapitulasi</Text>
              </View>
              <View style={styles.statusRowsList}>
                <View style={styles.statusDetailRow}>
                  <Text style={styles.statusDetailLabel}>Status Sesi:</Text>
                  <Text style={styles.statusDetailValue}>{agenda.status.label}</Text>
                </View>
                <View style={styles.statusDetailRow}>
                  <Text style={styles.statusDetailLabel}>Presensi Tervalidasi:</Text>
                  <Text style={styles.statusDetailSuccessMono}>
                    {attMeta.total || totalAttended} Data
                  </Text>
                </View>
                <View style={styles.statusDetailRow}>
                  <Text style={styles.statusDetailLabel}>Metode Verifikasi:</Text>
                  <Text style={styles.statusDetailValue}>Selfie + TTD Digital</Text>
                </View>
              </View>
            </View>

            {/* 7. NOTULENSI RAPAT (1:1 reports/show.blade.php:240-387) */}
            <View style={styles.sectionCard}>
              <View style={styles.notulenHeaderBar}>
                <View style={styles.notulenHeaderLeft}>
                  <BookOpen size={17} strokeWidth={2} color={colors.primary} />
                  <Text style={styles.sectionHeading}>Notulensi Rapat</Text>
                </View>
                {agenda.permissions?.can_manage_minutes ? (
                  <Pressable
                    onPress={() => onNavigateMonitoring(meetingId)}
                    style={({ pressed }) => [styles.editNotulenBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Edit Notulensi"
                  >
                    <Text style={styles.editNotulenBtnText}>Edit Notulensi</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.notulenBlock}>
                <View style={styles.notulenSubHeadingRow}>
                  <View style={styles.notulenCircleBadge}>
                    <Text style={styles.notulenCircleBadgeText}>P</Text>
                  </View>
                  <Text style={styles.notulenSubHeading}>Pembahasan Jalannya Rapat</Text>
                </View>
                <View style={styles.notulenContentIndent}>
                  {agenda.notulensi_html ? (
                    <SimpleHtmlView html={agenda.notulensi_html} />
                  ) : (
                    <Text style={styles.notulenEmptyText}>
                      Notulensi jalannya rapat belum diinput oleh pengelola rapat.
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.notulenBlock}>
                <View style={styles.notulenSubHeadingRow}>
                  <View style={styles.notulenCircleBadge}>
                    <Text style={styles.notulenCircleBadgeText}>K</Text>
                  </View>
                  <Text style={styles.notulenSubHeading}>
                    Kesimpulan, Keputusan & Rencana Tindak Lanjut (RTL)
                  </Text>
                </View>
                <View style={styles.notulenContentIndent}>
                  {agenda.kesimpulan_html ? (
                    <SimpleHtmlView html={agenda.kesimpulan_html} />
                  ) : (
                    <Text style={styles.notulenEmptyText}>
                      Kesimpulan rapat belum diinput.
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.notulenBlock}>
                <View style={styles.notulenSubHeadingRow}>
                  <View style={styles.notulenCircleBadge}>
                    <Check size={11} strokeWidth={2.5} color={colors.onPrimary} />
                  </View>
                  <Text style={styles.notulenSubHeading}>Penutup</Text>
                </View>
                <View style={styles.notulenContentIndent}>
                  <Text style={styles.penutupText}>{penutupText}</Text>
                </View>
              </View>

              {/* Dual Verification Signatures */}
              <View style={styles.dualSignatureGrid}>
                {/* Pemimpin Rapat */}
                <View style={styles.signatureVerifyBox}>
                  <Text style={styles.signatureRoleTitle}>Pemimpin Rapat</Text>
                  <View style={styles.signatureImageWrap}>
                    {pimpinanAttendance?.signature_url ? (
                      <BearerImage
                        rawUrl={pimpinanAttendance.signature_url}
                        attendanceId={pimpinanAttendance.id}
                        mediaKind="signature"
                        style={styles.signatureImg}
                        resizeMode="contain"
                        fallbackLabel="Belum Mengisi Presensi"
                      />
                    ) : (
                      <View style={styles.signatureEmptyDashBox}>
                        <Text style={styles.signaturePendingText}>
                          Belum Mengisi Presensi
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.signaturePersonDivider}>
                    <Text style={styles.signaturePersonName}>{pimpinanName}</Text>
                    {agenda.pimpinan?.nip && agenda.pimpinan.nip !== '-' ? (
                      <Text style={styles.signaturePersonNip}>
                        NIP {agenda.pimpinan.nip}
                      </Text>
                    ) : null}
                    {pimpinanAttendance?.signed_at ? (
                      <View style={styles.signatureValidatedPill}>
                        <Check size={10} strokeWidth={2.5} color={colors.success} />
                        <Text style={styles.signatureValidatedText}>
                          Tervalidasi Hadir ({formatWaktuWIB(pimpinanAttendance.signed_at).slice(0, 5)} WIB)
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Notulis Rapat */}
                <View style={styles.signatureVerifyBox}>
                  <Text style={styles.signatureRoleTitle}>Notulis Rapat</Text>
                  <View style={styles.signatureImageWrap}>
                    {notulisAttendance?.signature_url ? (
                      <BearerImage
                        rawUrl={notulisAttendance.signature_url}
                        attendanceId={notulisAttendance.id}
                        mediaKind="signature"
                        style={styles.signatureImg}
                        resizeMode="contain"
                        fallbackLabel="Belum Mengisi Presensi"
                      />
                    ) : (
                      <View style={styles.signatureEmptyDashBox}>
                        <Text style={styles.signaturePendingText}>
                          Belum Mengisi Presensi
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.signaturePersonDivider}>
                    <Text style={styles.signaturePersonName}>{notulisName}</Text>
                    {agenda.notulis?.nip && agenda.notulis.nip !== '-' ? (
                      <Text style={styles.signaturePersonNip}>
                        NIP {agenda.notulis.nip}
                      </Text>
                    ) : null}
                    {notulisAttendance?.signed_at ? (
                      <View style={styles.signatureValidatedPill}>
                        <Check size={10} strokeWidth={2.5} color={colors.success} />
                        <Text style={styles.signatureValidatedText}>
                          Tervalidasi Hadir ({formatWaktuWIB(notulisAttendance.signed_at).slice(0, 5)} WIB)
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.webOnlyNoticeBox}>
                <Monitor size={15} strokeWidth={2} color={colors.infoText} />
                <Text style={styles.webOnlyNoticeText}>
                  Penyesuaian format lanjutan dokumen laporan agenda dan naskah surat undangan
                  digital dapat dilakukan melalui portal Website SIPERAPAT.
                </Text>
              </View>
            </View>

            {/* 8. TABLE: DAFTAR KEHADIRAN PEGAWAI & VERIFIKASI MEDIA DIGITAL */}
            <View style={styles.tablePanel}>
              <View style={styles.tableHeaderBar}>
                <View style={styles.sectionTitleRow}>
                  <CheckCircle2 size={17} strokeWidth={2} color={colors.success} />
                  <Text style={styles.sectionHeading}>
                    Daftar Kehadiran Pegawai & Verifikasi Media Digital ({attMeta.total || totalAttended})
                  </Text>
                </View>
              </View>

              {isAttLoading ? (
                <View style={styles.loadingInline}>
                  <TutWuriLoader size="md" />
                  <Text style={styles.helperSubText}>Memuat halaman presensi...</Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  bounces={false}
                  overScrollMode="never"
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={true}
                  style={styles.tableScrollView}
                  contentContainerStyle={styles.tableScrollContent}
                >
                  <View style={styles.tableInner} collapsable={false}>
                    <View style={styles.tableColumnHeaderRow}>
                      <Text style={[styles.thCell, { width: ATT_COL_WIDTHS.no }]}>No</Text>
                      <Text style={[styles.thCell, { width: ATT_COL_WIDTHS.pegawai }]}>Pegawai</Text>
                      <Text style={[styles.thCell, { width: ATT_COL_WIDTHS.unit }]}>Unit Kerja</Text>
                      <Text style={[styles.thCell, { width: ATT_COL_WIDTHS.waktu }]}>
                        Waktu Presensi
                      </Text>
                      <Text style={[styles.thCell, { width: ATT_COL_WIDTHS.selfie }]}>
                        Selfie Wajah
                      </Text>
                      <Text style={[styles.thCell, { width: ATT_COL_WIDTHS.signature }]}>
                        Tanda Tangan
                      </Text>
                    </View>

                    {attendances.length === 0 ? (
                      <View style={styles.emptyTableBox}>
                        <Text style={styles.helperSubText}>
                          Belum ada pegawai yang mencatat presensi pada agenda ini.
                        </Text>
                      </View>
                    ) : (
                      attendances.map((att, idx) => {
                        const rowNum = (Math.max(attPage, 1) - 1) * 10 + idx + 1;
                        return (
                          <View
                            key={att.id}
                            style={[
                              styles.tableBodyRow,
                              idx === attendances.length - 1 && styles.tableBodyRowLast,
                            ]}
                          >
                            <View style={[styles.tdCell, { width: ATT_COL_WIDTHS.no }]}>
                              <Text style={styles.rowNumText}>{rowNum}</Text>
                            </View>

                            <View style={[styles.tdCell, { width: ATT_COL_WIDTHS.pegawai }]}>
                              <AutoScrollText style={styles.attNameText}>
                                {att.user?.name || `Pegawai #${att.user_id}`}
                              </AutoScrollText>
                              <AutoScrollText style={styles.attNipMono}>
                                NIP: {att.user?.nip || '-'}
                              </AutoScrollText>
                            </View>

                            <View style={[styles.tdCell, { width: ATT_COL_WIDTHS.unit }]}>
                              <Text style={styles.attUnitText} numberOfLines={2}>
                                {att.user?.unit?.kode_unit
                                  ? `${att.user.unit.kode_unit} • ${att.user.unit.nama_unit}`
                                  : att.user?.unit?.nama_unit || 'Pusat • Tingkat Lembaga'}
                              </Text>
                            </View>

                            <View style={[styles.tdCell, { width: ATT_COL_WIDTHS.waktu }]}>
                              <Text style={styles.attSignedTimeMono}>
                                {att.signed_at ? formatWaktuWIB(att.signed_at) : '-'}
                              </Text>
                              <AutoScrollText style={styles.attIpMono}>
                                IP: {att.ip_address || '127.0.0.1'}
                              </AutoScrollText>
                            </View>

                            <View style={[styles.tdCell, { width: ATT_COL_WIDTHS.selfie }]}>
                              <Pressable
                                onPress={() =>
                                  setEvidenceState({
                                    visible: true,
                                    initialTab: 'selfie',
                                    attendance: att,
                                  })
                                }
                                style={({ pressed }) => [styles.mediaThumbBtn, pressed && styles.pressed]}
                                accessibilityRole="button"
                                accessibilityLabel={`Lihat selfie ${att.user?.name || ''}`}
                              >
                                <Camera size={14} strokeWidth={2} color={colors.primary} />
                                <Text style={styles.mediaThumbBtnText}>Selfie</Text>
                              </Pressable>
                            </View>

                            <View style={[styles.tdCell, { width: ATT_COL_WIDTHS.signature }]}>
                              <Pressable
                                onPress={() =>
                                  setEvidenceState({
                                    visible: true,
                                    initialTab: 'signature',
                                    attendance: att,
                                  })
                                }
                                style={({ pressed }) => [styles.mediaThumbBtn, pressed && styles.pressed]}
                                accessibilityRole="button"
                                accessibilityLabel={`Lihat tanda tangan ${att.user?.name || ''}`}
                              >
                                <PenTool size={14} strokeWidth={2} color={colors.primary} />
                                <Text style={styles.mediaThumbBtnText}>Lihat TTD</Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </ScrollView>
              )}

              {attMeta.total > 0 ? (
                <PaginationBar
                  currentPage={attPage}
                  lastPage={attMeta.last_page}
                  total={attMeta.total}
                  label="Kehadiran"
                  isLoading={isAttLoading}
                  onPageChange={handleAttPageChange}
                  containerStyle={styles.tablePagination}
                />
              ) : null}
            </View>

            {/* 9. DOKUMENTASI FOTO & LAMPIRAN RAPAT */}
            <View style={styles.sectionCard}>
              <View style={styles.docsHeaderBar}>
                <View style={styles.notulenHeaderLeft}>
                  <ImageIcon size={17} strokeWidth={2} color={colors.primary} />
                  <Text style={styles.sectionHeading}>Dokumentasi Foto & Lampiran Rapat</Text>
                </View>
                <Text style={styles.docsCountMono}>{docsCount} File</Text>
              </View>
              {agenda.documentations && agenda.documentations.length > 0 ? (
                <View style={styles.docsGrid}>
                  {agenda.documentations.map((doc) => (
                    <View key={doc.id} style={styles.docCard}>
                      <BearerImage
                        rawUrl={doc.file_url || doc.url}
                        mediaKind="asset"
                        style={styles.docImage}
                        resizeMode="cover"
                        fallbackLabel="Foto dokumentasi tidak dapat dimuat"
                      />
                      {doc.caption ? (
                        <Text style={styles.docCaption}>{doc.caption}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.docsEmptyText}>
                  Belum ada foto dokumentasi yang diunggah untuk agenda ini.
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* MODAL: SURAT EDARAN */}
      <SuratEdaranViewerModal
        visible={suratModalVisible}
        onClose={() => setSuratModalVisible(false)}
        documentUrl={suratUrl}
        meetingTitle={agenda?.judul_rapat}
        meetingCode={agenda?.nomor_ba || (agenda ? `AGENDA-${agenda.id}` : undefined)}
        meetingDate={agenda ? formatTanggalIndonesia(agenda.waktu_mulai) : undefined}
      />

      {/* MODAL: EVIDENCE SELFIE & SIGNATURE */}
      <EvidenceViewerModal
        visible={evidenceState.visible}
        onClose={() =>
          setEvidenceState({ visible: false, initialTab: 'selfie', attendance: null })
        }
        initialTab={evidenceState.initialTab}
        attendanceId={
          evidenceState.attendance ? String(evidenceState.attendance.id) : undefined
        }
        selfieUrl={evidenceState.attendance?.selfie_url}
        signatureUrl={evidenceState.attendance?.signature_url}
        participantName={evidenceState.attendance?.user?.name}
        participantNip={evidenceState.attendance?.user?.nip ?? undefined}
        meetingTitle={agenda?.judul_rapat}
        verificationToken={evidenceState.attendance?.verification_token ?? undefined}
        signedAt={evidenceState.attendance?.signed_at ?? undefined}
        ipAddress={evidenceState.attendance?.ip_address ?? undefined}
        deviceInfo={evidenceState.attendance?.user_agent ?? undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  scrollWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  pressed: {
    opacity: 0.78,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  errorContainer: {
    padding: spacing.md,
  },

  /* Hero Banner */
  heroCard: {
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroFormatPill: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  heroFormatPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onPrimary,
  },
  heroJenisPill: {
    backgroundColor: colors.primaryContainer,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  heroJenisPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onPrimary,
  },
  heroTitle: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  heroMetaList: {
    gap: spacing.xs,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  heroMetaText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.borderSubtle,
    flex: 1,
  },
  heroToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.primary,
  },
  heroGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primary,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET,
  },
  heroGhostBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onPrimary,
  },
  heroAmberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warningSoftBg,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET,
  },
  heroAmberBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.primaryDarkest,
  },
  heroExportPdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET,
  },
  heroExportPdfBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  heroPrimaryWhiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET,
  },
  heroPrimaryWhiteBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },

  /* Generic Section Cards */
  sectionCard: {
    ...cardSurface,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sectionHeading: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    flex: 1,
  },
  helperSubText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },

  /* Metadata Grid */
  metaGrid: {
    gap: spacing.xs + 2,
  },
  metaTile: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    padding: spacing.sm,
    gap: 2,
  },
  metaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  metaValue: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  metaValueMono: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    color: colors.onSurface,
  },
  khususBadge: {
    backgroundColor: colors.warningContainer,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
  },
  khususBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onWarningContainer,
  },

  linkUrlText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.monoRegular,
    color: colors.infoText,
  },
  primarySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    backgroundColor: colors.primary,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  primarySmallBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  secondaryActionBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },

  /* Target Partisipan */
  targetSelectedWrap: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    padding: spacing.sm,
    gap: spacing.xs + 2,
  },
  targetSelectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  targetSelectedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  targetSelectedTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  targetCountBadge: {
    backgroundColor: colors.primary,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  targetCountBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.monoSemiBold,
    color: colors.onPrimary,
  },
  targetSubLabel: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  invitedUsersList: {
    gap: spacing.xs,
  },
  invitedUserCard: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    gap: 2,
  },
  invitedUserName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  invitedUserMeta: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textSecondary,
  },
  targetEmptyItalic: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  targetAllUnitsBanner: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  targetAllUnitsText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.infoText,
  },
  targetUnitsWrap: {
    gap: spacing.xs + 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  targetChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  targetChipText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
  },

  /* Status Rekapitulasi */
  statusRowsList: {
    gap: spacing.xs + 2,
  },
  statusDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 3,
  },
  statusDetailLabel: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    flex: 1,
  },
  statusDetailValue: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  statusDetailSuccessMono: {
    ...typography.labelMd,
    fontFamily: fontFamilies.monoSemiBold,
    color: colors.success,
  },

  /* Notulensi */
  notulenHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  notulenHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flex: 1,
  },
  editNotulenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
  },
  editNotulenBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },
  notulenBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  notulenSubHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  notulenCircleBadge: {
    width: 22,
    height: 22,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notulenCircleBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  notulenSubHeading: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  notulenContentIndent: {
    paddingLeft: spacing.lg + 2,
  },
  notulenEmptyText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  penutupText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  dualSignatureGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  signatureVerifyBox: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 6,
  },
  signatureRoleTitle: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  signatureImageWrap: {
    width: '100%',
    height: 70,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  signatureEmptyDashBox: {
    width: '100%',
    height: 70,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: rounded.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  signatureImg: {
    width: '100%',
    height: '100%',
  },
  signaturePendingText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
    textAlign: 'center',
  },
  signaturePersonDivider: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.xs,
    alignItems: 'center',
    gap: 2,
  },
  signaturePersonName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    textAlign: 'center',
  },
  signaturePersonNip: {
    ...typography.bodySm,
    fontFamily: fontFamilies.monoRegular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  signatureValidatedPill: {
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: 2,
  },
  signatureValidatedText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSuccessContainer,
    textAlign: 'center',
  },

  /* Attendance Table */
  tablePanel: {
    ...cardSurface,
    borderRadius: rounded.lg,
    overflow: 'hidden',
  },
  tableHeaderBar: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  loadingInline: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tableScrollView: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  tableInner: {
    minWidth: ATT_TABLE_MIN_WIDTH + spacing.sm * 2,
    flexGrow: 1,
    backgroundColor: colors.surfaceCard,
  },
  tableColumnHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  thCell: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  tableBodyRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceCard,
  },
  tableBodyRowLast: {
    borderBottomWidth: 0,
  },
  tdCell: {
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  rowNumText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  attNameText: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  attNipMono: {
    ...typography.bodySm,
    fontFamily: fontFamilies.monoRegular,
    color: colors.textMuted,
  },
  attUnitText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textSecondary,
  },
  attSignedTimeMono: {
    ...typography.labelMd,
    fontFamily: fontFamilies.monoSemiBold,
    color: colors.onSurface,
  },
  attIpMono: {
    ...typography.bodySm,
    fontFamily: fontFamilies.monoRegular,
    color: colors.textMuted,
  },
  mediaThumbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
  },
  mediaThumbBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },
  emptyTableBox: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  tablePagination: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
  },

  /* Documentation Grid */
  docsHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  docsCountMono: {
    ...typography.labelMd,
    fontFamily: fontFamilies.monoSemiBold,
    color: colors.textMuted,
  },
  docsEmptyText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
    paddingVertical: spacing.xs,
  },
  docsGrid: {
    gap: spacing.sm,
  },
  docCard: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    overflow: 'hidden',
  },
  docImage: {
    width: '100%',
    height: 190,
    backgroundColor: colors.surfaceContainerLow,
  },
  docCaption: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    padding: spacing.sm,
  },
  bearerImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
    backgroundColor: colors.surfaceSoft,
  },
  bearerFallbackText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
    textAlign: 'center',
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
