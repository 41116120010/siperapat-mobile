import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  AtSign,
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  FileSpreadsheet,
  History,
  Info,
  Lock,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  Smartphone,
  User,
  Users,
  X,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { formatTanggalIndonesia } from '../../core/utils/dateFormatter';
import { authApi } from '../../data/datasources/authApi';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedbackStore } from '../store/useFeedbackStore';

interface ProfileScreenProps {
  onLogout: () => void;
  onNavigateAuditLog: () => void;
  onNavigatePegawai: () => void;
  onNavigateChangePassword: () => void;
  onNavigateReports?: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onLogout,
  onNavigateAuditLog,
  onNavigatePegawai,
  onNavigateChangePassword,
  onNavigateReports,
}) => {
  const { user, logout, refreshProfile, updateProfile } = useAuthStore();
  const isAdministrator = user?.role === 'administrator';
  const canManageEmployees = isAdministrator || user?.role === 'admin';

  // Profile Edit State (Nama Lengkap, Email Kedinasan, No. WhatsApp / HP)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name ?? '');
  const [emailInput, setEmailInput] = useState(user?.email ?? '');
  const [phoneInput, setPhoneInput] = useState(user?.phone ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [registeredAt, setRegisteredAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditingProfile) {
      setNameInput(user?.name ?? '');
      setEmailInput(user?.email ?? '');
      setPhoneInput(user?.phone ?? '');
    }
  }, [user?.name, user?.email, user?.phone, isEditingProfile]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void refreshProfile();
      void authApi
        .me()
        .then((res) => {
          const createdAt = (res.data as { created_at?: string | null })?.created_at ?? null;
          setRegisteredAt(createdAt);
        })
        .catch(() => {});
    }, [refreshProfile, user?.id])
  );

  const initials = (user?.name ?? 'AS').trim().slice(0, 2).toUpperCase() || 'AS';
  const roleDisplayLabel =
    user?.role === 'administrator'
      ? 'Administrator'
      : user?.role === 'admin'
      ? 'Admin Unit'
      : 'Pegawai Unit';

  const handleStartEditProfile = () => {
    setNameInput(user?.name ?? '');
    setEmailInput(user?.email ?? '');
    setPhoneInput(user?.phone ?? '');
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setNameInput(user?.name ?? '');
    setEmailInput(user?.email ?? '');
    setPhoneInput(user?.phone ?? '');
    setIsEditingProfile(false);
  };

  const handleSaveProfile = async () => {
    const trimmedName = nameInput.trim();
    const trimmedEmail = emailInput.trim();
    const cleanedPhone = phoneInput.trim().replace(/[^0-9+]/g, '');

    if (trimmedName.length < 2) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Nama lengkap wajib diisi minimal 2 karakter.',
      });
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Format alamat email kedinasan tidak valid.',
      });
      return;
    }

    if (cleanedPhone.length > 0 && cleanedPhone.length < 9) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Nomor WhatsApp / HP minimal terdiri dari 9 digit angka.',
      });
      return;
    }

    if (cleanedPhone.length > 16) {
      useFeedbackStore.getState().showToast({
        type: 'warning',
        message: 'Nomor WhatsApp / HP maksimal 16 digit angka.',
      });
      return;
    }

    if (
      trimmedName === (user?.name ?? '') &&
      trimmedEmail === (user?.email ?? '') &&
      cleanedPhone === (user?.phone ?? '')
    ) {
      setIsEditingProfile(false);
      return;
    }

    try {
      setIsSavingProfile(true);
      const res = await updateProfile({
        name: trimmedName,
        email: trimmedEmail,
        phone: cleanedPhone,
      });

      if (res.success) {
        useFeedbackStore.getState().showToast({
          type: 'success',
          message: 'Informasi data diri berhasil diperbarui.',
        });
        setIsEditingProfile(false);
      } else {
        useFeedbackStore.getState().showToast({
          type: 'error',
          message: res.message || 'Gagal memperbarui informasi profil.',
        });
      }
    } catch (err: unknown) {
      useFeedbackStore.getState().showToast({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan saat menyimpan data profil.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = () => {
    useFeedbackStore.getState().showModal({
      type: 'confirm',
      title: 'Konfirmasi Keluar',
      message: 'Apakah Anda yakin ingin keluar dari akun kedinasan SIPERAPAT LLDIKTI X?',
      confirmText: 'Keluar',
      cancelText: 'Batal',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        await logout();
        onLogout();
      },
    });
  };

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* SUBTITLE & IDENTITAS RESMI */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Pengaturan Profil Akun</Text>
          <Text style={styles.mainSubtitle}>
            Kelola informasi identitas diri, kontak, dan keamanan kata sandi akun Anda
          </Text>
        </View>

        {/* KARTU PROFIL PEGAWAI RESMI ASN */}
        <View style={styles.heroCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarInitialBox}>
              <Text style={styles.avatarInitialText}>{initials}</Text>
            </View>

            <View style={styles.profileMetaInfo}>
              <Text style={styles.profileName}>{user?.name ?? 'Nama pengguna'}</Text>
              <Text style={styles.profileRoleTitle}>
                {user?.jabatan ?? roleDisplayLabel}
              </Text>
              <Text style={styles.profileMetaSub} numberOfLines={2}>
                {[user?.pangkatGolongan, user?.unitKerja].filter(Boolean).join(' • ') ||
                  'Informasi unit belum tersedia'}
              </Text>
            </View>
          </View>

          <View style={styles.accountStatusGrid}>
            <View style={styles.accountStatusRow}>
              <Text style={styles.accountStatusLabel}>Status Akun:</Text>
              <View style={styles.accountActivePill}>
                <Text style={styles.accountActiveText}>Aktif</Text>
              </View>
            </View>
            <View style={styles.accountStatusRow}>
              <Text style={styles.accountStatusLabel}>Terdaftar Sejak:</Text>
              <Text style={styles.accountStatusValue}>
                {registeredAt ? formatTanggalIndonesia(registeredAt) : '—'}
              </Text>
            </View>
          </View>

          {/* STATISTIK KEHADIRAN (3-COLUMN PROPORTIONAL GRID) */}
          <View style={styles.performanceSection}>
            <Text style={styles.performanceHeader}>Statistik Kehadiran</Text>

            <View style={styles.perfGrid}>
              <View style={styles.perfCol}>
                <Text style={styles.perfLabel}>Total Agenda</Text>
                <Text style={styles.perfValue}>
                  {user?.attendanceStats?.totalAgendas ?? '—'}
                </Text>
                <Text style={styles.perfSub}>Dapat diakses</Text>
              </View>

              <View style={styles.perfCol}>
                <Text style={styles.perfLabel}>Kehadiran</Text>
                <Text style={styles.perfValue}>
                  {user?.attendanceStats?.attendanceRateLabel ?? '—'}
                </Text>
                <Text style={styles.perfSub}>Tervalidasi</Text>
              </View>

              <View style={styles.perfCol}>
                <Text style={styles.perfLabel}>Tepat Waktu</Text>
                <Text style={styles.perfValue}>
                  {user?.attendanceStats?.onTimeRateLabel ?? '—'}
                </Text>
                <Text style={styles.perfSub}>Presensi Awal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 2: INFORMASI DATA DIRI & AKUN KEDINASAN */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Informasi Data Diri</Text>
            {!isEditingProfile ? (
              <Pressable
                onPress={handleStartEditProfile}
                style={({ pressed }) => [
                  styles.editToggleBtn,
                  pressed && styles.btnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Ubah informasi profil"
              >
                <Pencil size={14} strokeWidth={2} color={colors.primary} />
                <Text style={styles.editToggleBtnText}>Ubah Profil</Text>
              </Pressable>
            ) : null}
          </View>

          {isEditingProfile ? (
            <View style={styles.editFormWrap}>
              <Input
                label="Nama Lengkap *"
                placeholder="Masukkan nama lengkap beserta gelar..."
                value={nameInput}
                onChangeText={setNameInput}
                editable={!isSavingProfile}
                leftIcon={<User size={18} strokeWidth={2} color={colors.primary} />}
              />

              <Input
                label="Alamat Email *"
                placeholder="nama@lldikti.kemdikbud.go.id"
                value={emailInput}
                onChangeText={setEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSavingProfile}
                leftIcon={<Mail size={18} strokeWidth={2} color={colors.primary} />}
              />

              <Input
                label="Nomor Telepon / WhatsApp"
                placeholder="081234567890"
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
                isMono
                editable={!isSavingProfile}
                helperText="Digunakan untuk notifikasi & koordinasi rapat dinas."
                leftIcon={<Smartphone size={18} strokeWidth={2} color={colors.primary} />}
              />

              <View style={styles.editActionsRow}>
                <View style={styles.editActionHalf}>
                  <Button
                    title="Batal"
                    variant="outline"
                    onPress={handleCancelEditProfile}
                    disabled={isSavingProfile}
                    icon={<X size={16} strokeWidth={2} color={colors.onSurfaceVariant} />}
                    fullWidth
                  />
                </View>
                <View style={styles.editActionSave}>
                  <Button
                    title={isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan Data Diri'}
                    variant="primary"
                    onPress={() => void handleSaveProfile()}
                    isLoading={isSavingProfile}
                    disabled={isSavingProfile}
                    icon={<Check size={16} strokeWidth={2} color={colors.onPrimary} />}
                    fullWidth
                  />
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Nama Lengkap</Text>
                <View style={styles.readonlyInputRow}>
                  <User size={17} strokeWidth={2} color={colors.textMuted} />
                  <Text style={styles.readonlyInputValue} numberOfLines={1}>
                    {user?.name || '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Alamat Email</Text>
                <View style={styles.readonlyInputRow}>
                  <Mail size={17} strokeWidth={2} color={colors.textMuted} />
                  <Text style={styles.readonlyInputValue} numberOfLines={1}>
                    {user?.email || '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Nomor Telepon / WhatsApp</Text>
                <View style={styles.readonlyInputRow}>
                  <Smartphone
                    size={17}
                    strokeWidth={2}
                    color={user?.phone ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={
                      user?.phone
                        ? styles.readonlyInputValueMono
                        : styles.readonlyInputPlaceholder
                    }
                    numberOfLines={1}
                  >
                    {user?.phone ? user.phone : 'Belum ditambahkan'}
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* READONLY SYSTEM FIELDS */}
          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Nomor Induk Pegawai (NIP)</Text>
            <View style={styles.readonlyInputRow}>
              <CreditCard size={17} strokeWidth={2} color={colors.textMuted} />
              <Text style={styles.readonlyInputValueMono}>{user?.nip || 'Tidak tercatat'}</Text>
              <Lock size={14} strokeWidth={2} color={colors.textMuted} />
            </View>
            <Text style={styles.fieldHelperText}>
              Perubahan NIP hanya dapat dilakukan melalui Administrator.
            </Text>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Nama Pengguna (Username)</Text>
            <View style={styles.readonlyInputRow}>
              <AtSign size={17} strokeWidth={2} color={colors.textMuted} />
              <Text style={styles.readonlyInputValueMono}>{user?.username ?? '—'}</Text>
              <Lock size={14} strokeWidth={2} color={colors.textMuted} />
            </View>
            <Text style={styles.fieldHelperText}>
              Username ditetapkan oleh Administrator sistem.
            </Text>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Unit Kerja Organisasi</Text>
            <View style={styles.readonlyInputRow}>
              <Building2 size={17} strokeWidth={2} color={colors.textMuted} />
              <Text style={styles.readonlyInputValue} numberOfLines={1}>
                {user?.unitKerja || 'Tingkat Lembaga (Tanpa Unit Kerja Terikat)'}
              </Text>
              <Lock size={14} strokeWidth={2} color={colors.textMuted} />
            </View>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Hak Akses</Text>
            <View style={styles.readonlyInputRow}>
              <ShieldCheck size={17} strokeWidth={2} color={colors.textMuted} />
              <Text style={styles.readonlyInputValueBold}>{roleDisplayLabel}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 3: KEAMANAN AKUN */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderStatic}>
            <Text style={styles.sectionTitle}>Keamanan Akun</Text>
          </View>

          <View style={styles.authActionRow}>
            <View style={styles.authActionTextWrap}>
              <Text style={styles.authActionTitle}>Kata Sandi</Text>
              <Text style={styles.authActionSub}>
                {user?.security?.last_password_changed_label ||
                  'Tersedia opsi pembaruan berkala'}
              </Text>
            </View>
            <Pressable
              onPress={onNavigateChangePassword}
              style={({ pressed }) => [
                styles.changePassBtn,
                pressed && styles.itemPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Ubah Kata Sandi"
            >
              <Text style={styles.changePassBtnText}>Ubah Sandi</Text>
            </Pressable>
          </View>
        </View>

        {/* SECTION 4: ADMINISTRASI SISTEM (UNIFIED MENU CARD) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderStatic}>
            <Text style={styles.sectionTitle}>Administrasi Sistem</Text>
          </View>

          {canManageEmployees ? (
            <>
              <Pressable
                onPress={onNavigatePegawai}
                style={({ pressed }) => [styles.menuNavCard, pressed && styles.itemPressed]}
                accessibilityRole="button"
                accessibilityLabel="Buka Direktori Pegawai"
              >
                <View style={styles.menuNavIconWrap}>
                  <Users size={20} strokeWidth={2} color={colors.primary} />
                </View>
                <View style={styles.menuNavTextCol}>
                  <Text style={styles.menuNavTitle}>Direktori Pegawai ASN</Text>
                  <Text style={styles.menuNavSub}>
                    {isAdministrator
                      ? 'Daftar pegawai dan pembagian unit kerja'
                      : 'Pegawai pada unit kerja Anda'}
                  </Text>
                </View>
                <ChevronRight size={20} strokeWidth={2} color={colors.textMuted} />
              </Pressable>

              <View style={styles.menuDivider} />
            </>
          ) : null}

          {canManageEmployees && onNavigateReports ? (
            <>
              <Pressable
                onPress={onNavigateReports}
                style={({ pressed }) => [styles.menuNavCard, pressed && styles.itemPressed]}
                accessibilityRole="button"
                accessibilityLabel="Buka Laporan dan Rekapitulasi"
              >
                <View style={styles.menuNavIconWrap}>
                  <FileSpreadsheet size={20} strokeWidth={2} color={colors.primary} />
                </View>
                <View style={styles.menuNavTextCol}>
                  <Text style={styles.menuNavTitle}>Laporan & Rekapitulasi</Text>
                  <Text style={styles.menuNavSub}>
                    Rekap kehadiran rapat, ekspor PDF, Word & CSV
                  </Text>
                </View>
                <ChevronRight size={20} strokeWidth={2} color={colors.textMuted} />
              </Pressable>

              <View style={styles.menuDivider} />
            </>
          ) : null}

          <Pressable
            onPress={onNavigateAuditLog}
            style={({ pressed }) => [styles.menuNavCard, pressed && styles.itemPressed]}
            accessibilityRole="button"
            accessibilityLabel={
              isAdministrator ? 'Buka Log Aktivitas Sistem' : 'Buka Log Aktivitas Saya'
            }
          >
            <View style={styles.menuNavIconWrap}>
              <History size={20} strokeWidth={2} color={colors.primary} />
            </View>
            <View style={styles.menuNavTextCol}>
              <Text style={styles.menuNavTitle}>
                {isAdministrator ? 'Log Audit Sistem' : 'Log Aktivitas Saya'}
              </Text>
              <Text style={styles.menuNavSub}>
                {isAdministrator
                  ? 'Rekam jejak aktivitas seluruh pengguna'
                  : 'Riwayat aktivitas akun Anda'}
              </Text>
            </View>
            <ChevronRight size={20} strokeWidth={2} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* SECTION 3.5: KETENTUAN KEAMANAN AKUN (edit.blade.php:323-333) */}
        <View style={styles.sectionCard}>
          <View style={styles.securityGuideHeader}>
            <Info size={16} strokeWidth={2} color={colors.primary} />
            <Text style={styles.sectionTitle}>Ketentuan Keamanan Akun</Text>
          </View>
          <View style={styles.securityGuideList}>
            <Text style={styles.securityGuideItem}>
              • Gunakan kata sandi unik yang tidak digunakan pada layanan lain.
            </Text>
            <Text style={styles.securityGuideItem}>
              • Kata sandi minimal terdiri dari 8 karakter dengan kombinasi huruf dan angka.
            </Text>
            <Text style={styles.securityGuideItem}>
              • Setiap pembaruan profil atau kata sandi akan otomatis tercatat pada log audit sistem.
            </Text>
          </View>
        </View>

        {/* SECTION 5: LOGOUT BUTTON */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Keluar dari Sistem"
        >
          <LogOut size={18} strokeWidth={2} color={colors.error} />
          <Text style={styles.logoutButtonText}>Keluar dari Sistem</Text>
        </Pressable>

        <Text style={styles.versionNote}>SIPERAPAT LLDIKTI Wilayah X • v2.2</Text>
      </ScrollView>
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
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  titleSection: {
    marginTop: 2,
  },
  mainTitle: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  mainSubtitle: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  heroCard: {
    ...cardSurface,
    borderRadius: rounded.card,
    padding: spacing.md,
    gap: spacing.md,
    overflow: 'hidden',
  },
  profileTopRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  profileMetaInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  profileRoleTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.primary,
  },
  profileMetaSub: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  performanceSection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm + 2,
  },
  performanceHeader: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  perfGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  perfCol: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: rounded.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'space-between',
    minHeight: 74,
  },
  perfLabel: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  perfValue: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.monoBold,
    fontSize: 16,
    color: colors.primary,
    marginTop: 2,
  },
  perfSub: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    ...cardSurface,
    borderRadius: rounded.card,
    padding: spacing.md,
    gap: spacing.sm + 2,
    overflow: 'hidden',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.xs + 2,
    gap: spacing.sm,
  },
  sectionHeaderStatic: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.xs + 2,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceSoft,
  },
  editToggleBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11.5,
    color: colors.primary,
  },
  editFormWrap: {
    gap: spacing.sm + 2,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 2,
  },
  editActionHalf: {
    flex: 1,
  },
  fieldItem: {
    gap: 4,
  },
  fieldLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  readonlyInputRow: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  readonlyInputValue: {
    ...typography.bodySm,
    fontSize: 12.5,
    color: colors.onSurface,
    flex: 1,
  },
  readonlyInputValueMono: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 12,
    color: colors.onSurface,
    flex: 1,
    letterSpacing: 0.3,
  },
  readonlyInputPlaceholder: {
    ...typography.bodySm,
    fontSize: 12.5,
    color: colors.textMuted,
    fontStyle: 'italic',
    flex: 1,
  },
  readonlyInputValueBold: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12.5,
    color: colors.primary,
    flex: 1,
  },
  btnPressed: {
    opacity: 0.78,
  },
  authActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  authActionTextWrap: {
    flex: 1,
  },
  authActionTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  authActionSub: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  changePassBtn: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  changePassBtnText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    color: colors.primary,
  },
  menuNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: 6,
    gap: 12,
  },
  itemPressed: {
    opacity: 0.75,
  },
  menuNavIconWrap: {
    width: 40,
    height: 40,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  menuNavTextCol: {
    flex: 1,
  },
  menuNavTitle: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  menuNavSub: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  logoutButton: {
    minHeight: MIN_TOUCH_TARGET + 4,
    borderRadius: rounded.lg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    backgroundColor: colors.surfaceCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  logoutButtonPressed: {
    backgroundColor: colors.destructivePressed,
  },
  logoutButtonText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    color: colors.error,
  },
  versionNote: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  avatarInitialBox: {
    width: 64,
    height: 64,
    borderRadius: rounded.xl,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 20,
    color: colors.onPrimary,
  },
  accountStatusGrid: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm,
    gap: 6,
  },
  accountStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  accountStatusLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  accountStatusValue: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  accountActivePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: rounded.full,
    backgroundColor: colors.successContainer,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  accountActiveText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
    color: colors.onSuccessContainer,
  },
  editActionSave: {
    flex: 2,
  },
  fieldHelperText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  securityGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  securityGuideList: {
    gap: 6,
  },
  securityGuideItem: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
