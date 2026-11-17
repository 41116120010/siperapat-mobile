import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Calendar, CheckSquare, ChevronRight, Clock, Info, Square } from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { fontFamilies, typography } from '../../../core/theme/typography';
import {
  formatRentangWaktu,
  formatTanggalIndonesia,
  formatTanggalSingkat,
  normalizeTimeInput,
  parseJakartaDate,
} from '../../../core/utils/dateFormatter';
import { AutoScrollText } from '../common/AutoScrollText';

export interface WibScheduleSectionProps {
  dateLabel: string;
  dateIso: string;
  onPressDate: () => void;
  startTime: string;
  onChangeStartTime: (val: string) => void;
  endTime: string;
  onChangeEndTime: (val: string) => void;
  isUntilFinished: boolean;
  onToggleUntilFinished: (checked: boolean) => void;
  endDateIso?: string | null;
  allowOverlap?: boolean;
  onToggleOverlap?: (next: boolean) => void;
}

export interface WibScheduleValidationParams {
  dateIso: string;
  startTime: string;
  endTime: string;
  isUntilFinished: boolean;
  endDateIso?: string | null;
}

export interface WibScheduleValidationResult {
  valid: boolean;
  normalizedStart: string;
  normalizedEnd: string | null;
  errorMessage?: string;
}

interface ParsedTimeResult {
  valid: boolean;
  normalized: string;
  totalMinutes: number;
}

function parseStrictTime(raw: string): ParsedTimeResult {
  const trimmed = raw.replace(/\s+/g, '');
  if (!trimmed) {
    return { valid: false, normalized: '', totalMinutes: -1 };
  }

  let hh = -1;
  let mm = -1;

  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colonMatch) {
    hh = Number(colonMatch[1]);
    mm = colonMatch[2].length === 1 ? Number(`${colonMatch[2]}0`) : Number(colonMatch[2]);
  } else if (/^\d{1,2}$/.test(trimmed)) {
    hh = Number(trimmed);
    mm = 0;
  } else if (/^\d{3,4}$/.test(trimmed)) {
    const padded = trimmed.padStart(4, '0');
    hh = Number(padded.slice(0, 2));
    mm = Number(padded.slice(2, 4));
  } else {
    return { valid: false, normalized: '', totalMinutes: -1 };
  }

  if (Number.isNaN(hh) || Number.isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return { valid: false, normalized: '', totalMinutes: -1 };
  }

  return {
    valid: true,
    normalized: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    totalMinutes: hh * 60 + mm,
  };
}

export function validateWibSchedule({
  dateIso,
  startTime,
  endTime,
  isUntilFinished,
  endDateIso,
}: WibScheduleValidationParams): WibScheduleValidationResult {
  const parsedStart = parseStrictTime(startTime);
  if (!parsedStart.valid) {
    return {
      valid: false,
      normalizedStart: '',
      normalizedEnd: null,
      errorMessage: 'Waktu mulai (WIB) wajib diisi dengan format JJ:MM yang valid (00:00-23:59).',
    };
  }

  if (isUntilFinished) {
    return {
      valid: true,
      normalizedStart: parsedStart.normalized,
      normalizedEnd: null,
    };
  }

  const parsedEnd = parseStrictTime(endTime);
  if (!parsedEnd.valid) {
    return {
      valid: false,
      normalizedStart: parsedStart.normalized,
      normalizedEnd: null,
      errorMessage: 'Waktu selesai (WIB) wajib diisi dengan format JJ:MM yang valid (00:00-23:59).',
    };
  }

  if (endDateIso && dateIso && endDateIso < dateIso) {
    return {
      valid: false,
      normalizedStart: parsedStart.normalized,
      normalizedEnd: parsedEnd.normalized,
      errorMessage: 'Waktu selesai harus lebih lambat dari waktu mulai.',
    };
  }

  const isSameDay = !endDateIso || !dateIso || endDateIso === dateIso;
  if (isSameDay && parsedEnd.totalMinutes <= parsedStart.totalMinutes) {
    return {
      valid: false,
      normalizedStart: parsedStart.normalized,
      normalizedEnd: parsedEnd.normalized,
      errorMessage: 'Waktu selesai harus lebih lambat dari waktu mulai.',
    };
  }

  return {
    valid: true,
    normalizedStart: parsedStart.normalized,
    normalizedEnd: parsedEnd.normalized,
  };
}

export const WibScheduleSection: React.FC<WibScheduleSectionProps> = ({
  dateLabel,
  dateIso,
  onPressDate,
  startTime,
  onChangeStartTime,
  endTime,
  onChangeEndTime,
  isUntilFinished,
  onToggleUntilFinished,
  endDateIso,
  allowOverlap = false,
  onToggleOverlap,
}) => {
  const preview = useMemo(() => {
    const parsedStart = parseStrictTime(startTime);
    const cleanStart = parsedStart.valid ? parsedStart.normalized : normalizeTimeInput(startTime, '09:00');
    const dateDisplay = dateIso ? formatTanggalIndonesia(dateIso) : 'Pilih tanggal';

    if (isUntilFinished) {
      return {
        tone: 'info' as const,
        text: `${dateDisplay} • Pukul ${cleanStart} WIB s.d. Selesai`,
        badge: 'Hingga Selesai',
      };
    }

    const parsedEnd = parseStrictTime(endTime);
    const cleanEnd = parsedEnd.valid ? parsedEnd.normalized : normalizeTimeInput(endTime, '12:00');

    let diffMinutes = 0;
    const hasMultiDayEnd = Boolean(endDateIso && dateIso && endDateIso !== dateIso);
    if (hasMultiDayEnd && dateIso && endDateIso) {
      const startMs = parseJakartaDate(`${dateIso} ${cleanStart}:00`).getTime();
      const endMs = parseJakartaDate(`${endDateIso} ${cleanEnd}:00`).getTime();
      diffMinutes = Math.floor((endMs - startMs) / 60000);
    } else {
      const startMins = parsedStart.valid
        ? parsedStart.totalMinutes
        : parseStrictTime(cleanStart).totalMinutes;
      const endMins = parsedEnd.valid
        ? parsedEnd.totalMinutes
        : parseStrictTime(cleanEnd).totalMinutes;
      diffMinutes = endMins - startMins;
    }

    if (!parsedStart.valid || !parsedEnd.valid || diffMinutes <= 0) {
      return {
        tone: 'error' as const,
        text: 'Perhatian: Waktu selesai harus lebih lambat dari waktu mulai!',
        badge: 'Waktu Tidak Valid',
      };
    }

    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const durationParts: string[] = [];
    if (hours > 0) durationParts.push(`${hours} Jam`);
    if (mins > 0) durationParts.push(`${mins} Menit`);
    const durationText = durationParts.join(' ') || '0 Menit';

    const scheduleText =
      hasMultiDayEnd && endDateIso && endDateIso > dateIso
        ? `${formatTanggalSingkat(dateIso)} (${cleanStart} WIB) s.d. ${formatTanggalSingkat(endDateIso)} (${cleanEnd} WIB)`
        : `${dateIso ? formatTanggalIndonesia(dateIso) : 'Tanggal terpilih'} • ${formatRentangWaktu(cleanStart, cleanEnd)}`;

    return {
      tone: 'success' as const,
      text: scheduleText,
      badge: `Durasi: ${durationText}`,
    };
  }, [dateIso, endDateIso, endTime, isUntilFinished, startTime]);

  const handleToggleCheckbox = () => {
    const nextChecked = !isUntilFinished;
    onToggleUntilFinished(nextChecked);
    if (!nextChecked && !endTime.trim()) {
      onChangeEndTime('12:00');
    }
  };

  const bannerContainerToneStyle =
    preview.tone === 'info'
      ? styles.previewBannerInfo
      : preview.tone === 'error'
        ? styles.previewBannerError
        : styles.previewBannerSuccess;

  const bannerTextToneStyle =
    preview.tone === 'info'
      ? styles.previewTextInfo
      : preview.tone === 'error'
        ? styles.previewTextError
        : styles.previewTextSuccess;

  const bannerBadgeToneStyle =
    preview.tone === 'info'
      ? styles.previewBadgeInfo
      : preview.tone === 'error'
        ? styles.previewBadgeError
        : styles.previewBadgeSuccess;

  const bannerBadgeTextToneStyle =
    preview.tone === 'info'
      ? styles.previewBadgeTextInfo
      : preview.tone === 'error'
        ? styles.previewBadgeTextError
        : styles.previewBadgeTextSuccess;

  const iconColor =
    preview.tone === 'info'
      ? colors.infoText
      : preview.tone === 'error'
        ? colors.onErrorContainer
        : colors.onSuccessContainer;

  return (
    <View style={styles.root}>
      {/* Tanggal Pelaksanaan */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>
          Waktu Pelaksanaan <Text style={styles.required}>*</Text>
        </Text>
        <Pressable
          onPress={onPressDate}
          style={({ pressed }) => [styles.selectorTrigger, pressed && styles.pressedState]}
          accessibilityRole="button"
          accessibilityLabel="Pilih tanggal pelaksanaan rapat"
        >
          <View style={styles.selectorLeft}>
            <Calendar size={18} color={colors.primary} strokeWidth={2} />
            <AutoScrollText style={styles.selectorValue}>{dateLabel}</AutoScrollText>
          </View>
          <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Baris Jam Mulai & Jam Selesai / Notice Hingga Selesai */}
      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Text style={styles.label}>
            Mulai (WIB) <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.timeInput}
            value={startTime}
            onChangeText={onChangeStartTime}
            onBlur={() => onChangeStartTime(normalizeTimeInput(startTime, '09:00'))}
            placeholder="09:00"
            placeholderTextColor={colors.textMuted}
            maxLength={5}
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="Jam mulai rapat dalam WIB"
          />
        </View>

        <View style={styles.timeCol}>
          <Text style={styles.label}>Selesai (WIB)</Text>
          {!isUntilFinished ? (
            <TextInput
              style={styles.timeInput}
              value={endTime}
              onChangeText={onChangeEndTime}
              onBlur={() => onChangeEndTime(normalizeTimeInput(endTime, '12:00'))}
              placeholder="12:00"
              placeholderTextColor={colors.textMuted}
              maxLength={5}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Jam selesai rapat dalam WIB"
            />
          ) : (
            <View style={styles.untilFinishedNoticeBox}>
              <Info size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={styles.untilFinishedNoticeText}>
                Rapat dijadwalkan berlangsung sampai selesai (tanpa jam penutupan kaku).
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Checkbox Hingga Selesai */}
      <View style={styles.checkboxRowWrap}>
        <Pressable
          onPress={handleToggleCheckbox}
          style={({ pressed }) => [styles.checkboxPressable, pressed && styles.pressedState]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isUntilFinished }}
          accessibilityLabel="Hingga Selesai"
        >
          {isUntilFinished ? (
            <CheckSquare size={18} color={colors.primary} strokeWidth={2} />
          ) : (
            <Square size={18} color={colors.textMuted} strokeWidth={2} />
          )}
          <Text style={styles.checkboxLabel}>Hingga Selesai</Text>
        </Pressable>
      </View>

      {/* Live Schedule Preview Banner */}
      <View style={[styles.previewBanner, bannerContainerToneStyle]}>
        <View style={styles.previewLeft}>
          <Clock size={15} color={iconColor} strokeWidth={2} />
          <Text style={[styles.previewText, bannerTextToneStyle]}>{preview.text}</Text>
        </View>
        <View style={[styles.previewBadge, bannerBadgeToneStyle]}>
          <Text style={[styles.previewBadgeText, bannerBadgeTextToneStyle]}>{preview.badge}</Text>
        </View>
      </View>

      {/* Opsi Penjadwalan Bersamaan / Paralel (Soft vs Hard Conflict) */}
      {onToggleOverlap ? (
        <Pressable
          onPress={() => onToggleOverlap(!allowOverlap)}
          style={({ pressed }) => [
            styles.overlapCard,
            allowOverlap && styles.overlapCardActive,
            pressed && styles.pressedState,
          ]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: allowOverlap }}
          accessibilityLabel="Izinkan rapat bersamaan untuk unit atau ASN yang sama"
        >
          <View style={styles.overlapIconWrap}>
            {allowOverlap ? (
              <CheckSquare size={18} color={colors.primary} strokeWidth={2} />
            ) : (
              <Square size={18} color={colors.textMuted} strokeWidth={2} />
            )}
          </View>
          <View style={styles.overlapTextWrap}>
            <Text style={styles.overlapTitle}>Izinkan jadwal bersamaan</Text>
            <Text style={styles.overlapDesc}>
              Izinkan rapat bersamaan untuk unit atau ASN yang sama. Bentrok ruangan fisik tetap diblokir.
            </Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm + 4,
  },
  fieldGroup: {
    gap: spacing.xs + 2,
  },
  label: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  required: {
    color: colors.error,
  },
  selectorTrigger: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.surfaceCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  selectorLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectorValue: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onSurface,
    flex: 1,
    minWidth: 0,
  },
  pressedState: {
    opacity: 0.78,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  timeCol: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs + 2,
  },
  timeInput: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 4,
    backgroundColor: colors.surfaceCard,
    ...typography.labelMono,
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  untilFinishedNoticeBox: {
    minHeight: MIN_TOUCH_TARGET,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs + 2,
  },
  untilFinishedNoticeText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    flex: 1,
    minWidth: 0,
    lineHeight: 16,
  },
  checkboxRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  checkboxPressable: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
  },
  checkboxLabel: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  previewBanner: {
    borderRadius: rounded.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs + 4,
  },
  previewBannerInfo: {
    backgroundColor: colors.infoBg,
    borderColor: colors.infoBorder,
  },
  previewBannerError: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.errorBorder,
  },
  previewBannerSuccess: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  previewLeft: {
    flex: 1,
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  previewText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    flex: 1,
    minWidth: 0,
    lineHeight: 18,
  },
  previewTextInfo: {
    color: colors.infoText,
  },
  previewTextError: {
    color: colors.onErrorContainer,
  },
  previewTextSuccess: {
    color: colors.onSuccessContainer,
  },
  previewBadge: {
    borderRadius: rounded.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.xs + 4,
    paddingVertical: 3,
    flexShrink: 0,
  },
  previewBadgeInfo: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.borderStrong,
  },
  previewBadgeError: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.errorBorder,
  },
  previewBadgeSuccess: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.successBorder,
  },
  previewBadgeText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 11,
  },
  previewBadgeTextInfo: {
    color: colors.onSurface,
  },
  previewBadgeTextError: {
    color: colors.onErrorContainer,
  },
  previewBadgeTextSuccess: {
    color: colors.onSuccessContainer,
  },
  overlapCard: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  overlapCardActive: {
    borderColor: colors.infoBorder,
    backgroundColor: colors.infoBg,
  },
  overlapIconWrap: {
    paddingTop: 1,
  },
  overlapTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  overlapTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  overlapDesc: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
