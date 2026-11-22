import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  MapPin,
  UserCheck,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { formatRentangWaktu } from '../../core/utils/dateFormatter';
import { resolveSuratEdaranUrl } from '../../core/utils/mediaUrl';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { FaceOvalOverlay } from '../components/attendance/FaceOvalOverlay';
import { DigitalSignaturePad } from '../components/attendance/DigitalSignaturePad';
import { SuratEdaranViewerModal } from '../components/modals/SuratEdaranViewerModal';
import { useAuthStore } from '../store/useAuthStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { useFeedbackStore } from '../store/useFeedbackStore';

interface PresensiScreenProps {
  meetingId: string;
  onBack: () => void;
  onSuccess: (attendanceId: string) => void;
}

export const PresensiScreen: React.FC<PresensiScreenProps> = ({
  meetingId,
  onBack,
  onSuccess,
}) => {
  const { user } = useAuthStore();
  const { submitAttendance, isSubmitting, error, portal, fetchPortal, isLoading } = useAttendanceStore();

  const [selfieUri, setSelfieUri] = useState<string>('');
  const [signatureSvg, setSignatureSvg] = useState<string>('');
  const [isCircularVisible, setIsCircularVisible] = useState(false);

  useEffect(() => {
    void fetchPortal(meetingId);
  }, [meetingId, fetchPortal]);

  const rawAgenda = portal?.rawAgenda ?? null;
  const meeting = portal?.agenda;
  const rawEdaran = rawAgenda?.surat_edaran;
  const suratEdaranMeta = rawEdaran ?? meeting?.suratEdaran;
  const resolvedEdaranUrl =
    resolveSuratEdaranUrl(
      rawEdaran?.stream_url ??
        suratEdaranMeta?.url ??
        meeting?.invitationPdfUrl
    ) ??
    meeting?.invitationPdfUrl ??
    null;
  const edaranIsPdf = Boolean(
    rawEdaran?.is_digital || suratEdaranMeta?.is_pdf
  );
  const edaranExtLabel = rawEdaran?.is_digital
    ? 'PDF'
    : (suratEdaranMeta?.extension || (suratEdaranMeta?.is_image ? 'IMG' : 'PDF')).toUpperCase();
  const scheduleDisplay =
    rawAgenda?.jadwal_lengkap ||
    (meeting
      ? `${meeting.date}, ${formatRentangWaktu(meeting.startTime, meeting.endTime)}`
      : '—');
  const locationDisplay =
    rawAgenda?.lokasi_ruang ??
    (meeting?.type === 'online'
      ? 'Daring / Ruang Virtual'
      : meeting?.venue || 'Daring / Ruang Virtual');
  const organizerName = rawAgenda?.creator?.name ?? 'Penyelenggara Rapat';
  const meetingTypeLabel = (rawAgenda?.tipe_rapat ?? meeting?.type ?? 'offline').toUpperCase();
  const isIneligible = Boolean(portal && !portal.isEligible);
  const ineligibilityMessage =
    portal?.statusNote?.trim() ||
    'Anda tidak termasuk dalam daftar peserta yang diwajibkan mengisi presensi pada agenda rapat ini.';
  const isSessionInactive = Boolean(portal && portal.isEligible && (!portal.isOngoing || portal.hasAttended));

  const handleSubmit = async () => {
    if (!portal?.isOngoing || !portal.isEligible || portal.hasAttended) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Presensi tidak tersedia untuk agenda ini menurut status dan hak akses server.',
      });
      return;
    }
    if (!selfieUri.startsWith('data:image/') || !signatureSvg.startsWith('data:image/')) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Ambil foto dan bubuhkan tanda tangan sebelum mengirim presensi.',
      });
      return;
    }
    const record = await submitAttendance(meetingId, {
      selfie_data: selfieUri,
      signature_data: signatureSvg,
    });
    if (record) {
      onSuccess(record.id);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Formulir Presensi Rapat Kedinasan"
        subtitle="Perekaman selfie wajah dan tanda tangan digital terverifikasi"
        showBack
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Informasi Agenda Rapat (Web SSOT create.blade.php sidebar card) */}
        <View style={styles.agendaInfoCard}>
          <View style={styles.agendaBadgeRow}>
            <View style={styles.liveSessionBadge}>
              <View style={styles.liveSessionDot} />
              <Text style={styles.liveSessionText}>Sesi Presensi Dibuka</Text>
            </View>
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>{meetingTypeLabel}</Text>
            </View>
          </View>

          <Text style={styles.agendaInfoHeading}>Informasi Agenda Rapat</Text>
          <Text style={styles.agendaTitle}>
            {meeting?.title ?? rawAgenda?.judul_rapat ?? 'Rapat Kedinasan LLDIKTI X'}
          </Text>

          <View style={styles.agendaMetaList}>
            <View style={styles.agendaMetaItem}>
              <Clock size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={styles.agendaMetaStrong}>{scheduleDisplay}</Text>
            </View>
            <View style={styles.agendaMetaItem}>
              <MapPin size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={styles.agendaMetaText}>{locationDisplay}</Text>
            </View>
            <View style={styles.agendaMetaItem}>
              <UserCheck size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={styles.agendaMetaText}>
                Penyelenggara:{' '}
                <Text style={styles.agendaMetaStrong}>{organizerName}</Text>
              </Text>
            </View>
          </View>

          {resolvedEdaranUrl ? (
            <Pressable
              onPress={() => setIsCircularVisible(true)}
              style={({ pressed }) => [
                styles.circularBtn,
                pressed && styles.circularBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Lihat Surat Undangan Resmi"
            >
              <FileText size={15} color={colors.primaryDarkest} strokeWidth={2} />
              <Text style={styles.circularBtnText}>Lihat Surat Undangan Resmi</Text>
              <View
                style={[
                  styles.circularExtBadge,
                  edaranIsPdf ? styles.circularExtPdf : styles.circularExtImage,
                ]}
              >
                <Text
                  style={[
                    styles.circularExtText,
                    edaranIsPdf ? styles.circularExtPdfText : styles.circularExtImageText,
                  ]}
                >
                  {edaranExtLabel}
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>

        {isIneligible ? (
          <View style={styles.ineligibleBanner}>
            <AlertCircle size={20} color={colors.onErrorContainer} strokeWidth={2} />
            <View style={styles.ineligibleTextWrap}>
              <Text style={styles.ineligibleTitle}>Akses Presensi Dibatasi</Text>
              <Text style={styles.ineligibleDesc}>{ineligibilityMessage}</Text>
            </View>
          </View>
        ) : isSessionInactive && portal?.statusNote ? (
          <View style={styles.ineligibleBanner}>
            <AlertCircle size={20} color={colors.onErrorContainer} strokeWidth={2} />
            <View style={styles.ineligibleTextWrap}>
              <Text style={styles.ineligibleTitle}>Status Sesi Presensi</Text>
              <Text style={styles.ineligibleDesc}>{portal.statusNote}</Text>
            </View>
          </View>
        ) : null}

        {isIneligible ? (
          <View style={styles.lockedFormCard}>
            <View style={styles.lockedFormIconWrap}>
              <Lock size={22} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={styles.lockedFormTitle}>
              Formulir Kamera & Tanda Tangan Dikunci
            </Text>
            <Text style={styles.lockedFormDesc}>
              {ineligibilityMessage}
            </Text>
            <Button
              title="Kembali"
              onPress={onBack}
              variant="outline"
              size="md"
              fullWidth
            />
          </View>
        ) : (
          <>
            {/* Step 1: Live Selfie with Oval Guide */}
            <FaceOvalOverlay onCapture={setSelfieUri} />

            {/* Step 2: Digital Signature Canvas */}
            <DigitalSignaturePad onSignatureChange={setSignatureSvg} />
          </>
        )}

        {/* Step 3: Identity Metadata & Attendance Statement (aligned with Web create.blade.php) */}
        <View style={styles.metadataCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>NIP Pegawai ASN</Text>
            <Text style={styles.metaValueMono}>
              {user?.nip ?? '—'}
            </Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Waktu & IP Sesi</Text>
            <Text style={styles.metaValue}>Tercatat otomatis oleh server</Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.statementBox}>
            <Text style={styles.statementTitle}>Pernyataan Kehadiran:</Text>
            <Text style={styles.statementBody}>
              Dengan menekan tombol di bawah, saya menyatakan hadir secara sah pada agenda rapat kedinasan ini.
            </Text>
          </View>
        </View>

        {/* Error notification if any */}
        {error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color={colors.error} strokeWidth={2} />
            <Text style={styles.errorMsg}>{error}</Text>
          </View>
        ) : null}

        {/* Submit Button (Web SSOT: emerald bg-emerald-700 CTA) */}
        <Button
          title="Konfirmasi & Kirim Presensi"
          onPress={handleSubmit}
          variant="success"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          disabled={
            isSubmitting ||
            isLoading ||
            !portal?.isOngoing ||
            !portal.isEligible ||
            portal.hasAttended ||
            !selfieUri ||
            !signatureSvg
          }
          style={styles.submitBtn}
          icon={<CheckCircle2 size={20} color={colors.onPrimary} strokeWidth={2} />}
        />

        {/* Ketentuan Presensi Sah Card (Web SSOT create.blade.php) */}
        <View style={styles.guideCard}>
          <Text style={styles.guideHeading}>KETENTUAN PRESENSI SAH</Text>
          <View style={styles.guideList}>
            <View style={styles.guideItem}>
              <Text style={styles.guideBullet}>•</Text>
              <Text style={styles.guideItemText}>
                <Text style={styles.guideItemBold}>Selfie Wajah:</Text> Wajah tampak lurus menghadap kamera dan berada dalam bingkai oval panduan.
              </Text>
            </View>
            <View style={styles.guideItem}>
              <Text style={styles.guideBullet}>•</Text>
              <Text style={styles.guideItemText}>
                <Text style={styles.guideItemBold}>Tanda Tangan:</Text> Buat paraf atau tanda tangan asli Anda pada kotak canvas digital.
              </Text>
            </View>
            <View style={styles.guideItem}>
              <Text style={styles.guideBullet}>•</Text>
              <Text style={styles.guideItemText}>
                <Text style={styles.guideItemBold}>Integritas Data:</Text> Presensi tersimpan bersama stempel waktu (timestamp) dan alamat IP jaringan.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <SuratEdaranViewerModal
        visible={isCircularVisible}
        onClose={() => setIsCircularVisible(false)}
        documentUrl={resolvedEdaranUrl}
        fileName={`Surat-Edaran_${meeting?.code || meetingId}.${suratEdaranMeta?.extension || (suratEdaranMeta?.is_image ? 'jpg' : 'pdf')}`}
        meetingTitle={meeting?.title ?? rawAgenda?.judul_rapat}
        meetingCode={meeting?.code ?? rawAgenda?.slug}
        meetingDate={scheduleDisplay}
        mimeType={suratEdaranMeta?.is_image ? 'image/jpeg' : 'application/pdf'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  agendaInfoCard: {
    ...cardSurface,
    padding: spacing.md,
    borderColor: colors.borderStrong,
    marginBottom: spacing.md,
    gap: spacing.xs + 2,
  },
  agendaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  liveSessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: rounded.full,
    backgroundColor: colors.warningContainer,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  liveSessionDot: {
    width: 6,
    height: 6,
    borderRadius: rounded.full,
    backgroundColor: colors.warning,
  },
  liveSessionText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.onWarningContainer,
  },
  typePill: {
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  typePillText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 10.5,
    color: colors.primaryDarkest,
  },
  agendaInfoHeading: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  agendaTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 15,
    color: colors.primaryDarkest,
    lineHeight: 20,
  },
  agendaMetaList: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.xs + 2,
    gap: 6,
  },
  agendaMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agendaMetaText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  agendaMetaStrong: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primaryDarkest,
    flex: 1,
  },
  circularBtn: {
    marginTop: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  circularBtnPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  circularBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.primaryDarkest,
  },
  circularExtBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: rounded.sm,
  },
  circularExtPdf: {
    backgroundColor: colors.errorContainer,
  },
  circularExtImage: {
    backgroundColor: colors.infoBg,
  },
  circularExtText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 10,
  },
  circularExtPdfText: {
    color: colors.onErrorContainer,
  },
  circularExtImageText: {
    color: colors.infoText,
  },
  metadataCard: {
    ...cardSurface,
    padding: spacing.md,
    borderColor: colors.borderStrong,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  metaLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
  },
  metaValue: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  metaValueMono: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    color: colors.primary,
  },
  metaDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },
  statementBox: {
    paddingTop: spacing.xs,
    gap: 2,
  },
  statementTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.primaryDarkest,
  },
  statementBody: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    marginBottom: spacing.md,
    gap: spacing.xs + 2,
  },
  errorMsg: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onErrorContainer,
    flex: 1,
  },
  submitBtn: {
    marginBottom: spacing.md,
  },
  ineligibleBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    padding: spacing.md,
    borderRadius: rounded.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  ineligibleTextWrap: {
    flex: 1,
    gap: 3,
  },
  ineligibleTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onErrorContainer,
  },
  ineligibleDesc: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onErrorContainer,
    lineHeight: 18,
  },
  lockedFormCard: {
    ...cardSurface,
    padding: spacing.lg,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  lockedFormIconWrap: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedFormTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    textAlign: 'center',
  },
  lockedFormDesc: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  guideCard: {
    ...cardSurface,
    padding: spacing.md,
    borderColor: colors.borderStrong,
    gap: spacing.xs + 2,
  },
  guideHeading: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  guideList: {
    gap: 6,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  guideBullet: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primaryDarkest,
  },
  guideItemText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },
  guideItemBold: {
    fontFamily: fontFamilies.sansBold,
    color: colors.primaryDarkest,
  },
});
