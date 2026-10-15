import AsyncStorage from '@react-native-async-storage/async-storage';
import { IAttendanceRepository } from '../../domain/repositories/interfaces';
import { Attendance, AuditLog, ASNUnitMember } from '../../domain/entities/types';
import { MOCK_ATTENDANCES, MOCK_AUDIT_LOGS, MOCK_UNIT_MEMBERS } from '../datasources/mockData';
import { attendanceApi, ApiAttendanceDto, AttendancePortalDto } from '../datasources/attendanceApi';
import { AttendancePage, AttendanceRecord } from '../../domain/entities/types';

const toRecord = (dto: ApiAttendanceDto): AttendanceRecord => ({
  id: String(dto.id), agendaId: String(dto.agenda_id), userId: String(dto.user_id),
  signedAt: dto.signed_at, selfieUrl: dto.selfie_url, signatureUrl: dto.signature_url,
  ipAddress: dto.ip_address, userAgent: dto.user_agent, userName: dto.user?.name ?? null,
  userNip: dto.user?.nip ?? null, unitName: dto.user?.unit?.nama_unit ?? null,
});

const ATTENDANCE_STORAGE_KEY = '@siperapat_attendance_records';
const AUDIT_STORAGE_KEY = '@siperapat_audit_logs';

export class AttendanceRepositoryImpl implements IAttendanceRepository {
  async getPortal(agendaId: string): Promise<AttendancePortalDto> {
    const response = await attendanceApi.portal(agendaId);
    if (!response.success) throw new Error(response.message || 'Gagal memuat portal presensi.');
    return response.data;
  }

  async getMyHistory(page = 1): Promise<AttendancePage> {
    const response = await attendanceApi.myHistory(page);
    if (!response.success) throw new Error(response.message || 'Gagal memuat riwayat presensi.');
    return { records: response.data.map(toRecord), currentPage: response.meta.current_page, lastPage: response.meta.last_page, total: response.meta.total };
  }

  async getAgendaAttendances(agendaId: string, page = 1): Promise<AttendancePage> {
    const response = await attendanceApi.agendaAttendances(agendaId, page);
    if (!response.success) throw new Error(response.message || 'Gagal memuat daftar kehadiran.');
    return { records: response.data.map(toRecord), currentPage: response.meta.current_page, lastPage: response.meta.last_page, total: response.meta.total };
  }

  async submitApiAttendance(agendaId: string, payload: { selfie_data: string; signature_data: string }): Promise<AttendanceRecord> {
    const response = await attendanceApi.submit(agendaId, payload);
    if (!response.success) throw new Error(response.message || 'Gagal mengirim presensi.');
    return toRecord(response.data);
  }
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

  async getUnitMembers(unitKerja?: string): Promise<ASNUnitMember[]> {
    if (!unitKerja || unitKerja === 'Semua') {
      return MOCK_UNIT_MEMBERS;
    }
    return MOCK_UNIT_MEMBERS.filter((m) => m.unitKerja.includes(unitKerja));
  }
}
