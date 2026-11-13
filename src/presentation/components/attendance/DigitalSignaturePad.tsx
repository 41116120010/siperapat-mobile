import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  GestureResponderEvent,
  Alert,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Check, PenTool, RotateCcw, ShieldCheck } from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';

interface DigitalSignaturePadProps {
  onSignatureChange: (signatureSvg: string) => void;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  onSignatureChange,
}) => {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPathRef = useRef<string>('');
  const svgRef = useRef<Svg>(null);

  const hasDrawn = paths.length > 0;

  // ponytail: menggunakan PanResponder native React Native untuk kanvas TTD ringan tanpa library eksternal berlebih
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPathRef.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setPaths((prev) => [...prev, currentPathRef.current]);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPathRef.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        setPaths((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = currentPathRef.current;
          return updated;
        });
      },
      onPanResponderRelease: () => {
        setTimeout(() => svgRef.current?.toDataURL((base64) => {
          if (Math.ceil(base64.length * 0.75) > 512 * 1024) {
            Alert.alert('Tanda tangan terlalu besar', 'Bersihkan sebagian goresan atau ulangi tanda tangan. Batas API adalah 512 KB.');
            onSignatureChange('');
            return;
          }
          onSignatureChange(`data:image/png;base64,${base64}`);
        }), 50);
      },
    })
  ).current;

  const handleClear = () => {
    currentPathRef.current = '';
    setPaths([]);
    onSignatureChange('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionStepBadge}>
          <Text style={styles.sectionStepText}>2</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Tanda Tangan Digital</Text>
          <Text style={styles.subtitle}>
            Bubuhkan tanda tangan pada area kanvas berikut
          </Text>
        </View>
        <View style={[styles.statusBadge, hasDrawn && styles.statusBadgeReady]}>
          <Text style={[styles.statusBadgeText, hasDrawn && styles.statusBadgeTextReady]}>
            {hasDrawn ? 'Tanda Tangan Terisi' : 'Belum Ditandatangani'}
          </Text>
        </View>
      </View>

      {/* Signature Canvas Box */}
      <View style={styles.canvasContainer}>
        {/* Institutional Watermark */}
        <View style={styles.watermark} pointerEvents="none">
          <ShieldCheck size={96} color={colors.primary} strokeWidth={1.5} />
        </View>

        {/* Empty Canvas Placeholder */}
        {!hasDrawn ? (
          <View style={styles.placeholderOverlay} pointerEvents="none">
            <PenTool size={24} color={colors.textMuted} strokeWidth={1.75} />
            <Text style={styles.placeholderText}>
              Goreskan tanda tangan Anda di area ini
            </Text>
          </View>
        ) : null}

        {/* SVG Drawing Layer */}
        <View style={styles.touchArea} {...panResponder.panHandlers}>
          <Svg ref={svgRef} style={StyleSheet.absoluteFill}>
            {paths.map((d, index) => (
              <Path
                key={index}
                d={d}
                stroke={colors.primary}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </Svg>
        </View>

        {/* Baseline Guide */}
        <View style={styles.baselineGuide} pointerEvents="none">
          <Text style={styles.baselineLabel}>Tanda Tangan Digital ASN</Text>
          <Text style={styles.baselineLabel}>Garis Batas</Text>
        </View>
      </View>

      {/* Utilities Bar */}
      <View style={styles.utilityBar}>
        <View style={styles.utilityNoticeRow}>
          {hasDrawn ? (
            <Check size={14} color={colors.success} strokeWidth={2} />
          ) : null}
          <Text style={[styles.utilityNotice, hasDrawn && styles.utilityNoticeActive]}>
            {hasDrawn ? 'Tanda tangan terdata' : 'Tanda tangan tersimpan otomatis'}
          </Text>
        </View>
        <Pressable
          onPress={handleClear}
          style={({ pressed }) => [
            styles.clearButton,
            pressed && styles.clearButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Bersihkan dan ulangi tanda tangan"
        >
          <RotateCcw size={16} color={colors.textSecondary} strokeWidth={2} />
          <Text style={styles.clearButtonText}>Bersihkan / Ulangi TTD</Text>
        </Pressable>
      </View>
      <Text style={styles.helperText}>
        Gunakan jari tangan pada layar sentuh atau mouse pada layar.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...cardSurface,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.sm + 2,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionStepBadge: {
    width: 24,
    height: 24,
    borderRadius: rounded.full,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionStepText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onPrimary,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 15,
    color: colors.primaryDarkest,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statusBadgeReady: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  statusBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  statusBadgeTextReady: {
    color: colors.onSuccessContainer,
  },
  canvasContainer: {
    height: 176,
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    position: 'relative',
    overflow: 'hidden',
  },
  watermark: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.05,
  },
  placeholderOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  placeholderText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
    textAlign: 'center',
  },
  touchArea: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  baselineGuide: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.borderStrong,
    borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  baselineLabel: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoMedium,
    fontSize: 10,
    color: colors.outline,
  },
  utilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm + 2,
    gap: spacing.sm,
  },
  utilityNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  utilityNotice: {
    ...typography.labelSm,
    color: colors.textSecondary,
    fontSize: 11,
  },
  utilityNoticeActive: {
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.success,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm + 4,
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    gap: 6,
  },
  clearButtonPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  clearButtonText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  helperText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs + 2,
  },
});
