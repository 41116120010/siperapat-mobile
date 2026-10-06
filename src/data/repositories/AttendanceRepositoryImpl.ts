import AsyncStorage from '@react-native-async-storage/async-storage';
import { IAttendanceRepository } from '../../domain/repositories/interfaces';
import { Attendance, AuditLog, ASNUnitMember } from '../../domain/entities/types';
import { MOCK_ATTENDANCES, MOCK_AUDIT_LOGS, MOCK_UNIT_MEMBERS } from '../datasources/mockData';

const ATTENDANCE_STORAGE_KEY = '@siperapat_attendance_records';
const AUDIT_STORAGE_KEY = '@siperapat_audit_logs';

export class AttendanceRepositoryImpl implements IAttendanceRepository {
  private async loadOrSeedAttendances(): Promise<Attendance[]> {
    try {
      const stored = await AsyncStorage.getItem(ATTENDANCE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as Attendance[];
      }
    } catch {
      // Fallback
    }
    await AsyncStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(MOCK_ATTENDANCES));
    return MOCK_ATTENDANCES;
  }

  async submitAttendance(
    data: Omit<Attendance, 'id' | 'verificationToken' | 'timestamp' | 'isSynced'>
  ): Promise<Attendance> {
    const list = await this.loadOrSeedAttendances();
    const tokenSuffix = Math.floor(1000 + Math.random() * 9000);
    const verificationToken = `LLD10-PRES-2026-${tokenSuffix}`;
    const timestamp = new Date().toISOString();

    const newRecord: Attendance = {
      ...data,
      id: `att-${Date.now()}`,
      verificationToken,
      timestamp,
      isSynced: true, // Mark synced or queued
    };

    const updated = [newRecord, ...list];
    await AsyncStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(updated));

    // Also record into audit log
    await this.recordAuditLog({
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('id-ID'),
      nip: data.asnNip,
      userName: data.asnName,
      action: 'SUBMIT_PRESENSI_SAH',
      status: 'SUCCESS',
      ipAddress: data.ipAddress,
      details: `Presensi ${data.meetingTitle} disahkan (Token: ${verificationToken}, Jarak: ${data.distanceMeters}m).`,
    });

    return newRecord;
  }

  async getAttendanceHistory(nip: string): Promise<Attendance[]> {
    const list = await this.loadOrSeedAttendances();
    return list.filter((a) => a.asnNip === nip || !nip);
  }

  async getAttendanceReceipt(attendanceId: string): Promise<Attendance | null> {
    const list = await this.loadOrSeedAttendances();
    return list.find((a) => a.id === attendanceId) ?? null;
  }

  async getOfflineQueue(): Promise<Attendance[]> {
    const list = await this.loadOrSeedAttendances();
    return list.filter((a) => !a.isSynced);
  }

  async syncOfflineQueue(): Promise<number> {
    const list = await this.loadOrSeedAttendances();
    let syncedCount = 0;
    const updated = list.map((item) => {
      if (!item.isSynced) {
        syncedCount += 1;
        return { ...item, isSynced: true };
      }
      return item;
    });
    if (syncedCount > 0) {
      await AsyncStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(updated));
    }
    return syncedCount;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const stored = await AsyncStorage.getItem(AUDIT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as AuditLog[];
      }
    } catch {
      // Fallback
    }
    await AsyncStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(MOCK_AUDIT_LOGS));
    return MOCK_AUDIT_LOGS;
  }

  private async recordAuditLog(log: AuditLog): Promise<void> {
    try {
      const logs = await this.getAuditLogs();
      const updated = [log, ...logs];
      await AsyncStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Fail-safe
    }
  }

  async getUnitMembers(unitKerja?: string): Promise<ASNUnitMember[]> {
    if (!unitKerja || unitKerja === 'Semua') {
      return MOCK_UNIT_MEMBERS;
    }
    return MOCK_UNIT_MEMBERS.filter((m) => m.unitKerja.includes(unitKerja));
  }
}
