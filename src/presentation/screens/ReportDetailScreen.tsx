import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageStyle,
  Linking,
  Pressable,
  RefreshControl,
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
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Link2,
  MapPin,
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
import { ErrorState } from '../components/common/ErrorState';
import { Header } from '../components/common/Header';
import { PaginationBar } from '../components/common/PaginationBar';
import { SimpleHtmlView } from '../components/common/SimpleHtmlView';
import { StatusPill, StatusPillType } from '../components/common/StatusPill';
import { TutWuriLoader } from '../components/common/TutWuriLoader';
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
  const unattendedCount =
    agenda?.unattended_count ?? Math.max(0, totalInvited - totalAttended);
  const participationLabel = agenda?.participation_rate_label ?? '0%';

  return (
    <View style={styles.root}>
      <Header
        title="Detail Rekapitulasi Rapat"
        subtitle="Notulensi resmi, daftar kehadiran, dan verifikasi bukti digital"
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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadDetail('refresh')}
              colors={[colors.primary]}
            />
          }
        >
          {/* 1. HERO BANNER (1:1 reports/show.blade.php) */}
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
                <Calendar size={15} strokeWidth={2} color={colors.borderSubtle} />
                <Text style={styles.heroMetaText}>
                  {agenda.jadwal_lengkap ||
                    `${formatTanggalIndonesia(agenda.waktu_mulai)}${
                      agenda.rentang_waktu ? ` · ${agenda.rentang_waktu}` : ''
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
                  {agenda.lokasi_ruang || 'Pertemuan Virtual (Daring)'}
                </Text>
              </View>

              <View style={styles.heroMetaItem}>
                <Users size={15} strokeWidth={2} color={colors.borderSubtle} />
                <Text style={styles.heroMetaText}>
                  Penyelenggara: {agenda.creator?.name || '-'}
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
                  style={({ pressed }) => [styles.heroGhostBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Kelola Notulensi dan Format Dokumen"
                >
                  <BookOpen size={14} strokeWidth={2} color={colors.onPrimary} />
                  <Text style={styles.heroGhostBtnText}>Notulensi & Format Dokumen</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => handleExport('pdf')}
                disabled={exportingFormat !== null}
                style={({ pressed }) => [styles.heroExportBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Unduh PDF"
              >
                {exportingFormat === 'pdf' ? (
                  <TutWuriLoader size="sm" />
                ) : (
                  <FileText size={14} strokeWidth={2} color={colors.onPrimary} />
                )}
                <Text style={styles.heroExportBtnText}>Unduh PDF (.pdf)</Text>
              </Pressable>

              <Pressable
                onPress={() => handleExport('word')}
                disabled={exportingFormat !== null}
                style={({ pressed }) => [styles.heroExportBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Unduh Format Word"
              >
                {exportingFormat === 'word' ? (
                  <TutWuriLoader size="sm" />
                ) : (
                  <Download size={14} strokeWidth={2} color={colors.onPrimary} />
                )}
                <Text style={styles.heroExportBtnText}>Unduh Format Word (.docx)</Text>
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

          {/* 2. 5-ITEM METADATA INFO BAR */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Ringkasan Administrasi Rapat</Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaTile}>
                <Text style={styles.metaLabel}>MPI No. / Kode</Text>
                <Text style={styles.metaValueMono}>
                  {agenda.nomor_ba || `AGENDA-${agenda.id}`}
                </Text>
              </View>

              <View style={styles.metaTile}>
                <Text style={styles.metaLabel}>Penyelenggara</Text>
                <Text style={styles.metaValue}>{agenda.creator?.name || '-'}</Text>
              </View>

              <View style={styles.metaTile}>
                <View style={styles.metaLabelRow}>
                  <Text style={styles.metaLabel}>Pemimpin Rapat</Text>
                  {agenda.pimpinan?.unit_id &&
                  agenda.creator?.unit_id &&
                  agenda.pimpinan.unit_id !== agenda.creator.unit_id ? (
                    <View style={styles.khususBadge}>
                      <Text style={styles.khususBadgeText}>Khusus</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.metaValue}>
                  {agenda.pimpinan?.name || agenda.nama_pimpinan || '-'}
                </Text>
              </View>

              <View style={styles.metaTile}>
                <View style={styles.metaLabelRow}>
                  <Text style={styles.metaLabel}>Notulis Rapat</Text>
                  {agenda.notulis?.unit_id &&
                  agenda.creator?.unit_id &&
                  agenda.notulis.unit_id !== agenda.creator.unit_id ? (
                    <View style={styles.khususBadge}>
                      <Text style={styles.khususBadgeText}>Khusus</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.metaValue}>
                  {agenda.notulis?.name || agenda.nama_notulis || '-'}
                </Text>
              </View>

              <View style={styles.metaTile}>
                <Text style={styles.metaLabel}>Total Kehadiran</Text>
                <Text style={styles.metaValueSuccess}>
                  {totalAttended} / {totalInvited} Pegawai ({participationLabel})
                </Text>
              </View>
            </View>
          </View>

          {/* 3. ONLINE MEETING LINK CARD */}
          {agenda.link_meeting ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Link2 size={17} strokeWidth={2} color={colors.primary} />
                <Text style={styles.sectionHeading}>Tautan Pertemuan Daring</Text>
              </View>
              <Text style={styles.linkUrlText}>{agenda.link_meeting}</Text>
              <Pressable
                onPress={() => handleOpenLink(agenda.link_meeting!)}
                style={({ pressed }) => [styles.secondaryActionBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Buka Tautan Rapat Daring"
              >
                <ExternalLink size={15} strokeWidth={2} color={colors.primary} />
                <Text style={styles.secondaryActionBtnText}>Buka Tautan Rapat</Text>
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
            </View>
          ) : null}

          {/* 5. TARGET PARTISIPAN RAPAT */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Building2 size={17} strokeWidth={2} color={colors.primary} />
              <Text style={styles.sectionHeading}>Target Partisipan Rapat</Text>
            </View>
            {agenda.is_all_units ? (
              <View style={styles.targetChip}>
                <Text style={styles.targetChipText}>
                  Seluruh Unit Kerja (Tingkat Lembaga LLDIKTI Wilayah X)
                </Text>
              </View>
            ) : agenda.units && agenda.units.length > 0 ? (
              <View style={styles.chipWrap}>
                {agenda.units.map((u) => (
                  <View key={u.id} style={styles.targetChip}>
                    <Text style={styles.targetChipText}>
                      {u.kode_unit} — {u.nama_unit}
                    </Text>
                  </View>
                ))}
              </View>
            ) : agenda.invited_users && agenda.invited_users.length > 0 ? (
              <View style={styles.chipWrap}>
                {agenda.invited_users.map((u) => (
                  <View key={u.id} style={styles.targetChip}>
                    <Text style={styles.targetChipText}>{u.name}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.helperSubText}>
                {agenda.target_label || 'Peserta terdaftar pada sistem'}
              </Text>
            )}
          </View>

          {/* 6. STATUS REKAPITULASI */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <ShieldCheck size={17} strokeWidth={2} color={colors.primary} />
              <Text style={styles.sectionHeading}>Status Rekapitulasi</Text>
            </View>
            <View style={styles.statusStatsRow}>
              <View style={styles.statusStatBox}>
                <Text style={styles.statusStatLabel}>Hadir</Text>
                <Text style={[styles.statusStatValue, styles.textSuccess]}>{totalAttended}</Text>
              </View>
              <View style={styles.statusStatBox}>
                <Text style={styles.statusStatLabel}>Belum Hadir</Text>
                <Text style={styles.statusStatValue}>{unattendedCount}</Text>
              </View>
              <View style={styles.statusStatBox}>
                <Text style={styles.statusStatLabel}>Notulensi</Text>
                <Text
                  style={[
                    styles.statusStatValueSm,
                    agenda.has_notulensi ? styles.textSuccess : styles.textWarning,
                  ]}
                >
                  {agenda.has_notulensi ? 'Lengkap' : 'Belum Diisi'}
                </Text>
              </View>
            </View>
          </View>

          {/* 7. NOTULENSI RAPAT (Pembahasan, Kesimpulan/RTL, Penutup, Dual Signature) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <BookOpen size={17} strokeWidth={2} color={colors.primary} />
              <Text style={styles.sectionHeading}>Notulensi Rapat</Text>
            </View>

            <View style={styles.notulenBlock}>
              <Text style={styles.notulenSubHeading}>Pembahasan</Text>
              {agenda.notulensi_html ? (
                <SimpleHtmlView html={agenda.notulensi_html} />
              ) : (
                <Text style={styles.notulenEmptyText}>Belum ada catatan pembahasan.</Text>
              )}
            </View>

            <View style={styles.notulenBlock}>
              <Text style={styles.notulenSubHeading}>
                Kesimpulan, Keputusan & Rencana Tindak Lanjut (RTL)
              </Text>
              {agenda.kesimpulan_html ? (
                <SimpleHtmlView html={agenda.kesimpulan_html} />
              ) : (
                <Text style={styles.notulenEmptyText}>
                  Belum ada catatan kesimpulan dan rencana tindak lanjut.
                </Text>
              )}
            </View>

            <View style={styles.notulenBlock}>
              <Text style={styles.notulenSubHeading}>Penutup</Text>
              <Text style={styles.penutupText}>{penutupText}</Text>
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
                      fallbackLabel="TTD belum tersedia"
                    />
                  ) : (
                    <Text style={styles.signaturePendingText}>Menunggu TTD Digital</Text>
                  )}
                </View>
                <Text style={styles.signaturePersonName}>
                  {agenda.pimpinan?.name || agenda.nama_pimpinan || '-'}
                </Text>
                {agenda.pimpinan?.nip ? (
                  <Text style={styles.signaturePersonNip}>NIP. {agenda.pimpinan.nip}</Text>
                ) : null}
                {pimpinanAttendance?.signed_at ? (
                  <Text style={styles.signatureSignedAt}>
                    Ditandatangani {formatWaktuWIB(pimpinanAttendance.signed_at)}
                  </Text>
                ) : null}
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
                      fallbackLabel="TTD belum tersedia"
                    />
                  ) : (
                    <Text style={styles.signaturePendingText}>Menunggu TTD Digital</Text>
                  )}
                </View>
                <Text style={styles.signaturePersonName}>
                  {agenda.notulis?.name || agenda.nama_notulis || '-'}
                </Text>
                {agenda.notulis?.nip ? (
                  <Text style={styles.signaturePersonNip}>NIP. {agenda.notulis.nip}</Text>
                ) : null}
                {notulisAttendance?.signed_at ? (
                  <Text style={styles.signatureSignedAt}>
                    Ditandatangani {formatWaktuWIB(notulisAttendance.signed_at)}
                  </Text>
                ) : null}
              </View>
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
                            <Text style={styles.attNameText} numberOfLines={1}>
                              {att.user?.name || `Pegawai #${att.user_id}`}
                            </Text>
                            <Text style={styles.attNipMono} numberOfLines={1}>
                              {att.user?.nip || '-'}
                            </Text>
                          </View>

                          <View style={[styles.tdCell, { width: ATT_COL_WIDTHS.unit }]}>
                            <Text style={styles.attUnitText} numberOfLines={2}>
                              {att.user?.unit?.nama_unit || 'Pusat / Lembaga'}
                            </Text>
                          </View>

                          <View style={[styles.tdCell, { width: ATT_COL_WIDTHS.waktu }]}>
                            <View style={styles.timeBadge}>
                              <Clock size={12} strokeWidth={2} color={colors.onSuccessContainer} />
                              <Text style={styles.timeBadgeText}>
                                {att.signed_at ? formatWaktuWIB(att.signed_at) : '-'}
                              </Text>
                            </View>
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
            <View style={styles.sectionTitleRow}>
              <ImageIcon size={17} strokeWidth={2} color={colors.primary} />
              <Text style={styles.sectionHeading}>Dokumentasi Foto & Lampiran Rapat</Text>
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
              <Text style={styles.helperSubText}>
                Belum ada dokumentasi foto atau lampiran yang diunggah.
              </Text>
            )}
          </View>
        </ScrollView>
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
  heroExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.success,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET,
  },
  heroExportBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
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
  metaValueSuccess: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.success,
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
  statusStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusStatBox: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    padding: spacing.sm,
    gap: 2,
  },
  statusStatLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  statusStatValue: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  statusStatValueSm: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
  },
  textSuccess: {
    color: colors.success,
  },
  textWarning: {
    color: colors.warning,
  },

  /* Notulensi */
  notulenBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  notulenSubHeading: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
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
    gap: 4,
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
  signatureImg: {
    width: '100%',
    height: '100%',
  },
  signaturePendingText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
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
  signatureSignedAt: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.success,
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
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: 3,
  },
  timeBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.monoSemiBold,
    color: colors.onSuccessContainer,
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
});
