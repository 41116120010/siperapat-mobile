/**
 * Domain Entities for SIPERAPAT LLDIKTI X
 * Strict TypeScript types representing official Civil Servant & Meeting Presensi entities.
 */

export interface ASN {
  id: string;
  nip: string; // 18 Digits
  name: string;
  pangkatGolongan?: string;
  jabatan?: string;
  unitKerja?: string;
  unitId?: number | null;
  email: string;
  phone: string;
  avatarUrl?: string;
  username?: string;
  role?: string;
  roleLabel?: string;
  biometricEnabled: boolean;
  createdAt?: string | null;
  attendanceStats?: { totalAgendas?: number; totalAttended?: number; attendanceRateLabel?: string; onTimeRateLabel?: string; periodLabel?: string };
  security?: { last_password_changed_at?: string | null; last_password_changed_label?: string | null };
}

export type MeetingStatus = 'draft' | 'ongoing' | 'upcoming' | 'completed' | 'cancelled';
export type MeetingType = 'hybrid' | 'offline' | 'online';

export interface MeetingPermissions {
  can_update: boolean;
  can_delete: boolean;
  can_manage_status: boolean;
  can_manage_minutes: boolean;
  can_manage_circular: boolean;
  can_manage_participants?: boolean;
  can_attend: boolean;
  can_export: boolean;
}

export interface Meeting {
  id: string;
  code: string;
  title: string;
  type: MeetingType;
  leader: string;
  leaderId?: number | null;
  notulis?: string;
  notulisId?: number | null;
  date: string;
  endDate?: string | null;
  startTime: string;
  endTime: string;
  venue: string;
  venueId?: string | null;
  status: MeetingStatus;
  rawStatus?: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  classification?: string;
  isAllUnits?: boolean;
  targetType?: 'all_units' | 'selected_units' | 'selected_users';
  unitIds?: number[];
  unitsList?: Array<{ id: number; nama_unit: string; kode_unit: string }>;
  creatorId?: number | null;
  creatorUnitId?: number | null;
  geofenceRadiusMeters?: number;
  latitude?: number;
  longitude?: number;
  agendaDescription: string;
  targetAudience: string;
  zoomUrl?: string;
  invitationPdfUrl?: string;
  suratEdaran?: {
    url: string | null;
    extension?: string | null;
    is_pdf?: boolean;
    is_image?: boolean;
  };
  totalInvited?: number;
  totalAttended: number;
  hasAttended?: boolean;
  myAttendanceId?: string | null;
  permissions?: MeetingPermissions | null;
  baNumber?: string | null;
  minutesHtml?: string | null;
  summaryHtml?: string | null;
  invitedUsers?: UserOption[];
}

export type AttendanceStatus = 'sah' | 'terlambat' | 'izin' | 'ditolak' | 'tercatat' | 'belum_hadir';

/** Canonical agenda user-candidate entity (from GET /users/candidates). */
export interface UserOption {
  id: string;
  nip?: string;
  name: string;
  role?: string;
  roleLabel?: string;
  unit?: string;
}

export interface Attendance {
  id: string;
  meetingId: string;
  agendaId?: string;
  meetingTitle: string;
  meetingType?: MeetingType;
  meetingLocation?: string | null;
  meetingFormat?: string | null;
  baNumber?: string | null;
  institutionalHeader?: { kementerian: string; instansi: string; alamat: string };
  asnNip: string;
  asnName: string;
  asnJabatan: string;
  asnUnitKerja: string;
  timestamp: string;
  selfieUri?: string;
  signatureSvg?: string;
  verificationToken: string;
  ipAddress: string;
  deviceInfo: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  selfieUrl?: string | null;
  signatureUrl?: string | null;
  canViewBiometrics?: boolean;
  hasSelfie?: boolean;
  hasSignature?: boolean;
  userId?: string;
  validationStatus?: string;
  validationStatusLabel?: string;
  verificationMethod?: string;
  meetingSchedule?: string | null;
  status: AttendanceStatus;
  isSynced: boolean; // Durability: false when submitted offline, true when synced to central server
}

/** Attendance fields returned by the Laravel API; deliberately contains no inferred status/GPS/receipt token. */
export interface AttendanceRecord {
  id: string;
  agendaId: string;
  userId: string;
  signedAt: string | null;
  selfieUrl: string | null;
  signatureUrl: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  userName?: string | null;
  userNip?: string | null;
  unitName?: string | null;
}

export interface AttendancePage {
  records: AttendanceRecord[];
  currentPage: number;
  lastPage: number;
  total: number;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  nip: string;
  userName: string;
  action: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  ipAddress: string;
  details: string;
}

export interface ASNUnitMember {
  id: string;
  nip: string;
  name: string;
  jabatan: string;
  unitKerja: string;
  pangkatGolongan: string;
  statusPresensiTerakhir: 'Hadir' | 'Tugas Luar' | 'Belum Presensi';
}

export interface CreateEmployeeInput {
  name: string;
  nip: string;
  username: string;
  email: string;
  password: string;
  role: 'Administrator' | 'Admin Unit' | 'Staff';
  status: 'Aktif' | 'Nonaktif';
  phone?: string | null;
  jabatan?: string | null;
  pangkatGolongan?: string | null;
  unitId?: number | null;
  unit?: string;
}

export interface Employee {
  id: string;
  initials: string;
  name: string;
  nip: string; // 18 Digits
  role: 'Administrator' | 'Admin Unit' | 'Staff';
  unit: string;
  unitId?: number | null;
  status: 'Aktif' | 'Nonaktif';
  username: string;
  email: string;
  phone: string;
  jabatan: string;
  pangkatGolongan: string;
  lastLogin?: string;
  attendanceRate?: string;
  totalMeetings?: number;
  regDate?: string;
}
