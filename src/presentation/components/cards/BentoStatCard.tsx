import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  LucideIcon,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { cardSurface, rounded, spacing } from '../../../core/theme/tokens';
import { AutoScrollText } from '../common/AutoScrollText';

const LEGACY_STAT_ICONS: Record<string, LucideIcon> = {
  event: Calendar,
  calendar: Calendar,
  'check-circle': CheckCircle2,
  schedule: Clock,
  people: Users,
  'trending-up': TrendingUp,
  description: FileText,
};

export interface BentoStatItem {
  label: string;
  value: string | number;
  subValue: string;
  isPrimary?: boolean;
  valueColor?: string;
  subValueColor?: string;
  icon?: string | LucideIcon;
}

interface BentoStatCardProps extends BentoStatItem {}

export const BentoStatCard: React.FC<BentoStatCardProps> = ({
  label,
  value,
  subValue,
  isPrimary = false,
  valueColor,
  subValueColor,
  icon,
}) => {
  const IconComponent: LucideIcon | null = icon
    ? typeof icon === 'string'
      ? (LEGACY_STAT_ICONS[icon] ?? Calendar)
      : icon
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        <AutoScrollText style={styles.label}>{label}</AutoScrollText>
        {IconComponent ? (
          <IconComponent
            size={14}
            color={isPrimary ? colors.primary : colors.textMuted}
            strokeWidth={2}
          />
        ) : null}
      </View>
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
        <AutoScrollText
          style={[
            styles.subValue,
            subValueColor ? { color: subValueColor } : undefined,
          ]}
        >
          {subValue}
        </AutoScrollText>
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
          icon={stat.icon}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginVertical: spacing.sm,
  },
  card: {
    ...cardSurface,
    flex: 1,
    borderRadius: rounded.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 74,
    overflow: 'hidden',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    minWidth: 0,
  },
  label: {
    ...typography.labelSm,
    flex: 1,
    minWidth: 0,
    color: colors.textMuted,
    fontSize: 11,
  },
  metricContainer: {
    marginTop: spacing.xs,
    justifyContent: 'flex-end',
  },
  value: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    fontSize: 19,
    lineHeight: 23,
    fontVariant: ['tabular-nums'],
  },
  subValue: {
    ...typography.labelSm,
    color: colors.textMuted,
    fontSize: 10.5,
    marginTop: 2,
  },
});
