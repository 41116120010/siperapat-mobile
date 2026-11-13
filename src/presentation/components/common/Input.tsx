import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Platform,
} from 'react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputContainerStyle?: ViewStyle;
  isMono?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightAction,
  containerStyle,
  inputContainerStyle,
  isMono = false,
  style,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isMultiline = Boolean(rest.multiline);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputContainer,
          isMultiline && styles.inputContainerMultiline,
          isFocused && styles.inputFocused,
          Boolean(error) && styles.inputError,
          inputContainerStyle,
        ]}
      >
        {leftIcon ? (
          <View
            style={[
              styles.leftIcon,
              isMultiline && styles.leftIconMultiline,
            ]}
          >
            {leftIcon}
          </View>
        ) : null}
        <TextInput
          style={[
            styles.input,
            isMultiline && styles.inputMultiline,
            isMono && Boolean(rest.value) && styles.inputMono,
            Boolean(leftIcon) && styles.inputWithLeftIcon,
            Boolean(rightAction) && styles.inputWithRightAction,
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          textAlignVertical={isMultiline ? 'top' : (rest.textAlignVertical ?? 'center')}
          {...rest}
        />
        {rightAction ? (
          <View
            style={[
              styles.rightAction,
              isMultiline && styles.rightActionMultiline,
            ]}
          >
            {rightAction}
          </View>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    width: '100%',
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginBottom: spacing.xs + 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  inputContainerMultiline: {
    minHeight: 88,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  leftIcon: {
    paddingLeft: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftIconMultiline: {
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    alignSelf: 'flex-start',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.md,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  inputMultiline: {
    height: undefined,
    minHeight: 76,
    textAlignVertical: 'top',
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: 8,
  },
  inputMono: {
    ...typography.labelMono,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.sm + 2,
  },
  inputWithRightAction: {
    paddingRight: spacing.sm,
  },
  rightAction: {
    paddingRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightActionMultiline: {
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    alignSelf: 'flex-start',
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
