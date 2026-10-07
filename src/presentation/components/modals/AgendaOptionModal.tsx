import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { rounded, spacing } from '../../../core/theme/tokens';

export interface AgendaOption {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}

interface AgendaOptionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: AgendaOption[];
  selectedId: string;
  onSelect: (option: AgendaOption) => void;
}

export const AgendaOptionModal: React.FC<AgendaOptionModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  options,
  selectedId,
  onSelect,
}) => {
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
          accessibilityLabel="Tutup jendela pilihan"
        />

        {/* Modal Bottom Sheet Content */}
        <View style={styles.sheetContainer}>
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
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Tutup dialog"
            >
              <MaterialIcons
                name="close"
                size={20}
                color={colors.onSurfaceVariant}
              />
            </Pressable>
          </View>

          {/* Options List */}
          <ScrollView
            style={styles.optionsScrollView}
            contentContainerStyle={styles.optionsList}
            showsVerticalScrollIndicator={false}
          >
            {options.map((option) => {
              const isSelected = option.id === selectedId;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    onSelect(option);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.optionCard,
                    isSelected ? styles.optionCardActive : styles.optionCardInactive,
                    pressed && styles.optionCardPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                >
                  {/* Left Icon (if provided) */}
                  {option.icon ? (
                    <View
                      style={[
                        styles.iconWrap,
                        isSelected ? styles.iconWrapActive : styles.iconWrapInactive,
                      ]}
                    >
                      <MaterialIcons
                        name={option.icon}
                        size={18}
                        color={isSelected ? colors.primary : colors.onSurfaceVariant}
                      />
                    </View>
                  ) : null}

                  {/* Texts */}
                  <View style={styles.optionTextGroup}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.optionTitle,
                          isSelected && styles.optionTitleActive,
                        ]}
                      >
                        {option.title}
                      </Text>
                      {option.badge ? (
                        <View style={styles.badgePill}>
                          <Text style={styles.badgePillText}>
                            {option.badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {option.subtitle ? (
                      <Text style={styles.optionSubtitle}>
                        {option.subtitle}
                      </Text>
                    ) : null}
                  </View>

                  {/* Radio Indicator */}
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected ? styles.radioCircleActive : styles.radioCircleInactive,
                    ]}
                  >
                    {isSelected ? <View style={styles.radioInner} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: rounded.xl,
    borderTopRightRadius: rounded.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl + 8 : spacing.lg,
    maxHeight: '80%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 0,
        borderTopWidth: 1,
        borderTopColor: 'rgba(197, 197, 211, 0.5)',
      },
    }),
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(197, 197, 211, 0.8)',
    alignSelf: 'center',
    marginBottom: spacing.sm,
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
    fontSize: 16.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerSubtitle: {
    ...typography.bodySm,
    fontSize: 11.5,
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
  optionsScrollView: {
    flexGrow: 0,
  },
  optionsList: {
    gap: 8,
    paddingBottom: spacing.xs,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    gap: spacing.sm + 2,
    overflow: 'hidden',
  },
  optionCardActive: {
    backgroundColor: 'rgba(0, 35, 111, 0.04)',
    borderColor: colors.primary,
  },
  optionCardInactive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(197, 197, 211, 0.55)',
  },
  optionCardPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
  },
  iconWrapInactive: {
    backgroundColor: colors.surfaceContainerLow,
  },
  optionTextGroup: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionTitle: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  optionTitleActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  optionSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 15,
  },
  badgePill: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  badgePillText: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioCircleInactive: {
    borderColor: 'rgba(197, 197, 211, 0.8)',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
});
