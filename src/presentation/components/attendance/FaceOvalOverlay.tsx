import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';

interface FaceOvalOverlayProps {
  onCapture: (photoUri: string) => void;
}

export const FaceOvalOverlay: React.FC<FaceOvalOverlayProps> = ({ onCapture }) => {
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [captured, setCaptured] = useState(false);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const acceptPhoto = (base64: string | null | undefined, mimeType?: string | null) => {
    if (!base64) return;
    const mime = (mimeType ?? 'image/jpeg').toLowerCase();
    const bytes = Math.ceil(base64.length * 0.75);
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime) || bytes > 512 * 1024) {
      Alert.alert('Foto tidak sesuai', 'Foto harus berupa JPEG/PNG/WebP dan maksimal 512 KB. Silakan pilih atau ambil foto lain.');
      return;
    }
    const data = `data:${mime};base64,${base64}`;
    setPhotoData(data);
    setCaptured(true);
    onCapture(data);
  };

  const preparePhoto = async (uri: string) => {
    let prepared = await manipulateAsync(uri, [{ resize: { width: 640 } }], { base64: true, compress: 0.5, format: SaveFormat.JPEG });
    if (prepared.base64 && Math.ceil(prepared.base64.length * 0.75) > 512 * 1024) {
      prepared = await manipulateAsync(uri, [{ resize: { width: 480 } }], { base64: true, compress: 0.35, format: SaveFormat.JPEG });
    }
    acceptPhoto(prepared.base64, 'image/jpeg');
  };

  const handleCapture = async () => {
    if (!permission?.granted) {
      await requestPermission();
      return;
    }
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5 });
      if (photo?.uri) await preparePhoto(photo.uri);
    } catch {
      Alert.alert('Kamera gagal', 'Periksa izin kamera dan coba lagi.');
    }
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
    if (!result.canceled) await preparePhoto(result.assets[0].uri);
  };

  const handleRetake = () => {
    setCaptured(false);
    setPhotoData(null);
    onCapture('');
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
        {photoData ? <Image source={{ uri: photoData }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : permission?.granted ? <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} /> : <Pressable style={styles.canvasBackground} onPress={() => void requestPermission()}><MaterialIcons name="person" size={120} color="#334155" /><Text style={styles.badgeText}>Ketuk untuk memberi izin kamera</Text></Pressable>}

        {/* Oval Cutout Guide */}
        {!captured ? <View style={[styles.ovalGuide, styles.ovalGuideAligned]}>
          <View style={styles.topGuideBar} />
          <View style={styles.bottomGuideBar} />
        </View> : null}

        {/* Guidance Pill Badge */}
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>
            {captured
              ? 'Foto siap dikirim'
              : 'Posisikan wajah di dalam bingkai oval'}
          </Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => setFacing((current) => current === 'front' ? 'back' : 'front')}
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
          onPress={() => void handlePickPhoto()}
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
