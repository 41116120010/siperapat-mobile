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
  Eye,
  EyeOff,
  Fingerprint,
  Info,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { AgendaOption, AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { FeedbackModal } from '../components/modals/FeedbackModal';
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

  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [username, setUsername] = useState('');
  const [isUsernameCustom, setIsUsernameCustom] = useState(false);
  const [email, setEmail] = useState('');
  const [isEmailCustom, setIsEmailCustom] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'Administrator' | 'Admin Unit' | 'Staff'>('Staff');
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(() =>
    isAdministrator ? null : (authUser?.unitId ?? null),
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [activeModal, setActiveModal] = useState<'none' | 'role' | 'unit'>('none');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<{
    name: string;
    nip: string;
    unit: string;
    role: string;
  } | null>(null);

  const isActionHandledRef = useRef(false);

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

  const displayRoleLabel = role === 'Staff' ? 'Staff Pegawai' : role;

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

  const handleNameChange = (val: string) => {
    setName(val);
    const simplified = val
      .replace(/,.*$/, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!isUsernameCustom && simplified) {
      setUsername(simplified);
      if (!isEmailCustom) {
        setEmail(`${simplified}@lldikti.kemdiktisaintek.go.id`);
      }
    }
  };

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

    const effectiveUnitId = isAdministrator
      ? selectedUnitId
      : (authUser?.unitId ?? null);

    const result = await addEmployee({
      name: name.trim(),
      nip,
      username: cleanUsernameVal || `asn_${nip.slice(-4)}`,
      email: email.trim() || `${nip}@lldikti.kemdiktisaintek.go.id`,
      phone: phone.trim() || null,
      role,
      unit: selectedUnitRecord?.nama_unit ?? '',
      unitId: effectiveUnitId,
      password,
      status: isActive ? 'Aktif' : 'Nonaktif',
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
          {error ? (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={colors.error} strokeWidth={2} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* FORM CARD (1:1 users/create.blade.php field order) */}
          <View style={styles.formCard}>
            {/* 1. Nama Lengkap & Gelar * */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Nama Lengkap & Gelar <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="Cth: Dr. Budi Santoso, M.Kom"
                value={name}
                onChangeText={handleNameChange}
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
                onChangeText={(val) => {
                  setIsUsernameCustom(true);
                  setUsername(val.replace(/^@+/, '').toLowerCase());
                }}
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
                onChangeText={(val) => {
                  setIsEmailCustom(true);
                  setEmail(val);
                }}
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
              <Pressable
                onPress={() => setActiveModal('role')}
                style={({ pressed }) => [
                  styles.selectorTrigger,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Pilih Peran Pengguna"
              >
                <Text style={styles.selectorValue} numberOfLines={1}>
                  {displayRoleLabel}
                </Text>
                <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
              </Pressable>
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
                  style={({ pressed }) => [
                    styles.selectorTrigger,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Pilih Unit Kerja Organisasi"
                >
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {displayUnitLabel}
                  </Text>
                  <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
              ) : (
                <View style={styles.lockedFieldBox}>
                  <Building2 size={17} color={colors.textMuted} strokeWidth={2} />
                  <Text style={styles.lockedFieldText} numberOfLines={1}>
                    {displayUnitLabel}
                  </Text>
                </View>
              )}
              {!isAdministrator ? (
                <Text style={styles.fieldHint}>
                  Admin Unit hanya dapat mendaftarkan pegawai ke dalam unit kerja yang dikelola.
                </Text>
              ) : null}
            </View>

            {/* 8. Kata Sandi Awal * */}
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
                leftIcon={<Lock size={18} color={colors.outline} strokeWidth={2} />}
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
                    isPasswordValid ? styles.validationPillSuccess : styles.validationPillPending,
                  ]}
                >
                  {isPasswordValid ? (
                    <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
                  ) : (
                    <Info size={14} color={colors.onSurfaceVariant} strokeWidth={2} />
                  )}
                  <Text
                    style={[
                      styles.validationText,
                      isPasswordValid
                        ? styles.validationTextSuccess
                        : styles.validationTextPending,
                    ]}
                  >
                    {isPasswordValid
                      ? 'Format kata sandi memenuhi syarat keamanan'
                      : 'Harus minimal 8 karakter serta mengandung huruf dan angka'}
                  </Text>
                </View>
              ) : (
                <Text style={styles.fieldHint}>
                  Minimal 8 karakter dan wajib mengandung kombinasi huruf serta angka.
                </Text>
              )}
            </View>

            {/* 9. Checkbox Akun pengguna langsung aktif */}
            <Pressable
              onPress={() => setIsActive((prev) => !prev)}
              style={({ pressed }) => [styles.checkboxRow, pressed && styles.pressed]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isActive }}
              accessibilityLabel="Akun pengguna langsung aktif"
            >
              <View style={[styles.checkboxBox, isActive && styles.checkboxBoxChecked]}>
                {isActive ? <Check size={14} strokeWidth={2.5} color={colors.onPrimary} /> : null}
              </View>
              <Text style={styles.checkboxLabel}>Akun pengguna langsung aktif</Text>
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
                  title="Daftarkan Pengguna"
                  onPress={handleSubmit}
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  disabled={!isFormValid}
                  icon={<UserPlus size={17} color={colors.onPrimary} strokeWidth={2} />}
                />
              </View>
            </View>
          </View>

          {/* SIDE CARDS (1:1 users/create.blade.php: Tingkatan Hak Akses & Multi-Identifier Login) */}
          <View style={styles.guidanceStack}>
            <View style={styles.guidanceDarkCard}>
              <View style={styles.guidanceDarkHeader}>
                <ShieldCheck size={18} color={colors.onPrimary} strokeWidth={2} />
                <Text style={styles.guidanceDarkTitle}>Tingkatan Hak Akses (Role)</Text>
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
        title="Pengguna Berhasil Didaftarkan"
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
  checkboxLabel: {
    ...typography.bodyMd,
    fontFamily: fontFamilies.sansMedium,
    color: colors.onSurface,
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
  guidanceStack: {
    gap: spacing.md,
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
    gap: spacing.xs + 2,
  },
  guidanceDarkTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  guidanceRoleList: {
    gap: spacing.sm,
  },
  guidanceRoleItem: {
    gap: 2,
  },
  guidanceRoleName: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    color: colors.onPrimary,
  },
  guidanceRoleDesc: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.borderSubtle,
    lineHeight: 18,
  },
  guidanceLightCard: {
    ...cardSurface,
    borderRadius: rounded.lg,
    padding: spacing.md,
    gap: spacing.xs + 2,
  },
  guidanceLightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  guidanceLightTitle: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansBold,
    color: colors.onSurface,
  },
  guidanceLightDesc: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansRegular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
