import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import {
  AlertCircle,
  AtSign,
  Award,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Contact,
  Eye,
  EyeOff,
  Fingerprint,
  History,
  Info,
  KeyRound,
  Lock,
  Mail,
  Network,
  PauseCircle,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserCheck,
  UserCog,
  UserX,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { FeedbackModal } from '../components/modals/FeedbackModal';
import { PANGKAT_GOLONGAN_OPTIONS } from '../constants/employeeOptions';
import { useEmployeeStore } from '../store/useEmployeeStore';
import { useAuthStore } from '../store/useAuthStore';
import { cleanNIP, validateNIP } from '../../core/utils/nipValidator';

interface EditEmployeeScreenProps {
  employeeId: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

function formatIndonesianDate(iso?: string | null): string {
  if (!iso) return '-';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const EditEmployeeScreen: React.FC<EditEmployeeScreenProps> = ({
  employeeId,
  onBack,
  onSuccess,
}) => {
  const authUser = useAuthStore((state) => state.user);
  const isAdministrator = authUser?.role === 'administrator';
  const isEditingSelf = authUser != null && String(authUser.id) === String(employeeId);

  const {
    fetchEmployeeById,
    fetchAllUnits,
    updateEmployee,
    selectedEmployee,
    selectedUserDetail,
    allUnits,
    isLoading,
    error,
    validationErrors,
    clearError,
  } = useEmployeeStore();

  const [isInitializing, setIsInitializing] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [pangkatGolongan, setPangkatGolongan] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [role, setRole] = useState<'Administrator' | 'Admin Unit' | 'Staff'>('Staff');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Modals
  const [activeModal, setActiveModal] = useState<'none' | 'unit' | 'pangkat'>('none');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updatedSummary, setUpdatedSummary] = useState<{
    name: string;
    nip: string;
    unit: string;
    role: string;
    status: string;
  } | null>(null);

  // Load employee data & units on mount
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsInitializing(true);
      const [emp] = await Promise.all([
        fetchEmployeeById(employeeId),
        fetchAllUnits({ activeOnly: true }),
      ]);
      if (emp && isMounted) {
        setName(emp.name);
        setNip(cleanNIP(emp.nip || ''));
        setJabatan(emp.jabatan || '');
        setPangkatGolongan(emp.pangkatGolongan || 'Penata Tingkat I (III/d)');
        setSelectedUnitId(emp.unitId ?? null);
        setRole(emp.role);
        setStatus(emp.status);
        setUsername(emp.username);
        setEmail(emp.email || '');
        setPhone(emp.phone && emp.phone !== '-' ? emp.phone : '');
        setPassword('');
      }
      if (isMounted) {
        setIsInitializing(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [employeeId, fetchEmployeeById, fetchAllUnits]);

  const unitModalOptions = useMemo<AgendaOption[]>(() => {
    const items: AgendaOption[] = [];
    if (isAdministrator) {
      items.push({
        id: '',
        title: '-- Tingkat Lembaga (Tanpa Unit) --',
        subtitle: 'Pengguna tingkat lembaga tanpa penugasan unit kerja spesifik',
        icon: Building2,
      });
    }
    const seenIds = new Set<number>();
    allUnits.forEach((u) => {
      seenIds.add(u.id);
      items.push({
        id: String(u.id),
        title: `${u.kode_unit} — ${u.nama_unit}`,
        subtitle: u.deskripsi ?? undefined,
        icon: Building2,
      });
    });
    const currentUnit = selectedUserDetail?.unit;
    if (currentUnit && !seenIds.has(currentUnit.id)) {
      items.push({
        id: String(currentUnit.id),
        title: `${currentUnit.kode_unit} — ${currentUnit.nama_unit}`,
        subtitle: currentUnit.is_active ? currentUnit.deskripsi ?? undefined : 'Unit saat ini (nonaktif)',
        icon: Building2,
      });
    }
    return items;
  }, [allUnits, isAdministrator, selectedUserDetail?.unit]);

  const selectedUnitRecord = useMemo(() => {
    if (selectedUnitId == null) return null;
    return (
      allUnits.find((u) => u.id === selectedUnitId) ??
      (selectedUserDetail?.unit?.id === selectedUnitId ? selectedUserDetail.unit : null)
    );
  }, [allUnits, selectedUnitId, selectedUserDetail?.unit]);

  const displayUnitLabel = useMemo(() => {
    if (selectedUnitId == null) {
      return '-- Tingkat Lembaga (Tanpa Unit) --';
    }
    if (selectedUnitRecord) {
      return `${selectedUnitRecord.kode_unit} — ${selectedUnitRecord.nama_unit}`;
    }
    if (selectedEmployee?.unit) {
      return selectedEmployee.unit;
    }
    return `Unit #${selectedUnitId}`;
  }, [selectedUnitId, selectedUnitRecord, selectedEmployee?.unit]);

  const nipValidation = validateNIP(nip);
  const isNipComplete = nip.length === 18;
  const isPasswordRuleOk =
    password === '' ||
    (password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password));
  const cleanUsernameVal = username.replace(/^@+/, '').trim();

  const isFormValid =
    name.trim().length >= 3 &&
    isNipComplete &&
    nipValidation.isValid &&
    cleanUsernameVal.length > 0 &&
    email.trim().includes('@') &&
    isPasswordRuleOk &&
    (isAdministrator || selectedUnitId != null);

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    clearError();
    const finalUsername = username.trim().startsWith('@')
      ? username.trim()
      : `@${username.trim()}`;

    const effectiveUnitId = isAdministrator
      ? selectedUnitId
      : (selectedEmployee?.unitId ?? authUser?.unitId ?? null);

    const result = await updateEmployee(employeeId, {
      name: name.trim(),
      nip,
      jabatan: jabatan.trim(),
      pangkatGolongan,
      unit: selectedUnitRecord?.nama_unit ?? '',
      unitId: effectiveUnitId,
      role: isEditingSelf ? (selectedEmployee?.role ?? role) : role,
      status: isEditingSelf ? (selectedEmployee?.status ?? status) : status,
      username: finalUsername || selectedEmployee?.username || '@asn',
      email: email.trim(),
      phone: phone.trim(),
      password: password || undefined,
    });

    if (result) {
      setUpdatedSummary({
        name: result.name,
        nip: result.nip,
        unit: result.unit || 'Tingkat Lembaga (Tanpa Unit)',
        role: result.role,
        status: result.status,
      });
      setShowSuccessModal(true);
    }
  };

  const isActionHandledRef = React.useRef(false);

  const handleBack = () => {
    if (isActionHandledRef.current) return;
    isActionHandledRef.current = true;
    onBack?.();
  };

  const handleSuccessClose = () => {
    if (isActionHandledRef.current) return;
    isActionHandledRef.current = true;
    setShowSuccessModal(false);
    if (onSuccess) {
      onSuccess();
    } else if (onBack) {
      onBack();
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <Header
          title="Edit Pegawai ASN"
          subtitle="Pembaruan Data & Penugasan Personel"
          showBack={Boolean(onBack)}
          onBack={handleBack}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Memuat data kepegawaian ASN...</Text>
        </View>
      </View>
    );
  }

  if (!selectedEmployee && !isInitializing) {
    return (
      <View style={styles.container}>
        <Header
          title="Edit Pegawai ASN"
          subtitle="Pembaruan Data & Penugasan Personel"
          showBack={Boolean(onBack)}
          onBack={handleBack}
        />
        <View style={styles.notFoundContainer}>
          <UserX size={48} color={colors.outline} strokeWidth={2} />
          <Text style={styles.notFoundTitle}>Pegawai Tidak Ditemukan</Text>
          <Text style={styles.notFoundSubtitle}>
            Data aparatur dengan ID {employeeId} tidak ditemukan dalam arsip lokal sistem.
          </Text>
          {onBack && (
            <Button
              title="Kembali ke Direktori"
              onPress={handleBack}
              variant="primary"
              size="md"
              style={{ marginTop: spacing.md }}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Edit Pegawai ASN"
        subtitle="Pembaruan Data & Penugasan Personel"
        showBack={Boolean(onBack)}
        onBack={handleBack}
      />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={colors.error} strokeWidth={2} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* IDENTITY & ATTENDANCE SUMMARY CARD */}
          <View style={styles.contextCard}>
            <View style={styles.contextTopRow}>
              <View style={styles.contextAvatar}>
                <Text style={styles.contextAvatarText}>
                  {selectedEmployee?.initials || 'AS'}
                </Text>
              </View>
              <View style={styles.contextMeta}>
                <Text style={styles.contextName} numberOfLines={1}>
                  {selectedEmployee?.name}
                </Text>
                <View style={styles.contextBadgeRow}>
                  <View style={styles.lockBadge}>
                    <Fingerprint size={11} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.lockBadgeText}>
                      NIP {selectedEmployee?.nip || '-'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      selectedEmployee?.status === 'Aktif'
                        ? styles.statusPillActive
                        : styles.statusPillInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        selectedEmployee?.status === 'Aktif'
                          ? styles.statusPillTextActive
                          : styles.statusPillTextInactive,
                      ]}
                    >
                      {selectedEmployee?.status}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.contextStatsRow}>
              <View style={styles.contextStatItem}>
                <View style={styles.contextStatHeader}>
                  <CheckCircle2 size={13} color={colors.success} strokeWidth={2} />
                  <Text style={styles.contextStatLabel}>Total Hadir Rapat</Text>
                </View>
                <Text style={styles.contextStatValue}>
                  {selectedUserDetail?.attendance_stats?.total_attended ?? 0} Rapat
                </Text>
                <Text style={styles.contextStatHint}>
                  Tingkat hadir {selectedUserDetail?.attendance_stats?.attendance_rate_label ?? '0%'}
                </Text>
              </View>
              <View style={styles.contextStatDivider} />
              <View style={styles.contextStatItem}>
                <View style={styles.contextStatHeader}>
                  <Calendar size={13} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.contextStatLabel}>Terdaftar Sejak</Text>
                </View>
                <Text style={styles.contextStatValue}>
                  {formatIndonesianDate(selectedUserDetail?.created_at)}
                </Text>
                <Text style={styles.contextStatHint}>
                  {selectedUserDetail?.attendance_stats?.period_label || 'Data kedinasan'}
                </Text>
              </View>
            </View>
          </View>

          {/* BAGIAN 1: IDENTITAS APARATUR */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <UserCheck size={16} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.sectionTitle}>Identitas Aparatur Sipil Negara</Text>
            </View>

            {/* Nama Lengkap & Gelar */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Nama Lengkap & Gelar Resmi <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="Nama aparatur..."
                value={name}
                onChangeText={setName}
                error={validationErrors?.name?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <User size={18} color={colors.outline} strokeWidth={2} />
                }
              />
            </View>

            {/* NIP 18 Digit (Editable) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  NIP 18 Digit Resmi <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.nipCounter}>{nip.length}/18 digit</Text>
              </View>
              <Input
                placeholder="19XXXXXXXXXXXXXXNN"
                value={nip}
                onChangeText={(val) => setNip(cleanNIP(val))}
                keyboardType="numeric"
                maxLength={18}
                isMono
                error={validationErrors?.nip?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <Fingerprint size={18} color={colors.outline} strokeWidth={2} />
                }
              />
              {nip.length > 0 && (
                <View
                  style={[
                    styles.nipValidationPill,
                    isNipComplete && nipValidation.isValid
                      ? styles.nipValidationSuccess
                      : styles.nipValidationPending,
                  ]}
                >
                  {isNipComplete && nipValidation.isValid ? (
                    <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
                  ) : (
                    <Info size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
                  )}
                  <Text
                    style={[
                      styles.nipValidationText,
                      isNipComplete && nipValidation.isValid
                        ? styles.nipValidationTextSuccess
                        : styles.nipValidationTextPending,
                    ]}
                  >
                    {isNipComplete
                      ? nipValidation.isValid
                        ? `Valid: Lahir ${nipValidation.birthYear} · Jenis Kelamin: ${nipValidation.gender}`
                        : 'Format 18 digit tidak sesuai ketentuan BKN'
                      : `Kurang ${18 - nip.length} digit lagi untuk validasi resmi`}
                  </Text>
                </View>
              )}
            </View>

            {/* Jabatan Kedinasan */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Jabatan Kedinasan / Fungsional</Text>
              <Input
                placeholder="Jabatan kedinasan..."
                value={jabatan}
                onChangeText={setJabatan}
                error={validationErrors?.jabatan?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <Briefcase size={18} color={colors.outline} strokeWidth={2} />
                }
              />
            </View>

            {/* Pangkat & Golongan Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Pangkat & Golongan Ruang <Text style={styles.required}>*</Text>
              </Text>
              <Pressable
                onPress={() => setActiveModal('pangkat')}
                style={({ pressed }) => [
                  styles.selectorTrigger,
                  pressed && styles.pressedState,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Pilih Pangkat dan Golongan"
              >
                <View style={styles.selectorLeft}>
                  <Award size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {pangkatGolongan}
                  </Text>
                </View>
                <View style={styles.selectorRight}>
                  <Text style={styles.selectorActionText}>Ubah</Text>
                  <ChevronsUpDown size={18} color={colors.outline} strokeWidth={2} />
                </View>
              </Pressable>
            </View>
          </View>

          {/* BAGIAN 2: PENUGASAN UNIT & PERAN SISTEM */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Network size={16} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.sectionTitle}>Penugasan Unit & Peran Sistem</Text>
            </View>

            {/* Unit Kerja / Pokja Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Unit Kerja / Tim Kerja{' '}
                {!isAdministrator ? <Text style={styles.required}>*</Text> : null}
              </Text>
              {isAdministrator ? (
                <Pressable
                  onPress={() => setActiveModal('unit')}
                  style={({ pressed }) => [
                    styles.selectorTrigger,
                    pressed && styles.pressedState,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Pilih Unit Kerja"
                >
                  <View style={styles.selectorLeft}>
                    <Building2 size={18} color={colors.primary} strokeWidth={2} />
                    <Text style={styles.selectorValue} numberOfLines={1}>
                      {displayUnitLabel}
                    </Text>
                  </View>
                  <View style={styles.selectorRight}>
                    <Text style={styles.selectorActionText}>Ubah</Text>
                    <ChevronsUpDown size={18} color={colors.outline} strokeWidth={2} />
                  </View>
                </Pressable>
              ) : (
                <View style={styles.readonlyTrigger}>
                  <View style={styles.selectorLeft}>
                    <Building2 size={18} color={colors.outline} strokeWidth={2} />
                    <Text style={styles.readonlyText} numberOfLines={1}>
                      {displayUnitLabel}
                    </Text>
                  </View>
                  <Lock size={15} color={colors.outline} strokeWidth={2} />
                </View>
              )}
              <Text style={styles.fieldHintText}>
                {isAdministrator
                  ? 'Pilih unit kerja atau biarkan Tingkat Lembaga (Tanpa Unit).'
                  : 'Admin Unit tidak dapat memindahkan pegawai ke unit kerja lain.'}
              </Text>
              {validationErrors?.unit_id?.[0] ? (
                <Text style={styles.fieldErrorText}>{validationErrors.unit_id[0]}</Text>
              ) : null}
            </View>

            {/* Peran Sistem */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Peran Akses Sistem SIPERAPAT <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.roleGrid}>
                {(isAdministrator
                  ? (['Staff', 'Admin Unit', 'Administrator'] as const)
                  : (['Staff', 'Admin Unit'] as const)
                ).map((r) => {
                  const isSelected = role === r;
                  const RoleIcon =
                    r === 'Administrator'
                      ? ShieldCheck
                      : r === 'Admin Unit'
                      ? UserCog
                      : User;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => {
                        if (!isEditingSelf) {
                          setRole(r);
                        }
                      }}
                      disabled={isEditingSelf}
                      style={[
                        styles.roleCard,
                        isSelected && styles.roleCardActive,
                        isEditingSelf && styles.disabledControl,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected, disabled: isEditingSelf }}
                    >
                      <View style={styles.roleCardHeader}>
                        <RoleIcon
                          size={18}
                          color={isSelected ? colors.primary : colors.outline}
                          strokeWidth={2}
                        />
                        <View
                          style={[
                            styles.radioDot,
                            isSelected && styles.radioDotActive,
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.roleTitle,
                          isSelected && styles.roleTitleActive,
                        ]}
                      >
                        {r}
                      </Text>
                      <Text style={styles.roleDesc}>
                        {r === 'Administrator'
                          ? 'Akses penuh lembaga'
                          : r === 'Admin Unit'
                          ? 'Pengelola agenda unit'
                          : 'Peserta presensi'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {isEditingSelf ? (
                <Text style={styles.fieldHintText}>
                  Anda tidak dapat mengubah peran akun Anda sendiri.
                </Text>
              ) : null}
            </View>

            {/* Status Akun */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Status Akun Kedinasan</Text>
              <View style={styles.segmentedControl}>
                <Pressable
                  onPress={() => {
                    if (!isEditingSelf) setStatus('Aktif');
                  }}
                  disabled={isEditingSelf}
                  style={[
                    styles.segmentedBtn,
                    status === 'Aktif' && styles.segmentedBtnActive,
                    isEditingSelf && styles.disabledControl,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isEditingSelf }}
                >
                  <CheckCircle2
                    size={15}
                    color={status === 'Aktif' ? colors.success : colors.outline}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.segmentedBtnText,
                      status === 'Aktif' && styles.segmentedBtnTextActive,
                    ]}
                  >
                    Aktif Bertugas
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (!isEditingSelf) setStatus('Nonaktif');
                  }}
                  disabled={isEditingSelf}
                  style={[
                    styles.segmentedBtn,
                    status === 'Nonaktif' && styles.segmentedBtnActive,
                    isEditingSelf && styles.disabledControl,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isEditingSelf }}
                >
                  <PauseCircle
                    size={15}
                    color={status === 'Nonaktif' ? colors.error : colors.outline}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.segmentedBtnText,
                      status === 'Nonaktif' && styles.segmentedBtnTextActive,
                    ]}
                  >
                    Nonaktif / Cuti
                  </Text>
                </Pressable>
              </View>
              {isEditingSelf ? (
                <Text style={styles.fieldHintText}>
                  Anda tidak dapat menonaktifkan akun Anda sendiri.
                </Text>
              ) : null}
            </View>
          </View>

          {/* BAGIAN 3: AKUN & KONTAK KEDINASAN */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Contact size={16} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.sectionTitle}>Akun & Kontak Kedinasan</Text>
            </View>

            {/* Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Username Aplikasi <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="@username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                error={validationErrors?.username?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <AtSign size={18} color={colors.outline} strokeWidth={2} />
                }
              />
            </View>

            {/* Email Kedinasan */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Email Kedinasan Resmi <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="nama@lldikti10.kemdikbud.go.id"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={validationErrors?.email?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <Mail size={18} color={colors.outline} strokeWidth={2} />
                }
              />
            </View>

            {/* Telepon / WhatsApp */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nomor Kontak / WhatsApp</Text>
              <Input
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                error={validationErrors?.no_hp?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <Phone size={18} color={colors.outline} strokeWidth={2} />
                }
              />
            </View>

            {/* Kata Sandi Baru (Opsional) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Kata Sandi Baru</Text>
              <Input
                placeholder="Kosongkan jika tidak ingin mengubah kata sandi"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                error={validationErrors?.password?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <KeyRound size={18} color={colors.outline} strokeWidth={2} />
                }
                rightAction={
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.passwordToggleBtn}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
                    ) : (
                      <Eye size={18} color={colors.onSurfaceVariant} strokeWidth={2} />
                    )}
                  </Pressable>
                }
              />
              {password.length > 0 ? (
                <View
                  style={[
                    styles.nipValidationPill,
                    isPasswordRuleOk ? styles.nipValidationSuccess : styles.nipValidationPending,
                  ]}
                >
                  {isPasswordRuleOk ? (
                    <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
                  ) : (
                    <Info size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
                  )}
                  <Text
                    style={[
                      styles.nipValidationText,
                      isPasswordRuleOk
                        ? styles.nipValidationTextSuccess
                        : styles.nipValidationTextPending,
                    ]}
                  >
                    {isPasswordRuleOk
                      ? 'Format kata sandi baru memenuhi syarat keamanan'
                      : 'Harus minimal 8 karakter serta mengandung huruf dan angka'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.fieldHintText}>
                  Kosongkan jika tidak diubah. Jika diisi, minimal 8 karakter (huruf dan angka).
                </Text>
              )}
            </View>
          </View>

          {/* BAGIAN 4: RIWAYAT PRESENSI & KEAMANAN AUDIT LOG */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <History size={16} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.sectionTitle}>
                Riwayat Presensi ({selectedUserDetail?.attendance_stats?.total_attended ?? 0})
              </Text>
            </View>

            <View style={styles.auditMetricsGrid}>
              <View style={styles.auditMetricTile}>
                <Text style={styles.auditMetricLabel}>Agenda Diikuti</Text>
                <Text style={styles.auditMetricValue}>
                  {selectedUserDetail?.attendance_stats?.total_attended ?? 0} /{' '}
                  {selectedUserDetail?.attendance_stats?.total_agendas ?? 0}
                </Text>
              </View>
              <View style={styles.auditMetricTile}>
                <Text style={styles.auditMetricLabel}>Tepat Waktu</Text>
                <Text style={styles.auditMetricValue}>
                  {selectedUserDetail?.attendance_stats?.on_time_count ?? 0} (
                  {selectedUserDetail?.attendance_stats?.on_time_rate_label ?? '0%'})
                </Text>
              </View>
            </View>

            <View style={styles.auditNoteBox}>
              <Info size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
              <Text style={styles.auditNoteText}>
                Ringkasan dihitung dari data resmi server (
                {selectedUserDetail?.attendance_stats?.period_label || 'seluruh periode'}).
                Rincian per-rapat tersedia pada modul Laporan & Riwayat.
              </Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Clock size={16} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.sectionTitle}>Keamanan & Audit Log</Text>
            </View>

            <View style={styles.auditRow}>
              <Text style={styles.auditRowLabel}>Perubahan Kata Sandi Terakhir</Text>
              <Text style={styles.auditRowValue}>
                {selectedUserDetail?.security?.last_password_changed_label || 'Belum pernah dicatat'}
              </Text>
            </View>
            <View style={styles.auditRow}>
              <Text style={styles.auditRowLabel}>Login API Terakhir</Text>
              <Text style={styles.auditRowValue}>
                {selectedUserDetail?.security?.last_api_login_label || 'Belum pernah login API'}
              </Text>
            </View>
            <View style={styles.auditRow}>
              <Text style={styles.auditRowLabel}>Pembaruan Profil Terakhir</Text>
              <Text style={styles.auditRowValue}>
                {formatIndonesianDate(selectedUserDetail?.updated_at)}
              </Text>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionSection}>
            <Button
              title="Simpan Perubahan"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={!isFormValid}
              icon={
                <Save
                  size={18}
                  color={colors.onPrimary}
                  strokeWidth={2}
                />
              }
            />

            {onBack ? (
              <Button
                title="Batal"
                onPress={onBack}
                variant="outline"
                size="md"
                disabled={isLoading}
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* POPUP MODAL: UNIT KERJA */}
      <AgendaOptionModal
        visible={activeModal === 'unit'}
        onClose={() => setActiveModal('none')}
        title="Pilih Unit Kerja / Pokja"
        subtitle="Daftar unit kerja aktif atau Tingkat Lembaga (Tanpa Unit)"
        options={unitModalOptions}
        selectedId={selectedUnitId == null ? '' : String(selectedUnitId)}
        searchable
        searchPlaceholder="Cari nama atau kode unit..."
        onSelect={(opt) => {
          setSelectedUnitId(opt.id === '' ? null : Number(opt.id));
          setActiveModal('none');
        }}
      />

      {/* POPUP MODAL: PANGKAT & GOLONGAN */}
      <AgendaOptionModal
        visible={activeModal === 'pangkat'}
        onClose={() => setActiveModal('none')}
        title="Pilih Pangkat & Golongan Ruang"
        subtitle="Jenjang kepangkatan aparatur sipil negara"
        options={PANGKAT_GOLONGAN_OPTIONS}
        selectedId={pangkatGolongan}
        onSelect={(opt) => {
          setPangkatGolongan(opt.id);
          setActiveModal('none');
        }}
      />

      {/* SUCCESS CONFIRMATION MODAL */}
      <FeedbackModal
        visible={showSuccessModal}
        onClose={handleSuccessClose}
        type="success"
        title="Perubahan Berhasil Disimpan"
        message="Data profil dan penugasan kedinasan aparatur sipil negara telah diperbarui pada sistem SIPERAPAT."
        detail={
          updatedSummary
            ? {
                Nama: updatedSummary.name,
                NIP: updatedSummary.nip,
                'Unit Baru': updatedSummary.unit,
                Peran: updatedSummary.role,
                Status: updatedSummary.status,
              }
            : undefined
        }
        confirmText="Kembali ke Direktori Pegawai"
        onConfirm={handleSuccessClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl + spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.xs,
  },
  notFoundTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  notFoundSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.errorContainer,
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  errorBannerText: {
    ...typography.bodySm,
    color: colors.onErrorContainer,
    flex: 1,
  },
  contextCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  contextTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  contextAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextAvatarText: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 16,
    color: colors.onPrimary,
  },
  contextMeta: {
    flex: 1,
    gap: 3,
  },
  contextName: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  contextBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
  },
  lockBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10,
    color: colors.primary,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
    borderWidth: 1,
  },
  statusPillActive: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  statusPillInactive: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.errorBorder,
  },
  statusPillText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 10,
  },
  statusPillTextActive: {
    color: colors.onSuccessContainer,
  },
  statusPillTextInactive: {
    color: colors.onErrorContainer,
  },
  sectionCard: {
    ...cardSurface,
    padding: spacing.md,
    gap: spacing.sm + 4,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.xs + 4,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  fieldGroup: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  lockedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  lockedIndicatorText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.outline,
  },
  required: {
    color: colors.error,
  },
  inputContainerReset: {
    marginBottom: 0,
  },
  readonlyInput: {
    color: colors.onSurfaceVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  selectorTrigger: {
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
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
    gap: 4,
  },
  selectorValue: {
    ...typography.bodyMd,
    fontSize: 12.5,
    color: colors.onSurface,
    flex: 1,
  },
  selectorActionText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.primary,
  },
  pressedState: {
    backgroundColor: colors.surfaceContainerLow,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  roleCard: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    padding: spacing.sm,
    gap: 3,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  roleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  radioDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  roleTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11.5,
    color: colors.onSurface,
  },
  roleTitleActive: {
    color: colors.primary,
  },
  roleDesc: {
    ...typography.bodySm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    lineHeight: 13,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 4,
  },
  segmentedBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: rounded.sm,
    gap: 6,
  },
  segmentedBtnActive: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  segmentedBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
  },
  segmentedBtnTextActive: {
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  actionSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  contextStatsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  contextStatItem: {
    flex: 1,
    gap: 2,
  },
  contextStatDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle,
  },
  contextStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contextStatLabel: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  contextStatValue: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    fontSize: 13.5,
  },
  contextStatHint: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  nipCounter: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  nipValidationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: rounded.sm,
    marginTop: 4,
  },
  nipValidationSuccess: {
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  nipValidationPending: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  nipValidationText: {
    ...typography.bodySm,
    fontSize: 11,
    flex: 1,
  },
  nipValidationTextSuccess: {
    color: colors.onSuccessContainer,
    fontFamily: fontFamilies.sansSemiBold,
  },
  nipValidationTextPending: {
    color: colors.onSurfaceVariant,
  },
  readonlyTrigger: {
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
  },
  readonlyText: {
    ...typography.bodyMd,
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  disabledControl: {
    opacity: 0.65,
  },
  passwordToggleBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.xs,
  },
  fieldHintText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  fieldErrorText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.error,
    marginTop: 2,
  },
  auditMetricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  auditMetricTile: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    padding: spacing.sm,
    gap: 2,
  },
  auditMetricLabel: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  auditMetricValue: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    fontSize: 13,
  },
  auditNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  auditNoteText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  auditRowLabel: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  auditRowValue: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11.5,
    color: colors.onSurface,
    textAlign: 'right',
  },
});
