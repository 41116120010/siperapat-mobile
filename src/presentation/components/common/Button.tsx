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
import { fontFamilies, typography } from '../../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'destructive' | 'outline' | 'ghost';
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
      case 'success':
        list.push(styles.success);
        if (pressed && !isButtonDisabled) list.push(styles.successPressed);
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
    if (isButtonDisabled) {
      return variant === 'primary' || variant === 'success'
        ? colors.onPrimary
        : colors.textMuted;
    }
    switch (variant) {
      case 'primary':
        return colors.onPrimary;
      case 'secondary':
        return colors.onSurface;
      case 'success':
        return colors.onPrimary;
      case 'outline':
        return colors.primary;
      case 'destructive':
        return colors.onErrorContainer;
      case 'ghost':
        return colors.secondary;
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  sizeSm: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
  },
  sizeMd: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sizeLg: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  secondary: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderStrong,
  },
  secondaryPressed: {
    backgroundColor: colors.background,
    borderColor: colors.outline,
  },
  success: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  successPressed: {
    backgroundColor: colors.onSuccessContainer,
    borderColor: colors.onSuccessContainer,
  },
  outline: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderStrong,
  },
  outlinePressed: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.outline,
  },
  destructive: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
  },
  destructivePressed: {
    backgroundColor: colors.destructivePressed,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  ghostPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  disabled: {
    opacity: 0.5,
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
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    textAlign: 'center',
  },
  textSm: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
  },
  textLg: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
  },
  spinner: {
    marginVertical: 2,
  },
});
