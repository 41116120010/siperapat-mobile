import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';

interface FaceOvalOverlayProps {
  onCapture: (photoUri: string) => void;
}

export const FaceOvalOverlay: React.FC<FaceOvalOverlayProps> = ({ onCapture }) => {
  const [isFaceAligned, setIsFaceAligned] = useState(true);
  const [captured, setCaptured] = useState(false);

  const handleCapture = () => {
    setCaptured(true);
    // Mock valid selfie data URI
    onCapture('file:///data/user/0/id.go.lldikti10.siperapat/cache/selfie_asn.jpg');
  };

  const handleRetake = () => {
    setCaptured(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name="photo-camera" size={20} color={colors.primary} />
        <View style={styles.headerText}>
          <Text style={styles.title}>1. Swafoto Kehadiran ASN</Text>
          <Text style={styles.subtitle}>
            Ambil foto wajah langsung untuk verifikasi presensi kedinasan
          </Text>
        </View>
      </View>

      {/* Viewport Box */}
      <View style={styles.viewportBox}>
        {/* Background Dark Canvas */}
        <View style={styles.canvasBackground}>
          <MaterialIcons name="person" size={120} color="#334155" />
        </View>

        {/* Oval Cutout Guide */}
        <View
          style={[
            styles.ovalGuide,
            isFaceAligned ? styles.ovalGuideAligned : styles.ovalGuideUnfinished,
          ]}
        >
          <View style={styles.topGuideBar} />
          <View style={styles.bottomGuideBar} />
        </View>

        {/* Guidance Pill Badge */}
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {captured
              ? '✓ Wajah ASN Terverifikasi'
              : 'Posisikan wajah di dalam bingkai oval'}
          </Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => setIsFaceAligned(!isFaceAligned)}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          accessibilityLabel="Ganti Kamera"
        >
          <MaterialIcons
            name="flip-camera-android"
            size={20}
            color={colors.onSurfaceVariant}
          />
        </Pressable>

        <Pressable
          onPress={captured ? handleRetake : handleCapture}
          style={({ pressed }) => [
            styles.captureButton,
            pressed && styles.captureButtonPressed,
          ]}
        >
          <MaterialIcons
            name={captured ? 'refresh' : 'photo-camera'}
            size={20}
            color={colors.onPrimary}
          />
          <Text style={styles.captureButtonText}>
            {captured ? 'Foto Ulang' : 'Ambil Foto'}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleCapture}
          style={({ pressed }) => [
            styles.uploadButton,
            pressed && styles.uploadButtonPressed,
          ]}
        >
          <MaterialIcons
            name="file-upload"
            size={20}
            color={colors.onSurfaceVariant}
          />
          <Text style={styles.uploadButtonText}>Pilih Foto</Text>
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
  viewportBox: {
    width: '100%',
    height: 260,
    backgroundColor: '#0B1C30',
    borderRadius: rounded.lg,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
  },
  canvasBackground: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.25,
  },
  ovalGuide: {
    width: 170,
    height: 220,
    borderRadius: 85,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  ovalGuideAligned: {
    borderColor: colors.successLight,
    shadowColor: colors.successLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  ovalGuideUnfinished: {
    borderColor: colors.secondaryAccent,
  },
  topGuideBar: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 1,
  },
  bottomGuideBar: {
    width: 24,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 1,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: spacing.sm,
    backgroundColor: 'rgba(11, 28, 48, 0.85)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeText: {
    ...typography.labelSm,
    color: '#FFFFFF',
    fontSize: 11,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  captureButton: {
    flex: 1.5,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: rounded.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  captureButtonPressed: {
    backgroundColor: colors.primaryContainer,
  },
  captureButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  uploadButton: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  uploadButtonPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  uploadButtonText: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '500',
  },
});
