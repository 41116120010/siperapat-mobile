import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';

export interface PaginationBarProps {
  currentPage: number;
  lastPage: number;
  total: number;
  label: string;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const getPaginationRange = (current: number, last: number): (number | string)[] => {
  if (last <= 5) {
    return Array.from({ length: Math.max(1, last) }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, 3, 4, '...', last];
  }
  if (current >= last - 2) {
    return [1, '...', last - 3, last - 2, last - 1, last];
  }
  return [1, '...', current - 1, current, current + 1, '...', last];
};

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  lastPage,
  total,
  label,
  isLoading = false,
  onPageChange,
  containerStyle,
}) => {
  if (total <= 0) return null;

  const effectiveCurrentPage = Math.max(1, currentPage);
  const effectiveLastPage = Math.max(1, lastPage);
  const pages = getPaginationRange(effectiveCurrentPage, effectiveLastPage);

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.controls}>
        {/* Tombol Sebelumnya */}
        <Pressable
          disabled={effectiveCurrentPage <= 1 || isLoading}
          onPress={() => onPageChange(effectiveCurrentPage - 1)}
          style={({ pressed }) => [
            styles.navBtn,
            (effectiveCurrentPage <= 1 || isLoading) && styles.navBtnDisabled,
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Halaman sebelumnya"
          hitSlop={4}
        >
          <ChevronLeft
            size={18}
            color={effectiveCurrentPage <= 1 || isLoading ? colors.borderStrong : colors.onSurface}
            strokeWidth={2}
          />
        </Pressable>

        {/* Pills Nomor Halaman */}
        <View style={styles.pillsRow}>
          {pages.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <Text key={`ellipsis-${idx}`} style={styles.ellipsis}>
                  ...
                </Text>
              );
            }
            const isActive = p === effectiveCurrentPage;
            return (
              <Pressable
                key={`page-${p}`}
                onPress={() => onPageChange(p)}
                disabled={isActive || isLoading}
                style={({ pressed }) => [
                  styles.pill,
                  isActive && styles.pillActive,
                  pressed && !isActive && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Halaman ${p}`}
                hitSlop={{ top: 4, bottom: 4, left: 6, right: 6 }}
              >
                <Text
                  style={[
                    styles.pillText,
                    isActive && styles.pillTextActive,
                  ]}
                >
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tombol Berikutnya */}
        <Pressable
          disabled={effectiveCurrentPage >= effectiveLastPage || isLoading}
          onPress={() => onPageChange(effectiveCurrentPage + 1)}
          style={({ pressed }) => [
            styles.navBtn,
            (effectiveCurrentPage >= effectiveLastPage || isLoading) && styles.navBtnDisabled,
            pressed && styles.btnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Halaman berikutnya"
          hitSlop={4}
        >
          <ChevronRight
            size={18}
            color={effectiveCurrentPage >= effectiveLastPage || isLoading ? colors.borderStrong : colors.onSurface}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* Ringkasan Status Halaman */}
      <Text style={styles.infoText}>
        Menampilkan halaman {effectiveCurrentPage} dari {effectiveLastPage} • Total {total.toLocaleString('id-ID')} {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    gap: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    minWidth: 40,
    height: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.borderSubtle,
    opacity: 0.5,
  },
  pill: {
    minWidth: 34,
    height: 40,
    paddingHorizontal: 6,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  pillTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  ellipsis: {
    ...typography.labelSm,
    color: colors.textMuted,
    paddingHorizontal: 2,
  },
  infoText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  btnPressed: {
    opacity: 0.75,
  },
});
