import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing, elevations } from '../../../core/theme/tokens';
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
                <MaterialIcons name="cloud-upload" size={22} color={colors.primary} />
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
                <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
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
                  <MaterialIcons name="event" size={14} color={colors.onSurfaceVariant} />
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
                    <MaterialIcons name="picture-as-pdf" size={24} color="#DC2626" />
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
                  <MaterialIcons name="swap-horiz" size={18} color={colors.primary} />
                  <Text style={styles.changeBtnText}>Ganti</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Notice Box */}
            <View style={styles.noticeBox}>
              <MaterialIcons name="info-outline" size={18} color={colors.primary} />
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
              icon={<MaterialIcons name="cloud-done" size={20} color={colors.onPrimary} />}
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: Math.min(SCREEN_WIDTH - spacing.md * 2, 440),
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
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
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
    width: 32,
    height: 32,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
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
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: 3,
  },
  meetingInfoLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  meetingInfoTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  meetingInfoDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  meetingInfoDateText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
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
    backgroundColor: colors.surfaceContainerLow,
  },
  pdfBadge: {
    width: 44,
    height: 44,
    borderRadius: rounded.sm,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetails: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeFormat: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: rounded.sm,
  },
  badgeFormatText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 10,
  },
  fileSizeText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: rounded.sm,
    backgroundColor: 'rgba(0, 102, 204, 0.08)',
  },
  changeBtnText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '600',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: 'rgba(0, 102, 204, 0.05)',
    padding: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 204, 0.12)',
  },
  noticeText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
});
