import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors } from '../../core/theme/colors';
import { spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { PerforatedTicket } from '../components/receipt/PerforatedTicket';
import { ErrorState } from '../components/common/ErrorState';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { Attendance } from '../../domain/entities/types';

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
  const [receipt, setReceipt] = useState<Attendance | null>(lastReceipt);

  useEffect(() => {
    if (!receipt) {
      fetchReceipt(attendanceId).then((res) => {
        if (res) setReceipt(res);
      });
    }
  }, [attendanceId, fetchReceipt, receipt]);

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
          <PerforatedTicket
            attendance={receipt}
            onViewAgendaDetail={
              onViewAgendaDetail
                ? () => onViewAgendaDetail(receipt.meetingId)
                : onDone
            }
          />
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
    paddingBottom: spacing.xl,
  },
});
