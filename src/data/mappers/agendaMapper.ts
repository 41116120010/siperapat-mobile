import { Meeting, MeetingStatus } from '../../domain/entities/types';
import { ApiAgendaDto } from '../datasources/apiTypes';
import { resolveSuratEdaranUrl } from '../../core/utils/mediaUrl';

function localDatePart(value: string): string {
  return value.slice(0, 10);
}

function localTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  });
}

function mapStatus(value: ApiAgendaDto['status']['value']): MeetingStatus {
  if (value === 'scheduled') return 'upcoming';
  return value;
}

export function toMeeting(agenda: ApiAgendaDto): Meeting {
  const startDate = localDatePart(agenda.waktu_mulai);
  const venue = agenda.lokasi_ruang || agenda.link_meeting || '';
  const units = agenda.units?.map((unit) => unit.nama_unit) ?? [];
  const resolvedEdaranUrl = resolveSuratEdaranUrl(agenda.surat_edaran?.stream_url);

  return {
    id: String(agenda.id),
    code: agenda.slug,
    title: agenda.judul_rapat,
    type: agenda.tipe_rapat,
    leader: agenda.pimpinan?.name || '—',
    date: startDate,
    startTime: localTime(agenda.waktu_mulai),
    endTime: localTime(agenda.waktu_selesai),
    venue,
    status: mapStatus(agenda.status.value),
    agendaDescription: [agenda.jenis_rapat, venue].filter(Boolean).join(' • '),
    targetAudience: agenda.is_all_units ? 'Semua unit kerja' : units.join(', '),
    zoomUrl: agenda.link_meeting ?? undefined,
    invitationPdfUrl: resolvedEdaranUrl ?? undefined,
    suratEdaran: agenda.surat_edaran
      ? {
          url: resolvedEdaranUrl,
          extension: agenda.surat_edaran.extension,
          is_pdf: agenda.surat_edaran.is_pdf,
          is_image: agenda.surat_edaran.is_image,
        }
      : undefined,
    totalAttended: agenda.total_attended ?? agenda.attendances_count ?? 0,
    totalInvited: agenda.total_invited,
    baNumber: agenda.nomor_ba ?? null,
  };
}
