import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { useMeetingStore } from '../store/useMeetingStore';
import { useFeedbackStore } from '../store/useFeedbackStore';
import { MeetingType } from '../../domain/entities/types';
import {
  AgendaOptionModal,
  AgendaOption,
} from '../components/modals/AgendaOptionModal';

interface CreateMeetingScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

type ActiveModalType =
  | 'none'
  | 'classification'
  | 'leader'
  | 'notulis'
  | 'date'
  | 'venue';

const UNIT_KERJA_LIST = [
  'Bagian Umum & Tata Usaha',
  'Bagian Akademik & Kemahasiswaan',
  'Bagian Sumber Daya PT',
  'Pokja Penjaminan Mutu',
  'Pokja Pendidik & Tendik',
  'Pokja Kelembagaan & Kerjasama',
  'Pokja Riset & Pengabdian',
  'Pokja Sistem Informasi & PDDIKTI',
  'Subbag Tata Usaha & BMN',
  'Subbag Perencanaan & Keuangan',
  'Subbag Kepegawaian & Ortala',
];

const CLASSIFICATION_OPTIONS: AgendaOption[] = [
  {
    id: 'koordinasi',
    title: 'Rapat Koordinasi (Rakor Antar-Unit)',
    subtitle: 'Penyelarasan program kerja lintas kelompok kerja dan bagian',
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

const LEADER_OPTIONS: AgendaOption[] = [
  {
    id: '197012051992032002',
    title: 'Afdalisma, SH, M.Pd',
    subtitle: 'Kepala LLDIKTI Wilayah X • NIP. 197012051992032002',
    badge: 'Kepala Lembaga',
    icon: 'person',
  },
  {
    id: '196803151991031002',
    title: 'Dr. Hj. Syahril, M.Pd',
    subtitle: 'Sekretaris LLDIKTI Wilayah X • NIP. 196803151991031002',
    badge: 'Sekretaris',
    icon: 'person',
  },
  {
    id: '197405101998032001',
    title: 'Ely Susanti, SE, MM',
    subtitle: 'Kepala Bagian Umum • NIP. 197405101998032001',
    badge: 'Kabag Umum',
    icon: 'person',
  },
  {
    id: '198104122005012003',
    title: 'Desy Rachmawaty, SE, MM',
    subtitle: 'Ketua Tim Kerja Kelembagaan • NIP. 198104122005012003',
    badge: 'Ketua Tim',
    icon: 'person',
  },
];

const NOTULIS_OPTIONS: AgendaOption[] = [
  {
    id: 'rahmat',
    title: 'Rahmat Hidayat, S.Kom',
    subtitle: 'Subbag Sistem Informasi & Tata Kelola IT',
    badge: 'Analis TI',
    icon: 'edit-note',
  },
  {
    id: 'siti',
    title: 'Siti Rahmawati, S.AP',
    subtitle: 'Subbag Tata Usaha, Kearsipan & Protokol',
    badge: 'Arsiparis',
    icon: 'edit-note',
  },
  {
    id: 'budi',
    title: 'Budi Santoso, SE',
    subtitle: 'Subbag Perencanaan, Keuangan & BMN',
    badge: 'Pranata Keu',
    icon: 'edit-note',
  },
  {
    id: 'ilham',
    title: 'Ilham Pratama, S.Kom',
    subtitle: 'Pokja Penjaminan Mutu & Akreditasi',
    badge: 'Notulis Mutu',
    icon: 'edit-note',
  },
  {
    id: 'febrina',
    title: 'Febrina Anggraini, SE',
    subtitle: 'Pokja Sumber Daya & Tenaga Pendidik',
    badge: 'Notulis SDM',
    icon: 'edit-note',
  },
];

const DATE_OPTIONS: AgendaOption[] = [
  {
    id: '2026-10-23',
    title: 'Hari Ini — Rabu, 23 Oktober 2026',
    subtitle: 'Jadwal penyelenggaraan hari kerja berjalan',
    badge: 'Hari Ini',
    icon: 'today',
  },
  {
    id: '2026-10-24',
    title: 'Besok — Kamis, 24 Oktober 2026',
    subtitle: 'Rekomendasi jadwal sidang koordinasi rutin',
    badge: 'Besok',
    icon: 'event',
  },
  {
    id: '2026-10-25',
    title: 'Jumat, 25 Oktober 2026',
    subtitle: 'Sesi rapat pimpinan akhir pekan',
    badge: 'Minggu Ini',
    icon: 'date-range',
  },
  {
    id: '2026-10-28',
    title: 'Senin, 28 Oktober 2026',
    subtitle: 'Pembuka agenda kedinasan pekan depan',
    badge: 'Pekan Depan',
    icon: 'date-range',
  },
  {
    id: '2026-10-31',
    title: 'Kamis, 31 Oktober 2026',
    subtitle: 'Sidang evaluasi capaian akhir bulan',
    badge: 'Akhir Bulan',
    icon: 'event-available',
  },
  {
    id: '2026-11-04',
    title: 'Rabu, 4 November 2026',
    subtitle: 'Agenda terencana awal bulan berikutnya',
    badge: 'Bulan Depan',
    icon: 'event-available',
  },
];

const VENUE_OPTIONS: AgendaOption[] = [
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

export const CreateMeetingScreen: React.FC<CreateMeetingScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const { createMeeting, isLoading } = useMeetingStore();

  const [title, setTitle] = useState(
    'Rapat Koordinasi Penjaminan Mutu & Akreditasi Program Studi PTS 2026'
  );
  const [classification, setClassification] = useState('koordinasi');
  const [formatType, setFormatType] = useState<MeetingType>('hybrid');
  const [leaderName, setLeaderName] = useState('Afdalisma, SH, M.Pd');
  const [leaderNip, setLeaderNip] = useState('197012051992032002');
  const [leaderRole, setLeaderRole] = useState('Kepala LLDIKTI Wilayah X');
  const [notulisName, setNotulisName] = useState('Rahmat Hidayat, S.Kom');
  const [notulisId, setNotulisId] = useState('rahmat');

  const [date, setDate] = useState('Kamis, 24 Oktober 2026');
  const [dateIso, setDateIso] = useState('2026-10-24');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [venue, setVenue] = useState('Ruang Sidang Utama Gedung A');
  const [venueId, setVenueId] = useState('utama');
  const [zoomUrl, setZoomUrl] = useState(
    'https://zoom.lldikti10.kemdikbud.go.id/j/9823481239'
  );
  const [meetingIdInput, setMeetingIdInput] = useState('982 348 1239');
  const [passcode, setPasscode] = useState('LLDIKTI10');

  const [scopeUniversal, setScopeUniversal] = useState(true);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([
    'Bagian Umum & Tata Usaha',
    'Bagian Akademik & Kemahasiswaan',
    'Bagian Sumber Daya PT',
    'Pokja Penjaminan Mutu',
    'Pokja Pendidik & Tendik',
  ]);

  const [attachedFile, setAttachedFile] = useState<string | null>(
    'Surat_Undangan_Rapat_Akreditasi_2026.pdf'
  );

  const [activeModal, setActiveModal] = useState<ActiveModalType>('none');

  const selectedClassification =
    CLASSIFICATION_OPTIONS.find((c) => c.id === classification) ||
    CLASSIFICATION_OPTIONS[0];

  const toggleUnit = (unit: string) => {
    setSelectedUnits((prev) =>
      prev.includes(unit) ? prev.filter((u) => u !== unit) : [...prev, unit]
    );
  };

  const handleUploadFile = () => {
    useFeedbackStore.getState().showToast({
      type: 'success',
      message: 'Berkas "Surat_Undangan_Rapat_Akreditasi_2026.pdf" (1.4 MB) berhasil dilampirkan.',
    });
    setAttachedFile('Surat_Undangan_Rapat_Akreditasi_2026.pdf');
  };

  const handleSaveDraft = () => {
    useFeedbackStore.getState().showToast({
      type: 'info',
      message: 'Rancangan agenda rapat berhasil disimpan sebagai draf lokal.',
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Harap isi perihal agenda rapat kedinasan.',
      });
      return;
    }

    const meetingCode = `RPK-${Math.floor(1000 + Math.random() * 9000)}-X`;
    const ok = await createMeeting({
      code: meetingCode,
      title,
      type: formatType,
      leader: leaderName,
      date: dateIso,
      startTime,
      endTime,
      venue: formatType === 'online' ? 'Daring (Video Conference)' : venue,
      status: 'upcoming',
      geofenceRadiusMeters: 50,
      latitude: -0.92348,
      longitude: 100.36214,
      zoomUrl: formatType !== 'offline' ? zoomUrl : undefined,
      agendaDescription: `${title}. Penyelenggaraan secara ${formatType}. Notulis: ${notulisName}.`,
      targetAudience: scopeUniversal
        ? 'Seluruh Unit Kerja (Pleno)'
        : `${selectedUnits.length} Unit Kerja Terpilih`,
      totalInvited: scopeUniversal ? 79 : selectedUnits.length * 7,
    });

    if (ok) {
      useFeedbackStore.getState().showModal({
        type: 'success',
        title: 'Agenda Rapat Berhasil Diterbitkan',
        message: 'Agenda rapat kedinasan telah resmi tercatat dan disinkronkan ke kalender presensi aparatur.',
        detail: {
          'Kode Rapat': meetingCode,
          'Perihal': title,
          'Format': formatType.toUpperCase(),
          'Pimpinan': leaderName,
        },
        confirmText: 'Kembali ke Agenda',
        onConfirm: onSuccess,
      });
    }
  };

  const getModalConfig = (): {
    title: string;
    subtitle: string;
    options: AgendaOption[];
    selectedId: string;
  } => {
    switch (activeModal) {
      case 'classification':
        return {
          title: 'Pilih Klasifikasi Rapat',
          subtitle: 'Kategori agenda untuk administrasi dan kearsipan',
          options: CLASSIFICATION_OPTIONS,
          selectedId: classification,
        };
      case 'leader':
        return {
          title: 'Pilih Pimpinan Rapat',
          subtitle: 'Penanggung jawab sidang kedinasan LLDIKTI Wilayah X',
          options: LEADER_OPTIONS,
          selectedId: leaderNip,
        };
      case 'notulis':
        return {
          title: 'Pilih Petugas Notulis',
          subtitle: 'Petugas penyusun risalah dan notulensi sidang',
          options: NOTULIS_OPTIONS,
          selectedId: notulisId,
        };
      case 'date':
        return {
          title: 'Pilih Tanggal Pelaksanaan',
          subtitle: 'Jadwal hari kerja pelaksanaan agenda kedinasan',
          options: DATE_OPTIONS,
          selectedId: dateIso,
        };
      case 'venue':
        return {
          title: 'Pilih Ruang Rapat',
          subtitle: 'Lokasi fisik ruang sidang di lingkungan kantor LLDIKTI X',
          options: VENUE_OPTIONS,
          selectedId: venueId,
        };
      default:
        return {
          title: '',
          subtitle: '',
          options: [],
          selectedId: '',
        };
    }
  };

  const handleSelectOption = (option: AgendaOption) => {
    switch (activeModal) {
      case 'classification':
        setClassification(option.id);
        break;
      case 'leader':
        setLeaderName(option.title);
        setLeaderNip(option.id);
        setLeaderRole(option.badge || 'Pimpinan Rapat');
        break;
      case 'notulis':
        setNotulisName(option.title);
        setNotulisId(option.id);
        break;
      case 'date':
        setDateIso(option.id);
        setDate(
          option.title.includes(' — ')
            ? option.title.split(' — ')[1]
            : option.title
        );
        break;
      case 'venue':
        setVenue(option.title);
        setVenueId(option.id);
        break;
    }
    setActiveModal('none');
  };

  return (
    <View style={styles.container}>
      <Header
        title="Buat Agenda Rapat Baru"
        subtitle="Administrasi & Presensi LLDIKTI Wilayah X"
        showBack
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: Informasi Rapat */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informasi Rapat</Text>
          </View>

          {/* Judul Textarea */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Judul / Perihal Agenda Rapat <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              value={title}
              onChangeText={setTitle}
              multiline
              numberOfLines={3}
              placeholder="Masukkan perihal agenda rapat dinas..."
              placeholderTextColor={colors.outline}
            />
          </View>

          {/* Klasifikasi Selector Modal Trigger */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Klasifikasi & Jenis Rapat <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              onPress={() => setActiveModal('classification')}
              style={({ pressed }) => [
                styles.selectorTrigger,
                pressed && styles.pressedState,
              ]}
            >
              <View style={styles.selectorLeft}>
                <MaterialIcons
                  name={selectedClassification.icon || 'category'}
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.selectorValue} numberOfLines={1}>
                  {selectedClassification.title}
                </Text>
              </View>
              <View style={styles.selectorRight}>
                {selectedClassification.badge ? (
                  <View style={styles.selectorBadge}>
                    <Text style={styles.selectorBadgeText}>
                      {selectedClassification.badge}
                    </Text>
                  </View>
                ) : null}
                <MaterialIcons
                  name="expand-more"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </View>
            </Pressable>
          </View>

          {/* Segmented Format Buttons */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Format Penyelenggaraan Rapat <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.formatSegmentedGrid}>
              <Pressable
                onPress={() => setFormatType('offline')}
                style={[
                  styles.formatBtn,
                  formatType === 'offline' && styles.formatBtnActive,
                ]}
              >
                <MaterialIcons
                  name="apartment"
                  size={18}
                  color={
                    formatType === 'offline' ? colors.onPrimary : colors.outline
                  }
                />
                <Text
                  style={[
                    styles.formatBtnText,
                    formatType === 'offline' && styles.formatBtnTextActive,
                  ]}
                >
                  Luring
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setFormatType('online')}
                style={[
                  styles.formatBtn,
                  formatType === 'online' && styles.formatBtnActive,
                ]}
              >
                <MaterialIcons
                  name="videocam"
                  size={18}
                  color={
                    formatType === 'online' ? colors.onPrimary : colors.outline
                  }
                />
                <Text
                  style={[
                    styles.formatBtnText,
                    formatType === 'online' && styles.formatBtnTextActive,
                  ]}
                >
                  Daring
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setFormatType('hybrid')}
                style={[
                  styles.formatBtn,
                  formatType === 'hybrid' && styles.formatBtnActive,
                ]}
              >
                <MaterialIcons
                  name="hub"
                  size={18}
                  color={
                    formatType === 'hybrid' ? colors.onPrimary : colors.outline
                  }
                />
                <Text
                  style={[
                    styles.formatBtnText,
                    formatType === 'hybrid' && styles.formatBtnTextActive,
                  ]}
                >
                  Hybrid
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Leader Card Modal Trigger */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Penanggung Jawab / Pimpinan Rapat <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              onPress={() => setActiveModal('leader')}
              style={({ pressed }) => [
                styles.entityCard,
                pressed && styles.pressedState,
              ]}
            >
              <View style={styles.leaderAvatar}>
                <Text style={styles.leaderAvatarText}>
                  {leaderName
                    .split(' ')
                    .map((n) => n[0])
                    .filter((c) => /^[A-Z]$/i.test(c))
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'PJ'}
                </Text>
              </View>
              <View style={styles.entityInfo}>
                <Text style={styles.entityName}>{leaderName}</Text>
                <Text style={styles.entitySub}>
                  {leaderRole} • NIP. {leaderNip}
                </Text>
              </View>
              <View style={styles.actionPill}>
                <Text style={styles.actionPillText}>Ganti</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={colors.primary}
                />
              </View>
            </Pressable>
          </View>

          {/* Notulis Picker Modal Trigger */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Petugas Notulis / Risalah Rapat</Text>
            <Pressable
              onPress={() => setActiveModal('notulis')}
              style={({ pressed }) => [
                styles.entityCard,
                pressed && styles.pressedState,
              ]}
            >
              <View style={styles.notulisIconWrap}>
                <MaterialIcons
                  name="edit-note"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.entityInfo}>
                <Text style={styles.entityName}>{notulisName}</Text>
                <Text style={styles.entitySub}>
                  Petugas Notulensi Sidang Kedinasan
                </Text>
              </View>
              <View style={styles.actionPill}>
                <Text style={styles.actionPillText}>Pilih</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={colors.primary}
                />
              </View>
            </Pressable>
          </View>
        </View>

        {/* SECTION 2: Waktu & Tempat */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Waktu & Tempat</Text>
          </View>

          {/* Tanggal Modal Trigger */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Tanggal Pelaksanaan <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              onPress={() => setActiveModal('date')}
              style={({ pressed }) => [
                styles.selectorTrigger,
                pressed && styles.pressedState,
              ]}
            >
              <View style={styles.selectorLeft}>
                <MaterialIcons name="event" size={18} color={colors.secondary} />
                <Text style={styles.selectorValue}>{date}</Text>
              </View>
              <MaterialIcons
                name="calendar-today"
                size={18}
                color={colors.onSurfaceVariant}
              />
            </Pressable>
          </View>

          {/* Time Inputs & Inline Duration */}
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Mulai (WIB)</Text>
              <TextInput
                style={styles.timeInput}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={colors.outline}
              />
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Selesai (WIB)</Text>
              <TextInput
                style={styles.timeInput}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="12:00"
                placeholderTextColor={colors.outline}
              />
            </View>
          </View>

          {/* Inline Duration Indicator */}
          <View style={styles.durationInline}>
            <MaterialIcons name="schedule" size={15} color={colors.primary} />
            <Text style={styles.durationInlineText}>
              Estimasi Durasi: 3 Jam 00 Menit
            </Text>
          </View>

          {/* Venue Location Selector (Offline / Hybrid) */}
          {formatType !== 'online' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Ruang Rapat / Lokasi <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                onPress={() => setActiveModal('venue')}
                style={({ pressed }) => [
                  styles.selectorTrigger,
                  pressed && styles.pressedState,
                ]}
              >
                <View style={styles.selectorLeft}>
                  <MaterialIcons
                    name="meeting-room"
                    size={18}
                    color={colors.secondary}
                  />
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {venue}
                  </Text>
                </View>
                <MaterialIcons
                  name="expand-more"
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </Pressable>
            </View>
          ) : null}

          {/* Online Meeting Details (Online / Hybrid) */}
          {formatType !== 'offline' ? (
            <View style={styles.virtualMeetingBox}>
              <View style={styles.virtualHeader}>
                <View style={styles.virtualHeaderLeft}>
                  <MaterialIcons
                    name="videocam"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.virtualTitle}>
                    Tautan Pertemuan Virtual
                  </Text>
                </View>
                <View style={styles.virtualBadge}>
                  <Text style={styles.virtualBadgeText}>Video Conference</Text>
                </View>
              </View>

              <TextInput
                style={styles.virtualInput}
                value={zoomUrl}
                onChangeText={setZoomUrl}
                placeholder="https://zoom.lldikti10.kemdikbud.go.id/..."
                placeholderTextColor={colors.outline}
              />

              <View style={styles.virtualMetaRow}>
                <View style={styles.virtualMetaCol}>
                  <Text style={styles.virtualMetaLabel}>Meeting ID</Text>
                  <Text style={styles.virtualMetaValue}>{meetingIdInput}</Text>
                </View>
                <View style={styles.virtualMetaCol}>
                  <Text style={styles.virtualMetaLabel}>Passcode</Text>
                  <Text style={styles.virtualMetaValue}>{passcode}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* SECTION 3: Sasaran Peserta */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sasaran Peserta</Text>
          </View>

          {/* Radio Options */}
          <Pressable
            onPress={() => setScopeUniversal(true)}
            style={[
              styles.radioCard,
              scopeUniversal && styles.radioCardActive,
            ]}
          >
            <MaterialIcons
              name={
                scopeUniversal
                  ? 'radio-button-checked'
                  : 'radio-button-unchecked'
              }
              size={20}
              color={scopeUniversal ? colors.primary : colors.outline}
            />
            <View style={styles.radioTextWrap}>
              <Text style={styles.radioTitle}>
                Seluruh Unit Kerja (Pleno / Universal)
              </Text>
              <Text style={styles.radioSub}>
                Semua pegawai di lingkungan LLDIKTI Wilayah X diikutsertakan.
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setScopeUniversal(false)}
            style={[
              styles.radioCard,
              !scopeUniversal && styles.radioCardActive,
            ]}
          >
            <MaterialIcons
              name={
                !scopeUniversal
                  ? 'radio-button-checked'
                  : 'radio-button-unchecked'
              }
              size={20}
              color={!scopeUniversal ? colors.primary : colors.outline}
            />
            <View style={styles.radioTextWrap}>
              <Text style={styles.radioTitle}>Unit Kerja Tertentu</Text>
              <Text style={styles.radioSub}>
                Pilih bagian atau kelompok kerja yang diundang secara spesifik.
              </Text>
            </View>
          </Pressable>

          {/* Universal Scope Notice vs Specific Unit Chips */}
          {scopeUniversal ? (
            <View style={styles.universalNoticeBox}>
              <MaterialIcons
                name="groups"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.universalNoticeText}>
                Semua pegawai di 11 unit kerja LLDIKTI Wilayah X otomatis
                terdaftar sebagai peserta agenda ini.
              </Text>
            </View>
          ) : (
            <View style={styles.unitSelectSection}>
              <Text style={styles.unitSelectHeader}>
                Pilih Unit Kerja ({selectedUnits.length} dipilih):
              </Text>
              <View style={styles.chipsWrap}>
                {UNIT_KERJA_LIST.map((unit) => {
                  const selected = selectedUnits.includes(unit);
                  return (
                    <Pressable
                      key={unit}
                      onPress={() => toggleUnit(unit)}
                      style={[
                        styles.unitChip,
                        selected && styles.unitChipSelected,
                      ]}
                    >
                      {selected ? (
                        <MaterialIcons
                          name="check"
                          size={13}
                          color={colors.primary}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.unitChipText,
                          selected && styles.unitChipTextSelected,
                        ]}
                      >
                        {unit}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* SECTION 4: Lampiran Undangan */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lampiran Undangan</Text>
          </View>

          {/* Upload Dropzone */}
          <Pressable
            onPress={handleUploadFile}
            style={({ pressed }) => [
              styles.dropzone,
              pressed && styles.pressedState,
            ]}
          >
            <View style={styles.dropzoneIconWrap}>
              <MaterialIcons
                name="upload-file"
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={styles.dropzoneTextWrap}>
              <Text style={styles.dropzoneTitle}>
                Unggah Surat Undangan / Nota Dinas
              </Text>
              <Text style={styles.dropzoneSub}>
                Format PDF bertanda tangan digital (Maksimal 5 MB)
              </Text>
            </View>
          </Pressable>

          {/* Attached File Card */}
          {attachedFile ? (
            <View style={styles.attachedCard}>
              <View style={styles.attachedLeft}>
                <View style={styles.attachedIconBox}>
                  <MaterialIcons
                    name="picture-as-pdf"
                    size={20}
                    color={colors.error}
                  />
                </View>
                <View style={styles.attachedInfo}>
                  <Text style={styles.attachedName} numberOfLines={1}>
                    {attachedFile}
                  </Text>
                  <Text style={styles.attachedMeta}>
                    1.4 MB • Ditandatangani Elektronik (BSrE)
                  </Text>
                </View>
              </View>
              <View style={styles.attachedActions}>
                <Pressable
                  onPress={() =>
                    useFeedbackStore.getState().showToast({
                      type: 'info',
                      message: `Membuka pratinjau berkas: ${attachedFile}`,
                    })
                  }
                  style={styles.attachedActionBtn}
                  accessibilityLabel="Pratinjau lampiran"
                >
                  <MaterialIcons
                    name="visibility"
                    size={18}
                    color={colors.onSurfaceVariant}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setAttachedFile(null)}
                  style={styles.attachedActionBtn}
                  accessibilityLabel="Hapus lampiran"
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={18}
                    color={colors.error}
                  />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions Bar */}
      <View style={styles.stickyFooter}>
        <View style={styles.footerGrid}>
          <Pressable
            onPress={handleSaveDraft}
            style={({ pressed }) => [
              styles.draftButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons name="save" size={18} color={colors.outline} />
            <Text style={styles.draftButtonText}>Simpan Konsep</Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.publishButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons
              name="check-circle"
              size={18}
              color={colors.onPrimary}
            />
            <Text style={styles.publishButtonText}>
              {isLoading ? 'Menerbitkan...' : 'Terbitkan Agenda'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Reusable Bottom Sheet Agenda Option Modal */}
      <AgendaOptionModal
        visible={activeModal !== 'none'}
        onClose={() => setActiveModal('none')}
        title={getModalConfig().title}
        subtitle={getModalConfig().subtitle}
        options={getModalConfig().options}
        selectedId={getModalConfig().selectedId}
        onSelect={handleSelectOption}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 110,
    gap: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: spacing.sm + 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.3)',
    paddingBottom: spacing.xs + 2,
    marginBottom: 2,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    ...typography.labelMd,
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  required: {
    color: colors.error,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.md,
    padding: spacing.sm,
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurface,
    backgroundColor: colors.surfaceCard,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  selectorTrigger: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
  },
  selectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectorValue: {
    ...typography.bodyMd,
    fontSize: 12.5,
    color: colors.onSurface,
    flex: 1,
  },
  selectorBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  selectorBadgeText: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  formatSegmentedGrid: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: 4,
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rounded.sm,
  },
  formatBtnActive: {
    backgroundColor: colors.primary,
  },
  formatBtnText: {
    ...typography.labelMd,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  formatBtnTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  entityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceCard,
    gap: 10,
  },
  leaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderAvatarText: {
    color: colors.onPrimaryContainer,
    fontWeight: '700',
    fontSize: 13,
  },
  notulisIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityInfo: {
    flex: 1,
  },
  entityName: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  entitySub: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    gap: 2,
  },
  actionPillText: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeCol: {
    flex: 1,
    gap: 3,
  },
  timeInput: {
    height: 42,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    ...typography.bodyMd,
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
    backgroundColor: colors.surfaceCard,
  },
  durationInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: rounded.sm,
    alignSelf: 'flex-start',
  },
  durationInlineText: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
  },
  virtualMeetingBox: {
    padding: spacing.sm + 2,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    gap: 8,
  },
  virtualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  virtualHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  virtualTitle: {
    ...typography.labelMd,
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  virtualBadge: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  virtualBadgeText: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  virtualInput: {
    height: 38,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceCard,
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurface,
  },
  virtualMetaRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  virtualMetaCol: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  virtualMetaLabel: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  virtualMetaValue: {
    ...typography.labelMono,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  radioCard: {
    flexDirection: 'row',
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceCard,
    gap: 10,
    alignItems: 'flex-start',
  },
  radioCardActive: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.surfaceContainerLow,
  },
  radioTextWrap: {
    flex: 1,
  },
  radioTitle: {
    ...typography.labelMd,
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  radioSub: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 15,
  },
  universalNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  universalNoticeText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 16,
  },
  unitSelectSection: {
    gap: 6,
    marginTop: 4,
  },
  unitSelectHeader: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  unitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    backgroundColor: colors.surfaceCard,
  },
  unitChipSelected: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.primary,
  },
  unitChipText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  unitChipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  dropzone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    borderRadius: rounded.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  dropzoneIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  dropzoneTextWrap: {
    flex: 1,
  },
  dropzoneTitle: {
    ...typography.labelMd,
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  dropzoneSub: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    backgroundColor: colors.surfaceCard,
  },
  attachedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  attachedIconBox: {
    width: 34,
    height: 34,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedInfo: {
    flex: 1,
  },
  attachedName: {
    ...typography.labelMd,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  attachedMeta: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  attachedActions: {
    flexDirection: 'row',
    gap: 4,
  },
  attachedActionBtn: {
    width: 32,
    height: 32,
    borderRadius: rounded.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  footerGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  draftButton: {
    flex: 5,
    height: 44,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  draftButtonText: {
    ...typography.labelMd,
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  publishButton: {
    flex: 7,
    height: 44,
    borderRadius: rounded.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  publishButtonText: {
    ...typography.labelMd,
    fontSize: 12,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  pressedState: {
    opacity: 0.7,
  },
});
