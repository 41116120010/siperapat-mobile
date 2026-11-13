import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import {
  ArrowLeftRight,
  Calendar,
  CloudCheck,
  CloudUpload,
  FileText,
  Info,
  X,
} from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { Button } from '../common/Button';
import { UploadFileRef } from '../../../data/datasources/agendaApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface UploadSuratEdaranModalProps {
  visible: boolean;
  onClose: () => void;
  file: (UploadFileRef & { size?: number }) | null;
  meetingTitle: string;
  meetingDate?: string;
  isUploading: boolean;
  onConfirmUpload: () => Promise<void>;
  onPickDifferentFile: () => void;
}

export const UploadSuratEdaranModal: React.FC<UploadSuratEdaranModalProps> = ({
  visible,
  onClose,
  file,
  meetingTitle,
  meetingDate,
  isUploading,
  onConfirmUpload,
  onPickDifferentFile,
}) => {
  if (!file) return null;

  const isImage = file.type.startsWith('image/');
  const formattedSize = file.size
    ? file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(2)} MB`
    : 'Ukuran valid';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isUploading) onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <CloudUpload size={22} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.headerTitle}>Konfirmasi Surat Edaran</Text>
                <Text style={styles.headerSubtitle}>
                  Periksa kelengkapan berkas sebelum diunggah
                </Text>
              </View>
            </View>
            {!isUploading ? (
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.btnPressed]}
                accessibilityLabel="Tutup dialog konfirmasi"
              >
                <X size={20} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>

          {/* Body */}
          <View style={styles.body}>
            {/* Target Meeting Info Box */}
            <View style={styles.meetingInfoCard}>
              <Text style={styles.meetingInfoLabel}>Target Agenda Rapat:</Text>
              <Text style={styles.meetingInfoTitle} numberOfLines={2}>
                {meetingTitle}
              </Text>
              {meetingDate ? (
                <View style={styles.meetingInfoDateRow}>
                  <Calendar size={14} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={styles.meetingInfoDateText}>{meetingDate}</Text>
                </View>
              ) : null}
            </View>

            {/* Selected File Card */}
            <View style={styles.fileCard}>
              <View style={styles.fileLeft}>
                {isImage ? (
                  <Image source={{ uri: file.uri }} style={styles.imageThumbnail} resizeMode="cover" />
                ) : (
                  <View style={styles.pdfBadge}>
                    <FileText size={24} color={colors.error} strokeWidth={2} />
                  </View>
                )}
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                    {file.name}
                  </Text>
                  <View style={styles.fileMetaRow}>
                    <View style={styles.badgeFormat}>
                      <Text style={styles.badgeFormatText}>{isImage ? 'GAMBAR' : 'PDF'}</Text>
                    </View>
                    <Text style={styles.fileSizeText}>• {formattedSize}</Text>
                  </View>
                </View>
              </View>

              {!isUploading ? (
                <Pressable
                  onPress={onPickDifferentFile}
                  style={({ pressed }) => [styles.changeBtn, pressed && styles.btnPressed]}
                  accessibilityLabel="Pilih berkas lain"
                >
                  <ArrowLeftRight size={16} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.changeBtnText}>Ganti</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Notice Box */}
            <View style={styles.noticeBox}>
              <Info size={18} color={colors.infoText} strokeWidth={2} />
              <Text style={styles.noticeText}>
                Dokumen resmi ini akan tersimpan di peladen LLDIKTI X dan menjadi lampiran digital bagi seluruh peserta rapat.
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.footer}>
            <Button
              title={isUploading ? 'Sedang Mengunggah...' : 'Konfirmasi & Simpan Berkas'}
              onPress={() => void onConfirmUpload()}
              disabled={isUploading}
              isLoading={isUploading}
              variant="primary"
              size="lg"
              fullWidth
              icon={<CloudCheck size={20} color={colors.onPrimary} strokeWidth={2} />}
            />
            {!isUploading ? (
              <Button
                title="Batal"
                onPress={onClose}
                variant="ghost"
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
    paddingBottom: spacing.md,
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
    width: 40,
    height: 40,
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
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  meetingInfoCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 3,
  },
  meetingInfoLabel: {
    ...typography.labelSm,
    color: colors.textMuted,
  },
  meetingInfoTitle: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  meetingInfoDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  meetingInfoDateText: {
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'solid',
    gap: spacing.sm,
  },
  fileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  imageThumbnail: {
    width: 44,
    height: 44,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceSoft,
  },
  pdfBadge: {
    width: 44,
    height: 44,
    borderRadius: rounded.sm,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetails: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeFormat: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: rounded.sm,
  },
  badgeFormatText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
    fontSize: 10,
  },
  fileSizeText: {
    ...typography.labelSm,
    color: colors.textMuted,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  changeBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.infoBg,
    padding: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  noticeText: {
    ...typography.bodySm,
    color: colors.infoText,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
});
