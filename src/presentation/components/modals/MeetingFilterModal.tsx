import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';
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

const STATUS_OPTIONS: { id: FilterStatus; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'all', label: 'Semua Status', icon: 'apps' },
  { id: 'ongoing', label: 'Berlangsung', icon: 'play-circle-outline' },
  { id: 'upcoming', label: 'Akan Datang', icon: 'schedule' },
  { id: 'completed', label: 'Selesai', icon: 'task-alt' },
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
        <View style={styles.sheetContainer}>
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
              hitSlop={8}
              accessibilityLabel="Tutup"
            >
              <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Section: Status Rapat */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>STATUS PELAKSANAAN</Text>
            <View style={styles.chipGrid}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = selectedStatus === opt.id;
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
                    <MaterialIcons
                      name={opt.icon}
                      size={16}
                      color={isSelected ? colors.onPrimary : colors.onSurfaceVariant}
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
    backgroundColor: 'rgba(11, 28, 48, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: rounded.xl,
    borderTopRightRadius: rounded.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 8 : spacing.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    overflow: 'hidden',
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(197, 197, 211, 0.8)',
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
    borderBottomColor: 'rgba(197, 197, 211, 0.3)',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    ...typography.headlineSm,
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerSubtitle: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
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
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.outline,
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
    backgroundColor: colors.surfaceContainerLow,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    ...typography.labelMd,
    fontSize: 12,
  },
  chipTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  chipTextInactive: {
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  orderContainer: {
    gap: spacing.xs + 4,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    gap: spacing.sm + 2,
    overflow: 'hidden',
  },
  orderCardActive: {
    backgroundColor: 'rgba(0, 35, 111, 0.04)',
    borderColor: colors.primary,
  },
  orderCardInactive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(197, 197, 211, 0.5)',
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  orderTitleActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  orderDesc: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
    lineHeight: 15,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
  },
  resetButtonWrapper: {
    width: '36%',
  },
  applyButtonWrapper: {
    flex: 1,
  },
});
