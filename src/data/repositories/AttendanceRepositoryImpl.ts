import AsyncStorage from '@react-native-async-storage/async-storage';
import { IAttendanceRepository } from '../../domain/repositories/interfaces';
import { Attendance, AuditLog, ASNUnitMember } from '../../domain/entities/types';
import { MOCK_AUDIT_LOGS, MOCK_UNIT_MEMBERS } from '../datasources/mockData';
import { attendanceApi } from '../datasources/attendanceApi';
import { ApiAttendanceDto } from '../datasources/apiTypes';
import { toMeeting } from '../mappers/apiMappers';

function toAttendance(dto: ApiAttendanceDto): Attendance {
  return {
    id: String(dto.id), meetingId: String(dto.agenda_id), agendaId: String(dto.agenda_id),
    meetingTitle: `Agenda #${dto.agenda_id}`, asnNip: dto.user?.nip ?? '', asnName: dto.user?.name ?? '',
    asnJabatan: dto.user?.role?.label ?? '', asnUnitKerja: dto.user?.unit?.nama_unit ?? '', timestamp: dto.signed_at ?? '',
    selfieUri: dto.selfie_url ?? undefined, signatureSvg: undefined, verificationToken: '', ipAddress: dto.ip_address ?? '',
    deviceInfo: dto.user_agent ?? '', latitude: undefined, longitude: undefined, distanceMeters: undefined,
    status: 'tercatat', isSynced: true, selfieUrl: dto.selfie_url, signatureUrl: dto.signature_url, userId: String(dto.user_id),
  };
}

const AUDIT_STORAGE_KEY = '@siperapat_audit_logs';

export class AttendanceRepositoryImpl implements IAttendanceRepository {
  async getAttendancePortal(agendaId: string) {
    const response = await attendanceApi.portal(agendaId);
    if (!response.success) throw new Error(response.message || 'Gagal memuat portal presensi.');
    const value = response.data;
    return { agenda: toMeeting(value.agenda), isOngoing: value.is_ongoing, isEligible: value.is_eligible, hasAttended: value.has_attended, attendance: value.my_attendance ? toAttendance(value.my_attendance) : null };
  }

  async submitAttendance(agendaId: string, payload: { selfie_data?: string; signature_data?: string }): Promise<Attendance> {
    const response = await attendanceApi.submit(agendaId, payload);
    if (!response.success) throw new Error(response.message || 'Gagal mengirim presensi.');
    return toAttendance(response.data);
  }

  async getAttendanceHistory(page = 1, perPage = 15) {
    const response = await attendanceApi.myHistory(page, perPage);
    if (!response.success) throw new Error(response.message || 'Gagal memuat riwayat presensi.');
    return { records: response.data.map(toAttendance), currentPage: response.meta.current_page, lastPage: response.meta.last_page, total: response.meta.total };
  }

  async getAgendaAttendances(agendaId: string, page = 1, perPage = 50) {
    const response = await attendanceApi.agendaAttendances(agendaId, page, perPage);
    if (!response.success) throw new Error(response.message || 'Gagal memuat kehadiran agenda.');
    return { records: response.data.map(toAttendance), currentPage: response.meta.current_page, lastPage: response.meta.last_page, total: response.meta.total };
  }
  async getAttendanceReceipt(attendanceId: string): Promise<Attendance | null> {
    let page = 1;
    let lastPage = 1;
    do {
      const result = await this.getAttendanceHistory(page);
      const found = result.records.find((record) => record.id === attendanceId);
      if (found) return found;
      lastPage = result.lastPage;
      page += 1;
    } while (page <= lastPage);
    return null;
  }

  async getOfflineQueue(): Promise<Attendance[]> {
    return [];
  }

  async syncOfflineQueue(): Promise<number> {
    return 0;
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
