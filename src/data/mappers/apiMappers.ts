import { ASN, Meeting, MeetingStatus } from '../../domain/entities/types';
import { ApiAgendaDto, ApiUserDto } from '../datasources/apiTypes';

export function toAsn(user: ApiUserDto): ASN {
  return {
    id: String(user.id), nip: user.nip ?? '', name: user.name,
    pangkatGolongan: user.pangkat_golongan ?? '', jabatan: user.jabatan ?? user.role.label, unitKerja: user.unit?.nama_unit ?? '',
    email: user.email ?? '', phone: user.phone ?? '', avatarUrl: user.avatar_url ?? undefined,
    username: user.username, role: user.role.value, biometricEnabled: false,
    attendanceStats: user.attendance_stats ? {
      totalAgendas: user.attendance_stats.total_agendas,
      totalAttended: user.attendance_stats.total_attended,
      attendanceRateLabel: user.attendance_stats.attendance_rate_label,
      onTimeRateLabel: user.attendance_stats.on_time_rate_label,
      periodLabel: user.attendance_stats.period_label,
    } : undefined,
  };
}

function toMeetingStatus(value: ApiAgendaDto['status']['value']): MeetingStatus {
  if (value === 'scheduled') return 'upcoming';
  return value;
}

function timePart(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
}

export function toMeeting(agenda: ApiAgendaDto): Meeting {
  const venue = agenda.tipe_rapat === 'online' ? agenda.link_meeting ?? '' : agenda.lokasi_ruang ?? '';
  const units = agenda.units?.map((unit) => unit.nama_unit) ?? [];
  return {
    id: String(agenda.id), code: agenda.slug, title: agenda.judul_rapat, type: agenda.tipe_rapat,
    leader: agenda.pimpinan?.name ?? '', notulis: agenda.notulis?.name ?? '', date: agenda.waktu_mulai.slice(0, 10),
    startTime: timePart(agenda.waktu_mulai), endTime: timePart(agenda.waktu_selesai), venue,
    status: toMeetingStatus(agenda.status.value), agendaDescription: agenda.jenis_rapat,
    targetAudience: agenda.is_all_units ? 'Semua unit kerja' : units.join(', '),
    zoomUrl: agenda.link_meeting ?? undefined, invitationPdfUrl: agenda.surat_edaran?.url ?? undefined,
    totalAttended: agenda.total_attended ?? agenda.attendances_count ?? 0,
    totalInvited: agenda.total_invited, geofenceRadiusMeters: undefined, latitude: undefined, longitude: undefined,
    suratEdaran: agenda.surat_edaran, baNumber: agenda.nomor_ba ?? null,
    totalAttended: agenda.attendances_count ?? 0,
    totalInvited: agenda.total_invited ?? undefined, geofenceRadiusMeters: undefined, latitude: undefined, longitude: undefined,
    minutesHtml: agenda.notulensi_html ?? null, summaryHtml: agenda.kesimpulan_html ?? null,
  };
}

export function toIsoDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}
