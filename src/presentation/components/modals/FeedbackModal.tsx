import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';
import { Button } from '../common/Button';
import { FeedbackType } from '../../store/useFeedbackStore';

export interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  type?: FeedbackType;
  title: string;
  message: string;
  detail?: string | Record<string, string>;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'destructive';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  onClose,
  type = 'info',
  title,
  message,
  detail,
  confirmText,
  cancelText,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) => {
  const getThemeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle' as keyof typeof MaterialIcons.glyphMap,
          color: colors.success,
          bgColor: 'rgba(5, 150, 105, 0.12)',
          defaultConfirmText: 'Selesai',
        };
      case 'error':
        return {
          icon: 'error-outline' as keyof typeof MaterialIcons.glyphMap,
          color: colors.error,
          bgColor: 'rgba(186, 26, 26, 0.12)',
          defaultConfirmText: 'Mengerti',
        };
      case 'warning':
        return {
          icon: 'warning-amber' as keyof typeof MaterialIcons.glyphMap,
          color: colors.warning,
          bgColor: 'rgba(217, 119, 6, 0.12)',
          defaultConfirmText: 'Lanjutkan',
        };
      case 'confirm':
        return {
          icon: 'help-outline' as keyof typeof MaterialIcons.glyphMap,
          color: colors.secondary,
          bgColor: 'rgba(0, 81, 213, 0.12)',
          defaultConfirmText: 'Ya, Lanjutkan',
        };
      case 'info':
      default:
        return {
          icon: 'info-outline' as keyof typeof MaterialIcons.glyphMap,
          color: colors.primary,
          bgColor: 'rgba(0, 35, 111, 0.1)',
          defaultConfirmText: 'Mengerti',
        };
    }
  };

  const config = getThemeConfig();
  const showCancel = Boolean(cancelText) || type === 'confirm';
  const resolvedConfirmText = confirmText || config.defaultConfirmText;
  const resolvedCancelText = cancelText || 'Batal';

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Tutup dialog"
        />

        <View style={styles.card}>
          {/* Circular Themed Icon Header */}
          <View style={[styles.iconWrap, { backgroundColor: config.bgColor }]}>
            <MaterialIcons name={config.icon} size={32} color={config.color} />
          </View>

          {/* Texts */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Detail Box (Technical code or key-value summary) */}
          {detail ? (
            typeof detail === 'string' ? (
              <View style={styles.monoBox}>
                <Text style={styles.monoText}>{detail}</Text>
              </View>
            ) : (
              <View style={styles.summaryBox}>
                {Object.entries(detail).map(([key, val]) => (
                  <View key={key} style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>{key}</Text>
                    <Text style={styles.summaryVal} numberOfLines={1}>
                      {val}
                    </Text>
                  </View>
                ))}
              </View>
            )
          ) : null}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Button
              title={resolvedConfirmText}
              onPress={handleConfirm}
              variant={confirmVariant === 'destructive' ? 'destructive' : 'primary'}
              size="md"
              fullWidth
            />

            {showCancel ? (
              <Button
                title={resolvedCancelText}
                onPress={handleCancel}
                variant="outline"
                size="md"
                fullWidth
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 18,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(197, 197, 211, 0.5)',
      },
    }),
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
  },
  title: {
    ...typography.headlineSm,
    fontSize: 16,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
  },
  message: {
    ...typography.bodySm,
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  monoBox: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
  },
  monoText: {
    ...typography.labelSm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.onSurface,
    fontSize: 11,
    textAlign: 'center',
  },
  summaryBox: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryKey: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  summaryVal: {
    ...typography.bodySm,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurface,
    maxWidth: '65%',
  },
  actionsContainer: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
