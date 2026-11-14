import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Archive,
  Award,
  BarChart3,
  Building,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  DoorOpen,
  FilePenLine,
  FlaskConical,
  GraduationCap,
  IdCard,
  Landmark,
  LucideIcon,
  Monitor,
  Network,
  NotebookPen,
  Pencil,
  Plus,
  PlusCircle,
  Radio,
  RefreshCw,
  Scale,
  Search,
  SearchX,
  ShieldCheck,
  User,
  Wallet,
  X,
  XCircle,
} from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { AutoScrollText } from '../common/AutoScrollText';
import { PaginationBar } from '../common/PaginationBar';

const LEGACY_OPTION_ICONS: Record<string, LucideIcon> = {
  'account-balance': Landmark,
  school: GraduationCap,
  business: Building2,
  badge: IdCard,
  gavel: Scale,
  'inventory-2': Archive,
  verified: ShieldCheck,
  hub: Network,
  computer: Monitor,
  'account-balance-wallet': Wallet,
  science: FlaskConical,
  'military-tech': Award,
  'sync-alt': RefreshCw,
  assessment: BarChart3,
  'meeting-room': DoorOpen,
  apartment: Building,
  edit: Pencil,
  person: User,
  'edit-note': FilePenLine,
  schedule: Clock,
  sensors: Radio,
  'task-alt': CheckCircle2,
  cancel: XCircle,
};

function resolveOptionIcon(icon?: string | LucideIcon): LucideIcon | null {
  if (!icon) return null;
  if (typeof icon === 'string') {
    return LEGACY_OPTION_ICONS[icon] ?? CircleDot;
  }
  return icon;
}

export interface AgendaOption {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  // Accepts LucideIcon or legacy icon keys mapped via LEGACY_OPTION_ICONS (employeeOptions / meetingOptions).
  icon?: LucideIcon | string;
}

interface AgendaOptionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: AgendaOption[];
  selectedId: string;
  onSelect: (option: AgendaOption) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  paginationLabel?: string;
  consistentHeight?: boolean;
  allowCustomOption?: boolean;
  customOptionLabel?: string;
  customOptionPlaceholder?: string;
  customInitialValue?: string;
  onSelectCustom?: (customValue: string) => void;
  prioritizeOptionIds?: Array<number | string>;
  prioritizeDefaultTab?: 'invited' | 'all';
  prioritizeTabLabel?: string;
  allTabLabel?: string;
  prioritizeBadgeLabel?: string;
}

export const AgendaOptionModal: React.FC<AgendaOptionModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  options,
  selectedId,
  onSelect,
  searchable = false,
  searchPlaceholder,
  pageSize,
  paginationLabel,
  consistentHeight = false,
  allowCustomOption = false,
  customOptionLabel = 'Opsi Kustom',
  customOptionPlaceholder,
  customInitialValue = '',
  onSelectCustom,
  prioritizeOptionIds,
  prioritizeDefaultTab,
  prioritizeTabLabel = 'Peserta Terpilih',
  allTabLabel = 'Semua Pegawai',
  prioritizeBadgeLabel = 'Peserta',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [customInputValue, setCustomInputValue] = useState(customInitialValue);
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const [activePriorityTab, setActivePriorityTab] = useState<'invited' | 'all'>('all');

  const prioritizedIdSet = useMemo(() => {
    const set = new Set<string>();
    (prioritizeOptionIds ?? []).forEach((id) => {
      if (id !== null && id !== undefined && String(id).trim() !== '') {
        set.add(String(id));
      }
    });
    return set;
  }, [prioritizeOptionIds]);

  const hasPriorityTabs = prioritizedIdSet.size > 0;

  // Ordered options: prioritized candidates float to top in 'Semua' too
  const orderedOptions = useMemo(() => {
    if (!hasPriorityTabs) return options;
    const prioritized: AgendaOption[] = [];
    const regular: AgendaOption[] = [];
    for (const opt of options) {
      if (prioritizedIdSet.has(opt.id)) {
        prioritized.push(opt);
      } else {
        regular.push(opt);
      }
    }
    return [...prioritized, ...regular];
  }, [options, hasPriorityTabs, prioritizedIdSet]);

  // Reset or detect initial page whenever modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setIsSearchFocused(false);
      setCustomInputValue(customInitialValue);
      setIsCustomExpanded(false);

      const initialTab: 'invited' | 'all' =
        hasPriorityTabs && prioritizeDefaultTab !== 'all' ? 'invited' : 'all';
      setActivePriorityTab(initialTab);

      const pool =
        initialTab === 'invited'
          ? orderedOptions.filter((opt) => prioritizedIdSet.has(opt.id))
          : orderedOptions;

      if (pageSize && pageSize > 0 && selectedId) {
        const selectedIndex = pool.findIndex((opt) => opt.id === selectedId);
        if (selectedIndex >= 0) {
          setCurrentPage(Math.floor(selectedIndex / pageSize) + 1);
          return;
        }
      }
      setCurrentPage(1);
    }
  }, [
    visible,
    orderedOptions,
    selectedId,
    pageSize,
    customInitialValue,
    hasPriorityTabs,
    prioritizeDefaultTab,
    prioritizedIdSet,
  ]);

  // Memoized filter based on activePriorityTab + searchQuery
  const filteredOptions = useMemo(() => {
    const baseList =
      hasPriorityTabs && activePriorityTab === 'invited'
        ? orderedOptions.filter((opt) => prioritizedIdSet.has(opt.id))
        : orderedOptions;
    if (!searchable || !searchQuery.trim()) {
      return baseList;
    }
    const q = searchQuery.trim().toLowerCase();
    return baseList.filter((opt) => {
      const matchTitle = opt.title.toLowerCase().includes(q);
      const matchSubtitle = opt.subtitle ? opt.subtitle.toLowerCase().includes(q) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      return matchTitle || matchSubtitle || matchBadge;
    });
  }, [
    orderedOptions,
    hasPriorityTabs,
    activePriorityTab,
    prioritizedIdSet,
    searchable,
    searchQuery,
  ]);

  const handlePriorityTabChange = (nextTab: 'invited' | 'all') => {
    setActivePriorityTab(nextTab);
    setCurrentPage(1);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setCurrentPage(1);
  };

  const handleConfirmCustom = (val?: string) => {
    const finalValue = (val !== undefined ? val : customInputValue).trim();
    if (!finalValue) return;
    if (onSelectCustom) {
      onSelectCustom(finalValue);
    } else {
      onSelect({
        id: 'custom',
        title: finalValue,
        subtitle: `${customOptionLabel} (Kustom)`,
        badge: 'Kustom',
        icon: 'edit',
      });
    }
    onClose();
  };

  const hasExactMatch = useMemo(() => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.trim().toLowerCase();
    return options.some((opt) => opt.title.toLowerCase() === q);
  }, [options, searchQuery]);

  // Pagination calculation & responsive sheet sizing
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isPaginated = typeof pageSize === 'number' && pageSize > 0;
  const sheetMaxHeight = Math.max(360, Math.round(windowHeight * 0.82));
  const maxListHeight = Math.max(200, Math.round(windowHeight * 0.56));
  const sheetBottomPadding = Math.max(insets.bottom + spacing.md, spacing.lg);
  const totalItems = filteredOptions.length;
  const totalPages = isPaginated ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const displayedOptions = useMemo(() => {
    if (!isPaginated) return filteredOptions;
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredOptions.slice(startIndex, startIndex + pageSize);
  }, [filteredOptions, isPaginated, safeCurrentPage, pageSize]);

  const shouldScrollList = Boolean(searchable || isPaginated || displayedOptions.length > 6);

  const optionsListContent = (
    <>
      {/* Quick Action: Use current searchQuery as custom option */}
      {allowCustomOption && searchQuery.trim().length > 0 && !hasExactMatch ? (
        <Pressable
          onPress={() => handleConfirmCustom(searchQuery.trim())}
          style={({ pressed }) => [
            styles.quickCustomCard,
            pressed && styles.optionCardPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Gunakan ${searchQuery.trim()} sebagai ${customOptionLabel}`}
        >
          <View style={styles.quickCustomIconWrap}>
            <Plus size={18} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={styles.optionTextGroup}>
            <View style={styles.titleRow}>
              <AutoScrollText style={styles.quickCustomTitle}>
                Gunakan "{searchQuery.trim()}"
              </AutoScrollText>
              <View style={styles.badgePillCustom}>
                <Text style={styles.badgePillCustomText}>+ Kustom</Text>
              </View>
            </View>
            <AutoScrollText style={styles.quickCustomSubtitle}>
              Jadikan sebagai {customOptionLabel.toLowerCase()} baru
            </AutoScrollText>
          </View>
          <ChevronRight size={16} color={colors.primary} strokeWidth={2} />
        </Pressable>
      ) : null}

      {displayedOptions.map((option) => {
        const isSelected = option.id === selectedId;
        const isPrioritized = hasPriorityTabs && prioritizedIdSet.has(option.id);
        const OptionIcon = resolveOptionIcon(option.icon);
        return (
          <Pressable
            key={option.id}
            onPress={() => {
              onSelect(option);
              onClose();
            }}
            style={({ pressed }) => [
              styles.optionCard,
              isSelected ? styles.optionCardActive : styles.optionCardInactive,
              pressed && styles.optionCardPressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
          >
            {/* Left Icon (if provided) */}
            {OptionIcon ? (
              <View
                style={[
                  styles.iconWrap,
                  isSelected ? styles.iconWrapActive : styles.iconWrapInactive,
                ]}
              >
                <OptionIcon
                  size={18}
                  color={isSelected ? colors.primary : colors.textSecondary}
                  strokeWidth={2}
                />
              </View>
            ) : null}

            {/* Texts */}
            <View style={styles.optionTextGroup}>
              <View style={styles.titleRow}>
                <AutoScrollText
                  style={[
                    styles.optionTitle,
                    isSelected && styles.optionTitleActive,
                  ]}
                >
                  {option.title}
                </AutoScrollText>
                {isPrioritized ? (
                  <View style={styles.priorityTagPill}>
                    <AutoScrollText style={styles.priorityTagText}>
                      {prioritizeBadgeLabel}
                    </AutoScrollText>
                  </View>
                ) : null}
                {option.badge ? (
                  <View style={styles.badgePill}>
                    <AutoScrollText style={styles.badgePillText}>
                      {option.badge}
                    </AutoScrollText>
                  </View>
                ) : null}
              </View>
              {option.subtitle ? (
                <AutoScrollText style={styles.optionSubtitle}>
                  {option.subtitle}
                </AutoScrollText>
              ) : null}
            </View>

            {/* Radio Indicator */}
            <View
              style={[
                styles.radioCircle,
                isSelected ? styles.radioCircleActive : styles.radioCircleInactive,
              ]}
            >
              {isSelected ? <View style={styles.radioInner} /> : null}
            </View>
          </Pressable>
        );
      })}

      {/* Dedicated Manual / Custom Option Card at the end */}
      {allowCustomOption ? (
        <View style={styles.manualCustomSection}>
          {!isCustomExpanded ? (
            <Pressable
              onPress={() => setIsCustomExpanded(true)}
              style={({ pressed }) => [
                styles.manualCustomTrigger,
                selectedId === 'custom' && styles.manualCustomTriggerSelected,
                pressed && styles.optionCardPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Tentukan ${customOptionLabel} kustom`}
            >
              <View
                style={[
                  styles.iconWrap,
                  selectedId === 'custom' ? styles.iconWrapActive : styles.manualCustomIconWrap,
                ]}
              >
                <Pencil
                  size={18}
                  color={selectedId === 'custom' ? colors.primary : colors.secondary}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.optionTextGroup}>
                <View style={styles.titleRow}>
                  <AutoScrollText
                    style={[
                      styles.optionTitle,
                      selectedId === 'custom' && styles.optionTitleActive,
                    ]}
                  >
                    {selectedId === 'custom' && customInitialValue
                      ? `${customInitialValue}`
                      : `Tulis ${customOptionLabel} Kustom...`}
                  </AutoScrollText>
                  <View style={styles.badgePillCustom}>
                    <Text style={styles.badgePillCustomText}>
                      {selectedId === 'custom' ? 'Terpilih' : 'Manual'}
                    </Text>
                  </View>
                </View>
                <AutoScrollText style={styles.optionSubtitle}>
                  {selectedId === 'custom' && customInitialValue
                    ? 'Opsi kustom saat ini aktif • Ketuk untuk ubah'
                    : 'Input langsung jika opsi yang dicari tidak tersedia'}
                </AutoScrollText>
              </View>
              <View
                style={[
                  styles.radioCircle,
                  selectedId === 'custom' ? styles.radioCircleActive : styles.radioCircleInactive,
                ]}
              >
                {selectedId === 'custom' ? <View style={styles.radioInner} /> : null}
              </View>
            </Pressable>
          ) : (
            <View style={styles.inlineCustomCard}>
              <View style={styles.inlineCustomHeader}>
                <View style={styles.inlineCustomHeaderLeft}>
                  <NotebookPen size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.inlineCustomHeaderText}>
                    Input {customOptionLabel} Kustom
                  </Text>
                </View>
                <Pressable
                  onPress={() => setIsCustomExpanded(false)}
                  style={styles.inlineCloseBtn}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="Tutup form input kustom"
                >
                  <X size={18} color={colors.textSecondary} strokeWidth={2} />
                </Pressable>
              </View>
              <TextInput
                style={styles.inlineCustomInput}
                placeholder={
                  customOptionPlaceholder ?? `Ketik nama ${customOptionLabel.toLowerCase()}...`
                }
                placeholderTextColor={colors.textMuted}
                value={customInputValue}
                onChangeText={setCustomInputValue}
                returnKeyType="done"
                onSubmitEditing={() => handleConfirmCustom()}
                autoFocus
              />
              <View style={styles.inlineCustomActions}>
                <Pressable
                  onPress={() => setIsCustomExpanded(false)}
                  style={({ pressed }) => [
                    styles.inlineCancelBtn,
                    pressed && styles.inlineBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Batal input kustom"
                >
                  <Text style={styles.inlineCancelBtnText}>Batal</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleConfirmCustom()}
                  disabled={!customInputValue.trim()}
                  style={({ pressed }) => [
                    styles.inlineConfirmBtn,
                    !customInputValue.trim() && styles.inlineConfirmBtnDisabled,
                    pressed && styles.inlineBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Gunakan ${customOptionLabel}`}
                >
                  <Check size={16} color={colors.onPrimary} strokeWidth={2} />
                  <Text style={styles.inlineConfirmBtnText}>Gunakan Opsi</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : null}
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop dismiss directly inside overlay */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Tutup jendela pilihan"
        />

        {/* Modal Bottom Sheet Content (KeyboardAvoidingView only on iOS) */}
        {(() => {
          const sheetNode = (
            <View
              collapsable={false}
              style={[
                styles.sheetContainer,
                {
                  maxHeight: sheetMaxHeight,
                  width: '100%',
                  paddingBottom: sheetBottomPadding,
                },
              ]}
            >
              {/* Sheet Handle */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerTextGroup}>
                  <AutoScrollText style={styles.headerTitle}>{title}</AutoScrollText>
                  {subtitle ? (
                    <Text style={styles.headerSubtitle}>{subtitle}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.closeButtonPressed,
                ]}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Tutup dialog"
              >
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            {/* Search Input Bar (Conditional) */}
            {searchable ? (
              <View
                style={[
                  styles.searchContainer,
                  isSearchFocused && styles.searchContainerFocused,
                ]}
              >
                <Search
                  size={18}
                  color={isSearchFocused ? colors.primary : colors.textMuted}
                  strokeWidth={2}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder={searchPlaceholder ?? 'Cari nama, NIP, atau jabatan...'}
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="never"
                />
                {searchQuery.length > 0 ? (
                  <Pressable
                    onPress={() => handleSearchChange('')}
                    style={({ pressed }) => [
                      styles.clearSearchBtn,
                      pressed && styles.clearSearchBtnPressed,
                    ]}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Hapus pencarian"
                  >
                    <X size={15} color={colors.textSecondary} strokeWidth={2} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Priority Scope Filter Tabs (1:1 asn-role-selector.blade.php) */}
            {hasPriorityTabs ? (
              <View style={styles.priorityTabBar}>
                <Pressable
                  onPress={() => handlePriorityTabChange('invited')}
                  style={[
                    styles.priorityTabBtn,
                    activePriorityTab === 'invited' && styles.priorityTabBtnActive,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activePriorityTab === 'invited' }}
                >
                  <AutoScrollText
                    style={[
                      styles.priorityTabText,
                      activePriorityTab === 'invited' && styles.priorityTabTextActive,
                    ]}
                  >
                    {prioritizeTabLabel}
                  </AutoScrollText>
                  <View style={styles.priorityTabCountBadge}>
                    <Text style={styles.priorityTabCountText}>
                      {orderedOptions.filter((o) => prioritizedIdSet.has(o.id)).length}
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => handlePriorityTabChange('all')}
                  style={[
                    styles.priorityTabBtn,
                    activePriorityTab === 'all' && styles.priorityTabBtnActive,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: activePriorityTab === 'all' }}
                >
                  <AutoScrollText
                    style={[
                      styles.priorityTabText,
                      activePriorityTab === 'all' && styles.priorityTabTextActive,
                    ]}
                  >
                    {allTabLabel}
                  </AutoScrollText>
                  <View style={styles.priorityTabCountBadge}>
                    <Text style={styles.priorityTabCountText}>{orderedOptions.length}</Text>
                  </View>
                </Pressable>
              </View>
            ) : null}

            {/* Options List / Empty State */}
            {filteredOptions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <SearchX size={26} color={colors.textMuted} strokeWidth={2} />
                </View>
                <Text style={styles.emptyTitle}>Data Tidak Ditemukan</Text>
                <Text style={styles.emptySubtitle}>
                  Tidak ada data yang cocok dengan kata kunci "{searchQuery.trim()}".
                </Text>
                {allowCustomOption && searchQuery.trim().length > 0 ? (
                  <Pressable
                    onPress={() => handleConfirmCustom(searchQuery.trim())}
                    style={({ pressed }) => [
                      styles.emptyCustomButton,
                      pressed && styles.emptyCustomButtonPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Gunakan ${searchQuery.trim()} sebagai ${customOptionLabel}`}
                  >
                    <PlusCircle size={17} color={colors.primary} strokeWidth={2} />
                    <AutoScrollText style={styles.emptyCustomButtonText}>
                      Gunakan "{searchQuery.trim()}" sebagai {customOptionLabel}
                    </AutoScrollText>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => handleSearchChange('')}
                  style={({ pressed }) => [
                    styles.resetSearchButton,
                    pressed && styles.resetSearchButtonPressed,
                  ]}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel="Reset pencarian"
                >
                  <Text style={styles.resetSearchButtonText}>Reset Pencarian</Text>
                </Pressable>
              </View>
            ) : shouldScrollList ? (
              <ScrollView
                style={[styles.optionsScrollView, { maxHeight: maxListHeight }]}
                contentContainerStyle={styles.optionsList}
                nestedScrollEnabled
                overScrollMode="never"
                bounces={false}
                removeClippedSubviews={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {optionsListContent}
              </ScrollView>
            ) : (
              <View style={styles.optionsList} collapsable={false}>
                {optionsListContent}
              </View>
            )}

            {/* Sticky Pagination Controls outside ScrollView */}
            {isPaginated && totalItems > 0 ? (
              <View style={styles.stickyFooter}>
                <PaginationBar
                  currentPage={safeCurrentPage}
                  lastPage={totalPages}
                  total={totalItems}
                  label={paginationLabel ?? 'pilihan'}
                  onPageChange={(page) => setCurrentPage(page)}
                  containerStyle={styles.paginationContainer}
                />
              </View>
            ) : null}
          </View>
          );

          return Platform.OS === 'ios' ? (
            <KeyboardAvoidingView
              behavior="padding"
              style={styles.keyboardAvoid}
              pointerEvents="box-none"
            >
              {sheetNode}
            </KeyboardAvoidingView>
          ) : (
            <View style={styles.keyboardAvoid} pointerEvents="box-none">
              {sheetNode}
            </View>
          );
        })()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrimNeutralMid,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: rounded.xl,
    borderTopRightRadius: rounded.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 8 : spacing.lg,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 16.5,
    color: colors.onSurface,
  },
  headerSubtitle: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  closeButtonPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  optionsScrollView: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 1,
  },
  optionsList: {
    gap: 8,
    paddingBottom: spacing.xs,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    padding: spacing.sm + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    gap: spacing.sm + 2,
    overflow: 'hidden',
  },
  optionCardActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  optionCardInactive: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderStrong,
  },
  optionCardPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.surfaceContainer,
  },
  iconWrapInactive: {
    backgroundColor: colors.surfaceSoft,
  },
  optionTextGroup: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  optionTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12.5,
    color: colors.onSurface,
    flexShrink: 1,
  },
  optionTitleActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  optionSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  priorityTagPill: {
    backgroundColor: colors.infoBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    flexShrink: 0,
    maxWidth: '34%',
  },
  priorityTagText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 9.5,
    color: colors.infoText,
  },
  badgePill: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexShrink: 0,
    maxWidth: '46%',
  },
  badgePillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 9.5,
    color: colors.textSecondary,
  },
  priorityTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm,
  },
  priorityTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: rounded.sm,
  },
  priorityTabBtnActive: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  priorityTabText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11.5,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  priorityTabTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  priorityTabCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainer,
    flexShrink: 0,
  },
  priorityTabCountText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    color: colors.onSurface,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioCircleInactive: {
    borderColor: colors.borderStrong,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  keyboardAvoid: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm + 2,
    marginBottom: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
  },
  searchContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceCard,
  },
  searchIcon: {
    marginRight: spacing.xs + 2,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurface,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  clearSearchBtnPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  emptySubtitle: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  resetSearchButton: {
    marginTop: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  resetSearchButtonPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  resetSearchButtonText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
    fontSize: 11.5,
  },
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.xs,
    paddingBottom: 0,
    backgroundColor: colors.surfaceCard,
  },
  paginationContainer: {
    marginTop: 0,
    marginBottom: spacing.xs,
  },
  emptyCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginTop: spacing.xs,
    maxWidth: '90%',
  },
  emptyCustomButtonPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  emptyCustomButtonText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
    fontSize: 12,
  },
  quickCustomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    marginBottom: spacing.xs + 2,
    gap: spacing.sm,
  },
  quickCustomIconWrap: {
    width: 34,
    height: 34,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCustomTitle: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13.5,
    color: colors.primary,
    flex: 1,
  },
  quickCustomSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  badgePillCustom: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: rounded.full,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    marginLeft: spacing.xs,
  },
  badgePillCustomText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 9.5,
    color: colors.infoText,
  },
  manualCustomSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  manualCustomTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: spacing.sm,
  },
  manualCustomTriggerSelected: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  manualCustomIconWrap: {
    backgroundColor: colors.surfaceContainer,
  },
  inlineCustomCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: spacing.md,
    gap: spacing.sm,
  },
  inlineCustomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineCustomHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCustomHeaderText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
    fontSize: 13,
  },
  inlineCustomInput: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    minHeight: MIN_TOUCH_TARGET,
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurface,
  },
  inlineCustomActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs + 4,
  },
  inlineCancelBtn: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  inlineCancelBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  inlineConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    gap: 4,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
  },
  inlineConfirmBtnDisabled: {
    opacity: 0.5,
  },
  inlineConfirmBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11.5,
    color: colors.onPrimary,
  },
  inlineBtnPressed: {
    opacity: 0.8,
  },
});
