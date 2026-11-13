import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calendar,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { Button } from '../common/Button';

export const AGENDA_TIME_ZONE = 'Asia/Jakarta';

export interface CalendarDatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string; // ISO format 'YYYY-MM-DD'
  onSelectDate: (dateIso: string, formattedText: string) => void;
  minDate?: string;     // Optional ISO format 'YYYY-MM-DD'
  title?: string;
  subtitle?: string;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export function getJakartaDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: AGENDA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function formatIndonesianDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: AGENDA_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function addDaysToKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

interface CalendarCell {
  dayNumber: number;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  isWeekend: boolean;
}

export const CalendarDatePickerModal: React.FC<CalendarDatePickerModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  minDate,
  title = 'Pilih Tanggal Pelaksanaan',
  subtitle = 'Jadwal sidang dan pertemuan kedinasan LLDIKTI Wilayah X',
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetMaxHeight = Math.max(360, Math.round(windowHeight * 0.88));
  const bodyMaxHeight = Math.max(220, Math.round(windowHeight * 0.72));
  const sheetBottomPadding = Math.max(insets.bottom + spacing.md, spacing.lg);

  const todayKey = useMemo(() => getJakartaDateKey(new Date()), []);
  const effectiveMinDate = minDate ?? todayKey;

  const [tempSelectedDate, setTempSelectedDate] = useState<string>(selectedDate || todayKey);
  const [viewYear, setViewYear] = useState<number>(() => {
    const initial = selectedDate || todayKey;
    return Number(initial.split('-')[0]) || new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const initial = selectedDate || todayKey;
    const m = Number(initial.split('-')[1]);
    return !isNaN(m) ? m - 1 : new Date().getMonth();
  });

  // Sync state whenever modal is opened
  useEffect(() => {
    if (visible) {
      const active = selectedDate || todayKey;
      setTempSelectedDate(active);
      const [y, m] = active.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [visible, selectedDate, todayKey]);

  // Quick shortcut chips
  const shortcutOptions = useMemo(() => {
    return [
      { label: 'Hari Ini', dateKey: todayKey },
      { label: 'Besok', dateKey: addDaysToKey(todayKey, 1) },
      { label: 'Lusa', dateKey: addDaysToKey(todayKey, 2) },
      { label: '+1 Minggu', dateKey: addDaysToKey(todayKey, 7) },
    ];
  }, [todayKey]);

  // Determine relative badge label for active selection
  const relativeBadge = useMemo(() => {
    if (tempSelectedDate === todayKey) return 'Hari Ini';
    if (tempSelectedDate === addDaysToKey(todayKey, 1)) return 'Besok';
    if (tempSelectedDate === addDaysToKey(todayKey, 2)) return 'Lusa';
    const [y, m, d] = tempSelectedDate.split('-').map(Number);
    const dayOfWeek = new Date(Date.UTC(y, m - 1, d, 12)).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'Akhir Pekan';
    return 'Hari Kerja';
  }, [tempSelectedDate, todayKey]);

  // Calendar cells matrix generator
  const calendarCells = useMemo<CalendarCell[]>(() => {
    const cells: CalendarCell[] = [];

    // Days in current, previous, and first day of week
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    // 1. Previous month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonthYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const prevMonthIndex = viewMonth === 0 ? 12 : viewMonth;
      const dateKey = `${prevMonthYear}-${String(prevMonthIndex).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayOfWeek = cells.length % 7;

      cells.push({
        dayNumber: dayNum,
        dateKey,
        isCurrentMonth: false,
        isToday: dateKey === todayKey,
        isSelected: dateKey === tempSelectedDate,
        isDisabled: Boolean(effectiveMinDate && dateKey < effectiveMinDate),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = cells.length % 7;

      cells.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: true,
        isToday: dateKey === todayKey,
        isSelected: dateKey === tempSelectedDate,
        isDisabled: Boolean(effectiveMinDate && dateKey < effectiveMinDate),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }

    // 3. Next month leading days to complete the row grid
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let nextDay = 1; nextDay <= remaining; nextDay++) {
        const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        const nextMonthIndex = viewMonth === 11 ? 1 : viewMonth + 2;
        const dateKey = `${nextMonthYear}-${String(nextMonthIndex).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
        const dayOfWeek = cells.length % 7;

        cells.push({
          dayNumber: nextDay,
          dateKey,
          isCurrentMonth: false,
          isToday: dateKey === todayKey,
          isSelected: dateKey === tempSelectedDate,
          isDisabled: Boolean(effectiveMinDate && dateKey < effectiveMinDate),
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        });
      }
    }

    return cells;
  }, [viewYear, viewMonth, tempSelectedDate, todayKey, effectiveMinDate]);

  // Check if prev month should be disabled
  const isPrevMonthDisabled = useMemo(() => {
    if (!effectiveMinDate) return false;
    const [minY, minM] = effectiveMinDate.split('-').map(Number);
    return viewYear < minY || (viewYear === minY && viewMonth <= minM - 1);
  }, [effectiveMinDate, viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    if (viewMonth === 0) {
      setViewYear((prev) => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((prev) => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDateCell = (cell: CalendarCell) => {
    if (cell.isDisabled) return;
    setTempSelectedDate(cell.dateKey);

    // If tapped a trailing/leading day from another month, adjust viewMonth accordingly
    if (!cell.isCurrentMonth) {
      const [cellYear, cellMonth] = cell.dateKey.split('-').map(Number);
      setViewYear(cellYear);
      setViewMonth(cellMonth - 1);
    }
  };

  const handleApplyShortcut = (dateKey: string) => {
    setTempSelectedDate(dateKey);
    const [y, m] = dateKey.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
  };

  const handleConfirm = () => {
    const formatted = formatIndonesianDate(tempSelectedDate);
    onSelectDate(tempSelectedDate, formatted);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop dismiss */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Tutup kalender"
        />

        {/* Modal Bottom Sheet Content */}
        <View
          collapsable={false}
          style={[
            styles.sheetContainer,
            {
              maxHeight: sheetMaxHeight,
              width: '100%',
              paddingBottom: sheetBottomPadding,
            },
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle ? (
                <Text style={styles.headerSubtitle}>{subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Tutup dialog"
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            overScrollMode="never"
            removeClippedSubviews={false}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: bodyMaxHeight, flexGrow: 0 }}
          >
          {/* Active Date Preview Card */}
          <View style={styles.previewCard}>
            <View style={styles.previewLeft}>
              <View style={styles.previewIconWrap}>
                <CalendarCheck size={20} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.previewTextGroup}>
                <Text style={styles.previewDateText}>
                  {formatIndonesianDate(tempSelectedDate)}
                </Text>
                <Text style={styles.previewSubText}>
                  Tanggal pelaksanaan sidang terpilih
                </Text>
              </View>
            </View>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{relativeBadge}</Text>
            </View>
          </View>

          {/* Quick Shortcuts Bar */}
          <View style={styles.shortcutsRow}>
            {shortcutOptions.map((shortcut) => {
              const isActive = tempSelectedDate === shortcut.dateKey;
              return (
                <Pressable
                  key={shortcut.label}
                  onPress={() => handleApplyShortcut(shortcut.dateKey)}
                  style={({ pressed }) => [
                    styles.shortcutChip,
                    isActive && styles.shortcutChipActive,
                    pressed && styles.shortcutChipPressed,
                  ]}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`Pilih ${shortcut.label}`}
                >
                  <Text
                    style={[
                      styles.shortcutChipText,
                      isActive && styles.shortcutChipTextActive,
                    ]}
                  >
                    {shortcut.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Month & Year Navigator */}
          <View style={styles.monthNavigator}>
            <Pressable
              onPress={handlePrevMonth}
              disabled={isPrevMonthDisabled}
              style={({ pressed }) => [
                styles.navMonthBtn,
                isPrevMonthDisabled && styles.navMonthBtnDisabled,
                pressed && !isPrevMonthDisabled && styles.navMonthBtnPressed,
              ]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Bulan sebelumnya"
            >
              <ChevronLeft
                size={22}
                color={isPrevMonthDisabled ? colors.outlineVariant : colors.onSurface}
                strokeWidth={2}
              />
            </Pressable>

            <View style={styles.monthTitleWrap}>
              <Calendar size={18} color={colors.primary} strokeWidth={2} />
              <Text style={styles.monthTitleText}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
            </View>

            <Pressable
              onPress={handleNextMonth}
              style={({ pressed }) => [
                styles.navMonthBtn,
                pressed && styles.navMonthBtnPressed,
              ]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel="Bulan berikutnya"
            >
              <ChevronRight size={22} color={colors.onSurface} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Day of Week Header */}
          <View style={styles.dayOfWeekHeader}>
            {DAY_NAMES.map((dayName, idx) => {
              const isWeekend = idx === 0 || idx === 6;
              return (
                <View key={dayName} style={styles.dayOfWeekCol}>
                  <Text
                    style={[
                      styles.dayOfWeekText,
                      isWeekend && styles.dayOfWeekTextWeekend,
                    ]}
                  >
                    {dayName}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* 7-Column Calendar Days Matrix */}
          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) => {
              return (
                <View key={cell.dateKey} style={styles.cellCol}>
                  <Pressable
                    disabled={cell.isDisabled}
                    onPress={() => handleSelectDateCell(cell)}
                    style={({ pressed }) => [
                      styles.dayCell,
                      cell.isSelected && styles.dayCellSelected,
                      cell.isToday && !cell.isSelected && styles.dayCellToday,
                      cell.isDisabled && styles.dayCellDisabled,
                      pressed && !cell.isDisabled && !cell.isSelected && styles.dayCellPressed,
                    ]}
                    hitSlop={2}
                    accessibilityRole="button"
                    accessibilityLabel={`${cell.dayNumber} ${MONTH_NAMES[viewMonth]} ${viewYear}`}
                    accessibilityState={{ selected: cell.isSelected, disabled: cell.isDisabled }}
                  >
                    <Text
                      style={[
                        styles.dayNumberText,
                        !cell.isCurrentMonth && styles.dayNumberOutOfMonth,
                        cell.isWeekend && cell.isCurrentMonth && styles.dayNumberWeekend,
                        cell.isToday && !cell.isSelected && styles.dayNumberToday,
                        cell.isSelected && styles.dayNumberSelected,
                        cell.isDisabled && styles.dayNumberDisabled,
                      ]}
                    >
                      {cell.dayNumber}
                    </Text>

                    {/* Today Dot Indicator */}
                    {cell.isToday && !cell.isSelected ? (
                      <View style={styles.todayDot} />
                    ) : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            <Button
              title="Batal"
              variant="outline"
              size="md"
              style={styles.cancelBtn}
              onPress={onClose}
            />
            <Button
              title="Terapkan Tanggal"
              variant="primary"
              size="md"
              style={styles.applyBtn}
              icon={<Check size={18} color={colors.onPrimary} strokeWidth={2} />}
              onPress={handleConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrimNeutralMid,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: rounded.xl,
    borderTopRightRadius: rounded.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 8 : spacing.lg,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
    paddingBottom: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 16.5,
    color: colors.onSurface,
  },
  headerSubtitle: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: MIN_TOUCH_TARGET / 2,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  closeButtonPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.lg,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  previewIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTextGroup: {
    flex: 1,
  },
  previewDateText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    color: colors.primary,
  },
  previewSubText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  badgePill: {
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  badgePillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10,
    color: colors.primary,
  },
  shortcutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm + 2,
  },
  shortcutChip: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 6,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  shortcutChipPressed: {
    opacity: 0.75,
  },
  shortcutChipText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    color: colors.onSurface,
  },
  shortcutChipTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: spacing.xs + 2,
  },
  navMonthBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  navMonthBtnDisabled: {
    opacity: 0.4,
    backgroundColor: colors.surfaceCard,
  },
  navMonthBtnPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  monthTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthTitleText: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14.5,
    color: colors.onSurface,
  },
  dayOfWeekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: 6,
    marginBottom: 4,
  },
  dayOfWeekCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOfWeekText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  dayOfWeekTextWeekend: {
    color: colors.error,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  cellCol: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayCell: {
    width: 40,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.full,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayCellPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  dayNumberText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12.5,
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  dayNumberOutOfMonth: {
    color: colors.outlineVariant,
  },
  dayNumberWeekend: {
    color: colors.error,
  },
  dayNumberToday: {
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  dayNumberSelected: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  dayNumberDisabled: {
    color: colors.outline,
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm + 2,
  },
  cancelBtn: {
    flex: 1,
  },
  applyBtn: {
    flex: 1.4,
  },
});
