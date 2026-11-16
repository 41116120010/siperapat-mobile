import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import {
  Camera,
  Check,
  RotateCcw,
  Search,
  SwitchCamera,
  Upload,
  User,
  X,
} from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { useFeedbackStore } from '../../store/useFeedbackStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FaceOvalOverlayProps {
  onCapture: (photoUri: string) => void;
}

export const FaceOvalOverlay: React.FC<FaceOvalOverlayProps> = ({ onCapture }) => {
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [captured, setCaptured] = useState(false);
  const [captureSource, setCaptureSource] = useState<'camera' | 'gallery' | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [isInspectVisible, setIsInspectVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const acceptPhoto = (
    base64: string | null | undefined,
    mimeType?: string | null,
    source: 'camera' | 'gallery' = 'camera'
  ) => {
    if (!base64) return;
    const mime = (mimeType ?? 'image/jpeg').toLowerCase();
    const bytes = Math.ceil(base64.length * 0.75);
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime) || bytes > 512 * 1024) {
      useFeedbackStore.getState().showModal({
        type: 'warning',
        title: 'Foto Tidak Sesuai',
        message: 'Foto harus berupa JPEG/PNG/WebP dan maksimal 512 KB. Silakan pilih atau ambil foto lain.',
      });
      return;
    }
    const data = `data:${mime};base64,${base64}`;
    setPhotoData(data);
    setCaptured(true);
    setCaptureSource(source);
    onCapture(data);
  };

  const preparePhoto = async (uri: string, source: 'camera' | 'gallery' = 'camera') => {
    // Web SSOT alignment (create.blade.php): width 600, JPEG 0.75; fallback 480 @ 0.5 if > 512 KB
    let prepared = await manipulateAsync(
      uri,
      [{ resize: { width: 600 } }],
      { base64: true, compress: 0.75, format: SaveFormat.JPEG }
    );
    if (prepared.base64 && Math.ceil(prepared.base64.length * 0.75) > 512 * 1024) {
      prepared = await manipulateAsync(
        uri,
        [{ resize: { width: 480 } }],
        { base64: true, compress: 0.5, format: SaveFormat.JPEG }
      );
    }
    acceptPhoto(prepared.base64, 'image/jpeg', source);
  };

  const handleCapture = async () => {
    if (isProcessing) return;
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        useFeedbackStore.getState().showModal({
          type: 'warning',
          title: 'Izin Kamera Ditolak',
          message: 'Akses kamera tidak diizinkan atau tidak didukung. Silakan gunakan opsi unggah foto di bawah.',
        });
      }
      return;
    }
    setIsProcessing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        await preparePhoto(photo.uri, 'camera');
      }
    } catch {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: 'Kamera gagal mengambil foto. Periksa izin kamera atau gunakan unggah foto.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickPhoto = async () => {
    if (isProcessing) return;
    try {
      const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaPerm.granted) {
        useFeedbackStore.getState().showModal({
          type: 'warning',
          title: 'Izin Galeri Diperlukan',
          message: 'Izinkan akses galeri foto pada pengaturan perangkat untuk memilih berkas swafoto.',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setIsProcessing(true);
        try {
          await preparePhoto(result.assets[0].uri, 'gallery');
        } finally {
          setIsProcessing(false);
        }
      }
    } catch {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: 'Gagal memilih foto dari galeri perangkat.',
      });
    }
  };

  const handleRetake = () => {
    setIsInspectVisible(false);
    setCaptured(false);
    setCaptureSource(null);
    setPhotoData(null);
    onCapture('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionStepBadge}>
          <Text style={styles.sectionStepText}>1</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Foto Selfie Wajah</Text>
          <Text style={styles.subtitle}>
            Ambil foto wajah langsung untuk verifikasi presensi kedinasan
          </Text>
        </View>
        <View style={[styles.statusBadge, captured && styles.statusBadgeReady]}>
          <Text style={[styles.statusBadgeText, captured && styles.statusBadgeTextReady]}>
            {!captured
              ? 'Belum Diambil'
              : captureSource === 'gallery'
              ? 'Berkas Foto Siap'
              : 'Foto Terverifikasi'}
          </Text>
        </View>
      </View>

      {/* Viewport Box */}
      <View style={styles.viewportBox}>
        {photoData ? (
          <Pressable
            onPress={() => setIsInspectVisible(true)}
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Perbesar dan periksa hasil foto selfie"
          >
            <Image
              source={{ uri: photoData }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          </Pressable>
        ) : permission?.granted ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
          />
        ) : (
          <Pressable
            style={styles.permissionFallback}
            onPress={() => void requestPermission()}
            accessibilityRole="button"
            accessibilityLabel="Berikan izin akses kamera"
          >
            <View style={styles.permissionAvatar}>
              <User size={44} color={colors.textSplashMuted} strokeWidth={1.75} />
            </View>
            <Text style={styles.permissionTitle}>Akses Kamera Belum Diizinkan</Text>
            <Text style={styles.permissionHint}>
              Akses kamera tidak diizinkan atau tidak didukung. Silakan gunakan opsi unggah foto di bawah.
            </Text>
          </Pressable>
        )}

        {/* Oval Cutout Guide */}
        {!captured && permission?.granted ? (
          <View style={[styles.ovalGuide, styles.ovalGuideAligned]} pointerEvents="none">
            <View style={styles.topGuideBar} />
            <View style={styles.bottomGuideBar} />
          </View>
        ) : null}

        {/* Guidance Pill Badge */}
        <View style={styles.badgeContainer} pointerEvents="none">
          <Text style={styles.badgeText}>
            {captured
              ? 'Ketuk foto untuk memeriksa detail'
              : 'Posisikan wajah di dalam bingkai oval'}
          </Text>
        </View>
      </View>

      {/* Control Buttons */}
      {!captured ? (
        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => setFacing((current) => (current === 'front' ? 'back' : 'front'))}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.secondaryButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ganti Kamera Depan atau Belakang"
          >
            <SwitchCamera size={20} color={colors.onSurface} strokeWidth={2} />
          </Pressable>

          <Pressable
            onPress={() => void handleCapture()}
            disabled={isProcessing}
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.captureButtonPressed,
              isProcessing && styles.buttonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ambil Foto Wajah"
          >
            <Camera size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={styles.captureButtonText}>
              {isProcessing ? 'Memproses...' : 'Ambil Foto Wajah'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => setIsInspectVisible(true)}
            style={({ pressed }) => [
              styles.secondaryActionButton,
              pressed && styles.secondaryButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Periksa Foto Selfie"
          >
            <Search size={16} color={colors.onSurface} strokeWidth={2} />
            <Text style={styles.secondaryActionText}>Periksa Foto</Text>
          </Pressable>

          <Pressable
            onPress={handleRetake}
            style={({ pressed }) => [
              styles.secondaryActionButton,
              pressed && styles.secondaryButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ambil Ulang Foto Selfie"
          >
            <RotateCcw size={16} color={colors.onSurface} strokeWidth={2} />
            <Text style={styles.secondaryActionText}>Ambil Ulang</Text>
          </Pressable>
        </View>
      )}

      {/* Gallery / File Fallback (always available cleanly when camera fails or permission is denied) */}
      <View style={styles.fallbackRow}>
        <Pressable
          onPress={() => void handlePickPhoto()}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.fallbackButton,
            pressed && styles.secondaryButtonPressed,
            isProcessing && styles.buttonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Unggah berkas foto dari galeri"
        >
          <Upload size={15} color={colors.primary} strokeWidth={2} />
          <Text style={styles.fallbackButtonText}>
            Bermasalah dengan kamera? Unggah berkas foto
          </Text>
        </Pressable>
      </View>

      {/* "Periksa Foto" Lightbox Modal (aligned with Web selfie_preview_modal) */}
      <Modal
        visible={isInspectVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsInspectVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalHeaderIcon}>
                  <Camera size={18} color={colors.onSuccessContainer} strokeWidth={2} />
                </View>
                <View style={styles.modalTitleGroup}>
                  <Text style={styles.modalTitle}>Verifikasi Foto Selfie Kehadiran</Text>
                  <View style={styles.modalBadgeRow}>
                    <View style={styles.modalValidBadge}>
                      <Check size={11} color={colors.onSuccessContainer} strokeWidth={2.5} />
                      <Text style={styles.modalValidText}>Foto Siap Dikirim</Text>
                    </View>
                  </View>
                </View>
              </View>
              <Pressable
                onPress={() => setIsInspectVisible(false)}
                style={({ pressed }) => [
                  styles.modalCloseBtn,
                  pressed && styles.secondaryButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Tutup pratinjau foto selfie"
              >
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            <View style={styles.modalViewport}>
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                centerContent
                contentContainerStyle={styles.modalZoomContainer}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                {photoData ? (
                  <Image
                    source={{ uri: photoData }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                ) : null}
              </ScrollView>
            </View>

            <View style={styles.modalMetaBox}>
              <Text style={styles.modalMetaLabel}>STATUS PEREKAMAN</Text>
              <Text style={styles.modalMetaValue}>
                Pratinjau Foto Sebelum Dikirim • Perekaman Lokal Perangkat
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={handleRetake}
                style={({ pressed }) => [
                  styles.modalSecondaryBtn,
                  pressed && styles.secondaryButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ambil Ulang Foto"
              >
                <RotateCcw size={16} color={colors.onSurface} strokeWidth={2} />
                <Text style={styles.modalSecondaryBtnText}>Ambil Ulang</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsInspectVisible(false)}
                style={({ pressed }) => [
                  styles.modalPrimaryBtn,
                  pressed && styles.captureButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Tutup pratinjau"
              >
                <Text style={styles.modalPrimaryBtnText}>Tutup</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  viewportBox: {
    width: '100%',
    height: 260,
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.xl,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  permissionFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    backgroundColor: colors.primaryDarkest,
  },
  permissionAvatar: {
    width: 72,
    height: 72,
    borderRadius: rounded.full,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  permissionTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
    textAlign: 'center',
  },
  permissionHint: {
    ...typography.bodySm,
    color: colors.textSplashMuted,
    textAlign: 'center',
  },
  ovalGuide: {
    width: 170,
    height: 215,
    borderRadius: 85,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  ovalGuideAligned: {
    borderColor: colors.onPrimary,
  },
  topGuideBar: {
    width: 24,
    height: 2,
    backgroundColor: colors.onPrimary,
    opacity: 0.75,
    borderRadius: 1,
  },
  bottomGuideBar: {
    width: 24,
    height: 2,
    backgroundColor: colors.onPrimary,
    opacity: 0.75,
    borderRadius: 1,
  },
  badgeContainer: {
    position: 'absolute',
    bottom: spacing.sm,
    backgroundColor: colors.scrimNeutralBottom,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.secondaryContainer,
  },
  badgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
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
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  captureButtonPressed: {
    backgroundColor: colors.primaryContainer,
  },
  captureButtonText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  secondaryActionText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  fallbackRow: {
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  fallbackButton: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
  },
  fallbackButtonText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11.5,
    color: colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.scrimNeutralTop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    ...cardSurface,
    width: Math.min(SCREEN_WIDTH - spacing.md * 2, 440),
    maxHeight: SCREEN_HEIGHT * 0.86,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    marginRight: spacing.xs,
  },
  modalHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: rounded.md,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleGroup: {
    flex: 1,
  },
  modalTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.primaryDarkest,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  modalValidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: rounded.full,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  modalValidText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    color: colors.onSuccessContainer,
  },
  modalCloseBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  modalViewport: {
    width: '100%',
    height: 300,
    backgroundColor: colors.primaryDarkest,
  },
  modalZoomContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalMetaBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceSoft,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  modalMetaLabel: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  modalMetaValue: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onSurface,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
  },
  modalSecondaryBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  modalSecondaryBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  modalPrimaryBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
  },
  modalPrimaryBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
});
