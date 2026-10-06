import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';

export type StatusPillType =
  | 'ongoing'
  | 'sah'
  | 'upcoming'
  | 'cancelled'
  | 'terlambat'
  | 'izin'
  | 'ditolak';

interface StatusPillProps {
  status: StatusPillType;
  label?: string;
  style?: ViewStyle;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  style,
}) => {
  const getConfig = () => {
    switch (status) {
      case 'ongoing':
        return {
          bg: colors.warningContainer,
          text: colors.warning,
          dot: colors.warningLight,
          defaultLabel: 'Presensi Dibuka',
        };
      case 'sah':
        return {
          bg: colors.successContainer,
          text: colors.success,
          dot: colors.successLight,
          defaultLabel: 'Presensi Sah',
        };
      case 'upcoming':
        return {
          bg: colors.surfaceContainerLow,
          text: colors.secondary,
          dot: colors.secondaryAccent,
          defaultLabel: 'Akan Datang',
        };
      case 'cancelled':
      case 'ditolak' as StatusPillType:
        return {
          bg: colors.errorContainer,
          text: colors.error,
          dot: colors.errorLight,
          defaultLabel: 'Ditutup',
        };
      case 'terlambat':
        return {
          bg: '#FEF3C7',
          text: '#B45309',
          dot: '#D97706',
          defaultLabel: 'Terlambat',
        };
      case 'izin':
        return {
          bg: colors.surfaceSubtle,
          text: colors.textSecondary,
          dot: colors.textMuted,
          defaultLabel: 'Tugas Luar',
        };
      default:
        return {
          bg: colors.surfaceSubtle,
          text: colors.textSecondary,
          dot: colors.textMuted,
          defaultLabel: status,
        };
    }
  };

  const config = getConfig();

  return (
    <View style={[styles.pill, { backgroundColor: config.bg }, style]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.label, { color: config.text }]}>
        {label ?? config.defaultLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: rounded.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs + 2,
  },
  label: {
    ...typography.labelSm,
    fontWeight: '600',
  },
});
