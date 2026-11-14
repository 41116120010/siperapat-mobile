import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AlertCircle,
  AtSign,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  Fingerprint,
  History,
  Info,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { AutoScrollText } from '../components/common/AutoScrollText';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { TutWuriLoader } from '../components/common/TutWuriLoader';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { FeedbackModal } from '../components/modals/FeedbackModal';
import { useEmployeeStore } from '../store/useEmployeeStore';
import { useAuthStore } from '../store/useAuthStore';
import { cleanNIP, validateNIP } from '../../core/utils/nipValidator';
import { formatTanggalSingkat } from '../../core/utils/dateFormatter';

interface EditEmployeeScreenProps {
  employeeId: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

function formatIndonesianDate(iso?: string | null): string {
  if (!iso) return '-';
  return formatTanggalSingkat(iso);
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

  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Administrator' | 'Admin Unit' | 'Staff'>('Staff');
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [activeModal, setActiveModal] = useState<'none' | 'role' | 'unit'>('none');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [updatedSummary, setUpdatedSummary] = useState<{
    name: string;
    nip: string;
    unit: string;
    role: string;
    status: string;
  } | null>(null);

  const isActionHandledRef = useRef(false);

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
        setUsername((emp.username || '').replace(/^@+/, ''));
        setEmail(emp.email || '');
        setPhone(emp.phone && emp.phone !== '-' ? emp.phone : '');
        setRole(emp.role);
        setSelectedUnitId(emp.unitId ?? null);
        setIsActive(emp.status === 'Aktif');
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

  const roleModalOptions = useMemo<AgendaOption[]>(() => {
    const items: AgendaOption[] = [
      {
        id: 'Staff',
        title: 'Staff Pegawai',
        subtitle: 'Portal presensi, riwayat kehadiran pribadi, dan agenda terkait',
        icon: Users,
      },
      {
        id: 'Admin Unit',
        title: 'Admin Unit',
        subtitle: 'Mengelola agenda dan pegawai di dalam unit kerjanya saja',
        icon: UserCheck,
      },
    ];
    if (isAdministrator) {
      items.push({
        id: 'Administrator',
        title: 'Administrator',
        subtitle: 'Akses penuh master data, audit trail, rekapitulasi, dan lembaga',
        icon: ShieldCheck,
      });
    }
    return items;
  }, [isAdministrator]);

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

  const displayRoleLabel = useMemo(() => {
    if (isEditingSelf && isAdministrator && role === 'Administrator') {
      return 'Administrator (Akun Anda Sendiri)';
    }
    return role === 'Staff' ? 'Staff Pegawai' : role;
  }, [isEditingSelf, isAdministrator, role]);

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

    const effectiveUnitId = isAdministrator
      ? selectedUnitId
      : (selectedEmployee?.unitId ?? authUser?.unitId ?? null);

    const nextStatus = isEditingSelf
      ? (selectedEmployee?.status ?? (isActive ? 'Aktif' : 'Nonaktif'))
      : isActive
      ? 'Aktif'
      : 'Nonaktif';

    const result = await updateEmployee(employeeId, {
      name: name.trim(),
      nip,
      username: cleanUsernameVal || selectedEmployee?.username.replace(/^@+/, '') || 'asn',
      email: email.trim(),
      phone: phone.trim(),
      role: isEditingSelf ? (selectedEmployee?.role ?? role) : role,
      unit: selectedUnitRecord?.nama_unit ?? '',
      unitId: effectiveUnitId,
      password: password || undefined,
      status: nextStatus,
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
        <Header title="Edit Data Pengguna" showBack={Boolean(onBack)} onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <TutWuriLoader size="lg" />
          <Text style={styles.loadingText}>Memuat data pengguna...</Text>
        </View>
      </View>
    );
  }

  if (!selectedEmployee) {
    return (
      <View style={styles.container}>
        <Header title="Edit Data Pengguna" showBack={Boolean(onBack)} onBack={handleBack} />
        <View style={styles.notFoundContainer}>
          <UserX size={48} color={colors.textMuted} strokeWidth={2} />
          <Text style={styles.notFoundTitle}>Pengguna Tidak Ditemukan</Text>
          <Text style={styles.notFoundSubtitle}>
            Data pengguna dengan ID #{employeeId} tidak tersedia atau telah dihapus.
          </Text>
          {onBack ? (
            <Button title="Kembali" onPress={handleBack} variant="primary" size="md" />
          ) : null}
        </View>
      </View>
    );
  }

  const initials =
    selectedEmployee.initials ||
    (name || selectedEmployee.name)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') ||
    'PN';

  const totalAttended =
    selectedUserDetail?.attendance_stats?.total_attended ??
    selectedEmployee.totalMeetings ??
    0;

  return (
    <View style={styles.container}>
      <Header
        title="Edit Data Pengguna"
        subtitle={`Perbarui informasi akun dan hak akses ${selectedEmployee.name}`}
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
          {error ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={colors.error} strokeWidth={2} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* FORM CARD (1:1 users/edit.blade.php field order) */}
          <View style={styles.formCard}>
            {/* 1. Nama Lengkap & Gelar * */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Nama Lengkap & Gelar <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="Cth: Dr. Budi Santoso, M.Kom"
                value={name}
                onChangeText={setName}
                error={validationErrors?.name?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={<User size={18} color={colors.outline} strokeWidth={2} />}
              />
            </View>

            {/* 2. Nomor Induk Pegawai (NIP) * */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Nomor Induk Pegawai (NIP) <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="18 Digit Angka NIP"
                value={nip}
                onChangeText={(val) => setNip(cleanNIP(val))}
                keyboardType="numeric"
                maxLength={18}
                error={validationErrors?.nip?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={<Fingerprint size={18} color={colors.outline} strokeWidth={2} />}
                rightAction={<Text style={styles.nipCounter}>{nip.length}/18</Text>}
              />
              {nip.length > 0 ? (
                <View
                  style={[
                    styles.validationPill,
                    isNipComplete && nipValidation.isValid
                      ? styles.validationPillSuccess
                      : styles.validationPillPending,
                  ]}
                >
                  {isNipComplete && nipValidation.isValid ? (
                    <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
                  ) : (
                    <Info size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
                  )}
                  <Text
                    style={[
                      styles.validationText,
                      isNipComplete && nipValidation.isValid
                        ? styles.validationTextSuccess
                        : styles.validationTextPending,
                    ]}
                  >
                    {isNipComplete
                      ? nipValidation.isValid
                        ? `Valid: Lahir ${nipValidation.birthYear} · ${nipValidation.gender}`
                        : 'Format 18 digit tidak sesuai ketentuan BKN'
                      : `Kurang ${18 - nip.length} digit lagi`}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* 3. Username * */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Username <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="Cth: budi_santoso"
                value={username}
                onChangeText={(val) => setUsername(val.replace(/^@+/, '').toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
                error={validationErrors?.username?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={<AtSign size={18} color={colors.outline} strokeWidth={2} />}
              />
            </View>

            {/* 4. Alamat Email Resmi * */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Alamat Email Resmi <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="nama@lldikti10.go.id"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={validationErrors?.email?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={<Mail size={18} color={colors.outline} strokeWidth={2} />}
              />
            </View>

            {/* 5. Nomor Telepon / WhatsApp */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nomor Telepon / WhatsApp</Text>
              <Input
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                error={validationErrors?.no_hp?.[0] ?? validationErrors?.phone?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={<Phone size={18} color={colors.outline} strokeWidth={2} />}
              />
            </View>

            {/* 6. Peran Pengguna (Role) * */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Peran Pengguna (Role) <Text style={styles.required}>*</Text>
              </Text>
              {isEditingSelf ? (
                <View style={styles.lockedFieldBox}>
                  <Lock size={16} color={colors.textMuted} strokeWidth={2} />
                  <AutoScrollText style={styles.lockedFieldText}>
                    {displayRoleLabel}
                  </AutoScrollText>
                </View>
              ) : (
                <Pressable
                  onPress={() => setActiveModal('role')}
                  style={({ pressed }) => [styles.selectorTrigger, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Pilih Peran Pengguna"
                >
                  <AutoScrollText style={styles.selectorValue}>
                    {displayRoleLabel}
                  </AutoScrollText>
                  <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
              )}
              {isEditingSelf ? (
                <Text style={styles.fieldHint}>
                  Peran akun Anda sendiri tidak dapat diubah dari halaman ini.
                </Text>
              ) : null}
            </View>

            {/* 7. Unit Kerja Organisasi */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Unit Kerja Organisasi{' '}
                {!isAdministrator ? <Text style={styles.required}>*</Text> : null}
              </Text>
              {isAdministrator ? (
                <Pressable
                  onPress={() => setActiveModal('unit')}
                  style={({ pressed }) => [styles.selectorTrigger, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Pilih Unit Kerja Organisasi"
                >
                  <AutoScrollText style={styles.selectorValue}>
                    {displayUnitLabel}
                  </AutoScrollText>
                  <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
              ) : (
                <View style={styles.lockedFieldBox}>
                  <Building2 size={16} color={colors.textMuted} strokeWidth={2} />
                  <AutoScrollText style={styles.lockedFieldText}>
                    {displayUnitLabel}
                  </AutoScrollText>
                </View>
              )}
            </View>

            {/* 8. Kata Sandi Baru (Kosongkan jika tidak diubah) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Kata Sandi Baru (Kosongkan jika tidak diubah)</Text>
              <Input
                placeholder="Minimal 8 karakter (huruf & angka)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                error={validationErrors?.password?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={<KeyRound size={18} color={colors.outline} strokeWidth={2} />}
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
                    styles.validationPill,
                    isPasswordRuleOk ? styles.validationPillSuccess : styles.validationPillPending,
                  ]}
                >
                  {isPasswordRuleOk ? (
                    <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
                  ) : (
                    <Info size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
                  )}
                  <Text
                    style={[
                      styles.validationText,
                      isPasswordRuleOk
                        ? styles.validationTextSuccess
                        : styles.validationTextPending,
                    ]}
                  >
                    {isPasswordRuleOk
                      ? 'Format kata sandi baru memenuhi syarat keamanan'
                      : 'Harus minimal 8 karakter serta mengandung huruf dan angka'}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* 9. Checkbox Akun pengguna berstatus aktif */}
            <Pressable
              onPress={() => {
                if (!isEditingSelf) {
                  setIsActive((prev) => !prev);
                }
              }}
              disabled={isEditingSelf}
              style={({ pressed }) => [
                styles.checkboxRow,
                isEditingSelf && styles.checkboxRowDisabled,
                pressed && !isEditingSelf && styles.pressed,
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isActive, disabled: isEditingSelf }}
              accessibilityLabel="Akun pengguna berstatus aktif"
            >
              <View
                style={[
                  styles.checkboxBox,
                  isActive && styles.checkboxBoxChecked,
                  isEditingSelf && styles.checkboxBoxDisabled,
                ]}
              >
                {isActive ? <Check size={14} strokeWidth={2.5} color={colors.onPrimary} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>
                Akun pengguna berstatus aktif
                {isEditingSelf ? ' (Terkunci untuk akun Anda)' : ''}
              </Text>
            </Pressable>

            {/* ACTION BUTTONS */}
            <View style={styles.formActionsRow}>
              {onBack ? (
                <View style={styles.cancelBtnWrap}>
                  <Button
                    title="Batal"
                    onPress={handleBack}
                    variant="outline"
                    size="md"
                    disabled={isLoading}
                  />
                </View>
              ) : null}
              <View style={styles.submitBtnWrap}>
                <Button
                  title="Simpan Perubahan"
                  onPress={handleSubmit}
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  disabled={!isFormValid}
                  icon={<Save size={17} color={colors.onPrimary} strokeWidth={2} />}
                />
              </View>
            </View>
          </View>

          {/* SIDE CARDS (1:1 users/edit.blade.php) */}
          {/* 1. Dark Summary Card */}
          <View style={styles.darkSummaryCard}>
            <View style={styles.darkSummaryHeader}>
              <View style={styles.darkAvatarCircle}>
                <Text style={styles.darkAvatarText}>{initials}</Text>
              </View>
              <View style={styles.darkIdentityCol}>
                <Text style={styles.darkUserName} numberOfLines={2}>
                  {name || selectedEmployee.name}
                </Text>
                <AutoScrollText style={styles.darkUserEmail}>
                  {email || selectedEmployee.email}
                </AutoScrollText>
              </View>
            </View>

            <View style={styles.darkDivider} />

            <View style={styles.darkMetaList}>
              <View style={styles.darkMetaRow}>
                <Text style={styles.darkMetaLabel}>NIP:</Text>
                <Text style={styles.darkMetaValueMono}>{nip || '-'}</Text>
              </View>
              <View style={styles.darkMetaRow}>
                <Text style={styles.darkMetaLabel}>Unit:</Text>
                <AutoScrollText style={styles.darkMetaValue}>
                  {selectedUnitRecord?.nama_unit || selectedEmployee.unit || 'Pusat / Lembaga'}
                </AutoScrollText>
              </View>
              <View style={styles.darkMetaRow}>
                <Text style={styles.darkMetaLabel}>Peran:</Text>
                <Text style={styles.darkMetaValue}>{role === 'Staff' ? 'Staff Pegawai' : role}</Text>
              </View>
              <View style={styles.darkMetaRow}>
                <Text style={styles.darkMetaLabel}>Status Akun:</Text>
                <Text
                  style={[
                    styles.darkMetaValue,
                    isActive ? styles.darkMetaSuccess : styles.darkMetaError,
                  ]}
                >
                  {isActive ? 'Aktif' : 'Non-Aktif'}
                </Text>
              </View>
              <View style={styles.darkMetaRow}>
                <Text style={styles.darkMetaLabel}>Total Hadir Rapat:</Text>
                <Text style={styles.darkMetaValue}>{totalAttended} kali</Text>
              </View>
              <View style={styles.darkMetaRow}>
                <Text style={styles.darkMetaLabel}>Terdaftar sejak:</Text>
                <Text style={styles.darkMetaValue}>
                  {formatIndonesianDate(selectedUserDetail?.created_at)}
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Riwayat Presensi Card */}
          <View style={styles.sideCard}>
            <View style={styles.sideCardHeader}>
              <History size={16} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sideCardTitle}>Riwayat Presensi ({totalAttended})</Text>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Agenda Diikuti</Text>
                <Text style={styles.metricValue}>
                  {totalAttended} / {selectedUserDetail?.attendance_stats?.total_agendas ?? 0}
                </Text>
              </View>
              <View style={styles.metricTile}>
                <Text style={styles.metricLabel}>Tepat Waktu</Text>
                <Text style={styles.metricValue}>
                  {selectedUserDetail?.attendance_stats?.on_time_count ?? 0} (
                  {selectedUserDetail?.attendance_stats?.on_time_rate_label ?? '0%'})
                </Text>
              </View>
            </View>
            <Text style={styles.sideNoteText}>
              Ringkasan dihitung dari data resmi server (
              {selectedUserDetail?.attendance_stats?.period_label || 'seluruh periode'}).
            </Text>
          </View>

          {/* 3. Keamanan & Audit Log Card */}
          <View style={styles.sideCard}>
            <View style={styles.sideCardHeader}>
              <Clock size={16} color={colors.primary} strokeWidth={2} />
              <Text style={styles.sideCardTitle}>Keamanan & Audit Log</Text>
            </View>
            <View style={styles.auditRow}>
              <Text style={styles.auditLabel}>Perubahan Kata Sandi Terakhir</Text>
              <Text style={styles.auditValue}>
                {selectedUserDetail?.security?.last_password_changed_label || 'Belum pernah dicatat'}
              </Text>
            </View>
            <View style={[styles.auditRow, styles.auditRowLast]}>
              <Text style={styles.auditLabel}>Pembaruan Profil Terakhir</Text>
              <Text style={styles.auditValue}>
                {formatIndonesianDate(selectedUserDetail?.updated_at)}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* POPUP MODAL: ROLE */}
      <AgendaOptionModal
        visible={activeModal === 'role'}
        onClose={() => setActiveModal('none')}
        title="Pilih Peran Pengguna (Role)"
        subtitle="Tentukan tingkat hak akses pengguna pada sistem"
        options={roleModalOptions}
        selectedId={role}
        searchable={false}
        onSelect={(opt) => {
          setRole(opt.id as 'Administrator' | 'Admin Unit' | 'Staff');
          setActiveModal('none');
        }}
      />

      {/* POPUP MODAL: UNIT KERJA */}
      <AgendaOptionModal
        visible={activeModal === 'unit'}
        onClose={() => setActiveModal('none')}
        title="Pilih Unit Kerja Organisasi"
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

      {/* SUCCESS MODAL */}
      <FeedbackModal
        visible={showSuccessModal}
        onClose={handleSuccessClose}
        type="success"
        title="Perubahan Berhasil Disimpan"
        message="Data pengguna dan hak akses kedinasan telah diperbarui pada sistem SIPERAPAT."
        detail={
          updatedSummary
            ? {
                Nama: updatedSummary.name,
                NIP: updatedSummary.nip,
                Unit: updatedSummary.unit,
                Peran: updatedSummary.role,
                Status: updatedSummary.status,
              }
            : undefined
        }
        confirmText="Kembali ke Daftar Pengguna"
        onConfirm={handleSuccessClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
    paddingBottom: spacing.xl * 2,
  },
  pressed: {
    opacity: 0.78,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  notFoundTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  notFoundSubtitle: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
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
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onErrorContainer,
    flex: 1,
  },
  formCard: {
    ...cardSurface,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
  required: {
    color: colors.error,
  },
  inputContainerReset: {
    marginBottom: 0,
  },
  selectorTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 4,
    minHeight: MIN_TOUCH_TARGET,
  },
  selectorValue: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onSurface,
    flex: 1,
    minWidth: 0,
  },
  lockedFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.sm + 4,
    minHeight: MIN_TOUCH_TARGET,
  },
  lockedFieldText: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textSecondary,
    flex: 1,
    minWidth: 0,
  },
  fieldHint: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  passwordToggleBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nipCounter: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoMedium,
    color: colors.textMuted,
  },
  validationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: rounded.sm,
    borderWidth: 1,
  },
  validationPillSuccess: {
    backgroundColor: colors.successContainer,
    borderColor: colors.successBorder,
  },
  validationPillPending: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.borderSubtle,
  },
  validationText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    flex: 1,
  },
  validationTextSuccess: {
    color: colors.onSuccessContainer,
  },
  validationTextPending: {
    color: colors.textSecondary,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
  },
  checkboxRowDisabled: {
    opacity: 0.65,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: rounded.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxBoxDisabled: {
    backgroundColor: colors.textMuted,
    borderColor: colors.textMuted,
  },
  checkboxLabel: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onSurface,
    flex: 1,
  },
  formActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  cancelBtnWrap: {
    flex: 1,
  },
  submitBtnWrap: {
    flex: 2,
  },

  /* Dark Summary Card (users/edit.blade.php) */
  darkSummaryCard: {
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  darkSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  darkAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkAvatarText: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  darkIdentityCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  darkUserName: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  darkUserEmail: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.borderSubtle,
    minWidth: 0,
  },
  darkDivider: {
    height: 1,
    backgroundColor: colors.primary,
  },
  darkMetaList: {
    gap: spacing.xs + 2,
  },
  darkMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  darkMetaLabel: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.borderSubtle,
  },
  darkMetaValue: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onPrimary,
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'right',
  },
  darkMetaValueMono: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoSemiBold,
    color: colors.onPrimary,
    textAlign: 'right',
  },
  darkMetaSuccess: {
    color: colors.successLight,
  },
  darkMetaError: {
    color: colors.error,
  },

  /* Side Cards */
  sideCard: {
    ...cardSurface,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  sideCardTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricTile: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    padding: spacing.sm,
    gap: 2,
  },
  metricLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  metricValue: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  sideNoteText: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textMuted,
  },
  auditRow: {
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 2,
  },
  auditRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  auditLabel: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    color: colors.textMuted,
  },
  auditValue: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onSurface,
  },
});
