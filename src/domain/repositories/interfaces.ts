import { ASN, Meeting, Attendance, AuditLog, ASNUnitMember, Employee } from '../entities/types';
import { AgendaFilters, CreateAgendaDto, UploadFileRef } from '../../data/datasources/agendaApi';
import { ApiAttendanceDto, ApiDashboardDto, ApiUnitDto, ApiUserDto } from '../../data/datasources/apiTypes';

export interface IAuthRepository {
  loginWithNIP(identifier: string, password: string, remember?: boolean): Promise<ASN>;
  loginWithBiometrics(): Promise<ASN>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<ASN | null>;
  updateBiometricsSetting(enabled: boolean): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<boolean>;
}

export interface IMeetingRepository {
  getDashboard(): Promise<{ stats: ApiDashboardDto['stats']; agendas: Meeting[] }>;
  getMeetings(page?: number, filters?: AgendaFilters): Promise<{ meetings: Meeting[]; currentPage: number; lastPage: number; total: number }>;
  getMeetingById(id: string): Promise<Meeting | null>;
  createMeeting(meeting: CreateAgendaDto, suratEdaran?: UploadFileRef): Promise<Meeting>;
  getAgendaFormOptions(): Promise<{ users: ApiUserDto[]; units: ApiUnitDto[] }>;
}

export interface IAttendanceRepository {
  getAttendancePortal(agendaId: string): Promise<{ agenda: Meeting; isOngoing: boolean; isEligible: boolean; hasAttended: boolean; attendance: Attendance | null }>;
  submitAttendance(agendaId: string, payload: { selfie_data?: string; signature_data?: string }): Promise<Attendance>;
  getAttendanceHistory(page?: number, perPage?: number): Promise<{ records: Attendance[]; currentPage: number; lastPage: number; total: number }>;
  getAgendaAttendances(agendaId: string, page?: number, perPage?: number): Promise<{ records: Attendance[]; currentPage: number; lastPage: number; total: number }>;
  getAttendanceReceipt(attendanceId: string): Promise<Attendance | null>;
  getOfflineQueue(): Promise<Attendance[]>;
  syncOfflineQueue(): Promise<number>;
  getAuditLogs(): Promise<AuditLog[]>;
  getUnitMembers(unitKerja?: string): Promise<ASNUnitMember[]>;
}

export interface IEmployeeRepository {
  getEmployees(): Promise<Employee[]>;
  getEmployeeById(id: string): Promise<Employee | null>;
  createEmployee(employee: Omit<Employee, 'id' | 'initials'>): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee>;
  deleteEmployee(id: string): Promise<boolean>;
}
