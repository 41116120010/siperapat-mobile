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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Reset or detect initial page whenever modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setIsSearchFocused(false);

      if (pageSize && pageSize > 0 && selectedId) {
        const selectedIndex = options.findIndex((opt) => opt.id === selectedId);
        if (selectedIndex >= 0) {
          setCurrentPage(Math.floor(selectedIndex / pageSize) + 1);
          return;
        }
      }
      setCurrentPage(1);
    }
  }, [visible, options, selectedId, pageSize]);

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
              (searchable || isPaginated) && styles.sheetContainerConsistent,
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
});
