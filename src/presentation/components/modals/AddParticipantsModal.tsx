import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CheckSquare, Search, Square, UserPlus, X } from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { fontFamilies, typography } from '../../../core/theme/typography';
import { Meeting } from '../../../domain/entities/types';
import { useFeedbackStore } from '../../store/useFeedbackStore';
import { useMeetingStore } from '../../store/useMeetingStore';
import { AutoScrollText } from '../common/AutoScrollText';
import { Button } from '../common/Button';
import { TutWuriLoader } from '../common/TutWuriLoader';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface AddParticipantsModalProps {
  visible: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  onAdded?: (updated: Meeting) => void;
}

export const AddParticipantsModal: React.FC<AddParticipantsModalProps> = ({
  visible,
  onClose,
  meeting,
  onAdded,
}) => {
  const {
    userCandidates,
    isUserCandidatesLoading,
    userCandidatesError,
    fetchUserCandidates,
    addParticipants,
  } = useMeetingStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const alreadyInvitedIds = useMemo(() => {
    const set = new Set<string>();
    (meeting?.invitedUsers ?? []).forEach((u) => {
      if (u.id !== undefined && u.id !== null) {
        set.add(String(u.id));
      }
    });
    return set;
  }, [meeting?.invitedUsers]);

  useEffect(() => {
    if (!visible || !meeting?.id) return;
    setSearchQuery('');
    setSelectedIds([]);
    void fetchUserCandidates({ agendaId: meeting.id });
  }, [visible, meeting?.id, fetchUserCandidates]);

  useEffect(() => {
    if (!visible || !meeting?.id) return;
    const trimmed = searchQuery.trim();
    const timer = setTimeout(() => {
      void fetchUserCandidates({
        agendaId: meeting.id,
        search: trimmed || undefined,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [visible, meeting?.id, searchQuery, fetchUserCandidates]);

  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return userCandidates;
    return userCandidates.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.nip ?? '').toLowerCase().includes(q) ||
        (u.unit ?? '').toLowerCase().includes(q),
    );
  }, [userCandidates, searchQuery]);

  const toggleCandidate = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleConfirm = async () => {
    if (!meeting?.id || selectedIds.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const updated = await addParticipants(meeting.id, selectedIds);
      if (updated) {
        useFeedbackStore.getState().showToast({
          type: 'success',
          message: `${selectedIds.length} peserta ASN susulan berhasil ditambahkan.`,
        });
        onAdded?.(updated);
        onClose();
      } else {
        const errMsg = useMeetingStore.getState().error;
        useFeedbackStore.getState().showToast({
          type: 'error',
          message: errMsg || 'Gagal menambahkan peserta ASN susulan.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <UserPlus size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>Tambah Peserta ASN Susulan</Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  Undang ASN tambahan agar berhak mengisi presensi
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Tutup modal tambah peserta"
            >
              <X size={18} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <View style={styles.searchBox}>
              <Search size={15} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Cari nama, NIP, atau unit kerja ASN..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  style={styles.clearBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Bersihkan pencarian"
                >
                  <X size={15} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Kandidat Pegawai ASN Aktif</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{selectedIds.length} dipilih</Text>
              </View>
            </View>

            {isUserCandidatesLoading && filteredCandidates.length === 0 ? (
              <View style={styles.stateBox}>
                <TutWuriLoader size="md" />
                <Text style={styles.stateText}>Memuat daftar pegawai ASN...</Text>
              </View>
            ) : userCandidatesError && filteredCandidates.length === 0 ? (
              <View style={styles.stateBox}>
                <Text style={styles.errorText}>{userCandidatesError}</Text>
                <Pressable
                  onPress={() =>
                    meeting?.id && void fetchUserCandidates({ agendaId: meeting.id })
                  }
                  style={styles.retryBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.retryBtnText}>Muat Ulang</Text>
                </Pressable>
              </View>
            ) : filteredCandidates.length === 0 ? (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>Tidak ada kandidat ASN yang cocok.</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.listScroll}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {filteredCandidates.map((candidate) => {
                  const idStr = String(candidate.id);
                  const numericId = Number(candidate.id);
                  const isAlreadyInvited = alreadyInvitedIds.has(idStr);
                  const isChecked = isAlreadyInvited || selectedIds.includes(numericId);
                  return (
                    <Pressable
                      key={idStr}
                      disabled={isAlreadyInvited || !Number.isFinite(numericId)}
                      onPress={() => toggleCandidate(numericId)}
                      style={({ pressed }) => [
                        styles.candidateRow,
                        isChecked && !isAlreadyInvited && styles.candidateRowSelected,
                        isAlreadyInvited && styles.candidateRowDisabled,
                        pressed && !isAlreadyInvited && styles.pressed,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isChecked, disabled: isAlreadyInvited }}
                    >
                      {isChecked ? (
                        <CheckSquare
                          size={18}
                          color={isAlreadyInvited ? colors.textMuted : colors.primary}
                          strokeWidth={2}
                        />
                      ) : (
                        <Square size={18} color={colors.textMuted} strokeWidth={2} />
                      )}
                      <View style={styles.candidateInfo}>
                        <AutoScrollText style={styles.candidateName}>
                          {candidate.name}
                        </AutoScrollText>
                        <AutoScrollText style={styles.candidateSub}>
                          NIP: {candidate.nip || '-'}
                          {candidate.unit ? ` • ${candidate.unit}` : ''}
                        </AutoScrollText>
                      </View>
                      {isAlreadyInvited ? (
                        <View style={styles.invitedBadge}>
                          <Text style={styles.invitedBadgeText}>Diundang</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.footer}>
            <Button
              title="Batal"
              variant="outline"
              size="md"
              onPress={onClose}
              style={styles.flexOne}
            />
            <Button
              title={isSubmitting ? 'Menyimpan...' : `Tambahkan (${selectedIds.length})`}
              variant="primary"
              size="md"
              disabled={selectedIds.length === 0 || isSubmitting}
              isLoading={isSubmitting}
              onPress={() => void handleConfirm()}
              style={styles.flexTwo}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrimNeutralTop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    ...cardSurface,
    width: Math.min(SCREEN_WIDTH - spacing.md * 2, 460),
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderRadius: rounded.xl,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  headerSub: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textSecondary,
  },
  closeBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSoft,
    gap: spacing.xs + 2,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurface,
    paddingVertical: spacing.xs,
  },
  clearBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  metaLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.textSecondary,
  },
  countPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  countPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
    fontSize: 11,
  },
  listScroll: {
    maxHeight: SCREEN_HEIGHT * 0.42,
  },
  listContent: {
    gap: spacing.xs + 2,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceCard,
  },
  candidateRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  candidateRowDisabled: {
    opacity: 0.72,
    backgroundColor: colors.surfaceSoft,
  },
  candidateInfo: {
    flex: 1,
    minWidth: 0,
  },
  candidateName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12.5,
    color: colors.onSurface,
  },
  candidateSub: {
    ...typography.labelMono,
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  invitedBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  invitedBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 10,
    color: colors.onSuccessContainer,
  },
  stateBox: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  stateText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: spacing.md,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surfaceSoft,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  flexOne: { flex: 1 },
  flexTwo: { flex: 1.4 },
});
