import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  Camera,
  CameraOff,
  ImageOff,
  PenTool,
  RefreshCw,
  Share2,
  ShieldCheck,
  Signature,
  User,
  X,
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { Button } from '../common/Button';
import { useFeedbackStore } from '../../store/useFeedbackStore';
import { authTokenStore } from '../../../data/datasources/authTokenStore';
import { formatTanggalIndonesia, formatWaktuWIB } from '../../../core/utils/dateFormatter';
import { resolveAttendanceMediaUrl } from '../../../core/utils/mediaUrl';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface EvidenceViewerModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'selfie' | 'signature';
  attendanceId?: string;
  selfieUrl?: string | null;
  selfieUri?: string;
  signatureUrl?: string | null;
  signatureSvg?: string;
  participantName?: string;
  participantNip?: string;
  meetingTitle?: string;
  verificationToken?: string;
  signedAt?: string;
  ipAddress?: string;
  deviceInfo?: string;
}

export const EvidenceViewerModal: React.FC<EvidenceViewerModalProps> = ({
  visible,
  onClose,
  initialTab = 'selfie',
  attendanceId = '',
  selfieUrl,
  selfieUri,
  signatureUrl,
  signatureSvg,
  participantName,
  participantNip,
  meetingTitle,
  verificationToken,
  signedAt,
  ipAddress,
  deviceInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'selfie' | 'signature'>(initialTab);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaErrorMessage, setMediaErrorMessage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  // Compute canonical target URL
  const targetMediaUrl = useMemo(() => {
    const raw = activeTab === 'selfie'
      ? (selfieUri || selfieUrl || null)
      : (signatureSvg || signatureUrl || null);

    return resolveAttendanceMediaUrl(raw, attendanceId, activeTab);
  }, [activeTab, selfieUri, selfieUrl, signatureSvg, signatureUrl, attendanceId]);

  const loadMediaFile = useCallback(async () => {
    if (!visible) return;

    setMediaErrorMessage(null);

    if (!targetMediaUrl) {
      setLocalImageUri(null);
      setMediaErrorMessage(
        activeTab === 'selfie'
          ? 'Berkas foto swafoto belum tersedia pada tanda terima ini.'
          : 'Berkas tanda tangan digital belum tersedia pada tanda terima ini.'
      );
      return;
    }

    // 1. Direct Base64 data URI or Local file URI (from fresh attendance submission)
    if (targetMediaUrl.startsWith('data:image/') || targetMediaUrl.startsWith('file://')) {
      setLocalImageUri(targetMediaUrl);
      setIsLoadingMedia(false);
      return;
    }

    // 2. Remote URL: download to local cache with Bearer Token to guarantee 100% reliable rendering
    setIsLoadingMedia(true);
    try {
      const token = await authTokenStore.get();
      const cacheDir = FileSystem.cacheDirectory || '';
      const safeId = (attendanceId || 'att').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeToken = (verificationToken || 'SIP').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = activeTab === 'selfie' ? 'jpg' : 'png';
      const localDest = `${cacheDir}evidence_${activeTab}_${safeId}_${safeToken}.${ext}`;

      // Check if file is already cached locally
      const existingInfo = await FileSystem.getInfoAsync(localDest);
      if (existingInfo.exists && existingInfo.size && existingInfo.size > 0) {
        setLocalImageUri(localDest);
        setIsLoadingMedia(false);
        return;
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const downloadResult = await FileSystem.downloadAsync(targetMediaUrl, localDest, {
        headers,
      });

      if (downloadResult.status === 200) {
        setLocalImageUri(downloadResult.uri);
      } else if (downloadResult.status === 404) {
        setLocalImageUri(null);
        setMediaErrorMessage(
          activeTab === 'selfie'
            ? 'Berkas swafoto fisik tidak ditemukan di server (catatan presensi lama mungkin dibuat tanpa lampiran foto).'
            : 'Berkas tanda tangan digital tidak ditemukan di server.'
        );
      } else if (downloadResult.status === 401) {
        setLocalImageUri(null);
        setMediaErrorMessage('Sesi otentikasi telah berakhir. Silakan masuk kembali ke aplikasi.');
      } else {
        setLocalImageUri(null);
        setMediaErrorMessage(`Gagal mengunduh berkas dari server (HTTP ${downloadResult.status}).`);
      }
    } catch (error) {
      setLocalImageUri(null);
      setMediaErrorMessage(
        error instanceof Error
          ? error.message
          : 'Terjadi gangguan jaringan saat memuat berkas bukti digital.'
      );
    } finally {
      setIsLoadingMedia(false);
    }
  }, [visible, targetMediaUrl, activeTab, attendanceId, verificationToken]);

  useEffect(() => {
    void loadMediaFile();
  }, [loadMediaFile]);

  const formattedDateTime = useMemo(() => {
    if (!signedAt) return 'Waktu tidak tersedia';
    try {
      const dateStr = formatTanggalIndonesia(signedAt);
      const timeStr = formatWaktuWIB(signedAt);
      return `${dateStr} • ${timeStr}`;
    } catch {
      return signedAt;
    }
  }, [signedAt]);

  const handleShareEvidence = async () => {
    if (!localImageUri) return;
    try {
      setIsSharing(true);
      let targetShareUri = localImageUri;

      // If localImageUri is a Base64 data URI, write it to a temporary file for expo-sharing
      if (localImageUri.startsWith('data:image/')) {
        const matches = localImageUri.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const base64Data = matches[2];
          const tempPath = `${FileSystem.cacheDirectory || ''}share_${activeTab}_${Date.now()}.${ext}`;
          await FileSystem.writeAsStringAsync(tempPath, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          targetShareUri = tempPath;
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetShareUri, {
          mimeType: activeTab === 'selfie' ? 'image/jpeg' : 'image/png',
          dialogTitle: `Bagikan Bukti ${activeTab === 'selfie' ? 'Swafoto' : 'Tanda Tangan'} Presensi`,
        });
      } else {
        useFeedbackStore.getState().showToast({
          type: 'info',
          message: 'Fitur berbagi tidak didukung pada perangkat ini.',
        });
      }
    } catch (err) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal membagikan bukti kehadiran.',
      });
    } finally {
      setIsSharing(false);
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
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                {activeTab === 'selfie' ? (
                  <Camera size={20} color={colors.primary} strokeWidth={2} />
                ) : (
                  <PenTool size={20} color={colors.primary} strokeWidth={2} />
                )}
              </View>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>Bukti Kehadiran Sah</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {participantName ? `${participantName} • NIP ${participantNip || '—'}` : 'Verifikasi Presensi Kedinasan'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
              accessibilityLabel="Tutup dialog bukti kehadiran"
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Dual-Tab Segmented Selector */}
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => setActiveTab('selfie')}
              style={[
                styles.tabItem,
                activeTab === 'selfie' && styles.tabItemActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'selfie' }}
            >
              <User
                size={17}
                color={activeTab === 'selfie' ? colors.primary : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.tabItemText,
                  activeTab === 'selfie' && styles.tabItemTextActive,
                ]}
              >
                Swafoto Wajah
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('signature')}
              style={[
                styles.tabItem,
                activeTab === 'signature' && styles.tabItemActive,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'signature' }}
            >
              <Signature
                size={17}
                color={activeTab === 'signature' ? colors.primary : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.tabItemText,
                  activeTab === 'signature' && styles.tabItemTextActive,
                ]}
              >
                Tanda Tangan
              </Text>
            </Pressable>
          </View>

          {/* Modal Body */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Image Viewport Canvas */}
            <View style={styles.canvasContainer}>
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                centerContent
                contentContainerStyle={styles.canvasZoomWrapper}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                {localImageUri && !mediaErrorMessage ? (
                  <Image
                    source={{ uri: localImageUri }}
                    style={activeTab === 'selfie' ? styles.selfieImage : styles.signatureImage}
                    resizeMode={activeTab === 'selfie' ? 'cover' : 'contain'}
                  />
                ) : null}

                {isLoadingMedia ? (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Menyiapkan berkas terotentikasi...</Text>
                  </View>
                ) : null}

                {mediaErrorMessage && !isLoadingMedia ? (
                  <View style={styles.errorBox}>
                    {activeTab === 'selfie' ? (
                      <CameraOff size={44} color={colors.textMuted} strokeWidth={2} />
                    ) : (
                      <ImageOff size={44} color={colors.textMuted} strokeWidth={2} />
                    )}
                    <Text style={styles.errorTitle}>
                      {activeTab === 'selfie' ? 'Swafoto Belum Tersedia' : 'Tanda Tangan Belum Tersedia'}
                    </Text>
                    <Text style={styles.errorSub}>{mediaErrorMessage}</Text>
                    <Pressable
                      onPress={() => void loadMediaFile()}
                      style={styles.retryBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Coba muat ulang berkas bukti"
                    >
                      <RefreshCw size={16} color={colors.primary} strokeWidth={2} />
                      <Text style={styles.retryBtnText}>Coba Muat Ulang</Text>
                    </Pressable>
                  </View>
                ) : null}
              </ScrollView>
            </View>

            {/* Official Digital Authenticity Card */}
            <View style={styles.authenticityCard}>
              <View style={styles.authenticityHeader}>
                <View style={styles.verifiedRow}>
                  <ShieldCheck size={16} color={colors.success} strokeWidth={2} />
                  <Text style={styles.verifiedText}>BUKTI SAH PRESENSI KEDINASAN</Text>
                </View>
                <Text style={styles.instansiSub}>
                  Lembaga Layanan Pendidikan Tinggi Wilayah X
                </Text>
              </View>

              <View style={styles.metaTable}>
                {verificationToken ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Nomor Bukti</Text>
                    <Text style={styles.metaValueMono} numberOfLines={1}>
                      {verificationToken}
                    </Text>
                  </View>
                ) : null}

                {meetingTitle ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Perihal Agenda</Text>
                    <Text style={styles.metaValue} numberOfLines={2}>
                      {meetingTitle}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Waktu Sah</Text>
                  <Text style={styles.metaValue}>{formattedDateTime}</Text>
                </View>

                {ipAddress ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>IP Perangkat</Text>
                    <Text style={styles.metaValueMono}>{ipAddress}</Text>
                  </View>
                ) : null}

                <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.metaLabel}>Metode Otentikasi</Text>
                  <Text style={styles.metaValue}>Swafoto & TTD Digital</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              {localImageUri && !mediaErrorMessage ? (
                <Button
                  title="Bagikan Bukti"
                  onPress={() => void handleShareEvidence()}
                  disabled={isSharing || isLoadingMedia}
                  isLoading={isSharing}
                  variant="outline"
                  size="md"
                  icon={<Share2 size={18} color={colors.primary} strokeWidth={2} />}
                  style={{ flex: 1 }}
                />
              ) : null}
              <Button
                title="Tutup"
                onPress={onClose}
                variant="ghost"
                size="md"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrimNeutralTop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    ...cardSurface,
    width: Math.min(SCREEN_WIDTH - spacing.md * 2, 440),
    maxHeight: SCREEN_HEIGHT * 0.88,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    gap: 6,
    borderRadius: rounded.sm,
  },
  tabItemActive: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  tabItemText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
  },
  tabItemTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  modalBody: {
    maxHeight: SCREEN_HEIGHT * 0.56,
  },
  modalBodyContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  canvasContainer: {
    width: '100%',
    height: 250,
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  canvasZoomWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfieImage: {
    width: '100%',
    height: '100%',
  },
  signatureImage: {
    width: '90%',
    height: '80%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surfaceCard,
    opacity: 0.92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  loadingText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },
  errorBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md,
    gap: 4,
  },
  errorTitle: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  errorSub: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: '90%',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    gap: 6,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  retryBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },
  authenticityCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    gap: spacing.xs,
  },
  authenticityHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.xs + 2,
    marginBottom: spacing.xs,
    gap: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.success,
    letterSpacing: 0.5,
  },
  instansiSub: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textSecondary,
  },
  metaTable: {
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  metaLabel: {
    ...typography.bodySm,
    color: colors.textMuted,
    flex: 1,
  },
  metaValue: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
    textAlign: 'right',
    flex: 1.5,
  },
  metaValueMono: {
    ...typography.labelMono,
    fontSize: 11.5,
    color: colors.primary,
    textAlign: 'right',
    flex: 1.5,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
