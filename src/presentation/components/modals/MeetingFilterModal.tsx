import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Clock,
  LayoutGrid,
  LucideIcon,
  PlayCircle,
  X,
} from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { Button } from '../common/Button';

export type FilterStatus = 'all' | 'ongoing' | 'upcoming' | 'completed';
export type FilterOrder = 'all' | 'priority';

interface MeetingFilterModalProps {
  visible: boolean;
  onClose: () => void;
  currentStatus: FilterStatus;
  currentOrder: FilterOrder;
  onApply: (status: FilterStatus, order: FilterOrder) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: { id: FilterStatus; label: string; Icon: LucideIcon }[] = [
  { id: 'all', label: 'Semua Status', Icon: LayoutGrid },
  { id: 'ongoing', label: 'Berlangsung', Icon: PlayCircle },
  { id: 'upcoming', label: 'Akan Datang', Icon: Clock },
  { id: 'completed', label: 'Selesai', Icon: CheckCircle2 },
];

const ORDER_OPTIONS: { id: FilterOrder; label: string; desc: string }[] = [
  {
    id: 'all',
    label: 'Semua Rapat Dinas',
    desc: 'Tampilkan seluruh agenda rapat tanpa pembatasan prioritas',
  },
  {
    id: 'priority',
    label: 'Khusus Rapat Pleno / Prioritas',
    desc: 'Hanya tampilkan rapat pleno dan agenda berkategori penting',
  },
];

export const MeetingFilterModal: React.FC<MeetingFilterModalProps> = ({
  visible,
  onClose,
  currentStatus,
  currentOrder,
  onApply,
  onReset,
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetMaxHeight = Math.max(360, Math.round(windowHeight * 0.88));
  const bodyMaxHeight = Math.max(220, Math.round(windowHeight * 0.72));
  const sheetBottomPadding = Math.max(insets.bottom + spacing.md, spacing.lg);

  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>(currentStatus);
  const [selectedOrder, setSelectedOrder] = useState<FilterOrder>(currentOrder);

  useEffect(() => {
    if (visible) {
      setSelectedStatus(currentStatus);
      setSelectedOrder(currentOrder);
    }
  }, [visible, currentStatus, currentOrder]);

  const handleApply = () => {
    onApply(selectedStatus, selectedOrder);
    onClose();
  };

  const handleReset = () => {
    setSelectedStatus('all');
    setSelectedOrder('all');
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
          accessibilityLabel="Tutup dialog filter"
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
              <Text style={styles.headerTitle}>Filter Agenda Rapat</Text>
              <Text style={styles.headerSubtitle}>
                Kustomisasi kriteria tampilan agenda dinas
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

          <ScrollView
            bounces={false}
            overScrollMode="never"
            removeClippedSubviews={false}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: bodyMaxHeight, flexGrow: 0 }}
          >
          {/* Section: Status Rapat */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>STATUS PELAKSANAAN</Text>
            <View style={styles.chipGrid}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.id;
                const StatusIcon = opt.Icon;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setSelectedStatus(opt.id)}
                    style={({ pressed }) => [
                      styles.statusChip,
                      isSelected ? styles.statusChipActive : styles.statusChipInactive,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <StatusIcon
                      size={16}
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

          {/* Section: Prioritas / Kategori */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PRIORITAS & JENIS</Text>
            <View style={styles.orderContainer}>
              {ORDER_OPTIONS.map((opt) => {
                const isSelected = selectedOrder === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setSelectedOrder(opt.id)}
                    style={({ pressed }) => [
                      styles.orderCard,
                      isSelected ? styles.orderCardActive : styles.orderCardInactive,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <View style={styles.orderRadioCircle}>
                      {isSelected ? (
                        <View style={styles.orderRadioInner} />
                      ) : null}
                    </View>
                    <View style={styles.orderTextGroup}>
                      <Text
                        style={[
                          styles.orderTitle,
                          isSelected && styles.orderTitleActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.orderDesc}>{opt.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
          </ScrollView>

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
  statusChip: {
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
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipInactive: {
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
  orderContainer: {
    gap: spacing.xs + 4,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    padding: spacing.sm + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    gap: spacing.sm + 2,
    overflow: 'hidden',
  },
  orderCardActive: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primary,
  },
  orderCardInactive: {
    backgroundColor: colors.surfaceCard,
    borderColor: colors.borderStrong,
  },
  orderRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  orderTextGroup: {
    flex: 1,
  },
  orderTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  orderTitleActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  orderDesc: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
    lineHeight: 15,
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
