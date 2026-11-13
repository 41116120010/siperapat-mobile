import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  ScrollViewInstance,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  RotateCcw,
  Users,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { formatTanggalIndonesia } from '../../core/utils/dateFormatter';
import {
  ApiAgendaDto,
  ApiPaginationMeta,
} from '../../data/datasources/apiTypes';
import {
  AgendaExportFormat,
  ApiReportSummaryDto,
  reportApi,
  ReportFilterParams,
} from '../../data/datasources/reportApi';
import { AgendaExportRepository } from '../../data/repositories/AgendaExportRepository';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { Header } from '../components/common/Header';
import { PaginationBar } from '../components/common/PaginationBar';
import { StatusPill, StatusPillType } from '../components/common/StatusPill';
import { TutWuriLoader } from '../components/common/TutWuriLoader';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { CalendarDatePickerModal } from '../components/modals/CalendarDatePickerModal';
import { useAuthStore } from '../store/useAuthStore';
import { useEmployeeStore } from '../store/useEmployeeStore';
import { useFeedbackStore } from '../store/useFeedbackStore';

export interface ReportsScreenProps {
  onBack?: () => void;
  onOpenAgenda?: (agendaId: string) => void;
}

type StatusFilterValue = 'all' | 'completed' | 'ongoing' | 'scheduled';
type FormatFilterValue = 'all' | 'offline' | 'online' | 'hybrid';

interface AppliedReportFilters {
  startDate: string;
  endDate: string;
  status: StatusFilterValue;
  format: FormatFilterValue;
  unitId: string;
}

const DEFAULT_REPORT_FILTERS: AppliedReportFilters = {
  startDate: '',
  endDate: '',
  status: 'all',
  format: 'all',
  unitId: '',
};

const STATUS_OPTIONS: Array<{ value: StatusFilterValue; label: string }> = [
  { value: 'all', label: 'Semua Status' },
  { value: 'completed', label: 'Selesai' },
  { value: 'ongoing', label: 'Sedang Berlangsung' },
  { value: 'scheduled', label: 'Terjadwal' },
];

const FORMAT_OPTIONS: Array<{ value: FormatFilterValue; label: string }> = [
  { value: 'all', label: 'Semua Format' },
  { value: 'offline', label: 'Tatap Muka (Luring)' },
  { value: 'online', label: 'Daring (Virtual)' },
  { value: 'hybrid', label: 'Hibrida' },
];

const COL_WIDTHS = {
  agenda: 245,
  peserta: 105,
  status: 135,
  notulensi: 122,
  ekspor: 230,
} as const;

const TABLE_MIN_WIDTH =
  COL_WIDTHS.agenda +
  COL_WIDTHS.peserta +
  COL_WIDTHS.status +
  COL_WIDTHS.notulensi +
  COL_WIDTHS.ekspor;

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

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  onBack,
  onOpenAgenda,
}) => {
  const navigation = useNavigation<any>();
  const { showToast } = useFeedbackStore();
  const isAdministrator = useAuthStore((state) => state.user?.role === 'administrator');
  const { allUnits, fetchAllUnits } = useEmployeeStore();
  const exportRepoRef = useRef(new AgendaExportRepository());
  const scrollViewRef = useRef<ScrollViewInstance | null>(null);

  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftStatus, setDraftStatus] = useState<StatusFilterValue>('all');
  const [draftFormat, setDraftFormat] = useState<FormatFilterValue>('all');
  const [draftUnitId, setDraftUnitId] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<AppliedReportFilters>(DEFAULT_REPORT_FILTERS);

  const [activeDateField, setActiveDateField] = useState<'start' | 'end' | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<'none' | 'status' | 'format' | 'unit'>('none');

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

  useEffect(() => {
    if (isAdministrator) {
      void fetchAllUnits({ activeOnly: false });
    }
  }, [isAdministrator, fetchAllUnits]);

  const statusModalOptions = useMemo<AgendaOption[]>(
    () =>
      STATUS_OPTIONS.map((item) => ({
        id: item.value,
        title: item.label,
        icon: Filter,
      })),
    [],
  );

  const formatModalOptions = useMemo<AgendaOption[]>(
    () =>
      FORMAT_OPTIONS.map((item) => ({
        id: item.value,
        title: item.label,
        icon: BarChart3,
      })),
    [],
  );

  const unitModalOptions = useMemo<AgendaOption[]>(() => {
    const items: AgendaOption[] = [
      { id: '', title: 'Semua Unit Kerja', icon: Building2 },
    ];
    allUnits.forEach((u) => {
      items.push({
        id: String(u.id),
        title: `${u.kode_unit} — ${u.nama_unit}`,
        icon: Building2,
      });
    });
    return items;
  }, [allUnits]);

  const selectedStatusLabel =
    STATUS_OPTIONS.find((item) => item.value === draftStatus)?.label ?? 'Semua Status';
  const selectedFormatLabel =
    FORMAT_OPTIONS.find((item) => item.value === draftFormat)?.label ?? 'Semua Format';
  const selectedUnitLabel = useMemo(() => {
    if (!draftUnitId) return 'Semua Unit Kerja';
    const found = allUnits.find((u) => String(u.id) === draftUnitId);
    return found ? `${found.kode_unit} — ${found.nama_unit}` : `Unit #${draftUnitId}`;
  }, [allUnits, draftUnitId]);

  const activeApiFilters = useMemo<ReportFilterParams>(() => {
    const filters: ReportFilterParams = {};
    if (appliedFilters.status !== 'all') filters.status = appliedFilters.status;
    if (appliedFilters.format !== 'all') filters.tipe = appliedFilters.format;
    if (isAdministrator && appliedFilters.unitId) {
      filters.unit_id = Number(appliedFilters.unitId);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(appliedFilters.startDate)) {
      filters.start_date = appliedFilters.startDate;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(appliedFilters.endDate)) {
      filters.end_date = appliedFilters.endDate;
    }
    return filters;
  }, [appliedFilters, isAdministrator]);

  const hasActiveFilters = Boolean(
    appliedFilters.status !== 'all' ||
      appliedFilters.format !== 'all' ||
      appliedFilters.unitId !== '' ||
      appliedFilters.startDate !== '' ||
      appliedFilters.endDate !== '' ||
      draftStatus !== 'all' ||
      draftFormat !== 'all' ||
      draftUnitId !== '' ||
      draftStartDate !== '' ||
      draftEndDate !== '',
  );

  const loadReports = useCallback(
    async (page: number, mode: 'initial' | 'refresh' | 'list') => {
      if (mode === 'initial') setIsInitialLoading(true);
      else if (mode === 'refresh') setIsRefreshing(true);
      else setIsListLoading(true);

      setErrorMessage(null);
      try {
        const [summaryRes, agendasRes] = await Promise.all([
          reportApi.getSummary(activeApiFilters),
          reportApi.getAgendas({
            ...activeApiFilters,
            page,
            per_page: 10,
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
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Gagal memuat data laporan dan rekapitulasi.',
        );
      } finally {
        setIsInitialLoading(false);
        setIsRefreshing(false);
        setIsListLoading(false);
      }
    },
    [activeApiFilters],
  );

  useEffect(() => {
    void loadReports(currentPage, summary === null ? 'initial' : 'list');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeApiFilters]);

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setAppliedFilters({
      startDate: draftStartDate.trim(),
      endDate: draftEndDate.trim(),
      status: draftStatus,
      format: draftFormat,
      unitId: draftUnitId,
    });
  };

  const handleResetFilters = () => {
    setDraftStartDate('');
    setDraftEndDate('');
    setDraftStatus('all');
    setDraftFormat('all');
    setDraftUnitId('');
    setCurrentPage(1);
    setAppliedFilters(DEFAULT_REPORT_FILTERS);
  };

  const handleRefresh = () => {
    void loadReports(currentPage, 'refresh');
  };

  const handlePageChange = (targetPage: number) => {
    if (isListLoading || targetPage < 1 || targetPage > pagination.last_page) return;
    setCurrentPage(targetPage);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleOpenDetail = (agendaId: number) => {
    const idStr = String(agendaId);
    if (onOpenAgenda) {
      onOpenAgenda(idStr);
    } else {
      navigation.navigate('ReportDetail', { meetingId: idStr });
    }
  };

  const handleExportSummaryCsv = async () => {
    if (isExportingSummaryCsv) return;
    setIsExportingSummaryCsv(true);
    try {
      const result = await reportApi.exportSummaryCsv(activeApiFilters);
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

  return (
    <View style={styles.root}>
      <Header
        title="Rekapitulasi & Laporan Rapat"
        subtitle="Rekapitulasi kehadiran, notulensi resmi, dan ekspor dokumen rapat kedinasan."
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView
        ref={scrollViewRef}
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
            <TutWuriLoader size="lg" />
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

            {/* 1. 3 KPI CARDS */}
            {summary ? (
              <View style={styles.summarySection}>
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

                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <View style={styles.summaryIconBox}>
                      <Users size={18} color={colors.primary} strokeWidth={2} />
                    </View>
                    <View style={styles.summaryTitleCol}>
                      <Text style={styles.summaryLabel}>KEHADIRAN PEGAWAI</Text>
                      <View style={styles.kpiInlineRow}>
                        <Text style={styles.summaryKpi}>{summary.total_attendances}</Text>
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

                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <View style={styles.summaryIconBoxSuccess}>
                      <ClipboardCheck size={18} color={colors.success} strokeWidth={2} />
                    </View>
                    <View style={styles.summaryTitleCol}>
                      <Text style={styles.summaryLabel}>KELENGKAPAN NOTULENSI</Text>
                      <View style={styles.kpiInlineRow}>
                        <Text style={styles.summaryKpi}>{summary.governance_rate}%</Text>
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
                        <Text style={styles.emeraldPillText}>Semua Notulen Lengkap</Text>
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

            {/* 2. VISUAL PANELS: DISTRIBUSI FORMAT & PARTISIPASI */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <BarChart3 size={18} color={colors.primary} strokeWidth={2} />
                <Text style={styles.sectionTitle}>Distribusi Format Pelaksanaan Rapat</Text>
              </View>

              <View style={styles.stackedBarTrack}>
                {totalFormatCount > 0 ? (
                  <>
                    {formatStats.offline > 0 ? (
                      <View
                        style={[styles.stackedSegmentOffline, { flex: formatStats.offline }]}
                      />
                    ) : null}
                    {formatStats.online > 0 ? (
                      <View
                        style={[styles.stackedSegmentOnline, { flex: formatStats.online }]}
                      />
                    ) : null}
                    {formatStats.hybrid > 0 ? (
                      <View
                        style={[styles.stackedSegmentHybrid, { flex: formatStats.hybrid }]}
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
                  <Text style={styles.sectionTitle}>Partisipasi Per Unit Kerja</Text>
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
                  <Text style={styles.sectionTitle}>Partisipasi Pegawai di Unit</Text>
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

            {/* 3. FILTER CARD (1:1 reports/index.blade.php) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Filter size={17} color={colors.primary} strokeWidth={2} />
                <Text style={styles.sectionTitle}>Filter Laporan & Rekapitulasi</Text>
              </View>

              <View style={styles.filterGrid}>
                {/* Dari Tanggal */}
                <View style={styles.filterFieldHalf}>
                  <Text style={styles.filterFieldLabel}>Dari Tanggal</Text>
                  <Pressable
                    onPress={() => setActiveDateField('start')}
                    style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Pilih Dari Tanggal"
                  >
                    <Calendar size={15} strokeWidth={2} color={colors.textMuted} />
                    <Text
                      style={[
                        styles.dropdownTriggerText,
                        !draftStartDate && styles.dropdownPlaceholderText,
                      ]}
                      numberOfLines={1}
                    >
                      {draftStartDate || 'Pilih tanggal'}
                    </Text>
                  </Pressable>
                </View>

                {/* Sampai Tanggal */}
                <View style={styles.filterFieldHalf}>
                  <Text style={styles.filterFieldLabel}>Sampai Tanggal</Text>
                  <Pressable
                    onPress={() => setActiveDateField('end')}
                    style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Pilih Sampai Tanggal"
                  >
                    <Calendar size={15} strokeWidth={2} color={colors.textMuted} />
                    <Text
                      style={[
                        styles.dropdownTriggerText,
                        !draftEndDate && styles.dropdownPlaceholderText,
                      ]}
                      numberOfLines={1}
                    >
                      {draftEndDate || 'Pilih tanggal'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.filterGrid}>
                {/* Status Rapat */}
                <View style={styles.filterFieldHalf}>
                  <Text style={styles.filterFieldLabel}>Status Rapat</Text>
                  <Pressable
                    onPress={() => setActiveDropdown('status')}
                    style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Pilih Status Rapat"
                  >
                    <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                      {selectedStatusLabel}
                    </Text>
                    <ChevronDown size={15} strokeWidth={2} color={colors.textMuted} />
                  </Pressable>
                </View>

                {/* Format Rapat */}
                <View style={styles.filterFieldHalf}>
                  <Text style={styles.filterFieldLabel}>Format Rapat</Text>
                  <Pressable
                    onPress={() => setActiveDropdown('format')}
                    style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Pilih Format Rapat"
                  >
                    <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                      {selectedFormatLabel}
                    </Text>
                    <ChevronDown size={15} strokeWidth={2} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              {isAdministrator ? (
                <View style={styles.filterFieldFull}>
                  <Text style={styles.filterFieldLabel}>Unit Kerja</Text>
                  <Pressable
                    onPress={() => setActiveDropdown('unit')}
                    style={({ pressed }) => [styles.dropdownTrigger, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Pilih Unit Kerja"
                  >
                    <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                      {selectedUnitLabel}
                    </Text>
                    <ChevronDown size={15} strokeWidth={2} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.filterActionsRow}>
                <Pressable
                  onPress={handleApplyFilters}
                  style={({ pressed }) => [styles.applyPrimaryBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Terapkan Filter"
                >
                  <Text style={styles.applyPrimaryBtnText}>Terapkan</Text>
                </Pressable>

                {hasActiveFilters ? (
                  <Pressable
                    onPress={handleResetFilters}
                    style={({ pressed }) => [styles.resetSecondaryBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Reset Filter"
                  >
                    <RotateCcw size={14} strokeWidth={2} color={colors.textSecondary} />
                    <Text style={styles.resetSecondaryBtnText}>Reset</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.filterDivider} />

              {/* Ekspor Ringkasan Laporan Keseluruhan */}
              <View style={styles.csvExportRow}>
                <Text style={styles.csvExportLabel}>
                  Ekspor Ringkasan Laporan Keseluruhan:
                </Text>
                <Pressable
                  onPress={handleExportSummaryCsv}
                  disabled={isExportingSummaryCsv}
                  style={({ pressed }) => [styles.csvExportBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Unduh Rekap CSV / Excel"
                >
                  {isExportingSummaryCsv ? (
                    <TutWuriLoader size="sm" />
                  ) : (
                    <FileSpreadsheet size={15} strokeWidth={2} color={colors.onPrimary} />
                  )}
                  <Text style={styles.csvExportBtnText}>Unduh Rekap CSV / Excel</Text>
                </Pressable>
              </View>
            </View>

            {/* 4. PANEL TABEL: DAFTAR REKAPITULASI RAPAT */}
            <View style={styles.tablePanel}>
              <View style={styles.tableTopHeader}>
                <Text style={styles.tableTopTitle}>Daftar Rekapitulasi Rapat</Text>
                <View style={styles.neutralMiniPill}>
                  <Text style={styles.neutralMiniText}>
                    {pagination.total} Agenda Ditampilkan
                  </Text>
                </View>
              </View>

              {isListLoading ? (
                <View style={styles.loadingCardInline}>
                  <TutWuriLoader size="md" />
                  <Text style={styles.loadingText}>Memuat halaman agenda...</Text>
                </View>
              ) : agendas.length === 0 ? (
                <View style={styles.emptyBox}>
                  <EmptyState
                    icon={FileText}
                    title="Belum Ada Agenda Rapat"
                    description="Tidak ditemukan agenda rapat yang sesuai dengan filter laporan saat ini."
                    actionLabel={hasActiveFilters ? 'Reset Filter' : undefined}
                    onAction={hasActiveFilters ? handleResetFilters : undefined}
                  />
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
                    {/* Column Header Row */}
                    <View style={styles.tableColumnHeaderRow}>
                      <Text style={[styles.thCell, { width: COL_WIDTHS.agenda }]}>
                        Agenda & Jadwal
                      </Text>
                      <Text style={[styles.thCell, { width: COL_WIDTHS.peserta }]}>Peserta</Text>
                      <Text style={[styles.thCell, { width: COL_WIDTHS.status }]}>
                        Status Rapat
                      </Text>
                      <Text style={[styles.thCell, { width: COL_WIDTHS.notulensi }]}>
                        Notulensi
                      </Text>
                      <Text
                        style={[styles.thCell, styles.thCellRight, { width: COL_WIDTHS.ekspor }]}
                      >
                        Ekspor Dokumen
                      </Text>
                    </View>

                    {/* Body Rows */}
                    {agendas.map((agenda, idx) => {
                      const attended = agenda.total_attended ?? agenda.attendances_count ?? 0;
                      const invited = agenda.total_invited ?? 0;
                      const isPdfBusy = exportingKey === `${agenda.id}:pdf`;
                      const isWordBusy = exportingKey === `${agenda.id}:word`;

                      return (
                        <View
                          key={agenda.id}
                          style={[
                            styles.tableRow,
                            idx === agendas.length - 1 && styles.tableRowLast,
                          ]}
                        >
                          {/* Agenda & Jadwal */}
                          <View style={[styles.tdCell, { width: COL_WIDTHS.agenda }]}>
                            <Text style={styles.agendaTitleCell} numberOfLines={2}>
                              {agenda.judul_rapat}
                            </Text>
                            <Text style={styles.agendaScheduleCell} numberOfLines={1}>
                              {formatTanggalIndonesia(agenda.waktu_mulai)}
                              {agenda.rentang_waktu ? ` · ${agenda.rentang_waktu}` : ''}
                            </Text>
                            <Text style={styles.agendaMetaCell} numberOfLines={1}>
                              {formatMeetingTypeLabel(agenda.tipe_rapat)} •{' '}
                              {agenda.lokasi_ruang || 'Virtual'}
                            </Text>
                          </View>

                          {/* Peserta */}
                          <View style={[styles.tdCell, { width: COL_WIDTHS.peserta }]}>
                            <Text style={styles.pesertaCountText}>
                              {attended} / {invited}
                            </Text>
                            <Text style={styles.pesertaRateText}>
                              {agenda.participation_rate_label || '0%'}
                            </Text>
                          </View>

                          {/* Status Rapat */}
                          <View style={[styles.tdCell, { width: COL_WIDTHS.status }]}>
                            <StatusPill
                              status={mapAgendaStatusToPill(agenda.status.value)}
                              label={agenda.status.label}
                            />
                          </View>

                          {/* Notulensi */}
                          <View style={[styles.tdCell, { width: COL_WIDTHS.notulensi }]}>
                            <View
                              style={[
                                styles.notulenBadge,
                                agenda.has_notulensi
                                  ? styles.notulenBadgeComplete
                                  : styles.notulenBadgePending,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.notulenBadgeText,
                                  agenda.has_notulensi
                                    ? styles.notulenBadgeTextComplete
                                    : styles.notulenBadgeTextPending,
                                ]}
                              >
                                {agenda.has_notulensi ? 'Lengkap' : 'Belum Diisi'}
                              </Text>
                            </View>
                          </View>

                          {/* Ekspor Dokumen: PDF, Word, Detail (NO per-row CSV) */}
                          <View
                            style={[styles.tdCell, styles.eksporCell, { width: COL_WIDTHS.ekspor }]}
                          >
                            <Pressable
                              onPress={() => handleExportAgenda(agenda.id, 'pdf')}
                              disabled={exportingKey !== null}
                              style={({ pressed }) => [styles.exportMiniBtn, pressed && styles.pressed]}
                              accessibilityRole="button"
                              accessibilityLabel={`Unduh PDF ${agenda.judul_rapat}`}
                            >
                              {isPdfBusy ? (
                                <TutWuriLoader size="sm" />
                              ) : (
                                <FileText size={13} strokeWidth={2} color={colors.error} />
                              )}
                              <Text style={styles.exportMiniBtnText}>PDF</Text>
                            </Pressable>

                            <Pressable
                              onPress={() => handleExportAgenda(agenda.id, 'word')}
                              disabled={exportingKey !== null}
                              style={({ pressed }) => [styles.exportMiniBtn, pressed && styles.pressed]}
                              accessibilityRole="button"
                              accessibilityLabel={`Unduh Word ${agenda.judul_rapat}`}
                            >
                              {isWordBusy ? (
                                <TutWuriLoader size="sm" />
                              ) : (
                                <Download size={13} strokeWidth={2} color={colors.infoText} />
                              )}
                              <Text style={styles.exportMiniBtnText}>Word</Text>
                            </Pressable>

                            <Pressable
                              onPress={() => handleOpenDetail(agenda.id)}
                              style={({ pressed }) => [styles.detailMiniBtn, pressed && styles.pressed]}
                              accessibilityRole="button"
                              accessibilityLabel={`Detail laporan ${agenda.judul_rapat}`}
                            >
                              <Eye size={13} strokeWidth={2} color={colors.onPrimary} />
                              <Text style={styles.detailMiniBtnText}>Detail</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              {pagination.total > 0 ? (
                <PaginationBar
                  currentPage={pagination.current_page}
                  lastPage={pagination.last_page}
                  total={pagination.total}
                  label="Agenda"
                  isLoading={isListLoading}
                  onPageChange={handlePageChange}
                  containerStyle={styles.tablePagination}
                />
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      {/* DATE PICKER MODAL */}
      <CalendarDatePickerModal
        visible={activeDateField !== null}
        onClose={() => setActiveDateField(null)}
        selectedDate={activeDateField === 'end' ? draftEndDate : draftStartDate}
        title={activeDateField === 'end' ? 'Pilih Sampai Tanggal' : 'Pilih Dari Tanggal'}
        subtitle="Filter rentang tanggal pelaksanaan rapat"
        minDate={activeDateField === 'end' && draftStartDate ? draftStartDate : undefined}
        onSelectDate={(iso) => {
          if (activeDateField === 'start') {
            setDraftStartDate(iso);
            if (draftEndDate && iso > draftEndDate) {
              setDraftEndDate(iso);
            }
          } else if (activeDateField === 'end') {
            setDraftEndDate(iso);
          }
          setActiveDateField(null);
        }}
      />

      {/* DROPDOWN MODALS */}
      <AgendaOptionModal
        visible={activeDropdown === 'status'}
        onClose={() => setActiveDropdown('none')}
        title="Pilih Status Rapat"
        options={statusModalOptions}
        selectedId={draftStatus}
        searchable={false}
        onSelect={(opt) => setDraftStatus((opt.id as StatusFilterValue) || 'all')}
      />

      <AgendaOptionModal
        visible={activeDropdown === 'format'}
        onClose={() => setActiveDropdown('none')}
        title="Pilih Format Pelaksanaan Rapat"
        options={formatModalOptions}
        selectedId={draftFormat}
        searchable={false}
        onSelect={(opt) => setDraftFormat((opt.id as FormatFilterValue) || 'all')}
      />

      <AgendaOptionModal
        visible={activeDropdown === 'unit'}
        onClose={() => setActiveDropdown('none')}
        title="Pilih Unit Kerja"
        subtitle="Filter laporan berdasarkan unit kerja penyelenggara/target"
        options={unitModalOptions}
        selectedId={draftUnitId}
        searchable={true}
        searchPlaceholder="Cari kode atau nama unit kerja..."
        onSelect={(opt) => setDraftUnitId(opt.id)}
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
  loadingCard: {
    ...cardSurface,
    borderRadius: rounded.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingCardInline: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },

  /* KPI Cards */
  summarySection: {
    gap: spacing.sm,
  },
  summaryCard: {
    ...cardSurface,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.xs + 2,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconBoxSuccess: {
    width: 38,
    height: 38,
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
  },
  summaryKpi: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  kpiInlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  summarySubtext: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  neutralMiniPill: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  neutralMiniText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
  },
  warningMiniPill: {
    backgroundColor: colors.warningContainer,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  warningMiniText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onWarningContainer,
  },
  emeraldPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  emeraldPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSuccessContainer,
  },

  /* Visual & Filter Sections */
  sectionCard: {
    ...cardSurface,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.sm + 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sectionTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  stackedBarTrack: {
    height: 10,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  stackedSegmentOffline: {
    backgroundColor: colors.primary,
  },
  stackedSegmentOnline: {
    backgroundColor: colors.infoText,
  },
  stackedSegmentHybrid: {
    backgroundColor: colors.success,
  },
  stackedSegmentEmpty: {
    flex: 1,
    backgroundColor: colors.borderSubtle,
  },
  formatList: {
    gap: spacing.xs + 2,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formatLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
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
    backgroundColor: colors.infoText,
  },
  dotHybrid: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  formatLabel: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
  },
  formatCount: {
    ...typography.labelMd,
    fontFamily: fontFamilies.monoSemiBold,
    color: colors.onSurface,
  },

  /* Participation */
  participationList: {
    gap: spacing.xs + 2,
  },
  participationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    padding: spacing.sm,
  },
  unitCodeBadge: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.sm,
    paddingHorizontal: spacing.xs + 3,
    paddingVertical: 3,
  },
  unitCodeText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    color: colors.primary,
  },
  participationMeta: {
    flex: 1,
    gap: 1,
  },
  participationName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  participationSub: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },

  /* Filter Form */
  filterGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterFieldHalf: {
    flex: 1,
    gap: 4,
  },
  filterFieldFull: {
    gap: 4,
  },
  filterFieldLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET,
  },
  dropdownTriggerText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onSurface,
    flex: 1,
  },
  dropdownPlaceholderText: {
    color: colors.textMuted,
  },
  filterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  applyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.lg,
    minHeight: MIN_TOUCH_TARGET,
  },
  applyPrimaryBtnText: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onPrimary,
  },
  resetSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  resetSecondaryBtnText: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
  },
  filterDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  csvExportRow: {
    gap: spacing.xs + 2,
  },
  csvExportLabel: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
  },
  csvExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    backgroundColor: colors.success,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
  },
  csvExportBtnText: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onPrimary,
  },

  /* Table Panel */
  tablePanel: {
    ...cardSurface,
    borderRadius: rounded.lg,
    overflow: 'hidden',
  },
  tableTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  tableTopTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  emptyBox: {
    padding: spacing.md,
  },
  tableScrollView: {
    width: '100%',
    backgroundColor: colors.surfaceCard,
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  tableInner: {
    minWidth: TABLE_MIN_WIDTH + spacing.sm * 2,
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
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
  },
  thCell: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  thCellRight: {
    textAlign: 'right',
  },
  tableRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceCard,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tdCell: {
    paddingHorizontal: spacing.xs,
    justifyContent: 'center',
  },
  agendaTitleCell: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  agendaScheduleCell: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    marginTop: 2,
  },
  agendaMetaCell: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
    marginTop: 1,
  },
  pesertaCountText: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  pesertaRateText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.success,
  },
  notulenBadge: {
    alignSelf: 'flex-start',
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
  },
  notulenBadgeComplete: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  notulenBadgePending: {
    backgroundColor: colors.warningContainer,
    borderColor: colors.warningBorder,
  },
  notulenBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
  },
  notulenBadgeTextComplete: {
    color: colors.onSuccessContainer,
  },
  notulenBadgeTextPending: {
    color: colors.onWarningContainer,
  },
  eksporCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  exportMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
  },
  exportMiniBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  detailMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET,
  },
  detailMiniBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onPrimary,
  },
  tablePagination: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
  },
});
