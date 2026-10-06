import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const isButtonDisabled = disabled || isLoading;

  const getContainerStyle = (pressed: boolean): ViewStyle[] => {
    const list: ViewStyle[] = [styles.base];

    if (fullWidth) list.push(styles.fullWidth);

    // Size
    if (size === 'sm') list.push(styles.sizeSm);
    else if (size === 'lg') list.push(styles.sizeLg);
    else list.push(styles.sizeMd);

    // Variant
    switch (variant) {
      case 'primary':
        list.push(styles.primary);
        if (pressed && !isButtonDisabled) list.push(styles.primaryPressed);
        break;
      case 'secondary':
        list.push(styles.secondary);
        if (pressed && !isButtonDisabled) list.push(styles.secondaryPressed);
        break;
      case 'outline':
        list.push(styles.outline);
        if (pressed && !isButtonDisabled) list.push(styles.outlinePressed);
        break;
      case 'destructive':
        list.push(styles.destructive);
        if (pressed && !isButtonDisabled) list.push(styles.destructivePressed);
        break;
      case 'ghost':
        list.push(styles.ghost);
        if (pressed && !isButtonDisabled) list.push(styles.ghostPressed);
        break;
    }

    if (isButtonDisabled) {
      list.push(styles.disabled);
    }

    if (style) list.push(style);

    return list;
  };

  const getTextColor = (): string => {
    if (isButtonDisabled) return colors.outline;
    switch (variant) {
      case 'primary':
        return colors.onPrimary;
      case 'secondary':
        return colors.onSecondary;
      case 'outline':
        return colors.primary;
      case 'destructive':
        return colors.onErrorContainer;
      case 'ghost':
        return colors.primary;
      default:
        return colors.onPrimary;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isButtonDisabled}
      style={({ pressed }) => getContainerStyle(pressed)}
      accessibilityRole="button"
      accessibilityState={{ disabled: isButtonDisabled }}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={getTextColor()}
          style={styles.spinner}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
          <Text
            style={[
              styles.text,
              { color: getTextColor() },
              size === 'sm' && styles.textSm,
              size === 'lg' && styles.textLg,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  sizeSm: {
    height: 36,
    paddingHorizontal: spacing.sm + 4,
  },
  sizeMd: {
    height: 48,
    paddingHorizontal: spacing.md,
  },
  sizeLg: {
    height: 52,
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryContainer,
    transform: [{ scale: 0.99 }],
  },
  secondary: {
    backgroundColor: colors.secondary,
  },
  secondaryPressed: {
    backgroundColor: colors.secondaryContainer,
  },
  outline: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  outlinePressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  destructive: {
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.error,
  },
  destructivePressed: {
    backgroundColor: '#FFE4E6',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  disabled: {
    opacity: 0.6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  text: {
    ...typography.labelLg,
    textAlign: 'center',
  },
  textSm: {
    ...typography.labelMd,
  },
  textLg: {
    ...typography.headlineSm,
  },
  spinner: {
    marginVertical: 2,
  },
});
