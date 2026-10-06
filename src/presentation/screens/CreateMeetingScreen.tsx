import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing, elevations } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { useMeetingStore } from '../store/useMeetingStore';
import { MeetingType } from '../../domain/entities/types';

interface CreateMeetingScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

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
  const [notulisName, setNotulisName] = useState('Pilih Pegawai Notulis / Subbag');
  
  const [date, setDate] = useState('Kamis, 24 Oktober 2026');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [venue, setVenue] = useState(
    'Ruang Sidang Utama Gedung A (Kapasitas 80 Orang)'
  );
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

  const toggleUnit = (unit: string) => {
    setSelectedUnits((prev) =>
      prev.includes(unit) ? prev.filter((u) => u !== unit) : [...prev, unit]
    );
  };

  const handlePickNotulis = () => {
    Alert.alert(
      'Pilih Petugas Notulis',
      'Pilih pegawai pelaksana penyusun risalah sidang:',
      [
        {
          text: 'Rahmat Hidayat, S.Kom (Subbag TI)',
          onPress: () => setNotulisName('Rahmat Hidayat, S.Kom'),
        },
        {
          text: 'Siti Rahmawati, S.AP (Subbag TU)',
          onPress: () => setNotulisName('Siti Rahmawati, S.AP'),
        },
        {
          text: 'Budi Santoso, SE (Subbag Umum)',
          onPress: () => setNotulisName('Budi Santoso, SE'),
        },
        { text: 'Batal', style: 'cancel' },
      ]
    );
  };

  const handlePickLeader = () => {
    Alert.alert(
      'Ganti Penanggung Jawab Rapat',
      'Pilih pimpinan sidang kedinasan:',
      [
        {
          text: 'Afdalisma, SH, M.Pd (Kepala LLDIKTI X)',
          onPress: () => {
            setLeaderName('Afdalisma, SH, M.Pd');
            setLeaderNip('197012051992032002');
          },
        },
        {
          text: 'Dr. Hj. Syahril, M.Pd (Sekretaris)',
          onPress: () => {
            setLeaderName('Dr. Hj. Syahril, M.Pd');
            setLeaderNip('196803151991031002');
          },
        },
        { text: 'Batal', style: 'cancel' },
      ]
    );
  };

  const handleUploadFile = () => {
    Alert.alert(
      'Telusuri Dokumen Kedinasan',
      'Berkas nota dinas resmi "Surat_Undangan_Rapat_Akreditasi_2026.pdf" (1.4 MB) berhasil dilampirkan.'
    );
    setAttachedFile('Surat_Undangan_Rapat_Akreditasi_2026.pdf');
  };

  const handleSaveDraft = () => {
    Alert.alert(
      'Konsep Tersimpan',
      'Rancangan agenda rapat dinas berhasil disimpan sebagai draf lokal.'
    );
  };

  const handleSubmit = async () => {
    if (!title) {
      Alert.alert('Perhatian', 'Harap isi judul / perihal agenda rapat.');
      return;
    }

    const ok = await createMeeting({
      code: `RPK-${Math.floor(1000 + Math.random() * 9000)}-X`,
      title,
      type: formatType,
      leader: leaderName,
      date: '2026-10-24',
      startTime,
      endTime,
      venue: formatType === 'online' ? 'Zoom Meeting' : venue,
      status: 'upcoming',
      geofenceRadiusMeters: 50,
      latitude: -0.92348,
      longitude: 100.36214,
      zoomUrl: formatType !== 'offline' ? zoomUrl : undefined,
      agendaDescription: `${title}. Penyelenggaraan secara ${formatType}.`,
      targetAudience: scopeUniversal
        ? 'Seluruh Unit Kerja (Pleno / Universal)'
        : `${selectedUnits.length} Unit Kerja Terpilih`,
      totalInvited: scopeUniversal ? 79 : selectedUnits.length * 7,
    });

    if (ok) {
      Alert.alert('Sukses', 'Agenda rapat kedinasan berhasil diterbitkan.', [
        { text: 'OK', onPress: onSuccess },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Buat Agenda Rapat Baru"
        subtitle="Administrasi & Presensi Kedinasan LLDIKTI X"
        showBack
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: Data Pokok Rapat Kedinasan */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Data Pokok Rapat Kedinasan</Text>
            <Text style={styles.sectionSubtitle}>
              Identitas dasar dan perihal administrasi rapat
            </Text>
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
              placeholder="Contoh: Rapat Koordinasi Penjaminan Mutu & Akreditasi Program Studi PTS 2026"
              placeholderTextColor={colors.outline}
            />
            <Text style={styles.fieldHint}>
              Gunakan format resmi perihal nota dinas / surat undangan kementerian.
            </Text>
          </View>

          {/* Klasifikasi Selector */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Klasifikasi & Jenis Rapat <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.classificationSelector}>
              <Text style={styles.classificationValue}>
                {classification === 'koordinasi'
                  ? 'Rapat Koordinasi (Rakor Antar-Unit)'
                  : classification === 'pleno'
                  ? 'Rapat Pleno Pimpinan LLDIKTI X'
                  : 'Rapat Evaluasi Triwulan Kinerja ASN'}
              </Text>
              <MaterialIcons name="expand-more" size={20} color={colors.onSurfaceVariant} />
            </View>
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
                  color={formatType === 'offline' ? colors.onPrimary : colors.outline}
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
                  color={formatType === 'online' ? colors.onPrimary : colors.outline}
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
                  color={formatType === 'hybrid' ? colors.onPrimary : colors.outline}
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

          {/* Leader Card */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Penanggung Jawab / Pemimpin Rapat <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.leaderCard}>
              <View style={styles.leaderAvatar}>
                <Text style={styles.leaderAvatarText}>AF</Text>
              </View>
              <View style={styles.leaderInfo}>
                <Text style={styles.leaderName}>{leaderName}</Text>
                <Text style={styles.leaderNip}>
                  Kepala Lembaga (NIP. {leaderNip})
                </Text>
              </View>
              <Pressable onPress={handlePickLeader} style={styles.changeBtn}>
                <Text style={styles.changeBtnText}>Ganti</Text>
              </Pressable>
            </View>
          </View>

          {/* Notulis Picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Petugas Notulis / Risalah Rapat</Text>
            <Pressable onPress={handlePickNotulis} style={styles.notulisBox}>
              <View style={styles.notulisLeft}>
                <MaterialIcons name="person-add" size={20} color={colors.onSurfaceVariant} />
                <Text style={styles.notulisText}>{notulisName}</Text>
              </View>
              <View style={styles.searchCircle}>
                <MaterialIcons name="search" size={16} color={colors.primary} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* SECTION 2: Waktu & Lokasi Penyelenggaraan */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. Waktu & Lokasi Penyelenggaraan</Text>
            <Text style={styles.sectionSubtitle}>
              Jadwal, durasi, dan ruang pelaksanaan kegiatan
            </Text>
          </View>

          {/* Tanggal */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Tanggal Pelaksanaan <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.dateInputBox}>
              <MaterialIcons name="event" size={20} color={colors.secondary} />
              <TextInput
                style={styles.dateInput}
                value={date}
                onChangeText={setDate}
              />
            </View>
          </View>

          {/* Time Pickers */}
          <View style={styles.timeRow}>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Mulai (WIB)</Text>
              <TextInput
                style={styles.timeInput}
                value={startTime}
                onChangeText={setStartTime}
              />
            </View>
            <View style={styles.timeCol}>
              <Text style={styles.label}>Selesai (WIB)</Text>
              <TextInput
                style={styles.timeInput}
                value={endTime}
                onChangeText={setEndTime}
              />
            </View>
          </View>

          {/* Duration Banner */}
          <View style={styles.durationBanner}>
            <View style={styles.durationLeft}>
              <MaterialIcons name="schedule" size={18} color={colors.outline} />
              <Text style={styles.durationLabel}>Total Estimasi Durasi Rapat:</Text>
            </View>
            <Text style={styles.durationValue}>3 Jam 00 Menit</Text>
          </View>

          {/* Venue Location */}
          {formatType !== 'online' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Nama Ruangan / Gedung <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.venueBox}>
                <MaterialIcons name="meeting-room" size={20} color={colors.secondary} />
                <TextInput
                  style={styles.venueInput}
                  value={venue}
                  onChangeText={setVenue}
                />
              </View>
              <Text style={styles.fieldHint}>
                Lokasi terintegrasi geofencing presensi ASN LLDIKTI X Padang.
              </Text>
            </View>
          ) : null}

          {/* Online Zoom Box */}
          {formatType !== 'offline' ? (
            <View style={styles.zoomBox}>
              <View style={styles.zoomHeader}>
                <View style={styles.zoomHeaderLeft}>
                  <MaterialIcons name="video-call" size={18} color={colors.outline} />
                  <Text style={styles.zoomTitle}>Tautan Video Conference Resmi</Text>
                </View>
                <Text style={styles.zoomBadge}>Zoom Meeting Pro</Text>
              </View>
              <TextInput
                style={styles.zoomInput}
                value={zoomUrl}
                onChangeText={setZoomUrl}
                placeholder="https://zoom.lldikti10.kemdikbud.go.id/..."
              />
              <View style={styles.zoomMetaRow}>
                <View style={styles.zoomMetaCol}>
                  <Text style={styles.zoomMetaLabel}>Meeting ID:</Text>
                  <Text style={styles.zoomMetaValue}>{meetingIdInput}</Text>
                </View>
                <View style={styles.zoomMetaCol}>
                  <Text style={styles.zoomMetaLabel}>Passcode:</Text>
                  <Text style={styles.zoomMetaValue}>{passcode}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>

        {/* SECTION 3: Sasaran & Unit Kerja Diundang */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>3. Sasaran & Unit Kerja Diundang</Text>
            <Text style={styles.sectionSubtitle}>
              Penetapan batas unit peserta rapat kedinasan
            </Text>
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
              name={scopeUniversal ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={20}
              color={scopeUniversal ? colors.primary : colors.outline}
            />
            <View style={styles.radioTextWrap}>
              <Text style={styles.radioTitle}>
                Buka untuk Seluruh Unit Kerja (Pleno / Universal)
              </Text>
              <Text style={styles.radioSub}>
                Semua ASN & Tenaga Kontrak di lingkungan LLDIKTI Wilayah X akan mendapatkan lembar daftar hadir.
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
              name={!scopeUniversal ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={20}
              color={!scopeUniversal ? colors.primary : colors.outline}
            />
            <View style={styles.radioTextWrap}>
              <Text style={styles.radioTitle}>
                Unit Kerja Tertentu (Pilih Subbagian / Pokja)
              </Text>
              <Text style={styles.radioSub}>
                Khusus unit kerja yang dicentang secara spesifik.
              </Text>
            </View>
          </Pressable>

          {/* Unit Kerja Chips (11 Unit Aktif) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Rincian Unit Kerja yang Tercakup (11 Unit Aktif):
            </Text>
            <View style={styles.chipsWrap}>
              {UNIT_KERJA_LIST.map((unit) => {
                const selected = scopeUniversal || selectedUnits.includes(unit);
                return (
                  <Pressable
                    key={unit}
                    onPress={() => !scopeUniversal && toggleUnit(unit)}
                    style={[
                      styles.unitChip,
                      selected && styles.unitChipSelected,
                    ]}
                  >
                    {selected ? (
                      <MaterialIcons name="check" size={14} color={colors.primary} />
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
        </View>

        {/* SECTION 4: Berkas Surat Undangan Resmi */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>4. Berkas Surat Undangan Resmi</Text>
            <Text style={styles.sectionSubtitle}>
              Dokumen nota dinas atau surat panggilan rapat
            </Text>
          </View>

          {/* Upload Dropzone */}
          <Pressable onPress={handleUploadFile} style={styles.dropzone}>
            <View style={styles.dropzoneIconWrap}>
              <MaterialIcons name="upload-file" size={26} color={colors.outline} />
            </View>
            <Text style={styles.dropzoneTitle}>
              Unggah Berkas Surat Undangan Resmi
            </Text>
            <Text style={styles.dropzoneSub}>
              Format PDF atau JPG bertanda tangan digital (Maksimal 5 MB)
            </Text>
            <View style={styles.browseBtn}>
              <MaterialIcons name="folder-open" size={16} color={colors.outline} />
              <Text style={styles.browseBtnText}>Telusuri Dokumen</Text>
            </View>
          </Pressable>

          {/* Attached File Card */}
          {attachedFile ? (
            <View style={styles.attachedCard}>
              <View style={styles.attachedLeft}>
                <View style={styles.attachedIconBox}>
                  <MaterialIcons name="picture-as-pdf" size={20} color={colors.error} />
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
                    Alert.alert('Pratinjau', `Melihat isi ${attachedFile}`)
                  }
                  style={styles.attachedActionBtn}
                >
                  <MaterialIcons name="visibility" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
                <Pressable
                  onPress={() => setAttachedFile(null)}
                  style={styles.attachedActionBtn}
                >
                  <MaterialIcons name="delete" size={18} color={colors.error} />
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
            <MaterialIcons name="check-circle" size={18} color={colors.onPrimary} />
            <Text style={styles.publishButtonText}>
              {isLoading ? 'Menerbitkan...' : 'Terbitkan Agenda'}
            </Text>
          </Pressable>
        </View>
      </View>
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
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: spacing.sm + 2,
    ...elevations.level1,
  },
  sectionHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.3)',
    paddingBottom: spacing.xs + 2,
    marginBottom: 2,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  sectionSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  fieldGroup: {
    gap: 3,
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
    backgroundColor: colors.surfaceContainerLowest,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  fieldHint: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  classificationSelector: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
  },
  classificationValue: {
    ...typography.bodyMd,
    fontSize: 12.5,
    color: colors.onSurface,
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
    ...elevations.level1,
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
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLowest,
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
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  leaderNip: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  changeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
  },
  changeBtnText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  notulisBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    borderRadius: rounded.md,
    backgroundColor: 'rgba(239, 244, 255, 0.5)',
  },
  notulisLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  notulisText: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  searchCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInputBox: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
  },
  dateInput: {
    flex: 1,
    ...typography.bodyMd,
    fontSize: 12.5,
    color: colors.onSurface,
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
    backgroundColor: colors.surfaceContainerLowest,
  },
  durationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(239, 244, 255, 0.6)',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
  },
  durationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationLabel: {
    ...typography.labelMd,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
  },
  durationValue: {
    ...typography.labelMono,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
  },
  venueBox: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainerLowest,
  },
  venueInput: {
    flex: 1,
    ...typography.bodyMd,
    fontSize: 12.5,
    color: colors.onSurface,
  },
  zoomBox: {
    padding: spacing.sm + 2,
    backgroundColor: 'rgba(239, 244, 255, 0.5)',
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    gap: 6,
  },
  zoomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoomHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zoomTitle: {
    ...typography.labelMd,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  zoomBadge: {
    ...typography.labelSm,
    fontSize: 10,
    backgroundColor: colors.surfaceContainerLowest,
    color: colors.onSurfaceVariant,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  zoomInput: {
    height: 38,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: rounded.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurface,
  },
  zoomMetaRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    paddingTop: 2,
  },
  zoomMetaCol: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  zoomMetaLabel: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  zoomMetaValue: {
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
    backgroundColor: colors.surfaceContainerLowest,
    gap: 10,
    alignItems: 'flex-start',
  },
  radioCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(239, 244, 255, 0.4)',
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
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  unitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    backgroundColor: colors.surfaceContainerLowest,
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
    color: colors.onSurface,
    fontWeight: '600',
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(197, 197, 211, 0.6)',
    borderRadius: rounded.lg,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 244, 255, 0.3)',
  },
  dropzoneIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
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
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  browseBtnText: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
  },
  attachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
    backgroundColor: colors.surfaceContainerLowest,
    marginTop: 4,
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
  },
  attachedActions: {
    flexDirection: 'row',
    gap: 4,
  },
  attachedActionBtn: {
    width: 30,
    height: 30,
    borderRadius: rounded.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...elevations.level3,
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
    backgroundColor: colors.surfaceContainerLowest,
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
    ...elevations.level1,
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
});
