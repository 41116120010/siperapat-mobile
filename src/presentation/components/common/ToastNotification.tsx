import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';
import { FeedbackType } from '../../store/useFeedbackStore';

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

  const getTypeStyle = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle' as keyof typeof MaterialIcons.glyphMap,
          color: colors.success,
          borderColor: 'rgba(5, 150, 105, 0.3)',
          accentBg: 'rgba(5, 150, 105, 0.08)',
        };
      case 'error':
        return {
          icon: 'error-outline' as keyof typeof MaterialIcons.glyphMap,
          color: colors.error,
          borderColor: 'rgba(186, 26, 26, 0.3)',
          accentBg: 'rgba(186, 26, 26, 0.08)',
        };
      case 'warning':
        return {
          icon: 'warning-amber' as keyof typeof MaterialIcons.glyphMap,
          color: colors.warning,
          borderColor: 'rgba(217, 119, 6, 0.3)',
          accentBg: 'rgba(217, 119, 6, 0.08)',
        };
      case 'info':
      default:
        return {
          icon: 'info-outline' as keyof typeof MaterialIcons.glyphMap,
          color: colors.primary,
          borderColor: 'rgba(0, 35, 111, 0.25)',
          accentBg: 'rgba(0, 35, 111, 0.08)',
        };
    }
  };

  const styleConfig = getTypeStyle();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor: styleConfig.borderColor,
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
      <View style={[styles.iconWrap, { backgroundColor: styleConfig.accentBg }]}>
        <MaterialIcons
          name={styleConfig.icon}
          size={18}
          color={styleConfig.color}
        />
      </View>

      <Text style={styles.messageText} numberOfLines={2}>
        {message}
      </Text>

      <Pressable
        onPress={handleDismiss}
        style={styles.closeBtn}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Tutup pemberitahuan"
      >
        <MaterialIcons name="close" size={16} color={colors.outline} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 24,
    left: spacing.md,
    right: spacing.md,
    zIndex: 99999,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurface,
    flex: 1,
    lineHeight: 17,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
