import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';

export interface BiometricPrivacyPlaceholderProps {
  variant: 'avatar' | 'signature' | 'compactBtn' | 'modalNotice';
  label?: string;
  sublabel?: string;
}

export const BiometricPrivacyPlaceholder: React.FC<BiometricPrivacyPlaceholderProps> = ({
  variant,
  label,
  sublabel,
}) => {
  if (variant === 'avatar') {
    return (
      <View
        style={styles.avatarContainer}
        accessible
        accessibilityLabel={label ?? 'Swafoto dilindungi privasi'}
      >
        <Lock size={14} color={colors.textMuted} strokeWidth={2} />
      </View>
    );
  }

  if (variant === 'compactBtn') {
    const resolvedLabel = label ?? 'Terlindungi';
    return (
      <View
        style={styles.compactContainer}
        accessible
        accessibilityLabel={`${resolvedLabel} — media biometrik dilindungi privasi`}
      >
        <Lock size={13} color={colors.textMuted} strokeWidth={2} />
        <Text style={styles.compactLabel} numberOfLines={1}>
          {resolvedLabel}
        </Text>
      </View>
    );
  }

  if (variant === 'signature') {
    const resolvedLabel = label ?? 'Tanda Tangan Terlindungi';
    return (
      <View
        style={styles.signatureContainer}
        accessible
        accessibilityLabel={resolvedLabel}
      >
        <View style={styles.signatureRow}>
          <Lock size={14} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.signatureLabel} numberOfLines={1}>
            {resolvedLabel}
          </Text>
        </View>
        {sublabel ? (
          <Text style={styles.signatureSublabel} numberOfLines={2}>
            {sublabel}
          </Text>
        ) : null}
      </View>
    );
  }

  const resolvedTitle = label ?? 'Akses Media Biometrik Dibatasi';
  return (
    <View
      style={styles.modalContainer}
      accessible
      accessibilityLabel={sublabel ? `${resolvedTitle}. ${sublabel}` : resolvedTitle}
    >
      <View style={styles.modalIconCircle}>
        <Lock size={22} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.modalTitle}>{resolvedTitle}</Text>
      {sublabel ? <Text style={styles.modalSublabel}>{sublabel}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    width: '100%',
    height: '100%',
    minWidth: 32,
    minHeight: 32,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    flexShrink: 0,
  },
  compactLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    fontSize: 11,
  },
  signatureContainer: {
    width: '100%',
    minHeight: 68,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signatureLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    fontSize: 11,
  },
  signatureSublabel: {
    ...typography.bodySm,
    color: colors.textMuted,
    fontSize: 10.5,
    textAlign: 'center',
  },
  modalContainer: {
    width: '100%',
    height: '100%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
    textAlign: 'center',
  },
  modalSublabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: '92%',
  },
});
