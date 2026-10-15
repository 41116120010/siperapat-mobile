/**
 * Domain Entities for SIPERAPAT LLDIKTI X
 * Strict TypeScript types representing official Civil Servant & Meeting Presensi entities.
 */

export interface ASN {
  id: string;
  nip: string; // 18 Digits
  name: string;
  pangkatGolongan: string;
  jabatan: string;
  unitKerja: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  username?: string;
  biometricEnabled: boolean;
}

export type MeetingStatus = 'draft' | 'ongoing' | 'upcoming' | 'completed' | 'cancelled';
export type MeetingType = 'hybrid' | 'offline' | 'online';

export interface Meeting {
  id: string;
  code: string;
  title: string;
  type: MeetingType;
  leader: string;
  notulis?: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  status: MeetingStatus;
  geofenceRadiusMeters?: number;
  latitude?: number;
  longitude?: number;
  agendaDescription: string;
  targetAudience: string;
  zoomUrl?: string;
  invitationPdfUrl?: string;
  totalInvited?: number;
  totalAttended: number;
  minutesHtml?: string | null;
  summaryHtml?: string | null;
}

export type AttendanceStatus = 'sah' | 'terlambat' | 'izin' | 'ditolak' | 'tercatat';

export interface Attendance {
  id: string;
  meetingId: string;
  agendaId?: string;
  meetingTitle: string;
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
  userId?: string;
  status: AttendanceStatus;
  isSynced: boolean; // Durability: false when submitted offline, true when synced to central server
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

export interface Employee {
  id: string;
  initials: string;
  name: string;
  nip: string; // 18 Digits
  role: 'Administrator' | 'Admin Unit' | 'Staff';
  unit: string;
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
