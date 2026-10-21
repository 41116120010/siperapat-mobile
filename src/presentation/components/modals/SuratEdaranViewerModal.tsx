import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const activeUri = localFileUri || documentUrl;
  const resolvedFileName = fileName || `Surat-Edaran_${meetingCode || 'Agenda'}.pdf`;

  // Determine file type
  const isImage = React.useMemo(() => {
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

  const formattedSize = React.useMemo(() => {
    if (!fileSize || fileSize <= 0) return null;
    if (fileSize < 1024 * 1024) {
      return `${(fileSize / 1024).toFixed(1)} KB`;
    }
    return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`;
  }, [fileSize]);

  const handleOpenNativeReader = async () => {
    if (!activeUri) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Tautan atau berkas surat edaran belum tersedia.',
      });
      return;
    }

    try {
      setIsDownloading(true);
      let targetUri = activeUri;

      // If remote URL, download to cache first for native QuickLook/reader
      if (activeUri.startsWith('http://') || activeUri.startsWith('https://')) {
        const cacheDir = FileSystem.cacheDirectory || '';
        const safeName = resolvedFileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
        const localDest = `${cacheDir}${safeName}`;
        const downloadResult = await FileSystem.downloadAsync(activeUri, localDest);
        targetUri = downloadResult.uri;
      }

      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(targetUri, {
          mimeType: isImage ? 'image/jpeg' : 'application/pdf',
          dialogTitle: `Buka ${resolvedFileName}`,
          UTI: isImage ? 'public.image' : 'com.adobe.pdf',
        });
      } else {
        await Linking.openURL(activeUri);
      }
    } catch (err) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuka penampil dokumen native.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareDocument = async () => {
    if (!activeUri) return;
    try {
      setIsDownloading(true);
      let targetUri = activeUri;
      if (activeUri.startsWith('http://') || activeUri.startsWith('https://')) {
        const cacheDir = FileSystem.cacheDirectory || '';
        const safeName = resolvedFileName.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_');
        const localDest = `${cacheDir}${safeName}`;
        const downloadResult = await FileSystem.downloadAsync(activeUri, localDest);
        targetUri = downloadResult.uri;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: isImage ? 'image/jpeg' : 'application/pdf',
          dialogTitle: `Bagikan ${resolvedFileName}`,
        });
      } else {
        await Linking.openURL(activeUri);
      }
    } catch (err) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: 'Fitur berbagi berkas tidak dapat diproses saat ini.',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenExternal = async () => {
    if (documentUrl) {
      try {
        await Linking.openURL(documentUrl);
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
            {isImage && activeUri ? (
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
                    source={{ uri: activeUri }}
                    style={styles.imageDisplay}
                    resizeMode="contain"
                    onLoadStart={() => {
                      setImageLoading(true);
                      setImageError(false);
                    }}
                    onLoadEnd={() => setImageLoading(false)}
                    onError={() => {
                      setImageLoading(false);
                      setImageError(true);
                    }}
                  />
                  {imageLoading ? (
                    <View style={styles.imageLoadingOverlay}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles.imageLoadingText}>Memuat gambar...</Text>
                    </View>
                  ) : null}
                  {imageError ? (
                    <View style={styles.imageErrorBox}>
                      <MaterialIcons name="broken-image" size={36} color={colors.error} />
                      <Text style={styles.imageErrorText}>Gagal memuat pratinjau gambar.</Text>
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
            ) : (
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
                  title={isDownloading ? 'Mempersiapkan Dokumen...' : 'Buka Dokumen PDF (Viewer Native)'}
                  onPress={() => void handleOpenNativeReader()}
                  disabled={isDownloading}
                  isLoading={isDownloading}
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
                    disabled={isDownloading}
                    variant="outline"
                    size="md"
                    icon={<MaterialIcons name="share" size={18} color={colors.primary} />}
                    style={{ flex: 1 }}
                  />
                  {documentUrl ? (
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

  // Image Viewer Styles
  imageViewerContainer: {
    alignItems: 'center',
  },
  imageZoomWrapper: {
    width: '100%',
    height: 280,
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
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  imageLoadingText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '600',
  },
  imageErrorBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    gap: spacing.xs,
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
