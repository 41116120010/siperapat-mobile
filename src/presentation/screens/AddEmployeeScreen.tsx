import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  AlertCircle,
  AtSign,
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronsUpDown,
  Contact,
  Eye,
  EyeOff,
  Fingerprint,
  Info,
  Lock,
  Mail,
  Network,
  PauseCircle,
  Phone,
  ShieldCheck,
  User,
  UserCheck,
  UserCog,
  UserPlus,
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

interface AddEmployeeScreenProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export const AddEmployeeScreen: React.FC<AddEmployeeScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const authUser = useAuthStore((state) => state.user);
  const isAdministrator = authUser?.role === 'administrator';
  const {
    addEmployee,
    allUnits,
    fetchAllUnits,
    isLoading,
    error,
    validationErrors,
    clearError,
  } = useEmployeeStore();

  // Form State
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [pangkatGolongan, setPangkatGolongan] = useState('Penata Tingkat I (III/d)');
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(() =>
    isAdministrator ? null : (authUser?.unitId ?? null),
  );
  const [role, setRole] = useState<'Administrator' | 'Admin Unit' | 'Staff'>('Staff');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [username, setUsername] = useState('');
  const [isUsernameCustom, setIsUsernameCustom] = useState(false);
  const [email, setEmail] = useState('');
  const [isEmailCustom, setIsEmailCustom] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Modals
  const [activeModal, setActiveModal] = useState<'none' | 'unit' | 'pangkat'>('none');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<{
    name: string;
    nip: string;
    unit: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    void fetchAllUnits({ activeOnly: true });
  }, [fetchAllUnits]);

  useEffect(() => {
    if (!isAdministrator) {
      setSelectedUnitId(authUser?.unitId ?? null);
      if (role === 'Administrator') {
        setRole('Staff');
      }
    }
  }, [isAdministrator, authUser?.unitId, role]);

  const unitModalOptions = useMemo<AgendaOption[]>(() => {
    const items: AgendaOption[] = [
      {
        id: '',
        title: '-- Tingkat Lembaga (Tanpa Unit) --',
        subtitle: 'Pengguna tingkat lembaga tanpa penugasan unit kerja spesifik',
        icon: Building2,
      },
    ];
    allUnits.forEach((u) => {
      items.push({
        id: String(u.id),
        title: `${u.kode_unit} — ${u.nama_unit}`,
        subtitle: u.deskripsi ?? undefined,
        icon: Building2,
      });
    });
    return items;
  }, [allUnits]);

  const selectedUnitRecord = useMemo(
    () => allUnits.find((u) => u.id === selectedUnitId) ?? null,
    [allUnits, selectedUnitId],
  );

  const displayUnitLabel = useMemo(() => {
    if (!isAdministrator) {
      if (selectedUnitRecord) {
        return `${selectedUnitRecord.kode_unit} — ${selectedUnitRecord.nama_unit}`;
      }
      return authUser?.unitKerja || 'Unit Kerja Anda';
    }
    if (selectedUnitId == null) {
      return '-- Tingkat Lembaga (Tanpa Unit) --';
    }
    if (selectedUnitRecord) {
      return `${selectedUnitRecord.kode_unit} — ${selectedUnitRecord.nama_unit}`;
    }
    return `Unit #${selectedUnitId}`;
  }, [isAdministrator, selectedUnitId, selectedUnitRecord, authUser?.unitKerja]);

  // Auto-generate username & email when name changes (unless manually edited)
  const handleNameChange = (val: string) => {
    setName(val);
    const simplified = val
      .replace(/,.*$/, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');

    if (!isUsernameCustom && simplified) {
      const generatedUser = `@${simplified}`;
      setUsername(generatedUser);
      if (!isEmailCustom) {
        setEmail(`${simplified}@lldikti.kemdiktisaintek.go.id`);
      }
    }
  };

  const handleNipChange = (val: string) => {
    const cleaned = cleanNIP(val);
    setNip(cleaned);
  };

  // NIP & password validation info
  const nipValidation = validateNIP(nip);
  const isNipComplete = nip.length === 18;
  const isPasswordValid =
    password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  const cleanUsernameVal = username.replace(/^@+/, '').trim();
  const isFormValid =
    name.trim().length >= 3 &&
    isNipComplete &&
    nipValidation.isValid &&
    cleanUsernameVal.length > 0 &&
    email.trim().includes('@') &&
    isPasswordValid &&
    (isAdministrator || selectedUnitId != null);

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    clearError();
    const finalUsername = username.trim().startsWith('@')
      ? username.trim()
      : `@${username.trim()}`;

    const effectiveUnitId = isAdministrator
      ? selectedUnitId
      : (authUser?.unitId ?? null);

    const result = await addEmployee({
      name: name.trim(),
      nip,
      jabatan: jabatan.trim(),
      pangkatGolongan,
      unit: selectedUnitRecord?.nama_unit ?? '',
      unitId: effectiveUnitId,
      role,
      status,
      username: finalUsername || `@asn_${nip.slice(-4)}`,
      email: email.trim() || `${nip}@lldikti.kemdiktisaintek.go.id`,
      phone: phone.trim() || '-',
      password,
    });

    if (result) {
      setCreatedSummary({
        name: result.name,
        nip: result.nip,
        unit: result.unit || 'Tingkat Lembaga (Tanpa Unit)',
        role: result.role,
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

  return (
    <View style={styles.container}>
      <Header
        title="Tambah Pengguna Baru"
        subtitle="Daftarkan pegawai baru dan tentukan tingkatan hak aksesnya"
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
          {/* Error Banner if any */}
          {error ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={colors.error} strokeWidth={2} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

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
                placeholder="contoh: Dr. H. Syahril, M.Pd"
                value={name}
                onChangeText={handleNameChange}
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <User size={18} color={colors.outline} strokeWidth={2} />
                }
              />
            </View>

            {/* NIP 18 Digit */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  NIP 18 Digit Resmi <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.nipCounter}>
                  {nip.length}/18 digit
                </Text>
              </View>
              <Input
                placeholder="19XXXXXXXXXXXXXXNN"
                value={nip}
                onChangeText={handleNipChange}
                keyboardType="numeric"
                maxLength={18}
                isMono
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
                placeholder="contoh: Analis Kepegawaian Ahli Muda"
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
                  <Text style={styles.selectorActionText}>Pilih</Text>
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
                  : 'Admin Unit hanya dapat mendaftarkan pegawai pada unit kerjanya sendiri.'}
              </Text>
              {validationErrors?.unit_id?.[0] ? (
                <Text style={styles.fieldErrorText}>{validationErrors.unit_id[0]}</Text>
              ) : null}
            </View>

            {/* Peran Sistem (Role) */}
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
                      onPress={() => setRole(r)}
                      style={[
                        styles.roleCard,
                        isSelected && styles.roleCardActive,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
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
            </View>

            {/* Status Akun */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Status Akun Kedinasan</Text>
              <View style={styles.segmentedControl}>
                <Pressable
                  onPress={() => setStatus('Aktif')}
                  style={[
                    styles.segmentedBtn,
                    status === 'Aktif' && styles.segmentedBtnActive,
                  ]}
                  accessibilityRole="button"
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
                  onPress={() => setStatus('Nonaktif')}
                  style={[
                    styles.segmentedBtn,
                    status === 'Nonaktif' && styles.segmentedBtnActive,
                  ]}
                  accessibilityRole="button"
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
              <Text style={styles.label}>Username Aplikasi</Text>
              <Input
                placeholder="@username_resmi"
                value={username}
                onChangeText={(val) => {
                  setUsername(val);
                  setIsUsernameCustom(true);
                }}
                autoCapitalize="none"
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <AtSign size={18} color={colors.outline} strokeWidth={2} />
                }
              />
            </View>

            {/* Email Kedinasan */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Kedinasan Resmi</Text>
              <Input
                placeholder="nama@lldikti.kemdiktisaintek.go.id"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  setIsEmailCustom(true);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
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

            {/* Kata Sandi Awal (Wajib) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Kata Sandi Awal <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="Minimal 8 karakter (huruf & angka)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                error={validationErrors?.password?.[0] ?? null}
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <Lock size={18} color={colors.outline} strokeWidth={2} />
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
              <View
                style={[
                  styles.nipValidationPill,
                  password.length > 0 && isPasswordValid
                    ? styles.nipValidationSuccess
                    : styles.nipValidationPending,
                ]}
              >
                {password.length > 0 && isPasswordValid ? (
                  <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
                ) : (
                  <Info size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
                )}
                <Text
                  style={[
                    styles.nipValidationText,
                    password.length > 0 && isPasswordValid
                      ? styles.nipValidationTextSuccess
                      : styles.nipValidationTextPending,
                  ]}
                >
                  {password.length === 0
                    ? 'Minimal 8 karakter dengan kombinasi huruf dan angka.'
                    : isPasswordValid
                    ? 'Format kata sandi memenuhi syarat keamanan'
                    : 'Harus minimal 8 karakter serta mengandung huruf dan angka'}
                </Text>
              </View>
            </View>
          </View>

          {/* PANDUAN HAK AKSES & MULTI-IDENTIFIER LOGIN (Web users/create parity) */}
          <View style={styles.guidanceStack}>
            <View style={styles.guidanceDarkCard}>
              <View style={styles.guidanceDarkHeader}>
                <ShieldCheck size={18} color={colors.onPrimaryContainer} strokeWidth={2} />
                <Text style={styles.guidanceDarkTitle}>
                  Tingkatan Hak Akses (Role)
                </Text>
              </View>
              <View style={styles.guidanceRoleList}>
                <View style={styles.guidanceRoleItem}>
                  <Text style={styles.guidanceRoleName}>1. Administrator:</Text>
                  <Text style={styles.guidanceRoleDesc}>
                    Akses penuh ke master data unit, audit trail, rekapitulasi, dan agenda tingkat lembaga.
                  </Text>
                </View>
                <View style={styles.guidanceRoleItem}>
                  <Text style={styles.guidanceRoleName}>2. Admin Unit:</Text>
                  <Text style={styles.guidanceRoleDesc}>
                    Mengelola agenda dan pegawai yang berada di dalam unit kerjanya saja.
                  </Text>
                </View>
                <View style={styles.guidanceRoleItem}>
                  <Text style={styles.guidanceRoleName}>3. Staff Pegawai:</Text>
                  <Text style={styles.guidanceRoleDesc}>
                    Mengakses portal presensi, riwayat kehadiran pribadi, dan melihat agenda terkait.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.guidanceLightCard}>
              <View style={styles.guidanceLightHeader}>
                <Info size={16} color={colors.primary} strokeWidth={2} />
                <Text style={styles.guidanceLightTitle}>Multi-Identifier Login</Text>
              </View>
              <Text style={styles.guidanceLightDesc}>
                Pegawai dapat masuk ke portal menggunakan 18 digit NIP atau Username dengan kata sandi yang telah didaftarkan.
              </Text>
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionSection}>
            <Button
              title="Daftarkan Pengguna"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={!isFormValid}
              icon={
                <UserPlus
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
        title="Pegawai Berhasil Didaftarkan"
        message="Akun kedinasan aparatur sipil negara telah resmi tercatat di sistem SIPERAPAT LLDIKTI X."
        detail={
          createdSummary
            ? {
                Nama: createdSummary.name,
                NIP: createdSummary.nip,
                Unit: createdSummary.unit,
                Peran: createdSummary.role,
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
  nipCounter: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  required: {
    color: colors.error,
  },
  inputContainerReset: {
    marginBottom: 0,
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
  },
  nipValidationTextSuccess: {
    color: colors.onSuccessContainer,
    fontFamily: fontFamilies.sansSemiBold,
  },
  nipValidationTextPending: {
    color: colors.onSurfaceVariant,
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
  guidanceStack: {
    gap: spacing.sm,
  },
  guidanceDarkCard: {
    backgroundColor: colors.primaryDarkest,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  guidanceDarkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guidanceDarkTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  guidanceRoleList: {
    gap: 8,
  },
  guidanceRoleItem: {
    gap: 2,
  },
  guidanceRoleName: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  guidanceRoleDesc: {
    ...typography.bodySm,
    color: colors.onPrimaryContainer,
    lineHeight: 17,
  },
  guidanceLightCard: {
    ...cardSurface,
    padding: spacing.md,
    gap: 6,
  },
  guidanceLightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guidanceLightTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.primary,
  },
  guidanceLightDesc: {
    ...typography.bodySm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
