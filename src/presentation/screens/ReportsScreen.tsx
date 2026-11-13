import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { formatTanggalIndonesia } from '../../core/utils/dateFormatter';
import { ApiAgendaDto, ApiPaginationMeta } from '../../data/datasources/apiTypes';
import {
  AgendaExportFormat,
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
import { StatusPill, StatusPillType } from '../components/common/StatusPill';
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
  { value: 'ongoing', label: 'Berlangsung' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

const FORMAT_OPTIONS: Array<{ value: FormatFilterValue; label: string }> = [
  { value: 'all', label: 'Semua Format' },
  { value: 'offline', label: 'Tatap Muka' },
  { value: 'online', label: 'Daring' },
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

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  onBack,
  onOpenAgenda,
}) => {
  const { showToast } = useFeedbackStore();
  const exportRepoRef = useRef(new AgendaExportRepository());

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [formatFilter, setFormatFilter] = useState<FormatFilterValue>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

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
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeFilters = useMemo<ReportFilterParams>(() => {
    const filters: ReportFilterParams = {};
    if (statusFilter !== 'all') filters.status = statusFilter;
    if (formatFilter !== 'all') filters.tipe = formatFilter;
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate.trim())) {
      filters.start_date = startDate.trim();
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDate.trim())) {
      filters.end_date = endDate.trim();
    }
    return filters;
  }, [statusFilter, formatFilter, startDate, endDate]);

  const hasActiveFilters = Boolean(
    statusFilter !== 'all' ||
      formatFilter !== 'all' ||
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
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
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

  return (
    <View style={styles.container}>
      <Header
        title="Laporan & Rekapitulasi"
        subtitle="Analisis Kehadiran, Notulensi & Ekspor Dokumen"
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
        {/* TOP EXPORT CTA */}
        <View style={styles.topActionCard}>
          <View style={styles.topActionTextWrap}>
            <Text style={styles.topActionTitle}>Rekapitulasi Eksekutif</Text>
            <Text style={styles.topActionSubtitle}>
              Unduh ringkasan agenda & kehadiran dalam format CSV / Excel
            </Text>
          </View>
          <Button
            title="Unduh Rekap CSV"
            onPress={handleExportSummaryCsv}
            variant="primary"
            size="md"
            isLoading={isExportingSummaryCsv}
            icon={<Download size={16} color={colors.onPrimary} strokeWidth={2} />}
          />
        </View>

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

            {/* 3 SUMMARY CARDS */}
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
                        {summary.ongoing_agendas} Berlangsung
                      </Text>
                    </View>
                    <View style={styles.neutralMiniPill}>
                      <Text style={styles.neutralMiniText}>
                        {summary.scheduled_agendas} Terjadwal
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
                            {summary.attendance_rate}% Partisipasi
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.summarySubtext}>
                    {summary.attendance_rate_subtext} · Rata-rata{' '}
                    {summary.avg_attendances_per_agenda} peserta/rapat
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
                        <View style={styles.neutralMiniPill}>
                          <Text style={styles.neutralMiniText}>
                            {summary.count_with_notulen}/{summary.completed_agendas} Rapat
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.summarySubtext}>
                    {pendingNotulenCount === 0
                      ? 'Seluruh rapat selesai telah memiliki notulensi resmi.'
                      : `${pendingNotulenCount} agenda selesai belum dilengkapi notulensi.`}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* DISTRIBUSI FORMAT PELAKSANAAN */}
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

            {/* PARTISIPASI UNIT / ANGGOTA UNIT */}
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

            {/* FILTER & SEARCH PANEL */}
            <View style={styles.sectionCard}>
              <View style={styles.filterHeaderRow}>
                <View style={styles.sectionHeaderRow}>
                  <Filter size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.sectionTitle}>Filter & Pencarian Agenda</Text>
                </View>
                <View style={styles.filterHeaderActions}>
                  <Pressable
                    onPress={() => setShowDateFilter((prev) => !prev)}
                    style={styles.filterToggleBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Tampilkan filter tanggal"
                  >
                    <Calendar size={14} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.filterToggleText}>Tanggal</Text>
                  </Pressable>
                  {hasActiveFilters ? (
                    <Pressable
                      onPress={handleResetFilters}
                      style={styles.resetFilterBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Reset semua filter"
                    >
                      <RotateCcw size={14} color={colors.error} strokeWidth={2} />
                      <Text style={styles.resetFilterText}>Reset</Text>
                    </Pressable>
                  ) : null}
                </View>
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

              {/* Date Range Optional Inputs */}
              {showDateFilter ? (
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <Text style={styles.dateLabel}>Dari (YYYY-MM-DD)</Text>
                    <TextInput
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="2026-01-01"
                      placeholderTextColor={colors.textMuted}
                      style={styles.dateInput}
                      maxLength={10}
                      autoCapitalize="none"
                    />
                  </View>
                  <View style={styles.dateField}>
                    <Text style={styles.dateLabel}>Sampai (YYYY-MM-DD)</Text>
                    <TextInput
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="2026-12-31"
                      placeholderTextColor={colors.textMuted}
                      style={styles.dateInput}
                      maxLength={10}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              ) : null}

              {/* Status Chips */}
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

              {/* Format Chips */}
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

            {/* REKAPITULASI AGENDA LIST */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.listTitle}>
                Rekapitulasi Agenda ({pagination.total})
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

                        {onOpenAgenda ? (
                          <Pressable
                            onPress={() => onOpenAgenda(String(agenda.id))}
                            style={({ pressed }) => [
                              styles.detailChipBtn,
                              pressed && styles.pressedChip,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`Lihat detail agenda ${agenda.judul_rapat}`}
                          >
                            <Text style={styles.detailChipText}>Detail</Text>
                            <ArrowUpRight
                              size={14}
                              color={colors.onPrimary}
                              strokeWidth={2}
                            />
                          </Pressable>
                        ) : null}
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
  dateInput: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.sm + 2,
    ...typography.labelMono,
    color: colors.onSurface,
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
});
