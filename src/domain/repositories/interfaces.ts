import { ASN, Meeting, Attendance, CreateEmployeeInput, Employee, UserOption } from '../entities/types';
import { AgendaFilters, CreateAgendaDto, UpdateAgendaDto, UpdateMinutesDto, UploadFileRef } from '../../data/datasources/agendaApi';
import { ApiAgendaAttendanceSummary, ApiAttendanceDto, ApiAttendanceHistorySummary, ApiDashboardDto, ApiUnitDto, ApiUserDto } from '../../data/datasources/apiTypes';

export interface IAuthRepository {
  loginWithNIP(identifier: string, password: string, remember?: boolean): Promise<ASN>;
  loginWithBiometrics(): Promise<ASN>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<ASN | null>;
  updateBiometricsSetting(enabled: boolean): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<boolean>;
  updateProfile(payload: { phone?: string; name?: string; email?: string }): Promise<ASN>;
  forgotPassword(identity: string): Promise<{ success: boolean; message: string; maskedEmail?: string }>;
}

export interface IMeetingRepository {
  getDashboard(): Promise<{ stats: ApiDashboardDto['stats']; agendas: Meeting[] }>;
  getMeetings(page?: number, filters?: AgendaFilters): Promise<{ meetings: Meeting[]; currentPage: number; lastPage: number; total: number }>;
  getMeetingById(id: string): Promise<Meeting | null>;
  createMeeting(meeting: CreateAgendaDto, suratEdaran?: UploadFileRef): Promise<Meeting>;
  updateMeeting(id: string, meeting: UpdateAgendaDto, suratEdaran?: UploadFileRef): Promise<Meeting>;
  deleteMeeting(id: string): Promise<boolean>;
  updateMinutes(id: string, minutes: UpdateMinutesDto): Promise<Meeting>;
  uploadSuratEdaran(id: string, suratEdaran: UploadFileRef, meetingContext?: UpdateAgendaDto): Promise<Meeting>;
  getAgendaFormOptions(): Promise<{ users: ApiUserDto[]; units: ApiUnitDto[] }>;
  getUserCandidates(filters?: { search?: string; unitId?: number }): Promise<{ users: UserOption[]; total: number }>;
}

export interface IAttendanceRepository {
  getAttendancePortal(agendaId: string): Promise<{ agenda: Meeting; isOngoing: boolean; isEligible: boolean; hasAttended: boolean; attendance: Attendance | null }>;
  submitAttendance(agendaId: string, payload: { selfie_data?: string; signature_data?: string }): Promise<Attendance>;
  getAttendanceHistory(page?: number, perPage?: number, filters?: { search?: string; period?: string; tipeRapat?: string }): Promise<{ records: Attendance[]; currentPage: number; lastPage: number; total: number; summary: ApiAttendanceHistorySummary }>;
  getAgendaAttendances(agendaId: string, page?: number, perPage?: number, filters?: { status?: 'attended' | 'unattended'; search?: string }): Promise<{ records: Attendance[]; currentPage: number; lastPage: number; total: number; summary: ApiAgendaAttendanceSummary }>;
  getAttendanceReceipt(attendanceId: string): Promise<Attendance | null>;
  getOfflineQueue(): Promise<Attendance[]>;
  syncOfflineQueue(): Promise<number>;
}

export interface IEmployeeRepository {
  getEmployees(): Promise<Employee[]>;
  getEmployeePage(page?: number, filters?: { search?: string; role?: string; status?: string; unitId?: number }): Promise<{ employees: Employee[]; currentPage: number; lastPage: number; total: number }>;
  getUnits(page?: number): Promise<{ units: ApiUnitDto[]; currentPage: number; lastPage: number; total: number }>;
  getEmployeeById(id: string): Promise<Employee | null>;
  createEmployee(employee: CreateEmployeeInput): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<Employee>): Promise<Employee>;
  deleteEmployee(id: string): Promise<boolean>;
  toggleEmployeeStatus(id: string): Promise<Employee>;
  createUnit(unit: { kode_unit: string; nama_unit: string; deskripsi?: string | null; is_active?: boolean }): Promise<ApiUnitDto>;
  updateUnit(id: number | string, unit: { kode_unit?: string; nama_unit?: string; deskripsi?: string | null; is_active?: boolean }): Promise<ApiUnitDto>;
  deleteUnit(id: number | string): Promise<boolean>;
  getUnitById(id: number | string): Promise<ApiUnitDto | null>;
}
