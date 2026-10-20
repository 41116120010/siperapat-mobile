import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Attendance } from '../../../domain/entities/types';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';
import { formatWaktuWIB } from '../../../core/utils/dateFormatter';

interface PerforatedTicketProps {
  attendance: Attendance;
  onViewAgendaDetail?: () => void;
}

export const PerforatedTicket: React.FC<PerforatedTicketProps> = ({
  attendance,
  onViewAgendaDetail,
}) => {
  return (
    <View style={styles.card}>
      {/* 1. Institutional Header */}
      <View style={styles.header}>
        <Text style={styles.ministryText}>
          KEMENTERIAN PENDIDIKAN TINGGI, SAINS, DAN TEKNOLOGI
        </Text>
        <Text style={styles.institutionText}>
          LEMBAGA LAYANAN PENDIDIKAN TINGGI WILAYAH X
        </Text>
        <Text style={styles.addressText}>
          Jl. Khatib Sulaiman Padang, Sumatera Barat
        </Text>
      </View>

      {/* 2. Receipt Identifier Row */}
      <View style={styles.identifierRow}>
        <View>
          <Text style={styles.identifierLabel}>NOMOR BUKTI PRESENSI</Text>
          <Text style={styles.identifierCode}>
            {attendance.verificationToken || `ID ${attendance.id} • token tidak disediakan API`}
          </Text>
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
            <MaterialIcons name="apartment" size={16} color={colors.primary} />
            <Text style={styles.agendaGridText}>
              {attendance.asnUnitKerja || 'Unit tidak disediakan API'}
            </Text>
          </View>
          <View style={styles.agendaGridItem}>
            <MaterialIcons name="schedule" size={16} color={colors.primary} />
            <Text style={styles.agendaGridText}>
              Waktu Presensi:{'\n'}
              <Text style={styles.agendaGridBold}>
                {formatWaktuWIB(attendance.timestamp)} WIB
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.formatBox}>
          <MaterialIcons name="videocam" size={16} color={colors.primary} />
          <Text style={styles.formatText}>
            <Text style={styles.formatBold}>Format Kedinasan: </Text>
            {[attendance.meetingFormat, attendance.meetingLocation].filter(Boolean).join(' • ') || 'Lokasi dan format tidak disediakan API'}
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
              <Text style={styles.participantValue}>{attendance.asnUnitKerja}</Text>
            </View>
            <View style={styles.participantCol}>
              <Text style={styles.participantLabel}>Radius Geofence</Text>
              <Text style={attendance.distanceMeters === undefined ? styles.participantValue : styles.participantValueSuccess}>{attendance.distanceMeters === undefined ? 'Validasi lokasi tidak disediakan API' : `Tervalidasi (${attendance.distanceMeters}m)`}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 6. Bukti Kehadiran (Selfie & TTD) */}
      <View style={styles.evidenceSection}>
        <Text style={styles.sectionHeading}>BUKTI KEHADIRAN</Text>
        <View style={styles.evidenceGrid}>
          {/* Selfie Box */}
          <View style={styles.evidenceCard}>
            <View style={styles.evidencePlaceholder}>
              <MaterialIcons name="person" size={48} color={colors.outline} />
              <View style={styles.evidenceBadgeOverlay}>
                <MaterialIcons name="camera-alt" size={12} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.evidenceTitle}>Swafoto Presensi</Text>
            <Text style={styles.evidenceSub}>{attendance.selfieUrl ? 'Bukti tersimpan di server' : 'Bukti tidak tersedia'}</Text>
          </View>

          {/* Signature Box */}
          <View style={styles.evidenceCard}>
            <View style={styles.signatureBox}>
              <MaterialIcons name={attendance.signatureUrl ? 'draw' : 'draw'} size={32} color={colors.primary} />
            </View>
            <Text style={styles.evidenceTitle}>Tanda Tangan Digital</Text>
            <Text style={styles.evidenceSub}>{attendance.signatureUrl ? 'Bukti tersimpan di server' : 'Bukti tidak tersedia'}</Text>
          </View>
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
    gap: 4,
  },
  agendaGridText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  agendaGridBold: {
    fontWeight: '700',
    color: colors.onSurface,
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
  evidenceSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
  participantValueSuccess: {
    ...typography.bodySm,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.success,
    marginTop: 1,
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
  evidencePlaceholder: {
    width: '100%',
    height: 72,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  evidenceBadgeOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceTitle: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 6,
    textAlign: 'center',
  },
  evidenceSub: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  signatureBox: {
    width: '100%',
    height: 72,
    borderRadius: rounded.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
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
