import { AgendaOption } from '../components/modals/AgendaOptionModal';
import { colors } from '../../core/theme/colors';

export const CLASSIFICATION_OPTIONS: AgendaOption[] = [
  {
    id: 'koordinasi',
    title: 'Rapat Koordinasi Pimpinan & Pokja',
    subtitle: 'Koordinasi internal kelembagaan, perencanaan, dan pelaporan',
    badge: 'Rutin',
    icon: 'sync-alt',
  },
  {
    id: 'pleno',
    title: 'Rapat Pleno Pimpinan LLDIKTI X',
    subtitle: 'Sidang pleno pejabat struktural dan ketua tim kerja',
    badge: 'Pimpinan',
    icon: 'account-balance',
  },
  {
    id: 'evaluasi',
    title: 'Rapat Evaluasi Kinerja & Anggaran',
    subtitle: 'Tinjauan capaian kinerja triwulanan dan serapan anggaran DIPA',
    badge: 'Prioritas',
    icon: 'assessment',
  },
  {
    id: 'bimtek',
    title: 'Sosialisasi & Bimbingan Teknis PTS',
    subtitle: 'Pembinaan kelembagaan dan peningkatan mutu perguruan tinggi',
    badge: 'Eksternal',
    icon: 'school',
  },
  {
    id: 'disiplin',
    title: 'Sidang Penegakan Disiplin Pegawai ASN',
    subtitle: 'Majelis kode etik dan pembinaan aparatur sipil negara',
    badge: 'Internal',
    icon: 'gavel',
  },
];

export const VENUE_OPTIONS: AgendaOption[] = [
  {
    id: 'utama',
    title: 'Ruang Sidang Utama Gedung A',
    subtitle: 'Kapasitas 80 Orang • Sound System & Video Wall • AC Central',
    badge: 'Kapasitas 80',
    icon: 'meeting-room',
  },
  {
    id: 'pimpinan',
    title: 'Ruang Rapat Pimpinan Lt. 2',
    subtitle: 'Kapasitas 25 Orang • Smart Screen Interactive',
    badge: 'Kapasitas 25',
    icon: 'meeting-room',
  },
  {
    id: 'pokja',
    title: 'Ruang Rapat Pokja Penjaminan Mutu',
    subtitle: 'Kapasitas 20 Orang • Gedung B Lantai 1',
    badge: 'Kapasitas 20',
    icon: 'meeting-room',
  },
  {
    id: 'aula',
    title: 'Aula Ki Hadjar Dewantara',
    subtitle: 'Kapasitas 150 Orang • Khusus Pertemuan Pleno Besar',
    badge: 'Kapasitas 150',
    icon: 'apartment',
  },
  {
    id: 'akademik',
    title: 'Ruang Rapat Akademik Gedung B',
    subtitle: 'Kapasitas 35 Orang • LCD Proyektor & Geofence Valid',
    badge: 'Kapasitas 35',
    icon: 'meeting-room',
  },
];

export const STATUS_OPTIONS: Array<{
  id: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'draft';
  label: string;
  badge: string;
  color: string;
  icon: 'schedule' | 'sensors' | 'task-alt' | 'cancel' | 'edit-note';
}> = [
  {
    id: 'scheduled',
    label: 'Terjadwal',
    badge: 'Akan Datang',
    color: colors.secondary,
    icon: 'schedule',
  },
  {
    id: 'ongoing',
    label: 'Sedang Berlangsung',
    badge: 'Berlangsung',
    color: colors.success,
    icon: 'sensors',
  },
  {
    id: 'completed',
    label: 'Selesai',
    badge: 'Arsip',
    color: colors.outline,
    icon: 'task-alt',
  },
  {
    id: 'cancelled',
    label: 'Dibatalkan',
    badge: 'Batal',
    color: colors.error,
    icon: 'cancel',
  },
  {
    id: 'draft',
    label: 'Draf / Konsep',
    badge: 'Draf',
    color: colors.outlineVariant,
    icon: 'edit-note',
  },
];
