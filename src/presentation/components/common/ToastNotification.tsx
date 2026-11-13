import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';

export interface ToastNotificationProps {
  visible: boolean;
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onDismiss: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  visible,
  type = 'info',
  message,
  duration = 3500,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (visible) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();

      timer = setTimeout(() => {
        handleDismiss();
      }, duration);
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible, duration]);

  const handleDismiss = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color={colors.successLight} strokeWidth={2} />;
      case 'error':
        return <AlertCircle size={18} color={colors.errorLight} strokeWidth={2} />;
      case 'warning':
        return <AlertTriangle size={18} color={colors.warningLight} strokeWidth={2} />;
      case 'info':
      default:
        return <Info size={18} color={colors.infoBorder} strokeWidth={2} />;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 12,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-24, 0],
              }),
            },
          ],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.iconWrap}>{renderIcon()}</View>

      <Text style={styles.messageText} numberOfLines={2}>
        {message}
      </Text>

      <Pressable
        onPress={handleDismiss}
        style={styles.closeBtn}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Tutup pemberitahuan"
      >
        <X size={16} color={colors.onPrimaryContainer} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 99999,
    backgroundColor: colors.toastBg,
    borderRadius: rounded.lg,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.toastBorder,
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        }
      : {}),
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: rounded.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    ...typography.labelMd,
    fontSize: 13,
    color: colors.onPrimary,
    flex: 1,
    lineHeight: 18,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
