import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';

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
          hitSlop={6}
        >
          <MaterialIcons
            name="chevron-left"
            size={20}
            color={effectiveCurrentPage <= 1 || isLoading ? colors.outlineVariant : colors.onSurface}
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
                hitSlop={4}
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
          hitSlop={6}
        >
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={effectiveCurrentPage >= effectiveLastPage || isLoading ? colors.outlineVariant : colors.onSurface}
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
    width: 34,
    height: 34,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: 'rgba(197, 197, 211, 0.3)',
    opacity: 0.5,
  },
  pill: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    ...typography.labelSm,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  pillTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  ellipsis: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 2,
  },
  infoText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  btnPressed: {
    opacity: 0.75,
  },
});
