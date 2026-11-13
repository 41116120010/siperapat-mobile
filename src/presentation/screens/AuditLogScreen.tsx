import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ScrollViewInstance,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Calendar,
  ChevronRight,
  ChevronsUpDown,
  Filter,
  Info,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { PaginationBar } from '../components/common/PaginationBar';
import { Button } from '../components/common/Button';
import { CalendarDatePickerModal } from '../components/modals/CalendarDatePickerModal';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { activityLogApi, userApi } from '../../data/datasources/userApi';
import { ApiActivityLogDto, ApiActivityLogPage, ApiUserDto } from '../../data/datasources/apiTypes';
import { useAuthStore } from '../store/useAuthStore';
import { triggerPageTransition } from '../store/useTransitionStore';

interface AuditLogScreenProps {
  onBack?: () => void;
}

type LogTone = 'success' | 'warning' | 'danger' | 'info' | 'export';

const KNOWN_ACTIVITY_TYPES = [
  'AUTH_LOGIN',
  'AUTH_API_LOGIN',
  'AUTH_LOGOUT',
  'AUTH_API_LOGOUT',
  'AUTH_LOGIN_FAILED',
  'AUTH_CHANGE_PASSWORD',
  'AUTH_FORGOT_PASSWORD_REQUEST',
  'AUTH_PASSWORD_RESET',
  'CREATE_AGENDA',
  'UPDATE_AGENDA',
  'DELETE_AGENDA',
  'UPDATE_AGENDA_STATUS',
  'UPDATE_AGENDA_MINUTES',
  'UPDATE_AGENDA_CIRCULAR',
  'UPDATE_AGENDA_ROLES',
  'DELETE_AGENDA_DOCUMENTATION',
  'AUTO_CLOSE_AGENDA',
  'RECORD_ATTENDANCE',
  'CREATE_USER',
  'UPDATE_USER',
  'DELETE_USER',
  'TOGGLE_USER_STATUS',
  'CREATE_UNIT',
  'UPDATE_UNIT',
  'DELETE_UNIT',
  'TOGGLE_UNIT_STATUS',
  'UPDATE_PROFILE',
  'EXPORT_PDF',
  'EXPORT_PDF_API',
  'EXPORT_WORD',
  'EXPORT_WORD_API',
  'EXPORT_CSV',
  'EXPORT_CSV_API',
  'EXPORT_AGENDA_CSV_API',
];

function formatRelativeTimeId(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return `${diffSec} detik yang lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit yang lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam yang lalu`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} hari yang lalu`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} bulan yang lalu`;
  return `${Math.floor(diffMonth / 12)} tahun yang lalu`;
}

function formatWibDateTime(iso?: string | null): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  })} WIB`;
}

const getLogTone = (activityType: string): { tone: LogTone; label: string } => {
  if (activityType.includes('DELETE')) return { tone: 'danger', label: 'Hapus' };
  if (activityType.includes('UPDATE') || activityType.includes('TOGGLE')) {
    return { tone: 'warning', label: 'Ubah' };
  }
  if (activityType.startsWith('AUTH_') || activityType.includes('LOGIN') || activityType.includes('ATTENDANCE')) {
    return { tone: 'success', label: 'Terverifikasi' };
  }
  if (activityType.includes('EXPORT') || activityType.includes('REPORT')) {
    return { tone: 'export', label: 'Ekspor' };
  }
  return { tone: 'info', label: 'Tercatat' };
};

const formatDateShort = (isoDate: string): string => {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export const AuditLogScreen: React.FC<AuditLogScreenProps> = ({ onBack }) => {
  const currentUser = useAuthStore((state) => state.user);
  const isAdministrator = currentUser?.role === 'administrator';

  const [logScope, setLogScope] = useState<'system' | 'personal'>(
    isAdministrator ? 'system' : 'personal'
  );
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedActorId, setSelectedActorId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [datePickerTarget, setDatePickerTarget] = useState<'start' | 'end' | null>(null);
  const [optionModal, setOptionModal] = useState<'type' | 'actor' | null>(null);
  const [selectedLog, setSelectedLog] = useState<ApiActivityLogDto | null>(null);
  const [actorUsers, setActorUsers] = useState<ApiUserDto[]>([]);

  const [logs, setLogs] = useState<ApiActivityLogDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [summary, setSummary] = useState<ApiActivityLogPage['summary']>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollViewInstance | null>(null);

  useEffect(() => {
    if (!isAdministrator) return;
    let cancelled = false;
    void userApi
      .users(1, { perPage: 100 })
      .then((res) => {
        if (!cancelled && res.success) {
          setActorUsers(res.data);
        }
      })
      .catch(() => {
        // Actor dropdown gracefully falls back to seen log actors
      });
    return () => {
      cancelled = true;
    };
  }, [isAdministrator]);

  const categoryValue =
    selectedCategory === 'Login'
      ? 'login'
      : selectedCategory === 'Agenda'
      ? 'agenda'
      : selectedCategory === 'Presensi'
      ? 'presensi'
      : selectedCategory === 'User'
      ? 'user'
      : undefined;

  const loadLogs = useCallback(
    async (nextPage = 1, append = false, query = search) => {
      setIsLoading(true);
      setError(null);
      try {
        const filters = {
          category: categoryValue,
          type: selectedType || undefined,
          userId:
            isAdministrator && logScope === 'system' && selectedActorId
              ? selectedActorId
              : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
        const response =
          isAdministrator && logScope === 'system'
            ? await activityLogApi.system(nextPage, query, 10, filters)
            : await activityLogApi.personal(nextPage, query, 10, filters);
        setLogs((current) =>
          append ? [...current, ...response.data] : response.data
        );
        setTotal(response.meta.total);
        setPage(response.meta.current_page);
        setLastPage(response.meta.last_page);
        setSummary(response.summary);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Gagal memuat log aktivitas.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isAdministrator, logScope, search, categoryValue, selectedType, selectedActorId, startDate, endDate]
  );

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > lastPage || nextPage === page || isLoading) return;
    triggerPageTransition(400);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    void loadLogs(nextPage, false, search);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLogs(1, false, search);
    }, 350);
    return () => clearTimeout(timer);
  }, [loadLogs, search]);

  const categories = ['Semua', 'Login', 'Agenda', 'Presensi', 'User'];

  const typeOptions = useMemo<AgendaOption[]>(() => {
    const merged = new Set<string>(KNOWN_ACTIVITY_TYPES);
    logs.forEach((l) => {
      if (l.activity_type) merged.add(l.activity_type);
    });
    return [
      { id: '', title: 'Semua Tipe', subtitle: 'Tampilkan seluruh tipe aktivitas' },
      ...Array.from(merged)
        .sort()
        .map((t) => ({ id: t, title: t })),
    ];
  }, [logs]);

  const actorOptions = useMemo<AgendaOption[]>(() => {
    const map = new Map<string, { name: string; sub: string }>();
    actorUsers.forEach((u) => {
      map.set(String(u.id), {
        name: u.name,
        sub: [u.nip, u.unit?.kode_unit].filter(Boolean).join(' • ') || u.role.label,
      });
    });
    logs.forEach((l) => {
      if (l.user?.id && !map.has(String(l.user.id))) {
        map.set(String(l.user.id), {
          name: l.user.name,
          sub: l.user.nip ?? '-',
        });
      }
    });
    return [
      { id: '', title: 'Semua Pegawai', subtitle: 'Seluruh aktor pada sistem' },
      ...Array.from(map.entries()).map(([id, info]) => ({
        id,
        title: info.name,
        subtitle: info.sub,
      })),
    ];
  }, [actorUsers, logs]);

  const selectedActorLabel = useMemo(() => {
    if (!selectedActorId) return 'Semua Pegawai';
    return actorOptions.find((opt) => opt.id === selectedActorId)?.title ?? 'Semua Pegawai';
  }, [selectedActorId, actorOptions]);

  const formattedLogs = useMemo(
    () =>
      logs.map((log) => {
        const badge = getLogTone(log.activity_type);
        const hasProperties =
          log.properties != null && Object.keys(log.properties).length > 0;
        return {
          raw: log,
          id: String(log.id),
          tag: log.activity_type,
          time: formatWibDateTime(log.created_at),
          relativeTime: formatRelativeTimeId(log.created_at),
          status: badge.label,
          tone: badge.tone,
          actorName:
            log.user?.name ?? currentUser?.name ?? 'Sistem / Pengguna Terhapus',
          actorNip: log.user?.nip ?? currentUser?.nip ?? '-',
          unitCode: log.user?.unit?.kode_unit ?? null,
          description: log.description,
          ip: log.ip_address ?? '-',
          meta: log.target_model
            ? `${log.target_model}${log.target_id ? ` #${log.target_id}` : ''}`
            : log.user_agent ?? '-',
          hasProperties,
        };
      }),
    [logs, currentUser?.name, currentUser?.nip]
  );

  const hasActiveFilters = Boolean(
    search.trim() ||
      selectedCategory !== 'Semua' ||
      selectedType ||
      selectedActorId ||
      startDate ||
      endDate
  );

  const handleResetAllFilters = () => {
    setSearch('');
    setSelectedCategory('Semua');
    setSelectedType('');
    setSelectedActorId('');
    setStartDate('');
    setEndDate('');
  };

  const selectedLogPayload = useMemo(() => {
    if (!selectedLog?.properties) return null;
    try {
      return JSON.stringify(selectedLog.properties, null, 2);
    } catch {
      return String(selectedLog.properties);
    }
  }, [selectedLog]);

  return (
    <View style={styles.container}>
      <Header
        title={
          isAdministrator && logScope === 'system'
            ? 'Audit Trail & Log Aktivitas'
            : 'Log Aktivitas Saya'
        }
        subtitle={
          isAdministrator && logScope === 'system'
            ? 'Rekaman seluruh tindakan, mutasi data, dan autentikasi pengguna pada sistem'
            : 'Riwayat aktivitas akun Anda'
        }
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => loadLogs(1)} />
        }
      >
        {/* SCOPE TOGGLE (Administrator only: System vs Personal) */}
        {isAdministrator ? (
          <View style={styles.scopeSegmentedWrap}>
            <Pressable
              onPress={() => setLogScope('system')}
              style={[
                styles.scopeSegmentedBtn,
                logScope === 'system' && styles.scopeSegmentedBtnActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: logScope === 'system' }}
            >
              <Text
                style={[
                  styles.scopeSegmentedText,
                  logScope === 'system' && styles.scopeSegmentedTextActive,
                ]}
              >
                Log Aktivitas Sistem
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setSelectedActorId('');
                setLogScope('personal');
              }}
              style={[
                styles.scopeSegmentedBtn,
                logScope === 'personal' && styles.scopeSegmentedBtnActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: logScope === 'personal' }}
            >
              <Text
                style={[
                  styles.scopeSegmentedText,
                  logScope === 'personal' && styles.scopeSegmentedTextActive,
                ]}
              >
                Log Aktivitas Saya
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* RINGKASAN AKTIVITAS */}
        <View style={styles.integrityCard}>
          <View style={styles.integrityHeader}>
            <View style={styles.integrityTitleRow}>
              <ShieldCheck size={18} strokeWidth={2} color={colors.primary} />
              <Text style={styles.integrityTitle}>Ringkasan Aktivitas</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCol}>
              <Text style={styles.metricNumber}>
                {total.toLocaleString('id-ID')}
              </Text>
              <Text style={styles.metricLabel}>Total Log</Text>
            </View>
            <View style={styles.metricCol}>
              <Text style={styles.metricNumber}>
                {summary?.auth_success?.toLocaleString('id-ID') ?? '-'}
              </Text>
              <Text style={styles.metricLabel}>Otentikasi Sah</Text>
            </View>
            <View style={styles.metricCol}>
              <Text style={styles.metricNumber}>
                {summary?.incident_count?.toLocaleString('id-ID') ?? '-'}
              </Text>
              <Text style={styles.metricLabel}>Insiden</Text>
            </View>
          </View>
        </View>

        {/* SEARCH INPUT */}
        <View style={styles.searchBox}>
          <Search size={18} strokeWidth={2} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari deskripsi, IP, nama, NIP..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              style={styles.searchClearBtn}
              accessibilityRole="button"
              accessibilityLabel="Hapus pencarian"
            >
              <X size={17} strokeWidth={2} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* TIPE AKTIVITAS & AKTOR PEGAWAI FILTER TRIGGERS (Web SSOT logs/index.blade.php) */}
        <View style={styles.dropdownRow}>
          <Pressable
            onPress={() => setOptionModal('type')}
            style={({ pressed }) => [
              styles.dropdownTrigger,
              selectedType ? styles.dateChipBtnActive : null,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Filter tipe aktivitas"
          >
            <Filter
              size={15}
              strokeWidth={2}
              color={selectedType ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.dateChipText,
                selectedType ? styles.dateChipTextActive : null,
              ]}
              numberOfLines={1}
            >
              {selectedType || 'Semua Tipe'}
            </Text>
            <ChevronsUpDown size={14} strokeWidth={2} color={colors.textMuted} />
          </Pressable>

          {isAdministrator && logScope === 'system' ? (
            <Pressable
              onPress={() => setOptionModal('actor')}
              style={({ pressed }) => [
                styles.dropdownTrigger,
                selectedActorId ? styles.dateChipBtnActive : null,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filter aktor pegawai"
            >
              <User
                size={15}
                strokeWidth={2}
                color={selectedActorId ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.dateChipText,
                  selectedActorId ? styles.dateChipTextActive : null,
                ]}
                numberOfLines={1}
              >
                {selectedActorLabel}
              </Text>
              <ChevronsUpDown size={14} strokeWidth={2} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* DATE RANGE FILTER */}
        <View style={styles.dateFilterRow}>
          <Pressable
            onPress={() => setDatePickerTarget('start')}
            style={({ pressed }) => [
              styles.dateChipBtn,
              startDate ? styles.dateChipBtnActive : null,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Pilih tanggal mulai filter log"
          >
            <Calendar
              size={15}
              strokeWidth={2}
              color={startDate ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.dateChipText,
                startDate ? styles.dateChipTextActive : null,
              ]}
              numberOfLines={1}
            >
              {startDate ? `Dari: ${formatDateShort(startDate)}` : 'Dari Tanggal'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setDatePickerTarget('end')}
            style={({ pressed }) => [
              styles.dateChipBtn,
              endDate ? styles.dateChipBtnActive : null,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Pilih tanggal akhir filter log"
          >
            <Calendar
              size={15}
              strokeWidth={2}
              color={endDate ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.dateChipText,
                endDate ? styles.dateChipTextActive : null,
              ]}
              numberOfLines={1}
            >
              {endDate ? `Sampai: ${formatDateShort(endDate)}` : 'Sampai Tanggal'}
            </Text>
          </Pressable>

          {hasActiveFilters ? (
            <Pressable
              onPress={handleResetAllFilters}
              style={({ pressed }) => [
                styles.dateClearBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Reset filter"
            >
              <X size={16} strokeWidth={2} color={colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterActionsRow}>
          {hasActiveFilters ? (
            <Pressable
              onPress={handleResetAllFilters}
              style={({ pressed }) => [
                styles.resetFilterBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Reset Filter"
            >
              <Text style={styles.resetFilterBtnText}>Reset Filter</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => void loadLogs(1, false, search)}
            style={({ pressed }) => [
              styles.applyFilterBtn,
              pressed && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Terapkan Filter"
          >
            <Text style={styles.applyFilterBtnText}>Terapkan Filter</Text>
          </Pressable>
        </View>

        {/* CATEGORY FILTER PILLS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsRow}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.filterPill,
                  active && styles.filterPillActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Filter kategori ${cat}`}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* LIST SECTION HEADER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Riwayat Aktivitas & Jejak Audit</Text>
          <Text style={styles.sectionCountText}>
            {formattedLogs.length} Catatan
          </Text>
        </View>

        {/* LOG ITEMS */}
        {error ? (
          <ErrorState message={error} onRetry={() => loadLogs(1)} />
        ) : null}
        {!error && isLoading && logs.length === 0 ? (
          <ActivityIndicator color={colors.primary} />
        ) : null}
        {formattedLogs.length > 0 ? (
          <View style={styles.logsList}>
            {formattedLogs.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setSelectedLog(item.raw)}
                style={({ pressed }) => [
                  styles.logCard,
                  pressed && styles.logCardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Lihat detail aktivitas ${item.tag}`}
              >
                <View style={styles.logCardHeader}>
                  <View style={styles.logTagRow}>
                    <Text style={styles.logTag}>{item.tag}</Text>
                    <View style={styles.dotSeparator} />
                    <Text style={styles.logTime}>
                      {item.time}
                      {item.relativeTime ? ` • ${item.relativeTime}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      item.tone === 'success' && styles.statusPillSuccess,
                      item.tone === 'warning' && styles.statusPillWarn,
                      item.tone === 'danger' && styles.statusPillDanger,
                      item.tone === 'export' && styles.statusPillExport,
                      item.tone === 'info' && styles.statusPillInfo,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.tone === 'success' && styles.statusPillTextSuccess,
                        item.tone === 'warning' && styles.statusPillTextWarn,
                        item.tone === 'danger' && styles.statusPillTextDanger,
                        item.tone === 'export' && styles.statusPillTextExport,
                        item.tone === 'info' && styles.statusPillTextInfo,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.actorRow}>
                  <Text style={styles.actorName}>{item.actorName}</Text>
                  <Text style={styles.actorNip}>
                    {item.unitCode ? `${item.actorNip} • ${item.unitCode}` : item.actorNip}
                  </Text>
                </View>

                <Text style={styles.logDesc}>{item.description}</Text>

                <View style={styles.logFooter}>
                  <Text style={styles.ipText}>IP {item.ip}</Text>
                  <View style={styles.metaActionRow}>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.hasProperties ? 'Lihat Payload Perubahan' : item.meta}
                    </Text>
                    <ChevronRight
                      size={14}
                      strokeWidth={2}
                      color={item.hasProperties ? colors.primary : colors.textMuted}
                    />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="manage-search"
            title="Tidak Ada Log Ditemukan"
            description={
              page < lastPage
                ? 'Tidak ada catatan yang cocok pada halaman ini. Muat halaman berikutnya untuk melanjutkan pencarian.'
                : 'Tidak ada rekaman log aktivitas yang sesuai dengan kriteria filter.'
            }
            actionLabel="Reset Pencarian & Filter"
            onAction={handleResetAllFilters}
          />
        )}

        {total > 0 ? (
          <PaginationBar
            currentPage={page}
            lastPage={lastPage}
            total={total}
            label="Log Aktivitas"
            isLoading={isLoading}
            onPageChange={handlePageChange}
          />
        ) : null}
      </ScrollView>

      {/* DATE PICKER MODAL (Reusing existing CalendarDatePickerModal) */}
      <CalendarDatePickerModal
        visible={datePickerTarget !== null}
        onClose={() => setDatePickerTarget(null)}
        selectedDate={
          datePickerTarget === 'start' ? startDate : endDate
        }
        minDate={
          datePickerTarget === 'end' && startDate ? startDate : undefined
        }
        title={
          datePickerTarget === 'start'
            ? 'Pilih Tanggal Mulai'
            : 'Pilih Tanggal Akhir'
        }
        subtitle="Filter rentang waktu rekaman aktivitas"
        onSelectDate={(iso) => {
          if (datePickerTarget === 'start') {
            setStartDate(iso);
            if (endDate && endDate < iso) setEndDate(iso);
          } else if (datePickerTarget === 'end') {
            setEndDate(iso);
          }
          setDatePickerTarget(null);
        }}
      />

      {/* DETAIL PAYLOAD MODAL */}
      <Modal
        visible={selectedLog !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLog(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Info size={18} strokeWidth={2} color={colors.primary} />
                <Text style={styles.modalTitle}>Detail Payload Log Aktivitas</Text>
              </View>
              <Pressable
                onPress={() => setSelectedLog(null)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Tutup detail log"
              >
                <X size={18} strokeWidth={2} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>

            {selectedLog ? (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.detailMetaBox}>
                  <Text style={styles.detailTag}>{selectedLog.activity_type}</Text>
                  <Text style={styles.detailDesc}>{selectedLog.description}</Text>
                  <Text style={styles.detailSubMeta}>
                    Aktor: {selectedLog.user?.name ?? currentUser?.name ?? 'Sistem'} (
                    {selectedLog.user?.nip ?? currentUser?.nip ?? '-'})
                  </Text>
                  <Text style={styles.detailSubMeta}>
                    IP: {selectedLog.ip_address ?? '-'} •{' '}
                    {selectedLog.created_at
                      ? new Date(selectedLog.created_at).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'medium',
                          timeZone: 'Asia/Jakarta',
                        })
                      : '-'}
                  </Text>
                </View>

                {selectedLogPayload ? (
                  <View style={styles.payloadWrap}>
                    <Text style={styles.payloadHeading}>
                      Payload Perubahan (JSON)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      <Text style={styles.payloadCode}>{selectedLogPayload}</Text>
                    </ScrollView>
                  </View>
                ) : (
                  <View style={styles.emptyPayloadBox}>
                    <Text style={styles.emptyPayloadText}>
                      Tidak ada payload perubahan tambahan yang tercatat pada log ini.
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : null}

            <Button
              title="Tutup"
              variant="primary"
              onPress={() => setSelectedLog(null)}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* DROPDOWN OPTION MODAL (Tipe Aktivitas / Aktor Pegawai) */}
      <AgendaOptionModal
        visible={optionModal !== null}
        onClose={() => setOptionModal(null)}
        title={optionModal === 'actor' ? 'Filter Aktor Pegawai' : 'Filter Tipe Aktivitas'}
        subtitle={
          optionModal === 'actor'
            ? 'Pilih pegawai pelaksana aktivitas pada sistem'
            : 'Pilih kode tipe aktivitas jejak audit'
        }
        options={optionModal === 'actor' ? actorOptions : typeOptions}
        selectedId={optionModal === 'actor' ? selectedActorId : selectedType}
        searchable
        searchPlaceholder={
          optionModal === 'actor' ? 'Cari nama atau NIP pegawai...' : 'Cari tipe aktivitas...'
        }
        onSelect={(opt) => {
          if (optionModal === 'actor') {
            setSelectedActorId(opt.id);
          } else {
            setSelectedType(opt.id);
          }
          setOptionModal(null);
        }}
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
    gap: spacing.sm + 2,
  },
  scopeSegmentedWrap: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: 4,
  },
  scopeSegmentedBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
  },
  scopeSegmentedBtnActive: {
    backgroundColor: colors.primaryDarkest,
  },
  scopeSegmentedText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  scopeSegmentedTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownTrigger: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
  },
  filterActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  resetFilterBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 14,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetFilterBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  applyFilterBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 16,
    borderRadius: rounded.md,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFilterBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },
  integrityCard: {
    ...cardSurface,
    borderRadius: rounded.card,
    padding: spacing.md,
    overflow: 'hidden',
  },
  integrityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.sm,
  },
  integrityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  integrityTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13.5,
    color: colors.onSurface,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    gap: 8,
  },
  metricCol: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.sm,
    borderRadius: rounded.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  metricNumber: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.monoBold,
    fontSize: 16,
    color: colors.primary,
  },
  metricLabel: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  searchBox: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    gap: 8,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    minHeight: MIN_TOUCH_TARGET,
    fontSize: 12.5,
    color: colors.onSurface,
  },
  searchClearBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateChipBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
  },
  dateChipBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  dateChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11.5,
    color: colors.textMuted,
    flex: 1,
  },
  dateChipTextActive: {
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },
  dateClearBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.78,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterPill: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
    overflow: 'hidden',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.sansBold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  sectionCountText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  logsList: {
    gap: 10,
  },
  logCard: {
    ...cardSurface,
    borderRadius: rounded.card,
    padding: spacing.md,
    gap: 6,
    overflow: 'hidden',
  },
  logCardPressed: {
    opacity: 0.85,
  },
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  logTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  logTag: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 10.5,
    backgroundColor: colors.surfaceSoft,
    color: colors.onSurface,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: rounded.sm,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.borderStrong,
  },
  logTime: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
  },
  statusPillSuccess: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  statusPillWarn: {
    backgroundColor: colors.warningContainer,
    borderColor: colors.warningBorder,
  },
  statusPillDanger: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.errorBorder,
  },
  statusPillExport: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusPillInfo: {
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder,
  },
  statusPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  statusPillTextSuccess: {
    color: colors.onSuccessContainer,
  },
  statusPillTextWarn: {
    color: colors.onWarningContainer,
  },
  statusPillTextDanger: {
    color: colors.onErrorContainer,
  },
  statusPillTextExport: {
    color: colors.onPrimary,
  },
  statusPillTextInfo: {
    color: colors.infoText,
  },
  actorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  actorName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12.5,
    color: colors.onSurface,
    flex: 1,
  },
  actorNip: {
    ...typography.labelMono,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  logDesc: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 17,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 8,
    marginTop: 2,
    gap: 8,
  },
  ipText: {
    ...typography.labelMono,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  metaActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: '60%',
  },
  metaText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10.5,
    color: colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.scrimNeutralMid,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    ...cardSurface,
    borderRadius: rounded.xl,
    padding: spacing.md,
    maxHeight: '82%',
    gap: spacing.sm + 2,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.xs + 2,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 15,
    color: colors.onSurface,
  },
  modalCloseBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  modalScroll: {
    maxHeight: 360,
  },
  modalScrollContent: {
    gap: spacing.sm + 2,
  },
  detailMetaBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.sm + 2,
    gap: 4,
  },
  detailTag: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    color: colors.primary,
  },
  detailDesc: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12.5,
    color: colors.onSurface,
  },
  detailSubMeta: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textMuted,
  },
  payloadWrap: {
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.md,
    padding: spacing.sm + 4,
    gap: 6,
  },
  payloadHeading: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.onPrimaryContainer,
  },
  payloadCode: {
    ...typography.labelMono,
    fontSize: 11,
    lineHeight: 16,
    color: colors.onPrimaryContainer,
  },
  emptyPayloadBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  emptyPayloadText: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
