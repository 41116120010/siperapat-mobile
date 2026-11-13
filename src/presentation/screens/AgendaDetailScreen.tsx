import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  MapPin,
  NotebookPen,
  Users,
  Video,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Meeting } from '../../domain/entities/types';
import { Button } from '../components/common/Button';
import { ErrorState } from '../components/common/ErrorState';
import { SimpleHtmlView } from '../components/common/SimpleHtmlView';
import { StatusPill, StatusPillType } from '../components/common/StatusPill';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { useMeetingStore } from '../store/useMeetingStore';

interface DocumentationItem {
  id: number | string;
  url: string;
  caption?: string | null;
}

type MeetingWithDocs = Meeting & {
  documentations?: DocumentationItem[];
  hasAttended?: boolean;
};

interface AgendaDetailScreenProps {
  meetingId: string;
  onBack: () => void;
  onNavigatePresensi?: (meetingId: string) => void;
}

function formatTipeLabel(type: Meeting['type']): string {
  if (type === 'online') return 'Daring';
  if (type === 'hybrid') return 'Hybrid';
  return 'Luring';
}

function toPillStatus(status: Meeting['status']): StatusPillType {
  if (status === 'ongoing' || status === 'completed' || status === 'upcoming' || status === 'cancelled') {
    return status;
  }
  return 'upcoming';
}

export const AgendaDetailScreen: React.FC<AgendaDetailScreenProps> = ({
  meetingId,
  onBack,
  onNavigatePresensi,
}) => {
  const insets = useSafeAreaInsets();
  const [meeting, setMeeting] = useState<MeetingWithDocs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewerModalVisible, setIsViewerModalVisible] = useState(false);
  const [zoomDoc, setZoomDoc] = useState<DocumentationItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await useMeetingStore.getState().getMeetingById(meetingId);
      setMeeting(data as MeetingWithDocs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat detail agenda.');
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleOpenZoom = async () => {
    if (!meeting?.zoomUrl) return;
    try {
      await Linking.openURL(meeting.zoomUrl);
    } catch {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message: 'Tidak dapat membuka tautan pertemuan daring.',
      });
    }
  };

  const handleStartAttendance = () => {
    if (!meeting) return;
    if (onNavigatePresensi) {
      onNavigatePresensi(meeting.id);
      return;
    }
    useFeedbackStore.getState().showToast({
      type: 'info',
      message: 'Silakan buka menu Presensi dari Beranda untuk mengisi daftar hadir.',
    });
  };

  const docs = meeting?.documentations ?? [];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Dark Slate Hero Banner matching staff_show.blade.php */}
      <View style={[styles.heroBanner, { paddingTop: Math.max(insets.top, spacing.sm) + spacing.sm }]}>
        <View style={styles.heroTopRow}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.heroBackBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Kembali"
          >
            <ArrowLeft size={16} color={colors.onPrimary} strokeWidth={2} />
            <Text style={styles.heroBackText}>Kembali</Text>
          </Pressable>
          {meeting ? <StatusPill status={toPillStatus(meeting.status)} /> : null}
        </View>

        <Text style={styles.heroTitle} numberOfLines={3}>
          {meeting?.title ?? (loading ? 'Memuat Detail Agenda...' : 'Detail Agenda Rapat')}
        </Text>

        {meeting ? (
          <View style={styles.heroMetaList}>
            <View style={styles.heroMetaRow}>
              <BookOpen size={14} color={colors.borderStrong} strokeWidth={2} />
              <Text style={styles.heroMetaText} numberOfLines={1}>
                {meeting.classification || meeting.agendaDescription}
              </Text>
            </View>
            <View style={styles.heroMetaRow}>
              <Clock size={14} color={colors.borderStrong} strokeWidth={2} />
              <Text style={styles.heroMetaText} numberOfLines={2}>
                {meeting.date} • {meeting.startTime} {meeting.endTime ? `- ${meeting.endTime} WIB` : 'WIB s.d. Selesai'}
              </Text>
            </View>
            <View style={styles.heroMetaRow}>
              <MapPin size={14} color={colors.borderStrong} strokeWidth={2} />
              <Text style={styles.heroMetaText} numberOfLines={2}>
                [{formatTipeLabel(meeting.type)}] {meeting.venue || (meeting.type === 'online' ? 'Ruang Virtual / Tautan Rapat' : 'Lokasi belum ditentukan')}
              </Text>
            </View>
            <View style={styles.heroPeopleRow}>
              <View style={styles.heroPersonChip}>
                <Users size={13} color={colors.borderStrong} strokeWidth={2} />
                <Text style={styles.heroPersonText} numberOfLines={1}>
                  Pimpinan: <Text style={styles.heroPersonStrong}>{meeting.leader || '-'}</Text>
                </Text>
              </View>
              <View style={styles.heroPersonChip}>
                <NotebookPen size={13} color={colors.borderStrong} strokeWidth={2} />
                <Text style={styles.heroPersonText} numberOfLines={1}>
                  Notulis: <Text style={styles.heroPersonStrong}>{meeting.notulis || '-'}</Text>
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {meeting && meeting.status === 'ongoing' && !meeting.hasAttended ? (
          <View style={styles.heroCtaWrap}>
            <Button
              title="Isi Presensi Saya"
              variant="success"
              size="md"
              fullWidth
              onPress={handleStartAttendance}
              icon={<FileCheck2 size={18} color={colors.onPrimary} strokeWidth={2} />}
            />
          </View>
        ) : null}

        {meeting && meeting.status === 'ongoing' && meeting.hasAttended ? (
          <View style={styles.attendedPill}>
            <CheckCircle2 size={16} color={colors.successLight} strokeWidth={2.5} />
            <Text style={styles.attendedPillText}>Anda Sudah Mengisi Presensi</Text>
          </View>
        ) : null}
      </View>

      {loading && !meeting ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : null}
      {error && !meeting ? <ErrorState message={error} onRetry={load} /> : null}

      {meeting ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[colors.primary]} />}
        >
          {/* Online Meeting Link */}
          {meeting.zoomUrl ? (
            <View style={[styles.panel, styles.zoomCard]}>
              <View style={styles.zoomLeft}>
                <View style={styles.zoomIconBox}>
                  <Video size={18} color={colors.onPrimary} strokeWidth={2} />
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.sectionTitle}>Tautan Pertemuan Daring</Text>
                  <Text style={styles.zoomUrlText} numberOfLines={1}>
                    {meeting.zoomUrl}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => void handleOpenZoom()}
                style={({ pressed }) => [styles.zoomOpenBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Buka Zoom atau Google Meet"
              >
                <Text style={styles.zoomOpenText}>Buka</Text>
                <ExternalLink size={14} color={colors.onPrimary} strokeWidth={2} />
              </Pressable>
            </View>
          ) : null}

          {/* Notulensi & Kesimpulan */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <FileText size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>Notulensi & Kesimpulan Rapat</Text>
            </View>
            <View style={styles.panelBody}>
              <Text style={styles.subSectionLabel}>POIN-POIN PEMBAHASAN (NOTULENSI)</Text>
              {meeting.minutesHtml && meeting.minutesHtml.trim().length > 0 ? (
                <View style={styles.htmlBoxNeutral}>
                  <SimpleHtmlView html={meeting.minutesHtml} />
                </View>
              ) : (
                <View style={styles.htmlBoxNeutral}>
                  <Text style={styles.emptyItalicText}>
                    Notulensi jalannya rapat belum diinput oleh pengelola rapat.
                  </Text>
                </View>
              )}

              <Text style={[styles.subSectionLabel, styles.sectionGapTop]}>
                KESIMPULAN & RENCANA TINDAK LANJUT (RTL)
              </Text>
              {meeting.summaryHtml && meeting.summaryHtml.trim().length > 0 ? (
                <View style={styles.htmlBoxEmerald}>
                  <SimpleHtmlView html={meeting.summaryHtml} />
                </View>
              ) : (
                <View style={styles.htmlBoxNeutral}>
                  <Text style={styles.emptyItalicText}>Kesimpulan rapat belum diinput.</Text>
                </View>
              )}
            </View>
          </View>

          {/* Dokumentasi Foto Rapat */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <ImageIcon size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>
                Dokumentasi Foto Rapat ({docs.length})
              </Text>
            </View>
            <View style={styles.panelBody}>
              {docs.length > 0 ? (
                <View style={styles.docsGrid}>
                  {docs.map((doc) => (
                    <Pressable
                      key={String(doc.id)}
                      onPress={() => setZoomDoc(doc)}
                      style={({ pressed }) => [styles.docCard, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Lihat foto ${doc.caption || 'Dokumentasi Rapat'}`}
                    >
                      <Image source={{ uri: doc.url }} style={styles.docThumb} resizeMode="cover" />
                      <Text style={styles.docCaption} numberOfLines={1}>
                        {doc.caption || 'Dokumentasi Rapat'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyCenterText}>
                  Belum ada foto dokumentasi yang diunggah untuk agenda ini.
                </Text>
              )}
            </View>
          </View>

          {/* Surat Edaran */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <FileText size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>Surat Edaran / Undangan</Text>
            </View>
            <View style={styles.panelBody}>
              {meeting.invitationPdfUrl ? (
                <Pressable
                  onPress={() => setIsViewerModalVisible(true)}
                  style={({ pressed }) => [styles.edaranBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Buka surat edaran rapat"
                >
                  {meeting.suratEdaran?.is_image ? (
                    <ImageIcon size={18} color={colors.primary} strokeWidth={2} />
                  ) : (
                    <FileText size={18} color={colors.error} strokeWidth={2} />
                  )}
                  <Text style={styles.edaranBtnText} numberOfLines={1}>
                    Lihat Dokumen Digital
                  </Text>
                  <ChevronRight size={18} color={colors.primary} strokeWidth={2} />
                </Pressable>
              ) : (
                <Text style={styles.emptyItalicText}>Berkas surat edaran belum dilampirkan.</Text>
              )}
            </View>
          </View>

          {/* Target Partisipan Rapat */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Users size={17} color={colors.primary} strokeWidth={2} />
              <Text style={styles.panelHeaderTitle}>Target Partisipan Rapat</Text>
            </View>
            <View style={styles.panelBody}>
              {meeting.targetType === 'selected_users' ? (
                <View style={styles.targetList}>
                  <View style={styles.targetBannerNeutral}>
                    <Text style={styles.targetBannerText}>
                      Khusus Pegawai ASN Tertentu ({meeting.invitedUsers?.length ?? meeting.totalInvited ?? 0} Pegawai)
                    </Text>
                  </View>
                  {(meeting.invitedUsers ?? []).map((u) => (
                    <View key={u.id} style={styles.invitedUserRow}>
                      <Text style={styles.invitedUserName}>{u.name}</Text>
                      <Text style={styles.invitedUserMeta}>
                        NIP: {u.nip || '-'} • {u.unit || 'Pusat'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : meeting.isAllUnits || meeting.targetType === 'all_units' ? (
                <View style={styles.targetBannerEmerald}>
                  <CheckCircle2 size={16} color={colors.onSuccessContainer} strokeWidth={2} />
                  <Text style={styles.targetBannerEmeraldText}>
                    Terbuka untuk Seluruh Unit LLDIKTI
                  </Text>
                </View>
              ) : (
                <View style={styles.unitChipsWrap}>
                  {(meeting.unitsList ?? []).length > 0 ? (
                    meeting.unitsList!.map((unit) => (
                      <View key={unit.id} style={styles.unitChip}>
                        <Text style={styles.unitChipText}>
                          {unit.kode_unit} — {unit.nama_unit}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyItalicText}>
                      {meeting.targetAudience || 'Unit kerja terpilih'}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      ) : null}

      <SuratEdaranViewerModal
        visible={isViewerModalVisible}
        onClose={() => setIsViewerModalVisible(false)}
        documentUrl={meeting?.invitationPdfUrl}
        fileName={`Surat-Edaran_${meeting?.code || 'Agenda'}.${meeting?.suratEdaran?.extension || (meeting?.suratEdaran?.is_image ? 'jpg' : 'pdf')}`}
        meetingTitle={meeting?.title}
        meetingCode={meeting?.code}
        meetingDate={`${meeting?.date} • ${meeting?.startTime}`}
        mimeType={meeting?.suratEdaran?.is_image ? 'image/jpeg' : 'application/pdf'}
      />

      {/* Documentation Zoom Modal */}
      <Modal
        visible={Boolean(zoomDoc)}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomDoc(null)}
      >
        <View style={styles.zoomOverlay}>
          <View style={styles.zoomModalCard}>
            <View style={styles.zoomModalHeader}>
              <Text style={styles.zoomModalTitle} numberOfLines={1}>
                {zoomDoc?.caption || 'Dokumentasi Rapat'}
              </Text>
              <Pressable
                onPress={() => setZoomDoc(null)}
                style={({ pressed }) => [styles.zoomCloseBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Tutup pratinjau foto"
              >
                <X size={20} color={colors.onSurface} strokeWidth={2} />
              </Pressable>
            </View>
            {zoomDoc ? (
              <Image source={{ uri: zoomDoc.url }} style={styles.zoomFullImage} resizeMode="contain" />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flexOne: { flex: 1, minWidth: 0 },
  loader: { marginTop: spacing.xl },
  pressed: { opacity: 0.78 },

  heroBanner: {
    backgroundColor: colors.primaryDarkest,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryContainer,
    gap: spacing.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  heroBackBtn: {
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: rounded.md,
    backgroundColor: colors.primaryContainer,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  heroBackText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  heroTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.onPrimary,
  },
  heroMetaList: { gap: spacing.xs + 2 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  heroMetaText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.borderStrong,
    flex: 1,
  },
  heroPeopleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 2,
  },
  heroPersonChip: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  heroPersonText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.borderStrong,
  },
  heroPersonStrong: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  heroCtaWrap: {
    paddingTop: spacing.xs,
  },
  attendedPill: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.primaryContainer,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.successLight,
    paddingHorizontal: spacing.md,
  },
  attendedPillText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },

  content: { padding: spacing.md, gap: spacing.md },
  panel: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  panelHeaderTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    flex: 1,
  },
  panelBody: { padding: spacing.md, gap: spacing.xs + 2 },
  sectionGapTop: { marginTop: spacing.sm },

  zoomCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  zoomLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  zoomIconBox: {
    width: 40,
    height: 40,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  zoomUrlText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.monoRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  zoomOpenBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoomOpenText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },

  subSectionLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    letterSpacing: 0.5,
    color: colors.onSurface,
  },
  htmlBoxNeutral: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.lg,
    padding: spacing.sm + 4,
  },
  htmlBoxEmerald: {
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: rounded.lg,
    padding: spacing.sm + 4,
  },
  emptyItalicText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  emptyCenterText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    fontStyle: 'italic',
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  docsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  docCard: {
    width: '48.5%',
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    overflow: 'hidden',
  },
  docThumb: {
    width: '100%',
    height: 110,
    backgroundColor: colors.surfaceContainer,
  },
  docCaption: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
    padding: spacing.xs + 2,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },

  edaranBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  edaranBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
    flex: 1,
  },

  targetList: { gap: spacing.xs + 2 },
  targetBannerNeutral: {
    padding: spacing.sm + 2,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  targetBannerText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  invitedUserRow: {
    padding: spacing.sm,
    borderRadius: rounded.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 2,
  },
  invitedUserName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  invitedUserMeta: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoRegular,
    fontSize: 11,
    color: colors.textMuted,
  },
  targetBannerEmerald: {
    padding: spacing.sm + 2,
    borderRadius: rounded.lg,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  targetBannerEmeraldText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSuccessContainer,
    flex: 1,
  },
  unitChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  unitChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  unitChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },

  zoomOverlay: {
    flex: 1,
    backgroundColor: colors.scrimNeutralTop,
    justifyContent: 'center',
    padding: spacing.md,
  },
  zoomModalCard: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  zoomModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  zoomModalTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    flex: 1,
  },
  zoomCloseBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomFullImage: {
    width: '100%',
    height: 360,
    backgroundColor: colors.surfaceSoft,
  },
});
