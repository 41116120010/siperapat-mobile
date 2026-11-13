import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import {
  Calendar,
  CalendarX2,
  CloudOff,
  Folder,
  Inbox,
  LucideIcon,
  Search,
} from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';
import { Button } from './Button';

export type EmptyStateIconName =
  | 'inbox'
  | 'calendar'
  | 'search'
  | 'folder'
  | 'event-busy'
  | 'cloud-off'
  | 'manage-search';

const ICON_MAP: Record<EmptyStateIconName, LucideIcon> = {
  inbox: Inbox,
  calendar: Calendar,
  search: Search,
  folder: Folder,
  'event-busy': CalendarX2,
  'cloud-off': CloudOff,
  'manage-search': Search,
};

export interface EmptyStateProps {
  icon?: EmptyStateIconName | LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  style,
}) => {
  const renderIcon = () => {
    if (typeof icon === 'string') {
      const IconComponent =
        ICON_MAP[icon as EmptyStateIconName] ?? ICON_MAP.inbox;
      return (
        <IconComponent
          size={44}
          color={colors.borderStrong}
          strokeWidth={1.5}
        />
      );
    }
    if (typeof icon === 'function') {
      const IconComponent = icon as LucideIcon;
      return (
        <IconComponent
          size={44}
          color={colors.borderStrong}
          strokeWidth={1.5}
        />
      );
    }
    return icon;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrap}>{renderIcon()}</View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          size="sm"
          style={styles.actionButton}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl + spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginVertical: spacing.md,
  },
  iconWrap: {
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.primaryContainer,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  actionButton: {
    marginTop: spacing.md,
  },
});
