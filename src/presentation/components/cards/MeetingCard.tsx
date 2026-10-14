import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Meeting } from '../../../domain/entities/types';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';
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
              icon={
                <MaterialIcons name="camera-alt" size={18} color={colors.onPrimary} />
              }
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
      <View style={styles.cardHeader}>
        <Text style={styles.cardCategory}>
          {isOnline ? 'Daring via Zoom Meeting' : 'Jadwal Kedinasan'}
        </Text>
        <Text style={styles.cardTime}>
          {meeting.date ? `${meeting.date}, ` : ''}{meeting.startTime} WIB
        </Text>
      </View>

      <Text style={styles.cardTitle}>{meeting.title}</Text>
      <Text style={styles.cardVenue} numberOfLines={2}>
        {meeting.agendaDescription || `${meeting.venue} • ${meeting.leader}`}
      </Text>

      {/* Footer Actions */}
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
              <MaterialIcons name="picture-as-pdf" size={15} color={colors.primary} />
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
              <MaterialIcons
                name="open-in-new"
                size={16}
                color={colors.primary}
              />
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
                <MaterialIcons
                  name="chevron-right"
                  size={18}
                  color={colors.primary}
                />
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 35, 111, 0.25)',
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#00236F',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  activeHeader: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.3)',
  },
  activeHeaderTitle: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeHeaderCountdown: {
    ...typography.labelSm,
    color: colors.error,
    fontWeight: '600',
  },
  activeBody: {
    padding: spacing.md,
  },
  meetingCategory: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  activeTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  leaderText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  leaderHighlight: {
    color: colors.onSurface,
    fontWeight: '600',
  },
  meetingInfoGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.3)',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  meetingInfoItem: {
    flex: 1,
  },
  infoLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.labelMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  cardContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    marginBottom: spacing.sm + 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardCategory: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  cardTime: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  cardTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardVenue: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
  },
  cardCode: {
    ...typography.labelMono,
    color: colors.outline,
    fontSize: 11,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: rounded.sm,
    overflow: 'hidden',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: rounded.sm,
    overflow: 'hidden',
  },
  linkPressed: {
    backgroundColor: colors.surfaceContainerLow,
    opacity: 0.85,
  },
  pdfButtonText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '600',
  },
  detailButtonText: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: '700',
  },
});
