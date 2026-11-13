import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Fingerprint,
  MapPin,
  PenTool,
  ShieldCheck,
  Smartphone,
  User,
  ZoomIn,
} from 'lucide-react-native';
import { Attendance } from '../../../domain/entities/types';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { formatWaktuWIB, formatTanggalIndonesia } from '../../../core/utils/dateFormatter';
import { authTokenStore } from '../../../data/datasources/authTokenStore';
import { EvidenceViewerModal } from '../modals/EvidenceViewerModal';
import { resolveAttendanceMediaUrl } from '../../../core/utils/mediaUrl';

export interface PerforatedTicketProps {
  attendance: Attendance;
  onViewAgendaDetail?: () => void;
}

export const PerforatedTicket: React.FC<PerforatedTicketProps> = ({
  attendance,
  onViewAgendaDetail,
}) => {
  const [isEvidenceModalVisible, setIsEvidenceModalVisible] = useState(false);
  const [evidenceTab, setEvidenceTab] = useState<'selfie' | 'signature'>('selfie');
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    void authTokenStore.get().then((token) => setAuthToken(token));
  }, []);

  const activeSelfie = useMemo(() => {
    return resolveAttendanceMediaUrl(
      attendance.selfieUri || attendance.selfieUrl,
      attendance.id,
      'selfie'
    );
  }, [attendance.selfieUri, attendance.selfieUrl, attendance.id]);

  const activeSignature = useMemo(() => {
    return resolveAttendanceMediaUrl(
      attendance.signatureSvg || attendance.signatureUrl,
      attendance.id,
      'signature'
    );
  }, [attendance.signatureSvg, attendance.signatureUrl, attendance.id]);

  const isSelfieReadyToRender = useMemo(() => {
    if (!activeSelfie) return false;
    if (activeSelfie.startsWith('data:') || activeSelfie.startsWith('file:')) return true;
    return Boolean(authToken);
  }, [activeSelfie, authToken]);

  const isSignatureReadyToRender = useMemo(() => {
    if (!activeSignature) return false;
    if (activeSignature.startsWith('data:') || activeSignature.startsWith('file:')) return true;
    return Boolean(authToken);
  }, [activeSignature, authToken]);

  const selfieHeaders = useMemo(() => {
    if (activeSelfie && (activeSelfie.startsWith('http://') || activeSelfie.startsWith('https://')) && authToken) {
      return { Authorization: `Bearer ${authToken}` };
    }
    return undefined;
  }, [activeSelfie, authToken]);

  const signatureHeaders = useMemo(() => {
    if (activeSignature && (activeSignature.startsWith('http://') || activeSignature.startsWith('https://')) && authToken) {
      return { Authorization: `Bearer ${authToken}` };
    }
    return undefined;
  }, [activeSignature, authToken]);

  const handleOpenEvidence = (tab: 'selfie' | 'signature') => {
    setEvidenceTab(tab);
    setIsEvidenceModalVisible(true);
  };

  const attReference = `#ATT-${attendance.id.padStart(6, '0')}`;
  const sipReference = attendance.verificationToken || `SIP-${attendance.id.padStart(6, '0')}`;

  return (
    <View style={styles.card}>
      {/* 0. Top Receipt Confirmation Banner (aligned with Web success.blade.php) */}
      <View style={styles.confirmationBanner}>
        <View style={styles.confirmationCheckCircle}>
          <Check size={24} color={colors.onPrimary} strokeWidth={2.5} />
        </View>
        <View style={styles.confirmationPill}>
          <Text style={styles.confirmationPillText}>KEHADIRAN TERVERIFIKASI SAH</Text>
        </View>
        <Text style={styles.confirmationTitle}>Tanda Terima Presensi Digital</Text>
        <Text style={styles.confirmationId}>
          ID Bukti: {attReference} • {sipReference}
        </Text>
      </View>

      {/* 1. Institutional Header */}
      <View style={styles.header}>
        <Text style={styles.ministryText}>
          {attendance.institutionalHeader?.kementerian || 'KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI'}
        </Text>
        <Text style={styles.institutionText}>
          {attendance.institutionalHeader?.instansi || 'LEMBAGA LAYANAN PENDIDIKAN TINGGI WILAYAH X'}
        </Text>
        <Text style={styles.addressText}>
          {attendance.institutionalHeader?.alamat || 'Jl. Khatib Sulaiman Padang, Sumatera Barat'}
        </Text>
      </View>

      {/* 2. Receipt Identifier Row */}
      <View style={styles.identifierRow}>
        <View style={styles.identifierLeft}>
          <Text style={styles.identifierLabel}>NOMOR BUKTI PRESENSI</Text>
          <Text style={styles.identifierCode}>
            {attendance.verificationToken || `${sipReference} • Sah Kedinasan`}
          </Text>
        </View>
        <View style={styles.identifierBadge}>
          <ShieldCheck size={14} color={colors.primary} strokeWidth={2} />
          <Text style={styles.identifierBadgeText}>Resmi</Text>
        </View>
      </View>

      {/* 3. Ticket Perforation Notches & Dashed Line */}
      <View style={styles.perforationRow}>
        <View style={styles.notchLeft} />
        <View style={styles.dashedDivider} />
        <View style={styles.notchRight} />
      </View>

      {/* 4. Agenda Kedinasan Section */}
      <View style={styles.bodySection}>
        <Text style={styles.sectionHeading}>AGENDA KEDINASAN</Text>
        <Text style={styles.meetingTitle}>{attendance.meetingTitle}</Text>

        <View style={styles.agendaGrid}>
          <View style={styles.agendaGridItem}>
            <FileText size={16} color={colors.primary} strokeWidth={2} />
            <View style={styles.agendaColContent}>
              <Text style={styles.agendaGridLabel}>Berita Acara / Jadwal</Text>
              <Text style={styles.agendaGridText} numberOfLines={2}>
                {attendance.baNumber ? `No. BA: ${attendance.baNumber}` : (attendance.meetingSchedule || 'Sesuai Jadwal Agenda')}
              </Text>
            </View>
          </View>
          <View style={styles.agendaGridItem}>
            <Clock size={16} color={colors.primary} strokeWidth={2} />
            <View style={styles.agendaColContent}>
              <Text style={styles.agendaGridLabel}>Waktu Presensi Sah</Text>
              <Text style={styles.agendaGridDate}>
                {formatTanggalIndonesia(attendance.timestamp)}
              </Text>
              <Text style={styles.agendaGridBold}>
                {formatWaktuWIB(attendance.timestamp)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.formatBox}>
          <MapPin size={16} color={colors.primary} strokeWidth={2} />
          <Text style={styles.formatText}>
            <Text style={styles.formatBold}>Format & Lokasi: </Text>
            {[attendance.meetingFormat, attendance.meetingLocation].filter(Boolean).join(' • ') || 'Format kedinasan resmi LLDIKTI'}
          </Text>
        </View>
      </View>

      {/* 5. Identitas Peserta */}
      <View style={styles.subSection}>
        <Text style={styles.sectionHeading}>IDENTITAS PESERTA</Text>
        <View style={styles.participantBox}>
          <View style={styles.participantHeader}>
            <Text style={styles.participantName}>{attendance.asnName}</Text>
            <Text style={styles.participantNip}>
              NIP {attendance.asnNip} • Pegawai ASN
            </Text>
          </View>
          <View style={styles.participantGrid}>
            <View style={styles.participantCol}>
              <Text style={styles.participantLabel}>Unit Kerja</Text>
              <Text style={styles.participantValue}>{attendance.asnUnitKerja || 'LLDIKTI Wilayah X'}</Text>
            </View>
            <View style={styles.participantCol}>
              <Text style={styles.participantLabel}>Status Verifikasi</Text>
              <View style={styles.verifiedBadgeRow}>
                <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
                <Text style={styles.participantValueSuccess}>
                  {attendance.validationStatusLabel || 'Hadir Sah Terverifikasi'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.validationDetailsRow}>
            <View style={styles.validationItem}>
              <Fingerprint size={13} color={colors.textSecondary} strokeWidth={2} />
              <Text style={styles.validationText}>
                Metode: {attendance.verificationMethod || 'Swafoto & TTD Digital'}
              </Text>
            </View>
            {attendance.ipAddress ? (
              <View style={styles.validationItem}>
                <Smartphone size={13} color={colors.textSecondary} strokeWidth={2} />
                <Text style={styles.validationText}>
                  IP: {attendance.ipAddress}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* 6. Bukti Kehadiran (Selfie & TTD) */}
      <View style={styles.evidenceSection}>
        <View style={styles.evidenceSectionHeader}>
          <Text style={styles.sectionHeading}>BUKTI KEHADIRAN</Text>
          <Text style={styles.evidenceSectionHint}>Ketuk untuk melihat detail</Text>
        </View>
        <View style={styles.evidenceGrid}>
          {/* Selfie Box */}
          <Pressable
            style={({ pressed }) => [
              styles.evidenceCard,
              pressed && styles.evidenceCardPressed,
            ]}
            onPress={() => handleOpenEvidence('selfie')}
            accessibilityRole="button"
            accessibilityLabel="Lihat Bukti Swafoto Presensi"
          >
            <View style={styles.evidenceImageWrapper}>
              {activeSelfie && isSelfieReadyToRender ? (
                <Image
                  source={{ uri: activeSelfie, headers: selfieHeaders }}
                  style={styles.evidenceImage}
                  resizeMode="cover"
                />
              ) : activeSelfie && !isSelfieReadyToRender ? (
                <View style={styles.evidencePlaceholder}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <View style={styles.evidencePlaceholder}>
                  <User size={36} color={colors.outline} strokeWidth={1.75} />
                </View>
              )}
              <View style={styles.evidenceBadgeOverlay}>
                <ZoomIn size={13} color={colors.onPrimary} strokeWidth={2} />
              </View>
            </View>
            <Text style={styles.evidenceTitle}>Swafoto Presensi</Text>
            <Text style={activeSelfie ? styles.evidenceSubActive : styles.evidenceSub}>
              {activeSelfie ? 'Ketuk untuk memperbesar' : 'Bukti tidak tersedia'}
            </Text>
          </Pressable>

          {/* Signature Box */}
          <Pressable
            style={({ pressed }) => [
              styles.evidenceCard,
              pressed && styles.evidenceCardPressed,
            ]}
            onPress={() => handleOpenEvidence('signature')}
            accessibilityRole="button"
            accessibilityLabel="Lihat Bukti Tanda Tangan Digital"
          >
            <View style={styles.signatureImageWrapper}>
              {activeSignature && isSignatureReadyToRender ? (
                <Image
                  source={{ uri: activeSignature, headers: signatureHeaders }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              ) : activeSignature && !isSignatureReadyToRender ? (
                <View style={styles.signaturePlaceholder}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : (
                <View style={styles.signaturePlaceholder}>
                  <PenTool size={30} color={colors.outline} strokeWidth={1.75} />
                </View>
              )}
              <View style={styles.evidenceBadgeOverlay}>
                <ZoomIn size={13} color={colors.onPrimary} strokeWidth={2} />
              </View>
            </View>
            <Text style={styles.evidenceTitle}>Tanda Tangan Digital</Text>
            <Text style={activeSignature ? styles.evidenceSubActive : styles.evidenceSub}>
              {activeSignature ? 'Ketuk untuk memperbesar' : 'Bukti tidak tersedia'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 7. Action: Lihat Detail Agenda Button */}
      {onViewAgendaDetail ? (
        <View style={styles.detailButtonWrapper}>
          <Pressable
            onPress={onViewAgendaDetail}
            style={({ pressed }) => [
              styles.detailButton,
              pressed && styles.detailButtonPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Lihat Detail Agenda"
          >
            <View style={styles.detailButtonLeft}>
              <Calendar size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.detailButtonText}>Lihat Detail Agenda</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
        </View>
      ) : null}

      {/* Bottom tear border accent */}
      <View style={styles.tearBorder} />

      {/* Evidence Viewer Modal */}
      <EvidenceViewerModal
        visible={isEvidenceModalVisible}
        onClose={() => setIsEvidenceModalVisible(false)}
        initialTab={evidenceTab}
        attendanceId={attendance.id}
        selfieUrl={activeSelfie}
        selfieUri={attendance.selfieUri}
        signatureUrl={activeSignature}
        signatureSvg={attendance.signatureSvg}
        participantName={attendance.asnName}
        participantNip={attendance.asnNip}
        meetingTitle={attendance.meetingTitle}
        verificationToken={attendance.verificationToken}
        signedAt={attendance.timestamp}
        ipAddress={attendance.ipAddress}
        deviceInfo={attendance.deviceInfo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...cardSurface,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  confirmationBanner: {
    backgroundColor: colors.primaryDarkest,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryContainer,
    gap: spacing.xs + 2,
  },
  confirmationCheckCircle: {
    width: 48,
    height: 48,
    borderRadius: rounded.full,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  confirmationPill: {
    backgroundColor: colors.onSuccessContainer,
    borderWidth: 1,
    borderColor: colors.successLight,
    borderRadius: rounded.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 3,
  },
  confirmationPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10.5,
    color: colors.onPrimary,
    letterSpacing: 0.6,
  },
  confirmationTitle: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 18,
    color: colors.onPrimary,
    textAlign: 'center',
  },
  confirmationId: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 12,
    color: colors.textSplashMuted,
    textAlign: 'center',
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    alignItems: 'center',
  },
  ministryText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 2,
  },
  institutionText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 12.5,
    color: colors.onSurface,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  addressText: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  identifierRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identifierLeft: {
    flex: 1,
  },
  identifierLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 9.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  identifierCode: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 12.5,
    color: colors.primary,
    letterSpacing: 0.4,
    marginTop: 1,
  },
  identifierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  identifierBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10.5,
    color: colors.primary,
  },
  perforationRow: {
    height: 24,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notchLeft: {
    position: 'absolute',
    left: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.borderStrong,
    zIndex: 10,
  },
  dashedDivider: {
    width: '88%',
    borderTopWidth: 1.5,
    borderTopColor: colors.borderStrong,
    borderStyle: 'dashed',
  },
  notchRight: {
    position: 'absolute',
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderStrong,
    zIndex: 10,
  },
  bodySection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  sectionHeading: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  meetingTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 15,
    color: colors.primaryDarkest,
    lineHeight: 20,
    marginBottom: spacing.xs + 2,
  },
  agendaGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs + 2,
  },
  agendaGridItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  agendaColContent: {
    flex: 1,
  },
  agendaGridLabel: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.textMuted,
    marginBottom: 1,
  },
  agendaGridDate: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  agendaGridText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
    color: colors.onSurface,
  },
  agendaGridBold: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
    color: colors.primary,
    marginTop: 1,
  },
  formatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.sm,
    borderRadius: rounded.md,
    marginTop: 4,
  },
  formatText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  formatBold: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  subSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  participantBox: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    marginTop: 4,
  },
  participantHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  participantName: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14.5,
    color: colors.primaryDarkest,
  },
  participantNip: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoMedium,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  participantGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  participantCol: {
    flex: 1,
  },
  participantLabel: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.textMuted,
  },
  participantValue: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11.5,
    color: colors.onSurface,
    marginTop: 1,
  },
  verifiedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  participantValueSuccess: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11.5,
    color: colors.success,
    flexShrink: 1,
  },
  validationDetailsRow: {
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validationText: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  evidenceSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  evidenceSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  evidenceSectionHint: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 9.5,
    color: colors.primary,
  },
  evidenceGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  evidenceCard: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  evidenceCardPressed: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  evidenceImageWrapper: {
    width: '100%',
    height: 84,
    borderRadius: rounded.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  signatureImageWrapper: {
    width: '100%',
    height: 84,
    borderRadius: rounded.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureImage: {
    width: '90%',
    height: '90%',
  },
  evidencePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  signaturePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  evidenceBadgeOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: rounded.sm + 2,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.onPrimary,
  },
  evidenceTitle: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.onSurface,
    marginTop: 6,
    textAlign: 'center',
  },
  evidenceSub: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },
  evidenceSubActive: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 9.5,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 1,
  },
  detailButtonWrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
  },
  detailButtonPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  detailButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailButtonText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.primary,
  },
  tearBorder: {
    height: 8,
    backgroundColor: colors.surfaceSoft,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    borderStyle: 'dashed',
  },
});
