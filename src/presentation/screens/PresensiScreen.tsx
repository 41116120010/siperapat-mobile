import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { FaceOvalOverlay } from '../components/attendance/FaceOvalOverlay';
import { DigitalSignaturePad } from '../components/attendance/DigitalSignaturePad';
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

  useEffect(() => {
    void fetchPortal(meetingId);
  }, [meetingId, fetchPortal]);

  const meeting = portal?.agenda;

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
        title="Presensi Rapat Kedinasan"
        subtitle={meeting?.title ?? 'Rapat Kedinasan LLDIKTI X'}
        showBack
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Step 1: Live Selfie with Oval Guide */}
        <FaceOvalOverlay onCapture={setSelfieUri} />

        {/* Step 2: Digital Signature Canvas */}
        <DigitalSignaturePad onSignatureChange={setSignatureSvg} />

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
      </ScrollView>
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
    marginBottom: spacing.lg,
  },
});
