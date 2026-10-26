import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing, elevations } from '../../../core/theme/tokens';
import { Button } from '../common/Button';
import { useFeedbackStore } from '../../store/useFeedbackStore';
import { authTokenStore } from '../../../data/datasources/authTokenStore';
import { resolveSuratEdaranUrl } from '../../../core/utils/mediaUrl';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface SuratEdaranViewerModalProps {
  visible: boolean;
  onClose: () => void;
  documentUrl?: string | null;
  localFileUri?: string | null;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  meetingTitle?: string;
  meetingCode?: string;
  meetingDate?: string;
  canManage?: boolean;
  onReplaceFile?: () => void;
}

export const SuratEdaranViewerModal: React.FC<SuratEdaranViewerModalProps> = ({
  visible,
  onClose,
  documentUrl,
  localFileUri,
  fileName,
  fileSize,
  mimeType,
  meetingTitle,
  meetingCode,
  meetingDate,
  canManage = false,
  onReplaceFile,
}) => {
  const [cachedLocalUri, setCachedLocalUri] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [cacheError, setCacheError] = useState<string | null>(null);
  const [downloadedSize, setDownloadedSize] = useState<number | null>(fileSize ?? null);
  const [isSharing, setIsSharing] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Normalize remote document URL using active canonical backend host
  const canonicalDocumentUrl = useMemo(
    () => resolveSuratEdaranUrl(documentUrl),
    [documentUrl]
  );

  // Active URI priority: local file uri (e.g. from picker) > canonical remote URL
  const activeUri = localFileUri || canonicalDocumentUrl;
  const resolvedFileName = fileName || `Surat-Edaran_${meetingCode || 'Agenda'}.pdf`;

  // Determine whether the file is an image format
  const isImage = useMemo(() => {
    if (mimeType?.startsWith('image/')) return true;
    const lowerName = resolvedFileName.toLowerCase();
    const lowerUri = (activeUri || '').toLowerCase();
    return (
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp') ||
      lowerUri.includes('.jpg') ||
      lowerUri.includes('.jpeg') ||
      lowerUri.includes('.png') ||
      lowerUri.includes('.webp')
    );
  }, [mimeType, resolvedFileName, activeUri]);

  // Format file size label
  const formattedSize = useMemo(() => {
    const sizeToFormat = downloadedSize || fileSize;
    if (!sizeToFormat || sizeToFormat <= 0) return null;
    if (sizeToFormat < 1024 * 1024) {
      return `${(sizeToFormat / 1024).toFixed(1)} KB`;
    }
    return `${(sizeToFormat / (1024 * 1024)).toFixed(2)} MB`;
  }, [downloadedSize, fileSize]);

  /**
   * Pre-downloads or resolves the file into local cache so it can be viewed reliably
   * without encountering Android cleartext blocks, missing origin, or Fresco streaming dropped headers.
   */
  const prepareFile = useCallback(async () => {
    if (!activeUri) {
      setCachedLocalUri(null);
      return;
    }

    // 1. Direct local URIs (file://, data:, content://)
    if (
      activeUri.startsWith('file://') ||
      activeUri.startsWith('data:') ||
      activeUri.startsWith('content://')
    ) {
      setCachedLocalUri(activeUri);
      setCacheError(null);
      if (activeUri.startsWith('file://')) {
        try {
          const info = await FileSystem.getInfoAsync(activeUri);
          if (info.exists && typeof info.size === 'number') {
            setDownloadedSize(info.size);
          }
        } catch {
          // Keep existing size
        }
      }
      return;
    }

    // 2. Remote URLs (HTTP / HTTPS)
    try {
      setIsPreparing(true);
      setCacheError(null);
      setImageError(false);

      const cacheDir = FileSystem.cacheDirectory || '';
      const safeName = resolvedFileName.replace(/[\\/:*?"<>|\u0000-\u001f\s]/g, '_');
      const localDest = `${cacheDir}edaran_${safeName}`;

      // Check if already in cache and not zero-byte
      const existing = await FileSystem.getInfoAsync(localDest);
      if (existing.exists && typeof existing.size === 'number' && existing.size > 0) {
        setCachedLocalUri(localDest);
        setDownloadedSize(existing.size);
        setIsPreparing(false);
        return;
      }

      // Download file to cache with Bearer token if session exists
      const token = await authTokenStore.get();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const downloadResult = await FileSystem.downloadAsync(activeUri, localDest, {
        headers,
      });

      if (downloadResult.status === 200) {
        setCachedLocalUri(downloadResult.uri);
        const info = await FileSystem.getInfoAsync(downloadResult.uri);
        if (info.exists && typeof info.size === 'number') {
          setDownloadedSize(info.size);
        }
      } else if (downloadResult.status === 404) {
        throw new Error('Berkas surat edaran belum diunggah atau tidak ditemukan di server (404).');
      } else if (downloadResult.status === 401) {
        throw new Error('Sesi kredensial kedaluwarsa (401). Silakan login ulang.');
      } else {
        throw new Error(`Gagal mengunduh berkas surat edaran (HTTP ${downloadResult.status}).`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mempersiapkan berkas surat edaran.';
      setCacheError(msg);
      setCachedLocalUri(null);
    } finally {
      setIsPreparing(false);
    }
  }, [activeUri, resolvedFileName]);

  // Trigger preparation whenever modal becomes visible or URI changes
  useEffect(() => {
    if (visible && activeUri) {
      void prepareFile();
    } else if (!visible) {
      // Reset transient error states on close
      setCacheError(null);
      setImageError(false);
    }
  }, [visible, activeUri, prepareFile]);

  // Open native reader via system sharing/document viewer
  const handleOpenNativeReader = async () => {
    const targetUri = cachedLocalUri || activeUri;
    if (!targetUri) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Tautan atau berkas surat edaran belum tersedia.',
      });
      return;
    }

    try {
      setIsSharing(true);
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(targetUri, {
          mimeType: isImage ? 'image/jpeg' : 'application/pdf',
          dialogTitle: `Buka ${resolvedFileName}`,
          UTI: isImage ? 'public.image' : 'com.adobe.pdf',
        });
      } else if (canonicalDocumentUrl) {
        await Linking.openURL(canonicalDocumentUrl);
      }
    } catch (err) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuka penampil dokumen native.',
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Share file to external applications (WhatsApp, Drive, Email, etc.)
  const handleShareDocument = async () => {
    const targetUri = cachedLocalUri || activeUri;
    if (!targetUri) return;

    try {
      setIsSharing(true);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: isImage ? 'image/jpeg' : 'application/pdf',
          dialogTitle: `Bagikan ${resolvedFileName}`,
        });
      } else if (canonicalDocumentUrl) {
        await Linking.openURL(canonicalDocumentUrl);
      }
    } catch {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: 'Fitur berbagi berkas tidak dapat diproses saat ini.',
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Open canonical document URL in external mobile browser
  const handleOpenExternal = async () => {
    if (canonicalDocumentUrl) {
      try {
        await Linking.openURL(canonicalDocumentUrl);
      } catch {
        useFeedbackStore.getState().showToast({
          type: 'error',
          message: 'Gagal membuka peramban web.',
        });
      }
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
              <View
                style={[
                  styles.headerIconCircle,
                  isImage ? styles.headerIconImage : styles.headerIconPdf,
                ]}
              >
                <MaterialIcons
                  name={isImage ? 'image' : 'picture-as-pdf'}
                  size={22}
                  color={isImage ? colors.primary : '#DC2626'}
                />
              </View>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Surat Edaran Rapat
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {meetingTitle || 'Dokumen Kedinasan Resmi LLDIKTI X'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
              accessibilityLabel="Tutup pratinjau surat edaran"
            >
              <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Modal Body */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. STATE: Preparing / Downloading file */}
            {isPreparing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingTitle}>
                  {isImage ? 'Mengunduh Gambar Surat Edaran...' : 'Mempersiapkan Dokumen PDF...'}
                </Text>
                <Text style={styles.loadingSubtitle}>
                  Menyimpan ke penyimpanan lokal untuk tampilan instan...
                </Text>
              </View>
            ) : null}

            {/* 2. STATE: Cache / Download Error */}
            {!isPreparing && cacheError ? (
              <View style={styles.errorContainer}>
                <View style={styles.errorIconCircle}>
                  <MaterialIcons name="error-outline" size={36} color={colors.error} />
                </View>
                <Text style={styles.errorTitle}>Gagal Memuat Surat Edaran</Text>
                <Text style={styles.errorMessage}>{cacheError}</Text>
                <Button
                  title="Coba Muat Ulang"
                  onPress={() => void prepareFile()}
                  variant="outline"
                  size="md"
                  icon={<MaterialIcons name="refresh" size={18} color={colors.primary} />}
                  style={styles.retryBtn}
                />
              </View>
            ) : null}

            {/* 3. STATE: Normal Render (Image or PDF) */}
            {!isPreparing && !cacheError && isImage && (cachedLocalUri || activeUri) ? (
              /* IMAGE VIEWER VIEWPORT */
              <View style={styles.imageViewerContainer}>
                <ScrollView
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  centerContent
                  contentContainerStyle={styles.imageZoomWrapper}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                >
                  <Image
                    source={{ uri: cachedLocalUri || activeUri || '' }}
                    style={styles.imageDisplay}
                    resizeMode="contain"
                    onError={() => setImageError(true)}
                  />
                  {imageError ? (
                    <View style={styles.imageErrorBox}>
                      <MaterialIcons name="broken-image" size={42} color={colors.error} />
                      <Text style={styles.imageErrorText}>Gagal memuat pratinjau gambar.</Text>
                      <Button
                        title="Muat Ulang Gambar"
                        onPress={() => void prepareFile()}
                        variant="outline"
                        size="sm"
                        style={{ marginTop: spacing.sm }}
                      />
                    </View>
                  ) : null}
                </ScrollView>
                <View style={styles.imageMetaBar}>
                  <MaterialIcons name="info-outline" size={14} color={colors.onSurfaceVariant} />
                  <Text style={styles.imageMetaText} numberOfLines={1}>
                    {resolvedFileName} {formattedSize ? `• ${formattedSize}` : ''}
                  </Text>
                </View>
              </View>
            ) : null}

            {!isPreparing && !cacheError && !isImage && (
              /* PDF OFFICIAL DOCUMENT CARD */
              <View style={styles.pdfCardContainer}>
                {/* Official Insignia Banner */}
                <View style={styles.pdfInsigniaBox}>
                  <View style={styles.pdfBadgeIcon}>
                    <MaterialIcons name="picture-as-pdf" size={42} color="#DC2626" />
                  </View>
                  <Text style={styles.pdfDocTitle} numberOfLines={2}>
                    {resolvedFileName}
                  </Text>
                  <View style={styles.verifiedRow}>
                    <MaterialIcons name="verified" size={15} color={colors.success} />
                    <Text style={styles.verifiedText}>Dokumen Digital Resmi LLDIKTI X</Text>
                  </View>
                  {cachedLocalUri ? (
                    <View style={styles.cachedBadge}>
                      <MaterialIcons name="check-circle" size={13} color={colors.primary} />
                      <Text style={styles.cachedBadgeText}>Tersedia di Penyimpanan Lokal (Siap Dibaca)</Text>
                    </View>
                  ) : null}
                </View>

                {/* Document Metadata Table */}
                <View style={styles.metaTable}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Perihal Agenda</Text>
                    <Text style={styles.metaValue} numberOfLines={2}>
                      {meetingTitle || 'Agenda Rapat'}
                    </Text>
                  </View>
                  {meetingCode ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Kode Rapat</Text>
                      <Text style={styles.metaValue}>{meetingCode}</Text>
                    </View>
                  ) : null}
                  {meetingDate ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Waktu Acara</Text>
                      <Text style={styles.metaValue}>{meetingDate}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.metaLabel}>Format & Ukuran</Text>
                    <Text style={styles.metaValue}>
                      PDF Dokumen {formattedSize ? `• ${formattedSize}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Primary Reader Button */}
                <Button
                  title={isSharing ? 'Membuka Dokumen...' : 'Buka Dokumen PDF (Viewer Native)'}
                  onPress={() => void handleOpenNativeReader()}
                  disabled={isSharing || isPreparing}
                  isLoading={isSharing}
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<MaterialIcons name="chrome-reader-mode" size={20} color={colors.onPrimary} />}
                  style={styles.primaryReaderBtn}
                />

                {/* Auxiliary Action Buttons */}
                <View style={styles.auxiliaryGrid}>
                  <Button
                    title="Bagikan Dokumen"
                    onPress={() => void handleShareDocument()}
                    disabled={isSharing || isPreparing}
                    variant="outline"
                    size="md"
                    icon={<MaterialIcons name="share" size={18} color={colors.primary} />}
                    style={{ flex: 1 }}
                  />
                  {canonicalDocumentUrl ? (
                    <Button
                      title="Peramban Web"
                      onPress={() => void handleOpenExternal()}
                      variant="ghost"
                      size="md"
                      icon={<MaterialIcons name="open-in-new" size={18} color={colors.primary} />}
                      style={{ flex: 1 }}
                    />
                  ) : null}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.footer}>
            {canManage && onReplaceFile ? (
              <Button
                title="Ganti Berkas Surat Edaran"
                onPress={() => {
                  onClose();
                  onReplaceFile();
                }}
                variant="outline"
                size="md"
                fullWidth
                icon={<MaterialIcons name="cloud-upload" size={18} color={colors.primary} />}
                style={styles.replaceBtn}
              />
            ) : null}
            <Button
              title="Tutup Pratinjau"
              onPress={onClose}
              variant="ghost"
              size="md"
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: Math.min(SCREEN_WIDTH - spacing.md * 2, 460),
    maxHeight: SCREEN_HEIGHT * 0.88,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...elevations.level3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  headerIconPdf: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  headerIconImage: {
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  modalBody: {
    maxHeight: SCREEN_HEIGHT * 0.58,
  },
  modalBodyContent: {
    padding: spacing.lg,
  },

  // Loading States
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingSubtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  // Error States
  errorContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  errorIconCircle: {
    width: 60,
    height: 60,
    borderRadius: rounded.full,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  errorTitle: {
    ...typography.headlineSm,
    color: colors.error,
    fontWeight: '700',
  },
  errorMessage: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  retryBtn: {
    marginTop: spacing.md,
  },

  // Image Viewer Styles
  imageViewerContainer: {
    alignItems: 'center',
  },
  imageZoomWrapper: {
    width: '100%',
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.lg,
    overflow: 'hidden',
  },
  imageDisplay: {
    width: '100%',
    height: '100%',
  },
  imageErrorBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    gap: spacing.xs,
    padding: spacing.md,
  },
  imageErrorText: {
    ...typography.bodySm,
    color: colors.error,
  },
  imageMetaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.full,
  },
  imageMetaText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },

  // PDF Document Card Styles
  pdfCardContainer: {
    gap: spacing.md,
  },
  pdfInsigniaBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(220, 38, 38, 0.04)',
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.15)',
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  pdfBadgeIcon: {
    width: 68,
    height: 68,
    borderRadius: rounded.full,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  pdfDocTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: rounded.full,
  },
  verifiedText: {
    ...typography.labelSm,
    color: colors.success,
    fontWeight: '600',
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 102, 204, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: rounded.full,
    marginTop: 2,
  },
  cachedBadgeText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '500',
    fontSize: 10,
  },
  metaTable: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  metaLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  metaValue: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
    textAlign: 'right',
    flex: 2,
  },
  primaryReaderBtn: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  auxiliaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Footer Styles
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    gap: spacing.xs,
  },
  replaceBtn: {
    marginBottom: spacing.xs,
  },
});
