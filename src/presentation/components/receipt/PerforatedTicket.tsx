import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Attendance } from '../../../domain/entities/types';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';
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

  return (
    <View style={styles.card}>
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
            {attendance.verificationToken || `SIP-${attendance.id.padStart(6, '0')} • Sah Kedinasan`}
          </Text>
        </View>
        <View style={styles.identifierBadge}>
          <MaterialIcons name="verified-user" size={14} color={colors.primary} />
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
            <MaterialIcons name="assignment" size={16} color={colors.primary} />
            <View style={styles.agendaColContent}>
              <Text style={styles.agendaGridLabel}>Berita Acara / Jadwal</Text>
              <Text style={styles.agendaGridText} numberOfLines={2}>
                {attendance.baNumber ? `No. BA: ${attendance.baNumber}` : (attendance.meetingSchedule || 'Sesuai Jadwal Agenda')}
              </Text>
            </View>
          </View>
          <View style={styles.agendaGridItem}>
            <MaterialIcons name="schedule" size={16} color={colors.primary} />
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
          <MaterialIcons name="meeting-room" size={16} color={colors.primary} />
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
                <MaterialIcons name="verified" size={14} color={colors.success} />
                <Text style={styles.participantValueSuccess}>
                  {attendance.validationStatusLabel || 'Hadir Sah Terverifikasi'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.validationDetailsRow}>
            <View style={styles.validationItem}>
              <MaterialIcons name="fingerprint" size={13} color={colors.onSurfaceVariant} />
              <Text style={styles.validationText}>
                Metode: {attendance.verificationMethod || 'Swafoto & TTD Digital'}
              </Text>
            </View>
            {attendance.ipAddress ? (
              <View style={styles.validationItem}>
                <MaterialIcons name="devices" size={13} color={colors.onSurfaceVariant} />
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
                  <MaterialIcons name="person" size={40} color={colors.outline} />
                </View>
              )}
              <View style={styles.evidenceBadgeOverlay}>
                <MaterialIcons name="zoom-in" size={13} color="#FFFFFF" />
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
                  <MaterialIcons name="draw" size={32} color={colors.outline} />
                </View>
              )}
              <View style={styles.evidenceBadgeOverlay}>
                <MaterialIcons name="zoom-in" size={13} color="#FFFFFF" />
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
              <MaterialIcons name="event-note" size={18} color={colors.primary} />
              <Text style={styles.detailButtonText}>Lihat Detail Agenda</Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={18}
              color={colors.onSurfaceVariant}
            />
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    alignItems: 'center',
  },
  ministryText: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 2,
  },
  institutionText: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  addressText: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  identifierRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: 'rgba(229, 238, 255, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    borderStyle: 'dashed',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  identifierLeft: {
    flex: 1,
  },
  identifierLabel: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  identifierCode: {
    ...typography.labelMono,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  identifierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 35, 111, 0.15)',
  },
  identifierBadgeText: {
    ...typography.labelSm,
    fontSize: 10.5,
    fontWeight: '700',
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
    borderRightColor: colors.outlineVariant,
    zIndex: 10,
  },
  dashedDivider: {
    width: '88%',
    borderTopWidth: 1.5,
    borderTopColor: colors.outlineVariant,
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
    borderLeftColor: colors.outlineVariant,
    zIndex: 10,
  },
  bodySection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  sectionHeading: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  meetingTitle: {
    ...typography.headlineSm,
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.onSurface,
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
    color: colors.onSurfaceVariant,
    marginBottom: 1,
  },
  agendaGridDate: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  agendaGridText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurface,
    fontWeight: '500',
  },
  agendaGridBold: {
    ...typography.bodySm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 1,
  },
  formatBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(229, 238, 255, 0.5)',
    padding: spacing.sm,
    borderRadius: rounded.md,
    marginTop: 4,
  },
  formatText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  formatBold: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  subSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.6)',
  },
  participantBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.8)',
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    marginTop: 4,
  },
  participantHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.6)',
    paddingBottom: spacing.xs + 2,
    marginBottom: spacing.xs + 2,
  },
  participantName: {
    ...typography.headlineSm,
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  participantNip: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  participantGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  participantCol: {
    flex: 1,
  },
  participantLabel: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  participantValue: {
    ...typography.bodySm,
    fontSize: 11.5,
    fontWeight: '500',
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
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.success,
  },
  validationDetailsRow: {
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.4)',
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
    color: colors.onSurfaceVariant,
  },
  evidenceSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.6)',
  },
  evidenceSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  evidenceSectionHint: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.primary,
    fontWeight: '600',
  },
  evidenceGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  evidenceCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.8)',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  evidenceCardPressed: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.primary,
    transform: [{ scale: 0.99 }],
  },
  evidenceImageWrapper: {
    width: '100%',
    height: 84,
    borderRadius: rounded.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
    borderRadius: 8,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  evidenceTitle: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 6,
    textAlign: 'center',
  },
  evidenceSub: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 1,
  },
  evidenceSubActive: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 1,
  },
  detailButtonWrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.6)',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 35, 111, 0.3)',
    backgroundColor: colors.surfaceContainerLow,
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  tearBorder: {
    height: 8,
    backgroundColor: colors.surfaceContainerLow,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.6)',
    borderStyle: 'dashed',
  },
});
