import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import {
  Calendar,
  CalendarRange,
  History,
  LucideIcon,
  X,
} from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { Button } from '../common/Button';

export type HistoryPeriod = 'all' | '2026-10' | '2026-09' | '2026-08';
export type HistoryMeetingType = 'all' | 'hybrid' | 'offline' | 'online';

interface DateFilterModalProps {
  visible: boolean;
  onClose: () => void;
  currentPeriod: HistoryPeriod;
  currentType: HistoryMeetingType;
  onApply: (period: HistoryPeriod, type: HistoryMeetingType) => void;
  onReset: () => void;
}

const PERIOD_OPTIONS: { id: HistoryPeriod; label: string; Icon: LucideIcon }[] = [
  { id: 'all', label: 'Semua Periode', Icon: CalendarRange },
  { id: '2026-10', label: 'Okt 2026 (Bulan Ini)', Icon: Calendar },
  { id: '2026-09', label: 'September 2026', Icon: History },
  { id: '2026-08', label: 'Agustus 2026', Icon: History },
];

const TYPE_OPTIONS: { id: HistoryMeetingType; label: string; desc: string }[] = [
  {
    id: 'all',
    label: 'Semua Format Rapat',
    desc: 'Tampilkan seluruh riwayat presensi tanpa batasan format',
  },
  {
    id: 'hybrid',
    label: 'Rapat Pleno & Hybrid',
    desc: 'Pertemuan kombinasi tatap muka dan ruang sidang virtual',
  },
  {
    id: 'offline',
    label: 'Rapat Luring (Tatap Muka)',
    desc: 'Pertemuan langsung di kantor LLDIKTI Wilayah X',
  },
  {
    id: 'online',
    label: 'Rapat Daring (Zoom)',
    desc: 'Pertemuan virtual kedinasan via Zoom Meeting',
  },
];

export const DateFilterModal: React.FC<DateFilterModalProps> = ({
  visible,
  onClose,
  currentPeriod,
  currentType,
  onApply,
  onReset,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<HistoryPeriod>(currentPeriod);
  const [selectedType, setSelectedType] = useState<HistoryMeetingType>(currentType);

  useEffect(() => {
    if (visible) {
      setSelectedPeriod(currentPeriod);
      setSelectedType(currentType);
    }
  }, [visible, currentPeriod, currentType]);

  const handleApply = () => {
    onApply(selectedPeriod, selectedType);
    onClose();
  };

  const handleReset = () => {
    setSelectedPeriod('all');
    setSelectedType('all');
    onReset();
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
          accessibilityLabel="Tutup dialog filter tanggal"
        />

        {/* Modal Bottom Sheet Content */}
        <View style={styles.sheetContainer}>
          {/* Drag Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>Filter Riwayat Presensi</Text>
              <Text style={styles.headerSubtitle}>
                Sesuaikan rentang periode bulan dan format rapat
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
              ]}
              hitSlop={4}
              accessibilityLabel="Tutup"
            >
              <X size={20} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Section: Periode Bulan */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PERIODE TANGGAL / BULAN</Text>
            <View style={styles.chipGrid}>
              {PERIOD_OPTIONS.map((opt) => {
                const isSelected = selectedPeriod === opt.id;
                const PeriodIcon = opt.Icon;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setSelectedPeriod(opt.id)}
                    style={({ pressed }) => [
                      styles.periodChip,
                      isSelected ? styles.periodChipActive : styles.periodChipInactive,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <PeriodIcon
                      size={15}
                      color={isSelected ? colors.onPrimary : colors.textSecondary}
                      strokeWidth={2}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        isSelected ? styles.chipTextActive : styles.chipTextInactive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section: Format Rapat */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FORMAT PERTEMUAN</Text>
            <View style={styles.typeContainer}>
              {TYPE_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setSelectedType(opt.id)}
                    style={({ pressed }) => [
                      styles.typeCard,
                      isSelected ? styles.typeCardActive : styles.typeCardInactive,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <View style={styles.typeRadioCircle}>
                      {isSelected ? (
                        <View style={styles.typeRadioInner} />
                      ) : null}
                    </View>
                    <View style={styles.typeTextGroup}>
                      <Text
                        style={[
                          styles.typeTitle,
                          isSelected && styles.typeTitleActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.typeDesc}>{opt.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Footer Action Buttons */}
          <View style={styles.footerRow}>
            <View style={styles.resetButtonWrapper}>
              <Button
                title="Atur Ulang"
                onPress={handleReset}
                variant="outline"
                size="md"
                fullWidth
              />
            </View>
            <View style={styles.applyButtonWrapper}>
              <Button
                title="Terapkan Filter"
                onPress={handleApply}
                variant="primary"
                size="md"
                fullWidth
              />
            </View>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 8 : spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.sm + 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 17,
    color: colors.onSurface,
  },
  headerSubtitle: {
    ...typography.bodySm,
    fontSize: 12,
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
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: spacing.xs + 2,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 4,
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: rounded.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  periodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodChipInactive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.borderStrong,
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    ...typography.labelMd,
    fontSize: 12,
  },
  chipTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  chipTextInactive: {
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
  },
  typeContainer: {
    gap: spacing.xs + 3,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    gap: spacing.sm + 2,
    overflow: 'hidden',
  },
  typeCardActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  typeCardInactive: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderStrong,
  },
  typeRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  typeTextGroup: {
    flex: 1,
  },
  typeTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12.5,
    color: colors.onSurface,
  },
  typeTitleActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  typeDesc: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 14,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  resetButtonWrapper: {
    width: '36%',
  },
  applyButtonWrapper: {
    flex: 1,
  },
});
