import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  LucideIcon,
} from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { cardSurface, rounded, spacing } from '../../../core/theme/tokens';
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
  const getThemeConfig = (): {
    Icon: LucideIcon;
    color: string;
    bgColor: string;
    defaultConfirmText: string;
  } => {
    switch (type) {
      case 'success':
        return {
          Icon: CheckCircle2,
          color: colors.success,
          bgColor: colors.successContainer,
          defaultConfirmText: 'Selesai',
        };
      case 'error':
        return {
          Icon: AlertCircle,
          color: colors.error,
          bgColor: colors.errorContainer,
          defaultConfirmText: 'Mengerti',
        };
      case 'warning':
        return {
          Icon: AlertTriangle,
          color: colors.warning,
          bgColor: colors.warningContainer,
          defaultConfirmText: 'Lanjutkan',
        };
      case 'confirm':
        return {
          Icon: HelpCircle,
          color: colors.infoText,
          bgColor: colors.infoBg,
          defaultConfirmText: 'Ya, Lanjutkan',
        };
      case 'info':
      default:
        return {
          Icon: Info,
          color: colors.primary,
          bgColor: colors.surfaceSoft,
          defaultConfirmText: 'Mengerti',
        };
    }
  };

  const { Icon: StatusIcon, color: iconColor, bgColor, defaultConfirmText } = getThemeConfig();
  const showCancel = Boolean(cancelText) || type === 'confirm';
  const resolvedConfirmText = confirmText || defaultConfirmText;
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
          <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>
            <StatusIcon size={32} color={iconColor} strokeWidth={2} />
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
    backgroundColor: colors.scrimNeutralMid,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
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
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 16,
    color: colors.onSurface,
    textAlign: 'center',
  },
  message: {
    ...typography.bodySm,
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  monoBox: {
    width: '100%',
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  monoText: {
    ...typography.labelMono,
    color: colors.onSurface,
    fontSize: 11,
    textAlign: 'center',
  },
  summaryBox: {
    width: '100%',
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryKey: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.textMuted,
  },
  summaryVal: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11.5,
    color: colors.onSurface,
    maxWidth: '65%',
  },
  actionsContainer: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
