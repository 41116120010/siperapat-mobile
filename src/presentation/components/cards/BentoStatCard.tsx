import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';

export interface BentoStatItem {
  label: string;
  value: string | number;
  subValue: string;
  isPrimary?: boolean;
  valueColor?: string;
  subValueColor?: string;
}

interface BentoStatCardProps extends BentoStatItem {}

export const BentoStatCard: React.FC<BentoStatCardProps> = ({
  label,
  value,
  subValue,
  isPrimary = false,
  valueColor,
  subValueColor,
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.label} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
      <View style={styles.metricContainer}>
        <Text
          style={[
            styles.value,
            isPrimary && { color: colors.primary },
            valueColor ? { color: valueColor } : null,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.subValue,
            subValueColor ? { color: subValueColor } : null,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {subValue}
        </Text>
      </View>
    </View>
  );
};

export const BentoGrid: React.FC<{
  stats: BentoStatItem[];
}> = ({ stats }) => {
  return (
    <View style={styles.grid}>
      {stats.map((stat, idx) => (
        <BentoStatCard
          key={idx}
          label={stat.label}
          value={stat.value}
          subValue={stat.subValue}
          isPrimary={stat.isPrimary}
          valueColor={stat.valueColor}
          subValueColor={stat.subValueColor}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    justifyContent: 'space-between',
    minHeight: 74,
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
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '500',
  },
  metricContainer: {
    marginTop: spacing.xs,
    justifyContent: 'flex-end',
  },
  value: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 19,
    lineHeight: 23,
  },
  subValue: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 2,
  },
});
