import { ASN, Meeting, Attendance, AuditLog, ASNUnitMember, Employee } from '../entities/types';

export interface IAuthRepository {
  loginWithNIP(nip: string, password: string): Promise<ASN>;
  loginWithBiometrics(): Promise<ASN>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<ASN | null>;
  updateBiometricsSetting(enabled: boolean): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<boolean>;
}

export interface IMeetingRepository {
  getMeetings(page?: number, type?: 'hybrid' | 'offline' | 'online'): Promise<{ meetings: Meeting[]; currentPage: number; lastPage: number; total: number }>;
  getMeetingById(id: string): Promise<Meeting | null>;
  createMeeting(agenda: CreateAgendaInput): Promise<Meeting>;
  getAgendaFormOptions(): Promise<AgendaFormOptions>;
}

export interface CreateAgendaInput {
  judul_rapat: string;
  jenis_rapat: string;
  tipe_rapat: 'hybrid' | 'offline' | 'online';
  lokasi_ruang?: string | null;
  link_meeting?: string | null;
  waktu_mulai: string;
  waktu_selesai?: string | null;
  pimpinan_id?: number | null;
  notulis_id?: number | null;
  is_all_units: boolean;
  unit_ids?: number[];
  status?: 'draft' | 'scheduled';
}

export interface AgendaFormOptions {
  users: Array<{ id: string; name: string; nip: string | null; role: string; unitName: string }>;
  units: Array<{ id: string; name: string }>;
}

export interface IAttendanceRepository {
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
