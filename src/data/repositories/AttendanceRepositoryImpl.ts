import { IAttendanceRepository } from '../../domain/repositories/interfaces';
import { Attendance } from '../../domain/entities/types';
import { attendanceApi } from '../datasources/attendanceApi';
import { ApiAgendaDto, ApiAttendanceDto } from '../datasources/apiTypes';
import { toMeeting } from '../mappers/apiMappers';
import { resolveAttendanceMediaUrl } from '../../core/utils/mediaUrl';

function toAttendance(dto: ApiAttendanceDto): Attendance {
  const attendanceId = String(dto.id);
  const attendanceStatus = dto.status ?? dto.receipt?.validation?.status ?? 'tercatat';
  const canonicalSelfieUrl = resolveAttendanceMediaUrl(dto.selfie_url, attendanceId, 'selfie');
  const canonicalSignatureUrl = resolveAttendanceMediaUrl(dto.signature_url, attendanceId, 'signature');

  return {
    id: attendanceId, meetingId: String(dto.agenda_id), agendaId: String(dto.agenda_id),
    meetingTitle: dto.receipt?.meeting?.judul_rapat ?? dto.agenda?.judul_rapat ?? `Agenda #${dto.agenda_id}`, meetingType: dto.agenda?.tipe_rapat, asnNip: dto.receipt?.participant?.nip ?? dto.user?.nip ?? '', asnName: dto.receipt?.participant?.name ?? dto.user?.name ?? '',
    meetingLocation: dto.receipt?.meeting?.lokasi_ruang ?? dto.receipt?.meeting?.link_meeting ?? dto.agenda?.lokasi_ruang ?? null,
    meetingFormat: dto.receipt?.meeting?.format_kedinasan ?? dto.receipt?.meeting?.tipe_rapat ?? dto.agenda?.tipe_rapat ?? null,
    baNumber: dto.receipt?.meeting?.nomor_ba ?? dto.agenda?.nomor_ba ?? null,
    institutionalHeader: dto.receipt?.institutional_header,
    asnJabatan: dto.receipt?.participant?.jabatan ?? dto.user?.jabatan ?? dto.user?.role?.label ?? '', asnUnitKerja: dto.receipt?.participant?.unit_kerja ?? dto.user?.unit?.nama_unit ?? '', timestamp: dto.receipt?.validation?.signed_at ?? dto.signed_at ?? '',
    selfieUri: canonicalSelfieUrl ?? undefined, signatureSvg: undefined, verificationToken: dto.receipt?.nomor_bukti ?? dto.verification_token ?? '', ipAddress: dto.receipt?.validation?.ip_address ?? dto.ip_address ?? '',
    deviceInfo: dto.receipt?.validation?.user_agent ?? dto.user_agent ?? '', latitude: undefined, longitude: undefined, distanceMeters: undefined,
    status: attendanceStatus,
    validationStatus: dto.receipt?.validation?.status ?? (attendanceStatus === 'belum_hadir' ? 'belum_hadir' : 'tercatat'),
    validationStatusLabel: dto.receipt?.validation?.status_label ?? (attendanceStatus === 'belum_hadir' ? undefined : 'Hadir Sah Terverifikasi'),
    verificationMethod: dto.receipt?.validation?.metode_verifikasi ?? (attendanceStatus === 'belum_hadir' ? undefined : 'Swafoto Wajah & Tanda Tangan Digital'),
    meetingSchedule: dto.receipt?.meeting?.jadwal_lengkap ?? null,
    isSynced: true, selfieUrl: canonicalSelfieUrl, signatureUrl: canonicalSignatureUrl, userId: String(dto.user_id),
  };
}

export class AttendanceRepositoryImpl implements IAttendanceRepository {
  async getAttendancePortal(agendaId: string): Promise<{
    agenda: ReturnType<typeof toMeeting>;
    rawAgenda: ApiAgendaDto;
    isOngoing: boolean;
    isEligible: boolean;
    hasAttended: boolean;
    attendance: Attendance | null;
  }> {
    const response = await attendanceApi.portal(agendaId);
    if (!response.success) throw new Error(response.message || 'Gagal memuat portal presensi.');
    const value = response.data;
    return {
      agenda: toMeeting(value.agenda),
      rawAgenda: value.agenda,
      isOngoing: value.is_ongoing,
      isEligible: value.is_eligible,
      hasAttended: value.has_attended,
      attendance: value.my_attendance ? toAttendance(value.my_attendance) : null,
    };
  }

  async submitAttendance(agendaId: string, payload: { selfie_data?: string; signature_data?: string }): Promise<Attendance> {
    const response = await attendanceApi.submit(agendaId, payload);
    if (!response.success) throw new Error(response.message || 'Gagal mengirim presensi.');
    return toAttendance(response.data);
  }

  async getAttendanceHistory(page = 1, perPage = 10, filters: { search?: string; period?: string; tipeRapat?: string } = {}) {
    const response = await attendanceApi.myHistory(page, perPage, filters);
    if (!response.success) throw new Error(response.message || 'Gagal memuat riwayat presensi.');
    return { records: response.data.map(toAttendance), currentPage: response.meta.current_page, lastPage: response.meta.last_page, total: response.meta.total, summary: response.summary };
  }

  async getAgendaAttendances(agendaId: string, page = 1, perPage = 10, filters: { status?: 'attended' | 'unattended'; search?: string } = {}) {
    const response = await attendanceApi.agendaAttendances(agendaId, page, perPage, filters);
    if (!response.success) throw new Error(response.message || 'Gagal memuat kehadiran agenda.');
    return { records: response.data.map(toAttendance), currentPage: response.meta.current_page, lastPage: response.meta.last_page, total: response.meta.total, summary: response.summary };
  }
  async getAttendanceReceipt(attendanceId: string): Promise<Attendance | null> {
    const response = await attendanceApi.receipt(attendanceId);
    if (!response.success) throw new Error(response.message || 'Gagal memuat tanda terima presensi.');
    return toAttendanceReceipt(response.data);
  }
}

function toAttendanceReceipt(dto: ApiAttendanceDto): Attendance {
  return toAttendance(dto);
}
