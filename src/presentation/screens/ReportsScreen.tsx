import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronsUpDown,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Link2,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { formatTanggalIndonesia } from '../../core/utils/dateFormatter';
import {
  resolveAttendanceMediaUrl,
  resolveSuratEdaranUrl,
} from '../../core/utils/mediaUrl';
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
  ApiReportSummaryDto,
  reportApi,
  ReportFilterParams,
} from '../../data/datasources/reportApi';
import { AgendaExportRepository } from '../../data/repositories/AgendaExportRepository';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Header } from '../components/common/Header';
import { PaginationBar } from '../components/common/PaginationBar';
import { SimpleHtmlView } from '../components/common/SimpleHtmlView';
import { StatusPill, StatusPillType } from '../components/common/StatusPill';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { CalendarDatePickerModal } from '../components/modals/CalendarDatePickerModal';
import { useAuthStore } from '../store/useAuthStore';
import { useEmployeeStore } from '../store/useEmployeeStore';
import { useFeedbackStore } from '../store/useFeedbackStore';

export interface ReportsScreenProps {
  onBack?: () => void;
  onOpenAgenda?: (agendaId: string) => void;
}

type StatusFilterValue = 'all' | 'completed' | 'ongoing' | 'scheduled' | 'cancelled';
type FormatFilterValue = 'all' | 'offline' | 'online' | 'hybrid';

const STATUS_OPTIONS: Array<{ value: StatusFilterValue; label: string }> = [
  { value: 'all', label: 'Semua Status' },
  { value: 'completed', label: 'Selesai' },
  { value: 'ongoing', label: 'Sedang Berlangsung' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

const FORMAT_OPTIONS: Array<{ value: FormatFilterValue; label: string }> = [
  { value: 'all', label: 'Semua Format' },
  { value: 'offline', label: 'Tatap Muka (Luring)' },
  { value: 'online', label: 'Daring (Virtual)' },
  { value: 'hybrid', label: 'Hibrida' },
];

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
      return 'Tatap Muka';
    case 'online':
      return 'Daring';
    case 'hybrid':
      return 'Hibrida';
    default:
      return tipe;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Respons berkas rekap tidak dapat dibaca.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      if (comma < 0) reject(new Error('Format berkas CSV tidak valid.'));
      else resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

const BearerImage: React.FC<{
  rawUrl?: string | null;
  attendanceId?: number;
  style: object;
  resizeMode?: 'contain' | 'cover';
  fallbackLabel?: string;
}> = ({ rawUrl, attendanceId, style, resizeMode = 'contain', fallbackLabel }) => {
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const resolved =
      attendanceId != null
        ? resolveAttendanceMediaUrl(rawUrl, String(attendanceId), 'signature')
        : resolveSuratEdaranUrl(rawUrl);
    if (!resolved) {
      setLocalUri(null);
      setFailed(true);
      return () => {
        active = false;
      };
    }

    setFailed(false);
    const load = async () => {
      try {
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) {
          if (active) setFailed(true);
          return;
        }
        const token = authTokenStore.get();
        const safeKey = resolved.replace(/[^a-zA-Z0-9]/g, '_').slice(-40);
        const dest = `${cacheDir}report_media_${safeKey}.png`;
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
  }, [rawUrl]);

  if (localUri) {
    return <Image source={{ uri: localUri }} style={style} resizeMode={resizeMode} />;
  }

  return (
    <View style={[style, styles.bearerImageFallback]}>
      {failed ? (
        <Text style={styles.bearerFallbackText}>
          {fallbackLabel || 'Tidak dapat memuat media'}
        </Text>
      ) : (
        <ActivityIndicator size="small" color={colors.primary} />
      )}
    </View>
  );
};

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  onBack,
  onOpenAgenda,
}) => {
  const { showToast } = useFeedbackStore();
  const isAdministrator = useAuthStore((state) => state.user?.role === 'administrator');
  const { allUnits, fetchAllUnits } = useEmployeeStore();
  const exportRepoRef = useRef(new AgendaExportRepository());

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [formatFilter, setFormatFilter] = useState<FormatFilterValue>('all');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [activeDateField, setActiveDateField] = useState<'start' | 'end' | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [summary, setSummary] = useState<ApiReportSummaryDto | null>(null);
  const [agendas, setAgendas] = useState<ApiAgendaDto[]>([]);
  const [pagination, setPagination] = useState<ApiPaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isExportingSummaryCsv, setIsExportingSummaryCsv] = useState(false);
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  const [recapModalVisible, setRecapModalVisible] = useState(false);
  const [recapAgendaPreview, setRecapAgendaPreview] = useState<ApiAgendaDto | null>(null);
  const [recapDetail, setRecapDetail] = useState<ApiReportAgendaRecapDto | null>(null);
  const [recapAttendances, setRecapAttendances] = useState<ApiAttendanceDto[]>([]);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapError, setRecapError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdministrator) {
      void fetchAllUnits({ activeOnly: false });
    }
  }, [isAdministrator, fetchAllUnits]);

  const unitFilterOptions = useMemo<AgendaOption[]>(() => {
    const items: AgendaOption[] = [
      {
        id: '',
        title: 'Semua Unit Kerja',
        subtitle: 'Tampilkan laporan seluruh unit kerja LLDIKTI Wilayah X',
        icon: Building2,
      },
    ];
    allUnits.forEach((u) => {
      items.push({
        id: String(u.id),
        title: `${u.kode_unit} — ${u.nama_unit}`,
        subtitle: u.is_active ? u.deskripsi ?? undefined : 'Unit Nonaktif',
        icon: Building2,
      });
    });
    return items;
  }, [allUnits]);

  const selectedUnitLabel = useMemo(() => {
    if (!selectedUnitId) return 'Semua Unit Kerja';
    const found = allUnits.find((u) => String(u.id) === selectedUnitId);
    return found ? `${found.kode_unit} — ${found.nama_unit}` : `Unit #${selectedUnitId}`;
  }, [allUnits, selectedUnitId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeFilters = useMemo<ReportFilterParams>(() => {
    const filters: ReportFilterParams = {};
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (formatFilter !== 'all') filters.tipe = formatFilter;
    if (isAdministrator && selectedUnitId) {
      filters.unit_id = Number(selectedUnitId);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
      filters.start_date = startDate.trim();
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDate.trim())) {
      filters.end_date = endDate.trim();
    }
    return filters;
  }, [statusFilter, formatFilter, isAdministrator, selectedUnitId, startDate, endDate]);

  const hasActiveFilters = Boolean(
    statusFilter !== 'all' ||
      formatFilter !== 'all' ||
      (isAdministrator && selectedUnitId !== '') ||
      debouncedSearch.length > 0 ||
      startDate.trim().length > 0 ||
      endDate.trim().length > 0,
  );

  const loadReports = useCallback(
    async (page: number, mode: 'initial' | 'refresh' | 'list') => {
      if (mode === 'initial') setIsInitialLoading(true);
      else if (mode === 'refresh') setIsRefreshing(true);
      else setIsListLoading(true);

      setErrorMessage(null);
      try {
        const [summaryRes, agendasRes] = await Promise.all([
          reportApi.getSummary(activeFilters),
          reportApi.getAgendas({
            ...activeFilters,
            page,
            per_page: 10,
            search: debouncedSearch || undefined,
          }),
        ]);

        setSummary(summaryRes.data);
        setAgendas(agendasRes.data ?? []);
        setPagination(
          agendasRes.meta ?? {
            current_page: page,
            last_page: 1,
            per_page: 10,
            total: agendasRes.data?.length ?? 0,
          },
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Gagal memuat data laporan dan rekapitulasi.';
        setErrorMessage(message);
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
        setIsListLoading(false);
      }
    },
    [activeFilters, debouncedSearch],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters, debouncedSearch]);

  useEffect(() => {
    void loadReports(currentPage, summary === null ? 'initial' : 'list');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeFilters, debouncedSearch]);

  const handleRefresh = () => {
    void loadReports(currentPage, 'refresh');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setFormatFilter('all');
    setSelectedUnitId('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    setDebouncedSearch(searchQuery.trim());
    setCurrentPage(1);
    void loadReports(1, 'list');
  };

  const handleOpenRecap = async (agenda: ApiAgendaDto) => {
    setRecapAgendaPreview(agenda);
    setRecapDetail(null);
    setRecapAttendances(agenda.attendances ?? []);
    setRecapError(null);
    setRecapModalVisible(true);
    setRecapLoading(true);
    try {
      const [recapRes, attendanceRes] = await Promise.all([
        reportApi.getAgendaRecap(String(agenda.id)),
        attendanceApi
          .agendaAttendances(String(agenda.id), 1, 50, { status: 'attended' })
          .catch(() => null),
      ]);
      setRecapDetail(recapRes.data);
      if (recapRes.data.agenda.attendances && recapRes.data.agenda.attendances.length > 0) {
        setRecapAttendances(recapRes.data.agenda.attendances);
      } else if (attendanceRes?.data) {
        setRecapAttendances(attendanceRes.data);
      }
    } catch (err) {
      setRecapError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat pratinjau detail rekapitulasi laporan.',
      );
    } finally {
      setRecapLoading(false);
    }
  };

  const handleExportSummaryCsv = async () => {
    if (isExportingSummaryCsv) return;
    setIsExportingSummaryCsv(true);
    try {
      const result = await reportApi.exportSummaryCsv(activeFilters);
      const directory = FileSystem.cacheDirectory;
      if (!directory) {
        throw new Error('Penyimpanan sementara perangkat tidak tersedia.');
      }
      const filename =
        result.filename ||
        `SIPERAPAT_rekap-laporan-${new Date().toISOString().slice(0, 10)}.csv`;
      const safeFilename = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
      const uri = `${directory}${safeFilename}`;
      const base64 = await blobToBase64(result.blob);
      await FileSystem.writeAsStringAsync(uri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Fitur berbagi file tidak tersedia pada perangkat ini.');
      }
      await Sharing.shareAsync(uri, {
        mimeType: result.contentType ?? 'text/csv',
        dialogTitle: 'Bagikan Rekapitulasi Laporan CSV',
      });
      showToast({
        type: 'success',
        message: `Berkas ${safeFilename} siap dibagikan.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Gagal mengekspor rekapitulasi CSV.',
      });
    } finally {
      setIsExportingSummaryCsv(false);
    }
  };

  const handleExportAgenda = async (agendaId: number, format: AgendaExportFormat) => {
    const key = `${agendaId}:${format}`;
    if (exportingKey) return;
    setExportingKey(key);
    try {
      const filename = await exportRepoRef.current.downloadAndShare(
        String(agendaId),
        format,
      );
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
      setExportingKey(null);
    }
  };

  const formatStats = summary?.format_stats ?? {
    offline: 0,
    online: 0,
    hybrid: 0,
    pct_offline: 0,
    pct_online: 0,
    pct_hybrid: 0,
  };
  const totalFormatCount =
    formatStats.offline + formatStats.online + formatStats.hybrid;
  const pendingNotulenCount = summary
    ? Math.max(0, summary.completed_agendas - summary.count_with_notulen)
    : 0;

  const activeRecapAgenda = recapDetail?.agenda ?? recapAgendaPreview;
  const activeRecapPenutup =
    typeof recapDetail?.report_config?.penutup === 'string' &&
    recapDetail.report_config.penutup.trim().length > 0
      ? recapDetail.report_config.penutup.trim()
      : 'Demikian notulensi rapat kedinasan ini disusun secara sah sebagai bagian dari dokumentasi administrasi rapat di lingkungan LLDIKTI Wilayah X.';

  const pimpinanAttendance = useMemo(() => {
    if (!activeRecapAgenda?.pimpinan?.id) return null;
    return (
      recapAttendances.find((a) => a.user_id === activeRecapAgenda.pimpinan?.id) ?? null
    );
  }, [activeRecapAgenda, recapAttendances]);

  const notulisAttendance = useMemo(() => {
    if (!activeRecapAgenda?.notulis?.id) return null;
    return (
      recapAttendances.find((a) => a.user_id === activeRecapAgenda.notulis?.id) ?? null
    );
  }, [activeRecapAgenda, recapAttendances]);

  return (
    <View style={styles.container}>
      <Header
        title="Rekapitulasi & Laporan Rapat"
        subtitle="Rekapitulasi kehadiran, notulensi resmi, dan ekspor dokumen rapat kedinasan."
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {isInitialLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              Memuat statistik dan rekapitulasi laporan...
            </Text>
          </View>
        ) : errorMessage && !summary ? (
          <ErrorState
            title="Gagal Memuat Laporan"
            message={errorMessage}
            onRetry={() => loadReports(currentPage, 'initial')}
          />
        ) : (
          <>
            {errorMessage ? (
              <ErrorState
                title="Sebagian Data Gagal Dimuat"
                message={errorMessage}
                onRetry={() => loadReports(currentPage, 'list')}
              />
            ) : null}

            {/* 1. 3 SUMMARY KPI CARDS */}
            {summary ? (
              <View style={styles.summarySection}>
                {/* Card 1: Agenda Rapat */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <View style={styles.summaryIconBox}>
                      <Calendar size={18} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.summaryTitleCol}>
                      <Text style={styles.summaryLabel}>AGENDA RAPAT</Text>
                      <Text style={styles.summaryKpi}>{summary.total_agendas}</Text>
                    </View>
                  </View>
                  <View style={styles.summaryBadgeRow}>
                    <View style={styles.neutralMiniPill}>
                      <Text style={styles.neutralMiniText}>
                        {summary.completed_agendas} Selesai
                      </Text>
                    </View>
                    <View style={styles.warningMiniPill}>
                      <Text style={styles.warningMiniText}>
                        {summary.ongoing_agendas} Berlangsung • {summary.scheduled_agendas} Terjadwal
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Card 2: Kehadiran Pegawai */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <View style={styles.summaryIconBox}>
                      <Users size={18} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.summaryTitleCol}>
                      <Text style={styles.summaryLabel}>KEHADIRAN PEGAWAI</Text>
                      <View style={styles.kpiInlineRow}>
                        <Text style={styles.summaryKpi}>
                          {summary.total_attendances}
                        </Text>
                        <View style={styles.emeraldPill}>
                          <Text style={styles.emeraldPillText}>
                            {summary.attendance_rate}% Rasio
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.summarySubtext}>
                    {summary.attendance_rate_subtext} · Rata-rata{' '}
                    {summary.avg_attendances_per_agenda} aparatur per rapat dinas
                  </Text>
                </View>

                {/* Card 3: Kelengkapan Notulensi */}
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <View style={styles.summaryIconBoxSuccess}>
                      <ClipboardCheck
                        size={18}
                        color={colors.success}
                        strokeWidth={2}
                      />
                    </View>
                    <View style={styles.summaryTitleCol}>
                      <Text style={styles.summaryLabel}>KELENGKAPAN NOTULENSI</Text>
                      <View style={styles.kpiInlineRow}>
                        <Text style={styles.summaryKpi}>
                          {summary.governance_rate}%
                        </Text>
                        <View style={styles.emeraldPill}>
                          <Text style={styles.emeraldPillText}>Rampung</Text>
                        </View>
                        <View style={styles.neutralMiniPill}>
                          <Text style={styles.neutralMiniText}>
                            {summary.count_with_notulen} / {Math.max(1, summary.completed_agendas)} Berkas
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.summaryBadgeRow}>
                    {pendingNotulenCount === 0 ? (
                      <View style={styles.emeraldPill}>
                        <CheckCircle2
                          size={12}
                          color={colors.onSuccessContainer}
                          strokeWidth={2}
                        />
                        <Text style={styles.emeraldPillText}>
                          Semua Notulen Lengkap
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.warningMiniPill}>
                        <Text style={styles.warningMiniText}>
                          {pendingNotulenCount} Belum Diisi
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ) : null}

            {/* 2. DISTRIBUSI FORMAT PELAKSANAAN & PARTISIPASI */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <BarChart3 size={18} color={colors.primary} strokeWidth={2} />
                <Text style={styles.sectionTitle}>
                  Distribusi Format Pelaksanaan
                </Text>
              </View>

              <View style={styles.stackedBarTrack}>
                {totalFormatCount > 0 ? (
                  <>
                    {formatStats.offline > 0 ? (
                      <View
                        style={[
                          styles.stackedSegmentOffline,
                          { flex: formatStats.offline },
                        ]}
                      />
                    ) : null}
                    {formatStats.online > 0 ? (
                      <View
                        style={[
                          styles.stackedSegmentOnline,
                          { flex: formatStats.online },
                        ]}
                      />
                    ) : null}
                    {formatStats.hybrid > 0 ? (
                      <View
                        style={[
                          styles.stackedSegmentHybrid,
                          { flex: formatStats.hybrid },
                        ]}
                      />
                    ) : null}
                  </>
                ) : (
                  <View style={styles.stackedSegmentEmpty} />
                )}
              </View>

              <View style={styles.formatList}>
                <View style={styles.formatRow}>
                  <View style={styles.formatLabelWrap}>
                    <View style={styles.dotOffline} />
                    <Text style={styles.formatLabel}>Tatap Muka (Luring)</Text>
                  </View>
                  <Text style={styles.formatCount}>
                    {formatStats.offline} ({formatStats.pct_offline}%)
                  </Text>
                </View>

                <View style={styles.formatRow}>
                  <View style={styles.formatLabelWrap}>
                    <View style={styles.dotOnline} />
                    <Text style={styles.formatLabel}>Daring (Virtual)</Text>
                  </View>
                  <Text style={styles.formatCount}>
                    {formatStats.online} ({formatStats.pct_online}%)
                  </Text>
                </View>

                <View style={styles.formatRow}>
                  <View style={styles.formatLabelWrap}>
                    <View style={styles.dotHybrid} />
                    <Text style={styles.formatLabel}>Hibrida</Text>
                  </View>
                  <Text style={styles.formatCount}>
                    {formatStats.hybrid} ({formatStats.pct_hybrid}%)
                  </Text>
                </View>
              </View>
            </View>

            {summary && summary.unit_stats.length > 0 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Building2 size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.sectionTitle}>Partisipasi per Unit Kerja</Text>
                </View>
                <View style={styles.participationList}>
                  {summary.unit_stats.map((unit) => (
                    <View key={unit.unit_id} style={styles.participationRow}>
                      <View style={styles.unitCodeBadge}>
                        <Text style={styles.unitCodeText}>{unit.kode_unit}</Text>
                      </View>
                      <View style={styles.participationMeta}>
                        <Text style={styles.participationName} numberOfLines={1}>
                          {unit.nama_unit}
                        </Text>
                        <Text style={styles.participationSub}>
                          {unit.total_users} pegawai terdaftar
                        </Text>
                      </View>
                      <View style={styles.emeraldPill}>
                        <Text style={styles.emeraldPillText}>
                          {unit.attendances_count} hadir
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {summary &&
            summary.unit_stats.length === 0 &&
            summary.member_stats.length > 0 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Users size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.sectionTitle}>
                    Partisipasi Anggota Unit
                  </Text>
                </View>
                <View style={styles.participationList}>
                  {summary.member_stats.map((member) => (
                    <View key={member.user_id} style={styles.participationRow}>
                      <View style={styles.participationMeta}>
                        <Text style={styles.participationName} numberOfLines={1}>
                          {member.name}
                        </Text>
                        <Text style={styles.participationSub} numberOfLines={1}>
                          {member.jabatan || member.nip || 'Pegawai ASN'}
                        </Text>
                      </View>
                      <View style={styles.emeraldPill}>
                        <Text style={styles.emeraldPillText}>
                          {member.attendances_count} hadir
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* 3. FILTER BAR & EXPORT CSV/EXCEL */}
            <View style={styles.sectionCard}>
              <View style={styles.filterHeaderRow}>
                <View style={styles.sectionHeaderRow}>
                  <Filter size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.sectionTitle}>Filter & Ekspor Rekapitulasi</Text>
                </View>
                <Pressable
                  onPress={() => setShowDateFilter((prev) => !prev)}
                  style={styles.filterToggleBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Tampilkan filter tanggal"
                >
                  <Calendar size={14} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.filterToggleText}>
                    {showDateFilter || startDate || endDate ? 'Sembunyikan Tanggal' : 'Rentang Tanggal'}
                  </Text>
                </Pressable>
              </View>

              {/* Search Input */}
              <View style={styles.searchBox}>
                <Search size={18} color={colors.textMuted} strokeWidth={2} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Cari judul rapat atau lokasi..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  returnKeyType="search"
                  onSubmitEditing={handleApplyFilters}
                />
                {searchQuery.length > 0 ? (
                  <Pressable
                    onPress={() => setSearchQuery('')}
                    style={styles.clearSearchBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Hapus pencarian"
                  >
                    <X size={16} color={colors.textMuted} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>

              {/* Date Range Pickers */}
              {(showDateFilter || startDate.length > 0 || endDate.length > 0) ? (
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <Text style={styles.dateLabel}>Dari Tanggal</Text>
                    <Pressable
                      onPress={() => setActiveDateField('start')}
                      style={({ pressed }) => [
                        styles.dateTriggerBtn,
                        pressed && styles.pressedChip,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Pilih tanggal mulai laporan"
                    >
                      <Calendar size={15} color={colors.primary} strokeWidth={2} />
                      <Text
                        style={[
                          styles.dateTriggerText,
                          !startDate && styles.dateTriggerPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {startDate || 'Pilih tanggal...'}
                      </Text>
                      {startDate ? (
                        <Pressable
                          onPress={() => setStartDate('')}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Hapus tanggal mulai"
                        >
                          <X size={14} color={colors.textMuted} strokeWidth={2} />
                        </Pressable>
                      ) : null}
                    </Pressable>
                  </View>

                  <View style={styles.dateField}>
                    <Text style={styles.dateLabel}>Sampai Tanggal</Text>
                    <Pressable
                      onPress={() => setActiveDateField('end')}
                      style={({ pressed }) => [
                        styles.dateTriggerBtn,
                        pressed && styles.pressedChip,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Pilih tanggal akhir laporan"
                    >
                      <Calendar size={15} color={colors.primary} strokeWidth={2} />
                      <Text
                        style={[
                          styles.dateTriggerText,
                          !endDate && styles.dateTriggerPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {endDate || 'Pilih tanggal...'}
                      </Text>
                      {endDate ? (
                        <Pressable
                          onPress={() => setEndDate('')}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel="Hapus tanggal akhir"
                        >
                          <X size={14} color={colors.textMuted} strokeWidth={2} />
                        </Pressable>
                      ) : null}
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* Status Rapat */}
              <View style={styles.filterGroupBlock}>
                <Text style={styles.filterGroupLabel}>Status Rapat</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {STATUS_OPTIONS.map((opt) => {
                    const selected = statusFilter === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setStatusFilter(opt.value)}
                        style={[styles.filterChip, selected && styles.filterChipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            selected && styles.filterChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Format Rapat */}
              <View style={styles.filterGroupBlock}>
                <Text style={styles.filterGroupLabel}>Format Rapat</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {FORMAT_OPTIONS.map((opt) => {
                    const selected = formatFilter === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setFormatFilter(opt.value)}
                        style={[styles.filterChip, selected && styles.filterChipActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            selected && styles.filterChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Unit Kerja Filter (Administrator Only) */}
              {isAdministrator ? (
                <View style={styles.filterGroupBlock}>
                  <Text style={styles.filterGroupLabel}>Unit Kerja</Text>
                  <Pressable
                    onPress={() => setUnitModalVisible(true)}
                    style={({ pressed }) => [
                      styles.unitFilterTrigger,
                      selectedUnitId !== '' && styles.unitFilterTriggerActive,
                      pressed && styles.pressedChip,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Filter unit kerja laporan"
                  >
                    <View style={styles.unitFilterLeft}>
                      <Building2 size={16} color={colors.primary} strokeWidth={2} />
                      <Text style={styles.unitFilterText} numberOfLines={1}>
                        {selectedUnitLabel}
                      </Text>
                    </View>
                    <ChevronsUpDown size={16} color={colors.outline} strokeWidth={2} />
                  </Pressable>
                </View>
              ) : null}

              {/* Explicit Terapkan / Reset + Unduh Rekap CSV / Excel */}
              <View style={styles.filterButtonsRow}>
                <Button
                  title="Terapkan"
                  onPress={handleApplyFilters}
                  variant="primary"
                  size="sm"
                  icon={<Filter size={15} color={colors.onPrimary} strokeWidth={2} />}
                  style={styles.filterActionBtn}
                />
                <Button
                  title="Reset"
                  onPress={handleResetFilters}
                  variant="outline"
                  size="sm"
                  disabled={!hasActiveFilters}
                  icon={<RotateCcw size={15} color={colors.primary} strokeWidth={2} />}
                  style={styles.filterActionBtn}
                />
              </View>

              <View style={styles.exportSummaryDivider}>
                <Button
                  title="Unduh Rekap CSV / Excel"
                  onPress={handleExportSummaryCsv}
                  variant="secondary"
                  size="md"
                  isLoading={isExportingSummaryCsv}
                  icon={<Download size={16} color={colors.primary} strokeWidth={2} />}
                />
              </View>
            </View>

            {/* 4. REKAPITULASI AGENDA LIST */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>
                Daftar Rekapitulasi ({pagination.total})
              </Text>
              {isListLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : null}
            </View>

            {agendas.length === 0 ? (
              <EmptyState
                icon="calendar"
                title="Belum Ada Agenda Laporan"
                description={
                  hasActiveFilters
                    ? 'Tidak ada agenda yang sesuai dengan filter atau pencarian saat ini.'
                    : 'Belum ada agenda rapat yang tercatat pada unit kerja Anda.'
                }
              />
            ) : (
              <View style={styles.agendaList}>
                {agendas.map((agenda) => {
                  const hasNotulen = Boolean(agenda.notulensi_html?.trim());
                  const isCompleted = agenda.status.value === 'completed';
                  const unitCode = agenda.creator?.unit?.kode_unit;

                  return (
                    <View key={agenda.id} style={styles.agendaCard}>
                      <View style={styles.agendaHeaderRow}>
                        <Pressable
                          onPress={() => onOpenAgenda?.(String(agenda.id))}
                          disabled={!onOpenAgenda}
                          style={styles.agendaTitleBtn}
                          accessibilityRole={onOpenAgenda ? 'button' : 'text'}
                        >
                          <Text style={styles.agendaTitle} numberOfLines={2}>
                            {agenda.judul_rapat}
                          </Text>
                        </Pressable>
                        <StatusPill
                          status={mapAgendaStatusToPill(agenda.status.value)}
                          label={agenda.status.label}
                        />
                      </View>

                      <View style={styles.agendaMetaRow}>
                        <Text style={styles.agendaMetaText}>
                          {formatTanggalIndonesia(agenda.waktu_mulai)}
                        </Text>
                        <Text style={styles.metaDot}>·</Text>
                        <Text style={styles.agendaMetaText}>
                          {formatMeetingTypeLabel(agenda.tipe_rapat)}
                        </Text>
                        {unitCode ? (
                          <>
                            <Text style={styles.metaDot}>·</Text>
                            <Text style={styles.agendaMetaMono}>{unitCode}</Text>
                          </>
                        ) : null}
                      </View>

                      <View style={styles.agendaBadgesRow}>
                        <View style={styles.emeraldPill}>
                          <Users
                            size={12}
                            color={colors.onSuccessContainer}
                            strokeWidth={2}
                          />
                          <Text style={styles.emeraldPillText}>
                            {agenda.attendances_count ?? 0} Hadir
                          </Text>
                        </View>

                        {hasNotulen ? (
                          <View style={styles.emeraldPill}>
                            <CheckCircle2
                              size={12}
                              color={colors.onSuccessContainer}
                              strokeWidth={2}
                            />
                            <Text style={styles.emeraldPillText}>
                              Notulensi Lengkap
                            </Text>
                          </View>
                        ) : isCompleted ? (
                          <View style={styles.warningMiniPill}>
                            <Text style={styles.warningMiniText}>
                              Notulensi Belum Diisi
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.neutralMiniPill}>
                            <Text style={styles.neutralMiniText}>
                              Notulensi —
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* ONE-TAP EXPORT & DETAIL BAR */}
                      <View style={styles.exportActionsRow}>
                        {(['pdf', 'word', 'csv'] as AgendaExportFormat[]).map(
                          (fmt) => {
                            const key = `${agenda.id}:${fmt}`;
                            const isThisExporting = exportingKey === key;
                            const IconComp =
                              fmt === 'csv' ? FileSpreadsheet : FileText;
                            return (
                              <Pressable
                                key={fmt}
                                onPress={() => handleExportAgenda(agenda.id, fmt)}
                                disabled={Boolean(exportingKey)}
                                style={({ pressed }) => [
                                  styles.exportChipBtn,
                                  pressed && styles.pressedChip,
                                  Boolean(exportingKey) &&
                                    !isThisExporting &&
                                    styles.disabledChip,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`Ekspor ${fmt.toUpperCase()} untuk ${agenda.judul_rapat}`}
                              >
                                {isThisExporting ? (
                                  <ActivityIndicator
                                    size="small"
                                    color={colors.primary}
                                  />
                                ) : (
                                  <IconComp
                                    size={14}
                                    color={colors.primary}
                                    strokeWidth={2}
                                  />
                                )}
                                <Text style={styles.exportChipText}>
                                  {fmt.toUpperCase()}
                                </Text>
                              </Pressable>
                            );
                          },
                        )}

                        <Pressable
                          onPress={() => handleOpenRecap(agenda)}
                          style={({ pressed }) => [
                            styles.detailChipBtn,
                            pressed && styles.pressedChip,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Lihat detail rekap laporan ${agenda.judul_rapat}`}
                        >
                          <Text style={styles.detailChipText}>Detail</Text>
                          <ArrowUpRight
                            size={14}
                            color={colors.onPrimary}
                            strokeWidth={2}
                          />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <PaginationBar
              currentPage={pagination.current_page}
              lastPage={pagination.last_page}
              total={pagination.total}
              label="agenda"
              isLoading={isListLoading}
              onPageChange={(page) => setCurrentPage(page)}
              containerStyle={styles.paginationWrap}
            />
          </>
        )}
      </ScrollView>

      {/* PRATINJAU DETAIL REKAP LAPORAN MODAL (Web reports/show.blade.php parity) */}
      <Modal
        visible={recapModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRecapModalVisible(false)}
      >
        <View style={styles.recapModalContainer}>
          <View style={styles.recapModalTopBar}>
            <View style={styles.recapTopBarTextWrap}>
              <Text style={styles.recapTopBarTitle}>Detail Rekap Laporan Rapat</Text>
              {activeRecapAgenda?.slug ? (
                <Text style={styles.recapTopBarSlug} numberOfLines={1}>
                  {activeRecapAgenda.slug}
                </Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => setRecapModalVisible(false)}
              style={({ pressed }) => [
                styles.recapCloseBtn,
                pressed && styles.pressedChip,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Tutup pratinjau laporan"
            >
              <X size={20} color={colors.primary} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.recapScroll}
            contentContainerStyle={styles.recapScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {recapLoading && !recapDetail ? (
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>
                  Memuat pratinjau lengkap notulensi & bukti kehadiran...
                </Text>
              </View>
            ) : null}

            {recapError ? (
              <ErrorState
                title="Sebagian Detail Tidak Tersedia"
                message={recapError}
                onRetry={() => {
                  if (recapAgendaPreview) {
                    void handleOpenRecap(recapAgendaPreview);
                  }
                }}
              />
            ) : null}

            {activeRecapAgenda ? (
              <>
                {/* Hero Banner */}
                <View style={styles.recapHeroCard}>
                  <View style={styles.recapHeroBadgesRow}>
                    <View style={styles.recapStatusPill}>
                      <Text style={styles.recapStatusText}>
                        {activeRecapAgenda.status.label}
                      </Text>
                    </View>
                    <View style={styles.recapFormatPill}>
                      <Text style={styles.recapFormatText}>
                        {formatMeetingTypeLabel(activeRecapAgenda.tipe_rapat)}
                      </Text>
                    </View>
                    {activeRecapAgenda.jenis_rapat ? (
                      <View style={styles.recapFormatPill}>
                        <Text style={styles.recapFormatText}>
                          {activeRecapAgenda.jenis_rapat}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.recapHeroTitle}>
                    {activeRecapAgenda.judul_rapat}
                  </Text>

                  <View style={styles.recapHeroMetaList}>
                    <View style={styles.recapHeroMetaRow}>
                      <Calendar size={14} color={colors.onPrimary} strokeWidth={2} />
                      <Text style={styles.recapHeroMetaText}>
                        {activeRecapAgenda.jadwal_lengkap ||
                          formatTanggalIndonesia(activeRecapAgenda.waktu_mulai)}
                      </Text>
                    </View>
                    <View style={styles.recapHeroMetaRow}>
                      <MapPin size={14} color={colors.onPrimary} strokeWidth={2} />
                      <Text style={styles.recapHeroMetaText}>
                        {activeRecapAgenda.lokasi_ruang || 'Daring / Ruang Virtual'}
                      </Text>
                    </View>
                    <View style={styles.recapHeroMetaRow}>
                      <Building2 size={14} color={colors.onPrimary} strokeWidth={2} />
                      <Text style={styles.recapHeroMetaText}>
                        Penyelenggara:{' '}
                        {activeRecapAgenda.creator?.name || 'Administrator Sistem'}
                        {activeRecapAgenda.creator?.unit?.kode_unit
                          ? ` (${activeRecapAgenda.creator.unit.kode_unit})`
                          : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recapHeroActions}>
                    <Pressable
                      onPress={() => handleExportAgenda(activeRecapAgenda.id, 'pdf')}
                      disabled={Boolean(exportingKey)}
                      style={({ pressed }) => [
                        styles.recapExportBtn,
                        pressed && styles.pressedChip,
                      ]}
                      accessibilityRole="button"
                    >
                      <FileText size={15} color={colors.primary} strokeWidth={2} />
                      <Text style={styles.recapExportBtnText}>Unduh PDF (.pdf)</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleExportAgenda(activeRecapAgenda.id, 'word')}
                      disabled={Boolean(exportingKey)}
                      style={({ pressed }) => [
                        styles.recapExportBtn,
                        pressed && styles.pressedChip,
                      ]}
                      accessibilityRole="button"
                    >
                      <FileText size={15} color={colors.primary} strokeWidth={2} />
                      <Text style={styles.recapExportBtnText}>Unduh Format Word (.docx)</Text>
                    </Pressable>

                    {onOpenAgenda ? (
                      <Pressable
                        onPress={() => {
                          const targetId = String(activeRecapAgenda.id);
                          setRecapModalVisible(false);
                          onOpenAgenda(targetId);
                        }}
                        style={({ pressed }) => [
                          styles.recapManageBtn,
                          pressed && styles.pressedChip,
                        ]}
                        accessibilityRole="button"
                      >
                        <Text style={styles.recapManageBtnText}>Kelola Agenda</Text>
                        <ArrowUpRight size={15} color={colors.onPrimary} strokeWidth={2} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {/* Metadata Bar */}
                <View style={styles.sectionCard}>
                  <Text style={styles.recapSectionLabel}>INFORMASI ADMINISTRATIF</Text>
                  <View style={styles.recapMetaGrid}>
                    <View style={styles.recapMetaItem}>
                      <Text style={styles.recapMetaKey}>MPI No. / Kode</Text>
                      <Text style={styles.recapMetaValueMono}>
                        {activeRecapAgenda.nomor_ba || activeRecapAgenda.slug}
                      </Text>
                    </View>
                    <View style={styles.recapMetaItem}>
                      <Text style={styles.recapMetaKey}>Penyelenggara</Text>
                      <Text style={styles.recapMetaValue}>
                        {activeRecapAgenda.creator?.unit?.nama_unit ||
                          activeRecapAgenda.creator?.name ||
                          'Tingkat Lembaga'}
                      </Text>
                    </View>
                    <View style={styles.recapMetaItem}>
                      <Text style={styles.recapMetaKey}>Pemimpin Rapat</Text>
                      <View style={styles.recapInlineBadgeRow}>
                        <Text style={styles.recapMetaValue}>
                          {activeRecapAgenda.nama_pimpinan ||
                            activeRecapAgenda.pimpinan?.name ||
                            '—'}
                        </Text>
                        {activeRecapAgenda.pimpinan?.id ? (
                          <View style={styles.neutralMiniPill}>
                            <Text style={styles.neutralMiniText}>Khusus</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.recapMetaItem}>
                      <Text style={styles.recapMetaKey}>Notulis Rapat</Text>
                      <View style={styles.recapInlineBadgeRow}>
                        <Text style={styles.recapMetaValue}>
                          {activeRecapAgenda.nama_notulis ||
                            activeRecapAgenda.notulis?.name ||
                            '—'}
                        </Text>
                        {activeRecapAgenda.notulis?.id ? (
                          <View style={styles.neutralMiniPill}>
                            <Text style={styles.neutralMiniText}>Khusus</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.recapMetaItem}>
                      <Text style={styles.recapMetaKey}>Total Kehadiran</Text>
                      <Text style={styles.recapMetaValue}>
                        {recapAttendances.length > 0
                          ? recapAttendances.length
                          : activeRecapAgenda.attendances_count ?? 0}{' '}
                        Pegawai Hadir
                      </Text>
                    </View>
                  </View>

                  {activeRecapAgenda.link_meeting ? (
                    <View style={styles.recapLinkBox}>
                      <Link2 size={14} color={colors.primary} strokeWidth={2} />
                      <Text style={styles.recapLinkText} selectable>
                        {activeRecapAgenda.link_meeting}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Target Partisipan Rapat */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Users size={17} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.sectionTitle}>Target Partisipan Rapat</Text>
                  </View>
                  {activeRecapAgenda.is_all_units ||
                  activeRecapAgenda.target_type === 'all_units' ? (
                    <View style={styles.emeraldPill}>
                      <CheckCircle2
                        size={13}
                        color={colors.onSuccessContainer}
                        strokeWidth={2}
                      />
                      <Text style={styles.emeraldPillText}>
                        Seluruh Pegawai LLDIKTI Wilayah X
                      </Text>
                    </View>
                  ) : activeRecapAgenda.target_type === 'selected_users' ? (
                    <View style={styles.recapTargetWrap}>
                      <Text style={styles.recapTargetSub}>
                        Peserta Terundang Khusus (
                        {activeRecapAgenda.invited_users?.length ?? 0} pegawai)
                      </Text>
                      <View style={styles.summaryBadgeRow}>
                        {(activeRecapAgenda.invited_users ?? []).map((u) => (
                          <View key={u.id} style={styles.neutralMiniPill}>
                            <Text style={styles.neutralMiniText}>{u.name}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.summaryBadgeRow}>
                      {(activeRecapAgenda.units ?? []).length > 0 ? (
                        activeRecapAgenda.units?.map((u) => (
                          <View key={u.id} style={styles.neutralMiniPill}>
                            <Text style={styles.neutralMiniText}>
                              {u.kode_unit} — {u.nama_unit}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.summarySubtext}>
                          {activeRecapAgenda.target_label || 'Unit penyelenggara'}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Notulensi Rapat */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <BookOpen size={17} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.sectionTitle}>Notulensi Rapat</Text>
                  </View>

                  <View style={styles.notulenSubsection}>
                    <Text style={styles.notulenHeading}>
                      Pembahasan Jalannya Rapat
                    </Text>
                    {activeRecapAgenda.notulensi_html?.trim() ? (
                      <SimpleHtmlView html={activeRecapAgenda.notulensi_html} />
                    ) : (
                      <Text style={styles.notulenEmptyText}>
                        Pembahasan notulensi rapat belum diisi.
                      </Text>
                    )}
                  </View>

                  <View style={styles.notulenSubsection}>
                    <Text style={styles.notulenHeading}>
                      Kesimpulan, Keputusan & Rencana Tindak Lanjut (RTL)
                    </Text>
                    {activeRecapAgenda.kesimpulan_html?.trim() ? (
                      <SimpleHtmlView html={activeRecapAgenda.kesimpulan_html} />
                    ) : (
                      <Text style={styles.notulenEmptyText}>
                        Kesimpulan dan tindak lanjut belum diisi.
                      </Text>
                    )}
                  </View>

                  <View style={styles.notulenSubsection}>
                    <Text style={styles.notulenHeading}>Penutup</Text>
                    <Text style={styles.notulenBodyText}>{activeRecapPenutup}</Text>
                  </View>
                </View>

                {/* Verifikasi Tanda Tangan Pemimpin & Notulis */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <ShieldCheck size={17} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.sectionTitle}>Verifikasi Tanda Tangan</Text>
                  </View>

                  <View style={styles.signatureVerifyGrid}>
                    <View style={styles.signatureVerifyCard}>
                      <View style={styles.signatureVerifyHeader}>
                        <Award size={15} color={colors.primary} strokeWidth={2} />
                        <Text style={styles.signatureVerifyRole}>Pemimpin Rapat</Text>
                      </View>
                      <Text style={styles.signatureVerifyName}>
                        {activeRecapAgenda.nama_pimpinan ||
                          activeRecapAgenda.pimpinan?.name ||
                          '—'}
                      </Text>
                      {pimpinanAttendance?.signature_url ? (
                        <>
                          <BearerImage
                            rawUrl={pimpinanAttendance.signature_url}
                            attendanceId={pimpinanAttendance.id}
                            style={styles.signatureVerifyImage}
                            fallbackLabel="TTD Pemimpin Rapat"
                          />
                          <View style={styles.emeraldPill}>
                            <CheckCircle2
                              size={12}
                              color={colors.onSuccessContainer}
                              strokeWidth={2}
                            />
                            <Text style={styles.emeraldPillText}>
                              Tervalidasi Hadir
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.neutralMiniPill}>
                          <Text style={styles.neutralMiniText}>
                            Belum Mengisi Presensi
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.signatureVerifyCard}>
                      <View style={styles.signatureVerifyHeader}>
                        <UserCheck size={15} color={colors.primary} strokeWidth={2} />
                        <Text style={styles.signatureVerifyRole}>Notulis Rapat</Text>
                      </View>
                      <Text style={styles.signatureVerifyName}>
                        {activeRecapAgenda.nama_notulis ||
                          activeRecapAgenda.notulis?.name ||
                          '—'}
                      </Text>
                      {notulisAttendance?.signature_url ? (
                        <>
                          <BearerImage
                            rawUrl={notulisAttendance.signature_url}
                            attendanceId={notulisAttendance.id}
                            style={styles.signatureVerifyImage}
                            fallbackLabel="TTD Notulis Rapat"
                          />
                          <View style={styles.emeraldPill}>
                            <CheckCircle2
                              size={12}
                              color={colors.onSuccessContainer}
                              strokeWidth={2}
                            />
                            <Text style={styles.emeraldPillText}>
                              Tervalidasi Hadir
                            </Text>
                          </View>
                        </>
                      ) : (
                        <View style={styles.neutralMiniPill}>
                          <Text style={styles.neutralMiniText}>
                            Belum Mengisi Presensi
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Dokumentasi Rapat */}
                {activeRecapAgenda.documentations &&
                activeRecapAgenda.documentations.length > 0 ? (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                      Dokumentasi Rapat ({activeRecapAgenda.documentations.length})
                    </Text>
                    <View style={styles.docGrid}>
                      {activeRecapAgenda.documentations.map((doc) => (
                        <View key={doc.id} style={styles.docCard}>
                          <BearerImage
                            rawUrl={doc.url || doc.file_url}
                            style={styles.docThumb}
                            resizeMode="cover"
                            fallbackLabel="Foto Dokumentasi"
                          />
                          {doc.caption ? (
                            <Text style={styles.docCaption} numberOfLines={2}>
                              {doc.caption}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <CalendarDatePickerModal
        visible={activeDateField !== null}
        onClose={() => setActiveDateField(null)}
        selectedDate={activeDateField === 'start' ? startDate : endDate}
        title={
          activeDateField === 'start'
            ? 'Pilih Tanggal Mulai'
            : 'Pilih Tanggal Akhir'
        }
        subtitle="Filter rekapitulasi agenda berdasarkan rentang tanggal"
        onSelectDate={(dateIso) => {
          if (activeDateField === 'start') {
            setStartDate(dateIso);
          } else if (activeDateField === 'end') {
            setEndDate(dateIso);
          }
          setActiveDateField(null);
        }}
      />

      {isAdministrator ? (
        <AgendaOptionModal
          visible={unitModalVisible}
          onClose={() => setUnitModalVisible(false)}
          title="Filter Unit Kerja"
          subtitle="Saring laporan dan statistik berdasarkan unit kerja"
          options={unitFilterOptions}
          selectedId={selectedUnitId}
          searchable
          searchPlaceholder="Cari nama atau kode unit..."
          onSelect={(opt) => {
            setSelectedUnitId(opt.id);
            setUnitModalVisible(false);
          }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
  },
  topActionCard: {
    ...cardSurface,
    padding: spacing.md,
    gap: spacing.sm + 4,
  },
  topActionTextWrap: {
    gap: 2,
  },
  topActionTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  topActionSubtitle: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  loadingCard: {
    ...cardSurface,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  summarySection: {
    gap: spacing.sm + 2,
  },
  summaryCard: {
    ...cardSurface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  summaryIconBox: {
    width: 40,
    height: 40,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconBoxSuccess: {
    width: 40,
    height: 40,
    borderRadius: rounded.md,
    backgroundColor: colors.successContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitleCol: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  kpiInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryKpi: {
    ...typography.headlineLgMobile,
    fontFamily: fontFamilies.sansExtraBold,
    color: colors.primary,
  },
  summarySubtext: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  summaryBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  neutralMiniPill: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  neutralMiniText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  warningMiniPill: {
    backgroundColor: colors.warningContainer,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  warningMiniText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    color: colors.onWarningContainer,
  },
  emeraldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  emeraldPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    color: colors.onSuccessContainer,
  },
  sectionCard: {
    ...cardSurface,
    padding: spacing.md,
    gap: spacing.sm + 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  stackedBarTrack: {
    height: 12,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainer,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stackedSegmentOffline: {
    backgroundColor: colors.primary,
    height: '100%',
  },
  stackedSegmentOnline: {
    backgroundColor: colors.secondaryContainer,
    height: '100%',
  },
  stackedSegmentHybrid: {
    backgroundColor: colors.successLight,
    height: '100%',
  },
  stackedSegmentEmpty: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
  },
  formatList: {
    gap: spacing.xs + 4,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formatLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotOffline: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  dotOnline: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondaryContainer,
  },
  dotHybrid: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.successLight,
  },
  formatLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  formatCount: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoSemiBold,
    color: colors.onSurface,
  },
  participationList: {
    gap: spacing.sm,
  },
  participationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  unitCodeBadge: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unitCodeText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    color: colors.primary,
  },
  participationMeta: {
    flex: 1,
    gap: 2,
  },
  participationName: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  participationSub: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textMuted,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  filterHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterToggleBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 10,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterToggleText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },
  resetFilterBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 10,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.errorContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetFilterText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onErrorContainer,
  },
  searchBox: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    paddingLeft: spacing.sm + 4,
    paddingRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: 10,
  },
  clearSearchBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
    gap: 4,
  },
  dateLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
  },
  dateTriggerBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTriggerText: {
    ...typography.labelMono,
    color: colors.onSurface,
    flex: 1,
  },
  dateTriggerPlaceholder: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  filterGroupBlock: {
    gap: 6,
  },
  filterGroupLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.textSecondary,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterActionBtn: {
    flex: 1,
  },
  exportSummaryDivider: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  chipsRow: {
    gap: 8,
  },
  filterChip: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  listTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  agendaList: {
    gap: spacing.sm + 2,
  },
  agendaCard: {
    ...cardSurface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  agendaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  agendaTitleBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  agendaTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  agendaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  agendaMetaText: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  agendaMetaMono: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 11,
    color: colors.primary,
  },
  metaDot: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  agendaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  exportActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  exportChipBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exportChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  detailChipBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  detailChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  pressedChip: {
    opacity: 0.78,
  },
  disabledChip: {
    opacity: 0.5,
  },
  paginationWrap: {
    marginTop: spacing.xs,
  },
  unitFilterTrigger: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 10,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  unitFilterTriggerActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  unitFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  unitFilterText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
    flex: 1,
  },
  bearerImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    padding: spacing.xs,
  },
  bearerFallbackText: {
    ...typography.labelSm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  recapModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  recapModalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  recapTopBarTextWrap: {
    flex: 1,
    gap: 2,
  },
  recapTopBarTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  recapTopBarSlug: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.textMuted,
  },
  recapCloseBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recapScroll: {
    flex: 1,
  },
  recapScrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl + spacing.lg,
  },
  recapHeroCard: {
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  recapHeroBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recapStatusPill: {
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  recapStatusText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  recapFormatPill: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
  },
  recapFormatText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onPrimary,
  },
  recapHeroTitle: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansExtraBold,
    color: colors.onPrimary,
  },
  recapHeroMetaList: {
    gap: 6,
  },
  recapHeroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recapHeroMetaText: {
    ...typography.bodySm,
    color: colors.onPrimary,
    flex: 1,
  },
  recapHeroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: spacing.xs,
  },
  recapExportBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recapExportBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  recapManageBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recapManageBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  recapSectionLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  recapMetaGrid: {
    gap: spacing.sm,
  },
  recapMetaItem: {
    gap: 2,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  recapMetaKey: {
    ...typography.labelSm,
    color: colors.textMuted,
  },
  recapMetaValue: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  recapMetaValueMono: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    color: colors.primary,
  },
  recapInlineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  recapLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.sm,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  recapLinkText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.primary,
    flex: 1,
  },
  recapTargetWrap: {
    gap: 6,
  },
  recapTargetSub: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
  },
  notulenSubsection: {
    gap: 6,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  notulenHeading: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  notulenEmptyText: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  notulenBodyText: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  signatureVerifyGrid: {
    gap: spacing.sm,
  },
  signatureVerifyCard: {
    padding: spacing.sm + 4,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 8,
    alignItems: 'flex-start',
  },
  signatureVerifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  signatureVerifyRole: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  signatureVerifyName: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  signatureVerifyImage: {
    width: '100%',
    height: 84,
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  docGrid: {
    gap: spacing.sm,
  },
  docCard: {
    gap: 6,
    padding: spacing.xs,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  docThumb: {
    width: '100%',
    height: 160,
    borderRadius: rounded.sm,
  },
  docCaption: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
