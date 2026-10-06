import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';

interface DigitalSignaturePadProps {
  onSignatureChange: (signatureSvg: string) => void;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  onSignatureChange,
}) => {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPathRef = useRef<string>('');

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
        onSignatureChange(currentPathRef.current);
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
        <MaterialIcons name="draw" size={20} color={colors.primary} />
        <View style={styles.headerText}>
          <Text style={styles.title}>2. Tanda Tangan Digital Resmi ASN</Text>
          <Text style={styles.subtitle}>
            Bubuhkan tanda tangan pada area kanvas berikut
          </Text>
        </View>
      </View>

      {/* Signature Canvas Box */}
      <View style={styles.canvasContainer}>
        {/* Institutional Watermark */}
        <View style={styles.watermark}>
          <MaterialIcons name="verified-user" size={100} color={colors.primary} />
        </View>

        {/* SVG Drawing Layer */}
        <View style={styles.touchArea} {...panResponder.panHandlers}>
          <Svg style={StyleSheet.absoluteFill}>
            {paths.map((d, index) => (
              <Path
                key={index}
                d={d}
                stroke={colors.primary}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </Svg>
        </View>

        {/* Baseline Guide */}
        <View style={styles.baselineGuide}>
          <Text style={styles.baselineLabel}>Tanda Tangan Digital ASN</Text>
          <Text style={styles.baselineLabel}>Garis Batas</Text>
        </View>
      </View>

      {/* Utilities Bar */}
      <View style={styles.utilityBar}>
        <Text style={styles.utilityNotice}>
          {paths.length > 0 ? '✓ Tanda tangan terdata' : 'Tanda tangan tersimpan otomatis'}
        </Text>
        <Pressable
          onPress={handleClear}
          style={({ pressed }) => [
            styles.clearButton,
            pressed && styles.clearButtonPressed,
          ]}
        >
          <MaterialIcons name="refresh" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.clearButtonText}>Hapus / Ulangi</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm + 2,
  },
  headerText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  canvasContainer: {
    height: 160,
    backgroundColor: '#FAF5FF',
    borderRadius: rounded.md,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    position: 'relative',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.06,
  },
  touchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  baselineGuide: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: '#CBD5E1',
    borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  baselineLabel: {
    ...typography.labelMono,
    fontSize: 10,
    color: colors.outline,
  },
  utilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  utilityNotice: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 4,
  },
  clearButtonPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  clearButtonText: {
    ...typography.labelSm,
    color: colors.onSurface,
  },
});
