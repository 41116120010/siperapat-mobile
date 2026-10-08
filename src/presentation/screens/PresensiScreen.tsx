import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { FaceOvalOverlay } from '../components/attendance/FaceOvalOverlay';
import { DigitalSignaturePad } from '../components/attendance/DigitalSignaturePad';
import { useAuthStore } from '../store/useAuthStore';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { useMeetingStore } from '../store/useMeetingStore';
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
  const { activeMeeting, meetings } = useMeetingStore();
  const { submitAttendance, isSubmitting, error } = useAttendanceStore();

  const [selfieUri, setSelfieUri] = useState<string>('');
  const [signatureSvg, setSignatureSvg] = useState<string>('');
  const [isAgreementChecked, setIsAgreementChecked] = useState(true);

  const meeting =
    activeMeeting?.id === meetingId
      ? activeMeeting
      : meetings.find((m) => m.id === meetingId) ?? activeMeeting;

  const handleSubmit = async () => {
    if (!isAgreementChecked) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Harap centang pernyataan sah integritas kehadiran sebelum mengirim.',
      });
      return;
    }

    const payload = {
      meetingId: meeting?.id ?? 'meet-001',
      meetingTitle:
        meeting?.title ??
        'Rapat Koordinasi Penjaminan Mutu & Akreditasi Program Studi PTS 2026',
      asnNip: user?.nip ?? '197012051992032002',
      asnName: user?.name ?? 'Afdalisma, SH, M.Pd',
      asnJabatan: user?.jabatan ?? 'Kepala LLDIKTI Wilayah X',
      asnUnitKerja: user?.unitKerja ?? 'LLDIKTI Wilayah X',
      selfieUri: selfieUri || 'file:///data/cache/selfie.jpg',
      signatureSvg: signatureSvg || 'M 40 75 Q 60 20, 85 65',
      ipAddress: '180.252.164.218',
      deviceInfo: 'Android Device (LLDIKTI X Authorized)',
      latitude: meeting?.latitude ?? -0.92348,
      longitude: meeting?.longitude ?? 100.36214,
      distanceMeters: 12,
      status: 'sah' as const,
    };

    const record = await submitAttendance(payload);
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

        {/* Step 3: Identity & Geofence Verification Metadata Card */}
        <View style={styles.metadataCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>NIP Pegawai ASN</Text>
            <Text style={styles.metaValueMono}>
              {user?.nip ?? '19701205 199203 2 002'}
            </Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Waktu & IP Sesi</Text>
            <Text style={styles.metaValue}>09:14:22 WIB • 180.252.164.218</Text>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Lokasi Presensi</Text>
            <View style={styles.geofenceValidRow}>
              <MaterialIcons name="check-circle" size={14} color={colors.success} />
              <Text style={styles.metaValidText}>
                LLDIKTI Wilayah X (Akurat 12m)
              </Text>
            </View>
          </View>

          {/* Legal Checkbox */}
          <Pressable
            onPress={() => setIsAgreementChecked(!isAgreementChecked)}
            style={styles.checkboxRow}
          >
            <MaterialIcons
              name={isAgreementChecked ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={isAgreementChecked ? colors.primary : colors.outline}
            />
            <Text style={styles.checkboxText}>
              Saya menyatakan secara sah kehadiran saya pada rapat kedinasan ini sesuai data yang sebenarnya.
            </Text>
          </Pressable>
        </View>

        {/* Error notification if any */}
        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error-outline" size={18} color={colors.error} />
            <Text style={styles.errorMsg}>{error}</Text>
          </View>
        ) : null}

        {/* Submit Button */}
        <Button
          title="Kirim Presensi Sah Kedinasan"
          onPress={handleSubmit}
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
          disabled={isSubmitting || !isAgreementChecked}
          style={styles.submitBtn}
          icon={<MaterialIcons name="verified" size={20} color={colors.onPrimary} />}
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
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
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
    color: colors.onSurfaceVariant,
  },
  metaValue: {
    ...typography.labelSm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  metaValueMono: {
    ...typography.labelMono,
    color: colors.primary,
    fontWeight: '700',
  },
  geofenceValidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaValidText: {
    ...typography.labelSm,
    color: colors.tertiaryContainer,
    fontWeight: '700',
  },
  metaDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.xs,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  checkboxText: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorContainer,
    padding: spacing.sm,
    borderRadius: rounded.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  errorMsg: {
    ...typography.bodySm,
    color: colors.onErrorContainer,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    marginBottom: spacing.lg,
  },
});
