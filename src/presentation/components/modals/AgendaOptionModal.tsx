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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';
import { PaginationBar } from '../common/PaginationBar';

export interface AgendaOption {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [customInputValue, setCustomInputValue] = useState(customInitialValue);
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);

  // Reset or detect initial page whenever modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setIsSearchFocused(false);
      setCustomInputValue(customInitialValue);
      setIsCustomExpanded(false);

      if (pageSize && pageSize > 0 && selectedId) {
        const selectedIndex = options.findIndex((opt) => opt.id === selectedId);
        if (selectedIndex >= 0) {
          setCurrentPage(Math.floor(selectedIndex / pageSize) + 1);
          return;
        }
      }
      setCurrentPage(1);
    }
  }, [visible, options, selectedId, pageSize, customInitialValue]);

  // Memoized filter based on searchQuery
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) {
      return options;
    }
    const q = searchQuery.trim().toLowerCase();
    return options.filter((opt) => {
      const matchTitle = opt.title.toLowerCase().includes(q);
      const matchSubtitle = opt.subtitle ? opt.subtitle.toLowerCase().includes(q) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      return matchTitle || matchSubtitle || matchBadge;
    });
  }, [options, searchable, searchQuery]);

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

  // Pagination calculation
  const isPaginated = typeof pageSize === 'number' && pageSize > 0;
  const totalItems = filteredOptions.length;
  const totalPages = isPaginated ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const displayedOptions = useMemo(() => {
    if (!isPaginated) return filteredOptions;
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredOptions.slice(startIndex, startIndex + pageSize);
  }, [filteredOptions, isPaginated, safeCurrentPage, pageSize]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop dismiss */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Tutup jendela pilihan"
        />

        {/* Modal Bottom Sheet Content with Keyboard Avoiding */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View
            style={[
              styles.sheetContainer,
              (searchable || isPaginated || consistentHeight) && styles.sheetContainerConsistent,
            ]}
          >
            {/* Sheet Handle */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerTextGroup}>
                <Text style={styles.headerTitle}>{title}</Text>
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
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Tutup dialog"
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
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
                <MaterialIcons
                  name="search"
                  size={18}
                  color={isSearchFocused ? colors.primary : colors.onSurfaceVariant}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder={searchPlaceholder ?? 'Cari nama, NIP, atau jabatan...'}
                  placeholderTextColor={colors.onSurfaceVariant}
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
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Hapus pencarian"
                  >
                    <MaterialIcons
                      name="close"
                      size={15}
                      color={colors.onSurfaceVariant}
                    />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Options List / Empty State */}
            {filteredOptions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <MaterialIcons name="search-off" size={26} color={colors.outline} />
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
                    <MaterialIcons name="add-circle" size={17} color={colors.primary} />
                    <Text style={styles.emptyCustomButtonText} numberOfLines={1}>
                      Gunakan "{searchQuery.trim()}" sebagai {customOptionLabel}
                    </Text>
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
            ) : (
              <ScrollView
                style={styles.optionsScrollView}
                contentContainerStyle={styles.optionsList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
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
                      <MaterialIcons name="add" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.optionTextGroup}>
                      <View style={styles.titleRow}>
                        <Text style={styles.quickCustomTitle} numberOfLines={1}>
                          Gunakan "{searchQuery.trim()}"
                        </Text>
                        <View style={styles.badgePillCustom}>
                          <Text style={styles.badgePillCustomText}>+ Kustom</Text>
                        </View>
                      </View>
                      <Text style={styles.quickCustomSubtitle}>
                        Jadikan sebagai {customOptionLabel.toLowerCase()} baru
                      </Text>
                    </View>
                    <MaterialIcons
                      name="arrow-forward-ios"
                      size={14}
                      color={colors.primary}
                    />
                  </Pressable>
                ) : null}

                {displayedOptions.map((option) => {
                  const isSelected = option.id === selectedId;
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
                      {option.icon ? (
                        <View
                          style={[
                            styles.iconWrap,
                            isSelected ? styles.iconWrapActive : styles.iconWrapInactive,
                          ]}
                        >
                          <MaterialIcons
                            name={option.icon}
                            size={18}
                            color={isSelected ? colors.primary : colors.onSurfaceVariant}
                          />
                        </View>
                      ) : null}

                      {/* Texts */}
                      <View style={styles.optionTextGroup}>
                        <View style={styles.titleRow}>
                          <Text
                            style={[
                              styles.optionTitle,
                              isSelected && styles.optionTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {option.title}
                          </Text>
                          {option.badge ? (
                            <View style={styles.badgePill}>
                              <Text style={styles.badgePillText}>
                                {option.badge}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {option.subtitle ? (
                          <Text style={styles.optionSubtitle} numberOfLines={2}>
                            {option.subtitle}
                          </Text>
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
                          <MaterialIcons
                            name="edit"
                            size={18}
                            color={selectedId === 'custom' ? colors.primary : colors.secondary}
                          />
                        </View>
                        <View style={styles.optionTextGroup}>
                          <View style={styles.titleRow}>
                            <Text
                              style={[
                                styles.optionTitle,
                                selectedId === 'custom' && styles.optionTitleActive,
                              ]}
                              numberOfLines={1}
                            >
                              {selectedId === 'custom' && customInitialValue
                                ? `${customInitialValue}`
                                : `Tulis ${customOptionLabel} Kustom...`}
                            </Text>
                            <View style={styles.badgePillCustom}>
                              <Text style={styles.badgePillCustomText}>
                                {selectedId === 'custom' ? 'Terpilih' : 'Manual'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.optionSubtitle} numberOfLines={1}>
                            {selectedId === 'custom' && customInitialValue
                              ? 'Opsi kustom saat ini aktif • Ketuk untuk ubah'
                              : 'Input langsung jika opsi yang dicari tidak tersedia'}
                          </Text>
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
                            <MaterialIcons name="edit-note" size={18} color={colors.primary} />
                            <Text style={styles.inlineCustomHeaderText}>
                              Input {customOptionLabel} Kustom
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => setIsCustomExpanded(false)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Tutup form input kustom"
                          >
                            <MaterialIcons name="close" size={18} color={colors.onSurfaceVariant} />
                          </Pressable>
                        </View>
                        <TextInput
                          style={styles.inlineCustomInput}
                          placeholder={
                            customOptionPlaceholder ?? `Ketik nama ${customOptionLabel.toLowerCase()}...`
                          }
                          placeholderTextColor={colors.onSurfaceVariant}
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
                            <MaterialIcons name="check" size={16} color={colors.onPrimary} />
                            <Text style={styles.inlineConfirmBtnText}>Gunakan Opsi</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                ) : null}
              </ScrollView>
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: rounded.xl,
    borderTopRightRadius: rounded.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 8 : spacing.lg,
    maxHeight: '80%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 0,
        borderTopWidth: 1,
        borderTopColor: 'rgba(197, 197, 211, 0.5)',
      },
    }),
  },
  sheetContainerConsistent: {
    height: '78%',
    maxHeight: '85%',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(197, 197, 211, 0.8)',
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
    borderBottomColor: 'rgba(197, 197, 211, 0.3)',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.headlineSm,
    fontSize: 16.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerSubtitle: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  closeButtonPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  optionsScrollView: {
    flex: 1,
  },
  optionsList: {
    gap: 8,
    paddingBottom: spacing.xs,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    gap: spacing.sm + 2,
    overflow: 'hidden',
  },
  optionCardActive: {
    backgroundColor: 'rgba(0, 35, 111, 0.04)',
    borderColor: colors.primary,
  },
  optionCardInactive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(197, 197, 211, 0.55)',
  },
  optionCardPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
  },
  iconWrapInactive: {
    backgroundColor: colors.surfaceContainerLow,
  },
  optionTextGroup: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  optionTitleActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  optionSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 15,
  },
  badgePill: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  badgePillText: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
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
    borderColor: 'rgba(197, 197, 211, 0.8)',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    paddingHorizontal: spacing.sm + 2,
    marginBottom: spacing.sm,
    height: 42,
  },
  searchContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainerLowest,
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
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(197, 197, 211, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  clearSearchBtnPressed: {
    backgroundColor: 'rgba(197, 197, 211, 0.6)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  emptySubtitle: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
  },
  resetSearchButton: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.full,
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
  },
  resetSearchButtonPressed: {
    backgroundColor: 'rgba(0, 35, 111, 0.16)',
  },
  resetSearchButtonText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11.5,
  },
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
    paddingTop: spacing.xs,
    paddingBottom: 0,
    backgroundColor: colors.surfaceContainerLowest,
  },
  paginationContainer: {
    marginTop: 0,
    marginBottom: spacing.xs,
  },
  emptyCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.full,
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 35, 111, 0.2)',
    marginTop: spacing.xs,
    maxWidth: '90%',
  },
  emptyCustomButtonPressed: {
    backgroundColor: 'rgba(0, 35, 111, 0.16)',
  },
  emptyCustomButtonText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  quickCustomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: 'rgba(0, 35, 111, 0.04)',
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
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCustomTitle: {
    ...typography.bodyMd,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  quickCustomSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  badgePillCustom: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: rounded.full,
    backgroundColor: 'rgba(0, 81, 213, 0.12)',
    marginLeft: spacing.xs,
  },
  badgePillCustomText: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.secondary,
    fontWeight: '700',
  },
  manualCustomSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  manualCustomTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    gap: spacing.sm,
  },
  manualCustomTriggerSelected: {
    backgroundColor: 'rgba(0, 35, 111, 0.04)',
    borderColor: colors.primary,
  },
  manualCustomIconWrap: {
    backgroundColor: 'rgba(0, 81, 213, 0.08)',
  },
  inlineCustomCard: {
    backgroundColor: colors.surfaceContainerLowest,
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
  inlineCustomHeaderText: {
    ...typography.labelMd,
    fontWeight: '700',
    color: colors.primary,
    fontSize: 13,
  },
  inlineCustomInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    borderRadius: rounded.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 4,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.full,
    backgroundColor: 'rgba(197, 197, 211, 0.3)',
  },
  inlineCancelBtnText: {
    ...typography.labelSm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  inlineConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.full,
    backgroundColor: colors.primary,
  },
  inlineConfirmBtnDisabled: {
    opacity: 0.5,
  },
  inlineConfirmBtnText: {
    ...typography.labelSm,
    fontSize: 11.5,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  inlineBtnPressed: {
    opacity: 0.8,
  },
});
