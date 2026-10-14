import React, { useEffect, useState } from 'react';
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
import { ErrorState } from '../components/common/ErrorState';
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
  | 'date';

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

function localDateIso(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CreateMeetingScreen: React.FC<CreateMeetingScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const { createMeeting, isLoading, error, formOptions, isFormOptionsLoading, formOptionsError, fetchAgendaFormOptions } = useMeetingStore();
  useEffect(() => { void fetchAgendaFormOptions(); }, [fetchAgendaFormOptions]);

  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState('koordinasi');
  const [formatType, setFormatType] = useState<MeetingType>('hybrid');
  const [leaderId, setLeaderId] = useState('');
  const [notulisId, setNotulisId] = useState('');

  const [dateIso, setDateIso] = useState(localDateIso(new Date()));
  const date = new Date(`${dateIso}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [venue, setVenue] = useState('');
  const [zoomUrl, setZoomUrl] = useState('');

  const [scopeUniversal, setScopeUniversal] = useState(true);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  const attachedFile: string | null = null;

  const leader = formOptions?.users.find((person) => person.id === leaderId);
  const notulis = formOptions?.users.find((person) => person.id === notulisId);
  const peopleOptions: AgendaOption[] = (formOptions?.users ?? []).map((person) => ({
    id: person.id, title: person.name,
    subtitle: [person.role, person.nip ? `NIP ${person.nip}` : null, person.unitName].filter(Boolean).join(' • '),
    badge: person.role, icon: 'person',
  }));
  const dateOptions: AgendaOption[] = Array.from({ length: 30 }, (_, offset) => {
    const value = new Date(); value.setDate(value.getDate() + offset);
    const id = localDateIso(value);
    return { id, title: value.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), subtitle: '', badge: offset === 0 ? 'Hari ini' : offset === 1 ? 'Besok' : undefined, icon: 'event' };
  });
  const durationMinutes = (() => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    return Math.max(0, endHour * 60 + endMinute - startHour * 60 - startMinute);
  })();

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
      type: 'info',
      message: 'Unggah surat edaran belum termasuk integrasi tahap ini.',
    });
  };

  const handleSubmit = async (status: 'draft' | 'scheduled' = 'scheduled') => {
    if (!title.trim()) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Harap isi perihal agenda rapat kedinasan.',
      });
      return;
    }

    if ((!scopeUniversal && selectedUnits.length === 0) || (formatType !== 'online' && !venue.trim()) || (formatType !== 'offline' && !zoomUrl.trim())) {
      useFeedbackStore.getState().showToast({ type: 'warning', message: 'Lengkapi lokasi/tautan rapat dan pilih minimal satu unit untuk sasaran khusus.' });
      return;
    }
    const created = await createMeeting({
      judul_rapat: title.trim(), jenis_rapat: selectedClassification.title,
      tipe_rapat: formatType, lokasi_ruang: formatType === 'online' ? null : venue.trim(),
      link_meeting: formatType === 'offline' ? null : zoomUrl.trim(),
      waktu_mulai: `${dateIso}T${startTime}:00+07:00`, waktu_selesai: `${dateIso}T${endTime}:00+07:00`,
      pimpinan_id: leaderId ? Number(leaderId) : null, notulis_id: notulisId ? Number(notulisId) : null,
      is_all_units: scopeUniversal, unit_ids: scopeUniversal ? undefined : selectedUnits.map(Number),
      status,
    });

    if (created) {
      useFeedbackStore.getState().showModal({
        type: 'success',
        title: status === 'draft' ? 'Konsep Agenda Tersimpan' : 'Agenda Rapat Berhasil Diterbitkan',
        message: status === 'draft' ? 'Konsep agenda berhasil disimpan sebagai draf di server.' : 'Agenda rapat berhasil disimpan oleh server.',
        detail: {
          'Kode Rapat': created.code,
          'Perihal': created.title,
          'Format': formatType.toUpperCase(),
          'Pimpinan': leader?.name ?? 'Belum ditentukan',
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
          options: peopleOptions,
          selectedId: leaderId,
        };
      case 'notulis':
        return {
          title: 'Pilih Petugas Notulis',
          subtitle: 'Petugas penyusun risalah dan notulensi sidang',
          options: peopleOptions,
          selectedId: notulisId,
        };
      case 'date':
        return {
          title: 'Pilih Tanggal Pelaksanaan',
          subtitle: 'Jadwal hari kerja pelaksanaan agenda kedinasan',
          options: dateOptions,
          selectedId: dateIso,
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
        setLeaderId(option.id);
        break;
      case 'notulis':
        setNotulisId(option.id);
        break;
      case 'date':
        setDateIso(option.id);
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
        {isFormOptionsLoading ? <Text style={styles.formNotice}>Memuat daftar pengguna dan unit…</Text> : null}
        {formOptionsError ? <ErrorState message={formOptionsError} onRetry={fetchAgendaFormOptions} /> : null}
        {error ? <ErrorState message={error} /> : null}
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
                  {(leader?.name ?? '')
                    .split(' ')
                    .map((n) => n[0])
                    .filter((c) => /^[A-Z]$/i.test(c))
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'PJ'}
                </Text>
              </View>
              <View style={styles.entityInfo}>
                <Text style={styles.entityName}>{leader?.name ?? 'Pilih pimpinan dari daftar pengguna'}</Text>
                <Text style={styles.entitySub}>
                  {leader ? `${leader.role}${leader.nip ? ` • NIP. ${leader.nip}` : ''}` : 'Data dari server'}
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
                <Text style={styles.entityName}>{notulis?.name ?? 'Pilih notulis (opsional)'}</Text>
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
              Estimasi Durasi: {Math.floor(durationMinutes / 60)} Jam {String(durationMinutes % 60).padStart(2, '0')} Menit
            </Text>
          </View>

          {/* Venue Location Selector (Offline / Hybrid) */}
          {formatType !== 'online' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Ruang Rapat / Lokasi <Text style={styles.required}>*</Text>
              </Text>
              <TextInput style={styles.virtualInput} value={venue} onChangeText={setVenue} placeholder="Masukkan lokasi rapat" placeholderTextColor={colors.outline} />
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
                  <Text style={styles.virtualMetaValue}>Sesuai tautan</Text>
                </View>
                <View style={styles.virtualMetaCol}>
                  <Text style={styles.virtualMetaLabel}>Passcode</Text>
                  <Text style={styles.virtualMetaValue}>Sesuai tautan</Text>
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
                Agenda ini ditujukan untuk seluruh unit kerja yang tercatat pada server.
              </Text>
            </View>
          ) : (
            <View style={styles.unitSelectSection}>
              <Text style={styles.unitSelectHeader}>
                Pilih Unit Kerja ({selectedUnits.length} dipilih):
              </Text>
              <View style={styles.chipsWrap}>
                {(formOptions?.units ?? []).map((unit) => {
                  const selected = selectedUnits.includes(unit.id);
                  return (
                    <Pressable
                      key={unit.id}
                      onPress={() => toggleUnit(unit.id)}
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
                        {unit.name}
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
                  onPress={() => undefined}
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
            onPress={() => handleSubmit('draft')}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.draftButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons name="save" size={18} color={colors.outline} />
            <Text style={styles.draftButtonText}>Simpan Konsep</Text>
          </Pressable>

          <Pressable
            onPress={() => handleSubmit('scheduled')}
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
  formNotice: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
