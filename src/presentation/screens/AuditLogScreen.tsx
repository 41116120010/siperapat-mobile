import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { activityLogApi } from '../../data/datasources/userApi';
import { ApiActivityLogDto } from '../../data/datasources/apiTypes';
import { useAuthStore } from '../store/useAuthStore';

interface AuditLogScreenProps {
  onBack?: () => void;
}

export const AuditLogScreen: React.FC<AuditLogScreenProps> = ({ onBack }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [logs, setLogs] = useState<ApiActivityLogDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = useAuthStore((state) => state.user);
  const isAdministrator = currentUser?.role === 'administrator';

  const loadLogs = useCallback(async (nextPage = 1, append = false, query = search) => {
    setIsLoading(true); setError(null);
    try {
      const response = isAdministrator
        ? await activityLogApi.system(nextPage, query)
        : await activityLogApi.personal(nextPage, query);
      setLogs((current) => append ? [...current, ...response.data] : response.data);
      setTotal(response.meta.total); setPage(response.meta.current_page); setLastPage(response.meta.last_page);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal memuat log aktivitas.');
    } finally { setIsLoading(false); }
  }, [isAdministrator, search]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadLogs(1, false, search); }, 350);
    return () => clearTimeout(timer);
  }, [loadLogs, search]);

  const categories = ['Semua', 'Login', 'Agenda', 'Presensi', 'User'];

  const toCategory = (type: string): string => {
    if (type.startsWith('AUTH_')) return 'Login';
    if (type.includes('ATTENDANCE')) return 'Presensi';
    if (type.includes('AGENDA') || type.includes('EXPORT_') || type.includes('REPORT')) return 'Agenda';
    if (type.includes('USER') || type.includes('UNIT') || type.includes('PROFILE')) return 'User';
    return 'Lainnya';
  };
  const filteredLogs = logs.filter((log) => selectedCategory === 'Semua' || toCategory(log.activity_type) === selectedCategory).map((log) => ({
    id: String(log.id), tag: log.activity_type, time: log.created_at ? new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) : '-',
    status: 'Tercatat', statusType: 'info' as 'success' | 'info' | 'warning', actorName: log.user?.name ?? currentUser?.name ?? 'Pengguna tidak tersedia', actorNip: log.user?.nip ?? currentUser?.nip ?? '-', description: log.description,
    ip: log.ip_address ?? '-', meta: log.target_model ? `${log.target_model}${log.target_id ? ` #${log.target_id}` : ''}` : log.user_agent ?? '-', category: toCategory(log.activity_type),
  }));

  return (
    <View style={styles.container}>
      <Header
        title={isAdministrator ? 'Log Aktivitas Sistem' : 'Log Aktivitas Saya'}
        subtitle={isAdministrator ? 'Audit Trail & Rekam Jejak Kedinasan LLDIKTI X' : 'Riwayat aktivitas akun Anda'}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => loadLogs(1)} />}
      >
        {/* RINGKASAN AKTIVITAS */}
        <View style={styles.integrityCard}>
          <View style={styles.integrityHeader}>
            <View style={styles.integrityTitleRow}>
              <MaterialIcons name="verified-user" size={18} color={colors.primary} />
              <Text style={styles.integrityTitle}>
                Ringkasan Aktivitas
              </Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCol}>
                <Text style={styles.metricNumber}>{total.toLocaleString('id-ID')}</Text>
              <Text style={styles.metricLabel}>Total Log</Text>
            </View>
            <View style={styles.metricCol}>
                <Text style={styles.metricNumber}>-</Text>
              <Text style={styles.metricLabel}>Otentikasi Sah</Text>
            </View>
            <View style={styles.metricCol}>
                <Text style={styles.metricNumber}>-</Text>
              <Text style={styles.metricLabel}>Insiden</Text>
            </View>
          </View>
        </View>

        {/* SEARCH INPUT */}
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color={colors.outline} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari deskripsi aktivitas atau alamat IP..."
            placeholderTextColor={colors.outline}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Hapus pencarian"
            >
              <MaterialIcons name="close" size={18} color={colors.outline} />
            </Pressable>
          ) : null}
        </View>

        {/* FILTER PILLS */}
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
          <Text style={styles.sectionTitle}>Daftar Aktivitas</Text>
          <Text style={styles.sectionCountText}>
            {filteredLogs.length} Catatan
          </Text>
        </View>

        {/* LOG ITEMS */}
        {error ? <ErrorState message={error} onRetry={() => loadLogs(1)} /> : null}
        {!error && isLoading && logs.length === 0 ? <ActivityIndicator color={colors.primary} /> : null}
        {filteredLogs.length > 0 ? (
          <View style={styles.logsList}>
            {filteredLogs.map((item) => (
              <View key={item.id} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <View style={styles.logTagRow}>
                    <Text style={styles.logTag}>{item.tag}</Text>
                    <View style={styles.dotSeparator} />
                    <Text style={styles.logTime}>{item.time}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      item.statusType === 'success' && styles.statusPillSuccess,
                      item.statusType === 'warning' && styles.statusPillWarn,
                      item.statusType === 'info' && styles.statusPillInfo,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.statusType === 'success' && styles.statusPillTextSuccess,
                        item.statusType === 'warning' && styles.statusPillTextWarn,
                        item.statusType === 'info' && styles.statusPillTextInfo,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.actorRow}>
                  <Text style={styles.actorName}>{item.actorName}</Text>
                  <Text style={styles.actorNip}>{item.actorNip}</Text>
                </View>

                <Text style={styles.logDesc}>{item.description}</Text>

                <View style={styles.logFooter}>
                  <Text style={styles.ipText}>IP {item.ip}</Text>
                  <Text style={styles.metaText}>{item.meta}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState
            icon="manage-search"
            title="Tidak Ada Log Ditemukan"
            description={page < lastPage ? 'Tidak ada catatan yang cocok pada halaman ini. Muat halaman berikutnya untuk melanjutkan pencarian.' : 'Tidak ada catatan aktivitas yang cocok dengan kata kunci atau filter kategori yang dipilih.'}
            actionLabel="Atur Ulang Filter"
            onAction={() => {
              setSearch('');
              setSelectedCategory('Semua');
            }}
          />
        )}
        {page < lastPage ? <Pressable onPress={() => loadLogs(page + 1, true)} style={styles.loadMore}><Text style={styles.loadMoreText}>{isLoading ? 'Memuat...' : 'Muat lainnya'}</Text></Pressable> : null}
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
    gap: spacing.sm + 2,
  },
  integrityCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
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
  integrityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.3)',
    paddingBottom: spacing.sm,
  },
  integrityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  integrityTitle: {
    ...typography.labelMd,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
    gap: 8,
  },
  metricCol: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm,
    borderRadius: rounded.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.35)',
  },
  metricNumber: {
    ...typography.headlineMd,
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  metricLabel: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    textAlign: 'center',
  },
  searchBox: {
    height: 42,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.55)',
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
    paddingVertical: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    ...typography.labelMd,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  sectionCountText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.outline,
    fontWeight: '500',
  },
  logsList: {
    gap: 8,
  },
  loadMore: { padding: spacing.sm, alignItems: 'center' },
  loadMoreText: { ...typography.labelMd, color: colors.primary, fontWeight: '700' },
  logCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    gap: 6,
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
  logCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logTag: {
    ...typography.labelMono,
    fontSize: 10.5,
    fontWeight: '700',
    backgroundColor: colors.surfaceContainer,
    color: colors.onSurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dotSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.outlineVariant,
  },
  logTime: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.outline,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    backgroundColor: colors.surfaceContainerLow,
  },
  statusPillSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillWarn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusPillInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusPillText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  statusPillTextSuccess: {
    color: '#065F46',
  },
  statusPillTextWarn: {
    color: '#92400E',
  },
  statusPillTextInfo: {
    color: '#1E40AF',
  },
  actorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  actorName: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  actorNip: {
    ...typography.labelMono,
    fontSize: 10.5,
    color: colors.outline,
  },
  logDesc: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
    paddingTop: 6,
    marginTop: 2,
  },
  ipText: {
    ...typography.labelMono,
    fontSize: 10,
    color: colors.outline,
  },
  metaText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.outline,
  },
});
