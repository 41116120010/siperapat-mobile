import { ASN, Meeting, MeetingStatus } from '../../domain/entities/types';
import { ApiAgendaDto, ApiUserDto } from '../datasources/apiTypes';
import { UpdateAgendaDto } from '../datasources/agendaApi';
import { resolveSuratEdaranUrl } from '../../core/utils/mediaUrl';

export function toAsn(user: ApiUserDto): ASN {
  return {
    id: String(user.id), nip: user.nip ?? '', name: user.name,
    pangkatGolongan: user.pangkat_golongan ?? '', jabatan: user.jabatan ?? user.role.label, unitKerja: user.unit?.nama_unit ?? '',
    unitId: user.unit_id ?? user.unit?.id ?? null,
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
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      });
}

export function toMeeting(agenda: ApiAgendaDto): Meeting {
  const venue = agenda.tipe_rapat === 'online' ? agenda.link_meeting ?? '' : agenda.lokasi_ruang ?? '';
  const units = agenda.units?.map((unit) => unit.nama_unit) ?? [];
  const resolvedEdaranUrl = resolveSuratEdaranUrl(agenda.surat_edaran?.url);
  return {
    id: String(agenda.id), code: agenda.slug, title: agenda.judul_rapat, type: agenda.tipe_rapat,
    leader: agenda.pimpinan?.name ?? '', leaderId: agenda.pimpinan?.id ?? null,
    notulis: agenda.notulis?.name ?? '', notulisId: agenda.notulis?.id ?? null,
    date: agenda.waktu_mulai.slice(0, 10),
    startTime: timePart(agenda.waktu_mulai), endTime: timePart(agenda.waktu_selesai), venue,
    venueId: agenda.lokasi_ruang ? 'custom' : null,
    status: toMeetingStatus(agenda.status.value),
    rawStatus: agenda.status.value,
    classification: agenda.jenis_rapat,
    isAllUnits: agenda.is_all_units,
    unitIds: agenda.units?.map((u) => u.id) ?? [],
    unitsList: agenda.units?.map((u) => ({ id: u.id, nama_unit: u.nama_unit, kode_unit: u.kode_unit })) ?? [],
    creatorId: agenda.creator?.id ?? null,
    creatorUnitId: agenda.creator?.unit_id ?? agenda.creator?.unit?.id ?? null,
    agendaDescription: agenda.jenis_rapat,
    targetAudience: agenda.is_all_units ? 'Semua unit kerja' : units.join(', '),
    zoomUrl: agenda.link_meeting ?? undefined,
    invitationPdfUrl: resolvedEdaranUrl ?? undefined,
    totalAttended: agenda.total_attended ?? agenda.attendances_count ?? 0,
    suratEdaran: agenda.surat_edaran
      ? {
          ...agenda.surat_edaran,
          url: resolvedEdaranUrl,
        }
      : undefined,
    baNumber: agenda.nomor_ba ?? null,
    totalInvited: agenda.total_invited ?? undefined, geofenceRadiusMeters: undefined, latitude: undefined, longitude: undefined,
    minutesHtml: agenda.notulensi_html ?? null, summaryHtml: agenda.kesimpulan_html ?? null,
  };
}

export function toIsoDateTime(date: string, time?: string | null): string {
  if (!date || !time) return '';
  const dateKey = date.includes('T') ? date.slice(0, 10) : date.trim();
  const match = time.match(/(\d{1,2})[:.](\d{1,2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2].padStart(2, '0');
    return `${dateKey}T${hh}:${mm}:00+07:00`;
  }
  return '';
}

export function meetingToUpdateDto(meeting: Meeting): UpdateAgendaDto {
  const isOnline = meeting.type === 'online';
  const isOffline = meeting.type === 'offline';
  return {
    judul_rapat: meeting.title,
    jenis_rapat: meeting.classification || 'koordinasi',
    tipe_rapat: meeting.type,
    status: meeting.rawStatus ?? (meeting.status === 'upcoming' ? 'scheduled' : (meeting.status as any)),
    lokasi_ruang: isOnline ? null : (meeting.venue && meeting.venue !== 'Pilih ruang rapat' ? meeting.venue : null),
    link_meeting: isOffline ? null : (meeting.zoomUrl || null),
    waktu_mulai: toIsoDateTime(meeting.date, meeting.startTime) || `${meeting.date}T09:00:00+07:00`,
    waktu_selesai: meeting.endTime && meeting.endTime !== '—' ? toIsoDateTime(meeting.date, meeting.endTime) || null : null,
    pimpinan_id: meeting.leaderId ?? null,
    notulis_id: meeting.notulisId ?? null,
    is_all_units: meeting.isAllUnits ?? true,
    unit_ids: meeting.isAllUnits ? [] : (meeting.unitIds ?? []),
  };
}
