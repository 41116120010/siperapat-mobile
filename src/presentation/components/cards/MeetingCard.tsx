import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  Calendar,
  Camera,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Users,
} from 'lucide-react-native';
import { Meeting } from '../../../domain/entities/types';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';

export interface MeetingCardProps {
  meeting: Meeting;
  /** @deprecated Kept for backward compatibility; all cards now use the unified Web SSOT layout. */
  isActive?: boolean;
  showAttendance?: boolean;
  footerRight?: React.ReactNode;
  onPressAction?: () => void;
  onPressDetail?: () => void;
  onPressPdf?: () => void;
  onPressJoinLink?: () => void;
  statusLabel?: string;
  isOverdue?: boolean;
  attendancesCount?: number;
  targetLabel?: string;
  organizerLabel?: string;
  roleBadge?: string;
}

const SHORT_ID_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

function formatAgendaDateTime(
  dateIso: string,
  startTime: string,
  endTime: string
): string {
  const dateMatch = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dateLabel = dateMatch
    ? `${Number(dateMatch[3])} ${SHORT_ID_MONTHS[Number(dateMatch[2]) - 1] ?? dateMatch[2]} ${dateMatch[1]}`
    : dateIso;
  const rangeLabel = endTime
    ? `${startTime} - ${endTime} WIB`
    : `${startTime} WIB s.d. Selesai`;
  return dateLabel ? `${dateLabel}, ${rangeLabel}` : rangeLabel;
}

function getSoftStatusBadge(
  status: Meeting['status'],
  customLabel?: string,
  isOverdue?: boolean
): {
  label: string;
  bg: string;
  border: string;
  text: string;
  showLiveDot: boolean;
} {
  if (isOverdue) {
    return {
      label: 'Terlewat',
      bg: colors.warningContainer,
      border: colors.warningBorder,
      text: colors.onWarningContainer,
      showLiveDot: false,
    };
  }

  switch (status) {
    case 'ongoing':
      return {
        label: customLabel || 'Sedang Berlangsung',
        bg: colors.successContainer,
        border: colors.successBorder,
        text: colors.onSuccessContainer,
        showLiveDot: true,
      };
    case 'completed':
      return {
        label: customLabel || 'Selesai',
        bg: colors.surfaceSoft,
        border: colors.borderStrong,
        text: colors.textSecondary,
        showLiveDot: false,
      };
    case 'draft':
      return {
        label: customLabel || 'Konsep',
        bg: colors.surfaceSoft,
        border: colors.borderStrong,
        text: colors.textMuted,
        showLiveDot: false,
      };
    case 'cancelled':
      return {
        label: customLabel || 'Dibatalkan',
        bg: colors.errorContainer,
        border: colors.errorBorder,
        text: colors.onErrorContainer,
        showLiveDot: false,
      };
    case 'upcoming':
    default:
      return {
        label: customLabel || 'Terjadwal',
        bg: colors.infoBg,
        border: colors.infoBorder,
        text: colors.infoText,
        showLiveDot: false,
      };
  }
}

function getFormatLabel(type: Meeting['type']): string {
  switch (type) {
    case 'online':
      return 'Daring';
    case 'hybrid':
      return 'Hybrid';
    case 'offline':
    default:
      return 'Luring';
  }
}

function resolveTargetText(meeting: Meeting, customLabel?: string): string {
  if (customLabel) return customLabel;
  if (meeting.targetType === 'selected_users') return 'Khusus ASN Tertentu';
  if (meeting.isAllUnits || meeting.targetType === 'all_units') {
    return 'Seluruh Unit LLDIKTI (Pleno)';
  }
  if (meeting.unitsList && meeting.unitsList.length > 0) {
    return meeting.unitsList.map((u) => u.kode_unit).join(', ');
  }
  return meeting.targetAudience || 'Unit Kerja Tertentu';
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  showAttendance = true,
  footerRight,
  onPressAction,
  onPressDetail,
  onPressPdf,
  onPressJoinLink,
  statusLabel,
  isOverdue,
  attendancesCount,
  targetLabel,
  organizerLabel,
  roleBadge,
}) => {
  const isOnline = meeting.type === 'online';
  const statusMeta = getSoftStatusBadge(meeting.status, statusLabel, isOverdue);
  const attendedCount = attendancesCount ?? meeting.totalAttended ?? 0;
  const resolvedTarget = resolveTargetText(meeting, targetLabel);
  const formattedSchedule = formatAgendaDateTime(
    meeting.date,
    meeting.startTime,
    meeting.endTime
  );
  const resolvedLocation = isOnline
    ? 'Ruang Virtual / Tautan Rapat'
    : meeting.venue || 'Tempat Pelaksanaan Belum Ditentukan';

  const hasFallbackFooterRight =
    footerRight === undefined &&
    Boolean(onPressAction || (isOnline && ((onPressPdf && meeting.invitationPdfUrl) || (onPressJoinLink && meeting.zoomUrl))));

  return (
    <View style={styles.cardContainer}>
      {/* Card Header: Soft Status Pill (Left) + Attendance Pill (Right) */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
          ]}
        >
          {statusMeta.showLiveDot ? <View style={styles.liveDot} /> : null}
          <Text style={[styles.statusBadgeText, { color: statusMeta.text }]}>
            {statusMeta.label}
          </Text>
        </View>

        {showAttendance ? (
          <View style={styles.attendanceBadge}>
            <Users size={13} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.attendanceBadgeText}>{attendedCount} Hadir</Text>
          </View>
        ) : null}
      </View>

      {/* Card Body: Title, Time, Location + Format, Target, BodyExtra */}
      <Pressable
        onPress={onPressDetail}
        disabled={!onPressDetail}
        style={({ pressed }) => [styles.cardBody, pressed && onPressDetail && styles.linkPressed]}
        accessibilityRole={onPressDetail ? 'button' : undefined}
        accessibilityLabel={`Lihat detail agenda ${meeting.title}`}
      >
        <Text style={styles.cardTitle} numberOfLines={2}>
          {meeting.title}
        </Text>

        <View style={styles.metaStack}>
          <View style={styles.metaRow}>
            <Clock size={15} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.metaText} numberOfLines={1}>
              {formattedSchedule}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <MapPin size={15} color={colors.textMuted} strokeWidth={2} />
            <View style={styles.locationRowInner}>
              <View style={styles.formatBadge}>
                <Text style={styles.formatBadgeText}>{getFormatLabel(meeting.type)}</Text>
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                {resolvedLocation}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Calendar size={15} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.metaText} numberOfLines={1}>
              {resolvedTarget}
            </Text>
          </View>

          {organizerLabel || roleBadge ? (
            <View style={styles.organizerRow}>
              <View style={styles.organizerLeft}>
                <Users size={14} color={colors.textMuted} strokeWidth={2} />
                <Text style={styles.organizerText} numberOfLines={1}>
                  Oleh:{' '}
                  <Text style={styles.organizerStrong}>
                    {organizerLabel || 'Penyelenggara'}
                  </Text>
                </Text>
              </View>
              {roleBadge ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{roleBadge}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Pressable>

      {/* Card Footer: Lihat Detail (Left) + Custom or Fallback Actions (Right) */}
      <View style={styles.cardFooter}>
        {onPressDetail ? (
          <Pressable
            onPress={onPressDetail}
            style={({ pressed }) => [
              styles.detailButton,
              pressed && styles.linkPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Lihat detail ${meeting.title}`}
          >
            <Text style={styles.detailButtonText}>Lihat Detail</Text>
          </Pressable>
        ) : (
          <View />
        )}

        {footerRight !== undefined ? (
          <View style={styles.footerRightWrap}>{footerRight}</View>
        ) : hasFallbackFooterRight ? (
          <View style={styles.footerRightWrap}>
            {isOnline && onPressPdf && meeting.invitationPdfUrl ? (
              <Pressable
                onPress={onPressPdf}
                style={({ pressed }) => [styles.secondaryActionBtn, pressed && styles.linkPressed]}
                accessibilityRole="button"
              >
                <FileText size={14} color={colors.primary} strokeWidth={2} />
                <Text style={styles.secondaryActionText}>Undangan</Text>
              </Pressable>
            ) : null}
            {isOnline && onPressJoinLink && meeting.zoomUrl ? (
              <Pressable
                onPress={onPressJoinLink}
                style={({ pressed }) => [styles.secondaryActionBtn, pressed && styles.linkPressed]}
                accessibilityRole="button"
              >
                <ExternalLink size={14} color={colors.primary} strokeWidth={2} />
                <Text style={styles.secondaryActionText}>Tautan</Text>
              </Pressable>
            ) : null}
            {onPressAction ? (
              <Pressable
                onPress={onPressAction}
                style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.linkPressed]}
                accessibilityRole="button"
              >
                <Camera size={14} color={colors.onPrimary} strokeWidth={2} />
                <Text style={styles.primaryActionText}>Presensi</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm + 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.full,
    borderWidth: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: rounded.full,
    backgroundColor: colors.successLight,
  },
  statusBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11.5,
  },
  attendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  attendanceBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
    fontSize: 11.5,
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    fontSize: 15.5,
    lineHeight: 22,
  },
  metaStack: {
    gap: 7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  metaText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    fontSize: 12.5,
    flex: 1,
  },
  formatBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  formatBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
    fontSize: 10,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.xs + 4,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  organizerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  organizerText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
    flex: 1,
  },
  organizerStrong: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    backgroundColor: colors.infoBg,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  roleBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.infoText,
    fontSize: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 4,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  footerRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
    flexShrink: 1,
  },
  detailButton: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 4,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  detailButtonText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    fontSize: 12,
  },
  secondaryActionBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  secondaryActionText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
    fontSize: 11.5,
  },
  primaryActionBtn: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: rounded.md,
    backgroundColor: colors.success,
  },
  primaryActionText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
    fontSize: 11.5,
  },
  linkPressed: {
    opacity: 0.8,
  },
});
