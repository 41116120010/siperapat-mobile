import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing, elevations } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Button } from '../components/common/Button';
import { PerforatedTicket } from '../components/receipt/PerforatedTicket';
import { ErrorState } from '../components/common/ErrorState';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { Attendance } from '../../domain/entities/types';

interface ReceiptScreenProps {
  attendanceId: string;
  onBack: () => void;
  onDone: () => void;
  onViewAgendaDetail?: () => void;
}

export const ReceiptScreen: React.FC<ReceiptScreenProps> = ({
  attendanceId,
  onBack,
  onDone,
  onViewAgendaDetail,
}) => {
  const { lastReceipt, fetchReceipt } = useAttendanceStore();
  const [receipt, setReceipt] = useState<Attendance | null>(lastReceipt);

  useEffect(() => {
    if (!receipt) {
      fetchReceipt(attendanceId).then((res) => {
        if (res) setReceipt(res);
      });
    }
  }, [attendanceId, fetchReceipt, receipt]);

  const handleDownloadPdf = () => {
    Alert.alert(
      'Unduh Bukti PDF Resmi',
      `Dokumen bukti presensi sah (${receipt?.verificationToken || 'PRES-LLDIKTI-2026-X0914'}.pdf) berstempel elektronik telah diunduh ke penyimpanan kedinasan.`
    );
  };

  const handleShareToken = () => {
    Alert.alert(
      'Bagikan Dokumen Presensi',
      `Tautan verifikasi resmi portal LLDIKTI X untuk token ${receipt?.verificationToken || 'PRES-LLDIKTI-2026-X0914'} telah disalin ke papan klip.`
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Tanda Terima Presensi"
        subtitle={receipt?.meetingTitle ?? 'Bukti Kehadiran Resmi Kedinasan'}
        showBack
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {receipt ? (
          <>
            <PerforatedTicket
              attendance={receipt}
              onViewAgendaDetail={onViewAgendaDetail || onDone}
            />

            {/* Quick Info Legal Box */}
            <View style={styles.legalNoticeBox}>
              <MaterialIcons name="security" size={16} color={colors.primary} />
              <Text style={styles.legalNoticeText}>
                Presensi diverifikasi secara terpusat melalui NIP dan geofencing resmi LLDIKTI Wilayah X. Seluruh tanda tangan elektronik sah berdasarkan ketentuan UU ITE.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionColumn}>
              <Button
                title="Unduh Bukti PDF Resmi"
                onPress={handleDownloadPdf}
                variant="primary"
                size="lg"
                fullWidth
                icon={
                  <MaterialIcons
                    name="picture-as-pdf"
                    size={18}
                    color={colors.onPrimary}
                  />
                }
              />

              <Button
                title="Bagikan Dokumen Presensi"
                onPress={handleShareToken}
                variant="outline"
                size="md"
                fullWidth
                icon={
                  <MaterialIcons
                    name="share"
                    size={18}
                    color={colors.primary}
                  />
                }
              />

              <Button
                title="Kembali ke Beranda"
                onPress={onDone}
                variant="ghost"
                size="md"
                fullWidth
              />
            </View>
          </>
        ) : (
          <ErrorState
            title="Bukti Tidak Ditemukan"
            message="Data tanda terima presensi tidak dapat dimuat."
            onRetry={onBack}
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
    paddingBottom: spacing.xl * 2,
  },
  legalNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    marginBottom: spacing.md,
  },
  legalNoticeText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 16,
  },
  actionColumn: {
    gap: spacing.sm,
  },
});
