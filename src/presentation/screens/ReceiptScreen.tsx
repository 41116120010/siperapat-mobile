import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Text,
  Share,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { spacing, rounded } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { PerforatedTicket } from '../components/receipt/PerforatedTicket';
import { ErrorState } from '../components/common/ErrorState';
import { Button } from '../components/common/Button';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { Attendance } from '../../domain/entities/types';
import { formatTanggalIndonesia, formatWaktuWIB } from '../../core/utils/dateFormatter';

interface ReceiptScreenProps {
  attendanceId: string;
  onBack: () => void;
  onDone: () => void;
  onViewAgendaDetail?: (meetingId?: string) => void;
}

export const ReceiptScreen: React.FC<ReceiptScreenProps> = ({
  attendanceId,
  onBack,
  onDone,
  onViewAgendaDetail,
}) => {
  const { lastReceipt, fetchReceipt } = useAttendanceStore();
  const [receipt, setReceipt] = useState<Attendance | null>(
    lastReceipt?.id === attendanceId ? lastReceipt : null
  );
  const [isLoadingReceipt, setIsLoadingReceipt] = useState<boolean>(
    !receipt || !receipt.verificationToken
  );

  const loadOfficialReceipt = useCallback(async () => {
    setIsLoadingReceipt(true);
    try {
      const result = await fetchReceipt(attendanceId);
      if (result) {
        setReceipt(result);
      }
    } finally {
      setIsLoadingReceipt(false);
    }
  }, [attendanceId, fetchReceipt]);

  useEffect(() => {
    void loadOfficialReceipt();
  }, [loadOfficialReceipt]);

  const handleShareReceipt = async () => {
    if (!receipt) return;
    try {
      const shareMessage = [
        'TANDA TERIMA PRESENSI KEDINASAN LLDIKTI WILAYAH X',
        '================================================',
        `No. Bukti  : ${receipt.verificationToken || `SIP-${receipt.id.padStart(6, '0')}`}`,
        `Agenda     : ${receipt.meetingTitle}`,
        `Peserta    : ${receipt.asnName} (NIP ${receipt.asnNip})`,
        `Unit Kerja : ${receipt.asnUnitKerja || 'LLDIKTI Wilayah X'}`,
        `Waktu Sah  : ${formatTanggalIndonesia(receipt.timestamp)} ${formatWaktuWIB(receipt.timestamp)}`,
        `Status     : ${receipt.validationStatusLabel || 'Hadir Sah Terverifikasi'}`,
        `Metode     : ${receipt.verificationMethod || 'Swafoto & TTD Digital'}`,
        ...(receipt.ipAddress ? [`Alamat IP  : ${receipt.ipAddress}`] : []),
        '================================================',
        'Sistem Presensi Rapat Kedinasan (SIPERAPAT LLDIKTI X)',
      ].join('\n');

      await Share.share({
        title: `Tanda Terima Presensi - ${receipt.verificationToken || receipt.meetingTitle}`,
        message: shareMessage,
      });
    } catch {
      // User cancelled or share dismissed
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Tanda Terima Presensi"
        subtitle={receipt?.meetingTitle ?? 'Bukti Kehadiran Resmi Kedinasan'}
        showBack
        onBack={onBack}
        rightAction={
          receipt ? (
            <Pressable
              onPress={() => void handleShareReceipt()}
              style={({ pressed }) => [
                styles.shareHeaderBtn,
                pressed && styles.shareHeaderBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Bagikan Tanda Terima Presensi"
            >
              <MaterialIcons name="share" size={20} color={colors.primary} />
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {receipt ? (
          <>
            <PerforatedTicket
              attendance={receipt}
              onViewAgendaDetail={
                onViewAgendaDetail
                  ? () => onViewAgendaDetail(receipt.meetingId)
                  : onDone
              }
            />

            {/* Bottom Actions */}
            <View style={styles.actionSection}>
              <Button
                title="Bagikan Tanda Terima"
                variant="outline"
                onPress={() => void handleShareReceipt()}
                icon={<MaterialIcons name="share" size={18} color={colors.primary} />}
                fullWidth
                style={styles.actionButton}
              />
              <Button
                title="Selesai & Kembali"
                variant="primary"
                onPress={onDone}
                icon={<MaterialIcons name="check-circle" size={18} color="#FFFFFF" />}
                fullWidth
              />
            </View>
          </>
        ) : isLoadingReceipt ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Memuat Tanda Terima Resmi</Text>
            <Text style={styles.loadingSubtitle}>
              Menghubungkan ke server LLDIKTI Wilayah X...
            </Text>
          </View>
        ) : (
          <ErrorState
            title="Bukti Tidak Ditemukan"
            message="Data tanda terima presensi tidak dapat dimuat dari server."
            onRetry={() => void loadOfficialReceipt()}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  shareHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 35, 111, 0.15)',
  },
  shareHeaderBtnPressed: {
    backgroundColor: colors.surfaceContainer,
  },
  actionSection: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: 4,
  },
  loadingContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    ...typography.headlineSm,
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: spacing.md,
  },
  loadingSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
