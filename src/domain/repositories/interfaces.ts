import { ASN, Meeting, Attendance, AuditLog, ASNUnitMember } from '../entities/types';

export interface IAuthRepository {
  loginWithNIP(nip: string, password: string): Promise<ASN>;
  loginWithBiometrics(): Promise<ASN>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<ASN | null>;
  updateBiometricsSetting(enabled: boolean): Promise<void>;
}

export interface IMeetingRepository {
  getMeetings(): Promise<Meeting[]>;
  getMeetingById(id: string): Promise<Meeting | null>;
  createMeeting(meeting: Omit<Meeting, 'id' | 'totalAttended'>): Promise<Meeting>;
  getUpcomingMeetings(): Promise<Meeting[]>;
  getActiveMeeting(): Promise<Meeting | null>;
}

export interface IAttendanceRepository {
  submitAttendance(attendance: Omit<Attendance, 'id' | 'verificationToken' | 'timestamp' | 'isSynced'>): Promise<Attendance>;
  getAttendanceHistory(nip: string): Promise<Attendance[]>;
  getAttendanceReceipt(attendanceId: string): Promise<Attendance | null>;
  getOfflineQueue(): Promise<Attendance[]>;
  syncOfflineQueue(): Promise<number>;
  getAuditLogs(): Promise<AuditLog[]>;
  getUnitMembers(unitKerja?: string): Promise<ASNUnitMember[]>;
}
