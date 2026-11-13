import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Camera, ChevronRight, ExternalLink, FileText } from 'lucide-react-native';
import { Meeting } from '../../../domain/entities/types';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { Button } from '../common/Button';

interface MeetingCardProps {
  meeting: Meeting;
  isActive?: boolean;
  onPressAction?: () => void;
  onPressDetail?: () => void;
  onPressPdf?: () => void;
  onPressJoinLink?: () => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  isActive = false,
  onPressAction,
  onPressDetail,
  onPressPdf,
  onPressJoinLink,
}) => {
  if (isActive) {
    return (
      <View style={styles.activeContainer}>
        {/* Active Banner */}
        <View style={styles.activeHeader}>
          <Text style={styles.activeHeaderTitle}>Presensi Sedang Dibuka</Text>
        </View>

        {/* Content Body */}
        <View style={styles.activeBody}>
          <Text style={styles.meetingCategory}>
            {meeting.type === 'hybrid'
              ? 'Rapat Pleno Hybrid'
              : meeting.type === 'online'
              ? 'Rapat Daring Kedinasan'
              : 'Rapat Luring Kedinasan'}
          </Text>
          <Text style={styles.activeTitle}>{meeting.title}</Text>
          <Text style={styles.leaderText}>
            Pemimpin Rapat:{' '}
            <Text style={styles.leaderHighlight}>{meeting.leader}</Text>
          </Text>

          {/* Sesi & Lokasi Rapat */}
          <View style={styles.meetingInfoGrid}>
            <View style={styles.meetingInfoItem}>
              <Text style={styles.infoLabel}>Waktu Sesi</Text>
              <Text style={styles.infoValue}>
                {meeting.startTime} - {meeting.endTime} WIB
              </Text>
            </View>
            <View style={styles.meetingInfoItem}>
              <Text style={styles.infoLabel}>Lokasi / Ruang</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {meeting.venue || 'Tidak tersedia'}
              </Text>
            </View>
          </View>

          {/* Action Button */}
          {onPressAction ? (
            <Button
              title="Lakukan Presensi"
              onPress={onPressAction}
              variant="primary"
              size="lg"
              fullWidth
              icon={<Camera size={18} color={colors.onPrimary} strokeWidth={2} />}
            />
          ) : null}
        </View>
      </View>
    );
  }

  // Upcoming / Standard Card
  const isOnline = meeting.type === 'online';

  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardCategory}>
            {isOnline ? 'Daring via Zoom Meeting' : 'Jadwal Kedinasan'}
          </Text>
          <Text style={styles.cardTime}>
            {meeting.date ? `${meeting.date}, ` : ''}{meeting.startTime} WIB
          </Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {meeting.title}
        </Text>
        <Text style={styles.cardVenue} numberOfLines={2}>
          {meeting.agendaDescription || `${meeting.venue} • ${meeting.leader}`}
        </Text>
      </View>

      {/* Footer Actions aligned with Web <x-agenda-card> */}
      <View style={styles.cardFooter}>
        {isOnline ? (
          <>
            <Pressable
              onPress={onPressPdf}
              style={({ pressed }) => [
                styles.pdfButton,
                pressed && styles.linkPressed,
              ]}
              hitSlop={4}
            >
              <FileText size={15} color={colors.primary} strokeWidth={2} />
              <Text style={styles.pdfButtonText}>Lihat Undangan (PDF)</Text>
            </Pressable>

            <Pressable
              onPress={onPressJoinLink || onPressDetail}
              style={({ pressed }) => [
                styles.detailButton,
                pressed && styles.linkPressed,
              ]}
              hitSlop={4}
            >
              <Text style={styles.detailButtonText}>Akses Tautan</Text>
              <ExternalLink size={16} color={colors.primary} strokeWidth={2} />
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.cardCode}>Kode: {meeting.code}</Text>
            {onPressDetail ? (
              <Pressable
                onPress={onPressDetail}
                style={({ pressed }) => [
                  styles.detailButton,
                  pressed && styles.linkPressed,
                ]}
                hitSlop={4}
              >
                <Text style={styles.detailButtonText}>Detail Agenda</Text>
                <ChevronRight size={18} color={colors.primary} strokeWidth={2} />
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  activeContainer: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  activeHeader: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  activeHeaderTitle: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeBody: {
    padding: spacing.md,
  },
  meetingCategory: {
    ...typography.labelSm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  activeTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    lineHeight: 22,
    marginBottom: 4,
  },
  leaderText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  leaderHighlight: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  meetingInfoGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  meetingInfoItem: {
    flex: 1,
  },
  infoLabel: {
    ...typography.labelSm,
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  cardContainer: {
    ...cardSurface,
    borderRadius: rounded.xl,
    borderColor: colors.borderSubtle,
    marginBottom: spacing.sm + 2,
    overflow: 'hidden',
  },
  cardBody: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardCategory: {
    ...typography.labelSm,
    color: colors.textMuted,
  },
  cardTime: {
    ...typography.labelSm,
    color: colors.textMuted,
  },
  cardTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 4,
  },
  cardVenue: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  cardCode: {
    ...typography.labelMono,
    color: colors.textMuted,
    fontSize: 11,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    gap: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: rounded.sm,
    overflow: 'hidden',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    gap: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: rounded.sm,
    overflow: 'hidden',
  },
  linkPressed: {
    backgroundColor: colors.surfaceSoft,
    opacity: 0.85,
  },
  pdfButtonText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },
  detailButtonText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
});
