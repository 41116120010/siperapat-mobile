import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  ChevronRight,
  CreditCard,
  FileSpreadsheet,
  History,
  Info,
  Lock,
  LogOut,
  LucideIcon,
  Mail,
  Save,
  ShieldCheck,
  Smartphone,
  User,
  Users,
} from 'lucide-react-native';
import { colors } from '../../core/theme/colors';
import { fontFamilies, typography } from '../../core/theme/typography';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../core/theme/tokens';
import { formatTanggalIndonesia } from '../../core/utils/dateFormatter';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../store/useAuthStore';
import { useFeedbackStore } from '../store/useFeedbackStore';

export interface ProfileScreenProps {
  onLogout: () => void;
  onNavigateAuditLog: () => void;
  onNavigatePersonalActivityLog?: () => void;
  onNavigatePegawai: () => void;
  onNavigateChangePassword: () => void;
  onNavigateReports?: () => void;
  onNavigateUnitDirectory?: () => void;
}

interface ProfileMenuItem {
  key: string;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  Icon: LucideIcon;
  onPress: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onLogout,
  onNavigateAuditLog,
  onNavigatePersonalActivityLog,
  onNavigatePegawai,
  onNavigateChangePassword,
  onNavigateReports,
  onNavigateUnitDirectory,
}) => {
  const { user, logout, refreshProfile, updateProfile } = useAuthStore();
  const isAdministrator = user?.role === 'administrator';
  const canManageEmployees = isAdministrator || user?.role === 'admin';

  const [nameInput, setNameInput] = useState(user?.name ?? '');
  const [emailInput, setEmailInput] = useState(user?.email ?? '');
  const [phoneInput, setPhoneInput] = useState(user?.phone ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const registeredAt = user?.createdAt ?? null;

  useEffect(() => {
    setNameInput(user?.name ?? '');
    setEmailInput(user?.email ?? '');
    setPhoneInput(user?.phone ?? '');
  }, [user?.name, user?.email, user?.phone]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      void refreshProfile();
    }, [refreshProfile, user?.id])
  );

  const initials = (user?.name ?? 'AS').trim().slice(0, 2).toUpperCase() || 'AS';
  const roleDisplayLabel =
    user?.role === 'administrator'
      ? 'Administrator'
      : user?.role === 'admin'
      ? 'Admin Unit'
      : 'Pegawai Unit';

  const handleOpenPersonalLogs = useCallback(() => {
    if (onNavigatePersonalActivityLog) {
      onNavigatePersonalActivityLog();
      return;
    }
    onNavigateAuditLog();
  }, [onNavigatePersonalActivityLog, onNavigateAuditLog]);

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
      useFeedbackStore.getState().showToast({
        type: 'info',
        message: 'Tidak ada perubahan data diri untuk disimpan.',
      });
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

  const menuItems = useMemo<ProfileMenuItem[]>(() => {
    const items: ProfileMenuItem[] = [];

    if (canManageEmployees && onNavigateReports) {
      items.push({
        key: 'reports',
        title: 'Laporan & Rekap',
        subtitle: 'Rekap kehadiran rapat, ekspor PDF, Word & CSV',
        accessibilityLabel: 'Buka Laporan dan Rekap',
        Icon: FileSpreadsheet,
        onPress: onNavigateReports,
      });
    }

    if (isAdministrator && onNavigateUnitDirectory) {
      items.push({
        key: 'units',
        title: 'Unit Kerja',
        subtitle: 'Master data bagian dan kelompok kerja (Pokja)',
        accessibilityLabel: 'Buka Master Data Unit Kerja',
        Icon: Building2,
        onPress: onNavigateUnitDirectory,
      });
    }

    if (canManageEmployees) {
      items.push({
        key: 'users',
        title: 'Pengguna',
        subtitle: isAdministrator
          ? 'Daftar pengguna dan penugasan unit kerja'
          : 'Daftar aparatur pada unit kerja Anda',
        accessibilityLabel: 'Buka Kelola Pengguna',
        Icon: Users,
        onPress: onNavigatePegawai,
      });
    }

    if (isAdministrator) {
      items.push({
        key: 'system-logs',
        title: 'Log Aktivitas Sistem',
        subtitle: 'Rekam jejak audit seluruh pengguna sistem',
        accessibilityLabel: 'Buka Log Aktivitas Sistem',
        Icon: ShieldCheck,
        onPress: onNavigateAuditLog,
      });
    }

    items.push({
      key: 'personal-logs',
      title: 'Log Aktivitas Saya',
      subtitle: 'Riwayat aktivitas akun kedinasan Anda',
      accessibilityLabel: 'Buka Log Aktivitas Saya',
      Icon: History,
      onPress: handleOpenPersonalLogs,
    });

    return items;
  }, [
    canManageEmployees,
    isAdministrator,
    onNavigateReports,
    onNavigateUnitDirectory,
    onNavigatePegawai,
    onNavigateAuditLog,
    handleOpenPersonalLogs,
  ]);

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading & Subtitle (Web SSOT profile/edit.blade.php:4-5) */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Pengaturan Profil Akun</Text>
          <Text style={styles.mainSubtitle}>
            Kelola informasi identitas diri, kontak, dan keamanan kata sandi akun Anda
          </Text>
        </View>

        {/* 1. Profile Summary Panel (URUTAN TERATAS #1 — Putih bersih sesuai profile/edit.blade.php:266-320) */}
        <View style={styles.summaryPanel}>
          <View style={styles.summaryTop}>
            <View style={styles.avatarDarkBox}>
              <Text style={styles.avatarDarkText}>{initials}</Text>
            </View>
            <Text style={styles.summaryName}>{user?.name ?? 'Nama pengguna'}</Text>
            <View style={styles.emailPill}>
              <Text style={styles.emailPillText}>
                {user?.email || (user?.username ? `@${user.username}` : '—')}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hak Akses:</Text>
              <View
                style={[
                  styles.roleBadge,
                  isAdministrator ? styles.roleBadgeAdmin : styles.roleBadgeLight,
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    isAdministrator ? styles.roleBadgeTextAdmin : styles.roleBadgeTextLight,
                  ]}
                >
                  {roleDisplayLabel}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Status Akun:</Text>
              <View style={styles.accountActivePill}>
                <Text style={styles.accountActiveText}>Aktif</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Nomor Induk:</Text>
              <Text style={styles.summaryValueMono}>{user?.nip || '-'}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Terdaftar Sejak:</Text>
              <Text style={styles.summaryValueBold}>
                {registeredAt ? formatTanggalIndonesia(registeredAt) : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Card: Informasi Data Diri (langsung siap edit 1:1 Web) */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderIconBox}>
              <User size={19} strokeWidth={2} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderTextWrap}>
              <Text style={styles.sectionTitle}>Informasi Data Diri</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Perbarui nama lengkap, email kedinasan, dan nomor kontak aktif
              </Text>
            </View>
          </View>

          <Input
            label="Nama Lengkap *"
            placeholder="Masukkan nama lengkap beserta gelar..."
            value={nameInput}
            onChangeText={setNameInput}
            editable={!isSavingProfile}
            leftIcon={<User size={17} strokeWidth={2} color={colors.primary} />}
          />

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Nama Pengguna (Username)</Text>
            <View style={styles.readonlyInputRow}>
              <AtSign size={16} strokeWidth={2} color={colors.textMuted} />
              <Text style={styles.readonlyInputValueMono}>{user?.username ?? '—'}</Text>
              <Lock size={14} strokeWidth={2} color={colors.textMuted} />
            </View>
            <Text style={styles.fieldHelperText}>
              Username ditetapkan oleh Administrator sistem.
            </Text>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Nomor Induk Pegawai (NIP)</Text>
            <View style={styles.readonlyInputRow}>
              <CreditCard size={16} strokeWidth={2} color={colors.textMuted} />
              <Text style={styles.readonlyInputValueMono}>
                {user?.nip || 'Tidak tercatat'}
              </Text>
              <Lock size={14} strokeWidth={2} color={colors.textMuted} />
            </View>
            <Text style={styles.fieldHelperText}>
              Perubahan NIP hanya dapat dilakukan melalui Administrator.
            </Text>
          </View>

          <Input
            label="Alamat Email *"
            placeholder="nama@lldikti.kemdikbud.go.id"
            value={emailInput}
            onChangeText={setEmailInput}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSavingProfile}
            leftIcon={<Mail size={17} strokeWidth={2} color={colors.primary} />}
          />

          <Input
            label="Nomor Telepon / WhatsApp"
            placeholder="081234567890"
            value={phoneInput}
            onChangeText={setPhoneInput}
            keyboardType="phone-pad"
            isMono
            editable={!isSavingProfile}
            leftIcon={<Smartphone size={17} strokeWidth={2} color={colors.primary} />}
          />

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Unit Kerja Organisasi</Text>
            <View style={styles.readonlyInputRow}>
              <Building2 size={16} strokeWidth={2} color={colors.textMuted} />
              <Text style={styles.readonlyInputValue} numberOfLines={2}>
                {user?.unitKerja || 'Tingkat Lembaga (Tanpa Unit Kerja Terikat)'}
              </Text>
              <Lock size={14} strokeWidth={2} color={colors.textMuted} />
            </View>
          </View>

          <View style={styles.cardFooterSaveWrap}>
            <Button
              title={isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan Data Diri'}
              variant="primary"
              onPress={() => void handleSaveProfile()}
              isLoading={isSavingProfile}
              disabled={isSavingProfile}
              icon={<Save size={15} strokeWidth={2} color={colors.onPrimary} />}
              fullWidth
            />
          </View>
        </View>

        {/* 3. Card: Perbarui Kata Sandi Akun & Jejak Audit */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderIconBox}>
              <Lock size={19} strokeWidth={2} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderTextWrap}>
              <Text style={styles.sectionTitle}>Perbarui Kata Sandi Akun</Text>
              <Text style={styles.cardHeaderSubtitle}>
                {user?.security?.last_password_changed_label ||
                  'Pastikan menggunakan kombinasi kata sandi yang kuat dan aman'}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onNavigateChangePassword}
            style={({ pressed }) => [
              styles.changePassBtn,
              pressed && styles.changePassBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Perbarui Kata Sandi"
          >
            <ShieldCheck size={16} strokeWidth={2} color={colors.onPrimary} />
            <Text style={styles.changePassBtnText}>Perbarui Kata Sandi</Text>
          </Pressable>
        </View>

        {/* 4. Administrasi & Laporan Kedinasan sesuai Kebijakan Role Web */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderStatic}>
            <Text style={styles.sectionTitle}>
              {canManageEmployees ? 'Administrasi & Laporan Kedinasan' : 'Menu Akun'}
            </Text>
          </View>

          {menuItems.map((item, idx) => {
            const IconComp = item.Icon;
            return (
              <React.Fragment key={item.key}>
                {idx > 0 ? <View style={styles.menuDivider} /> : null}
                <Pressable
                  onPress={item.onPress}
                  style={({ pressed }) => [styles.menuNavCard, pressed && styles.itemPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={item.accessibilityLabel}
                >
                  <View style={styles.menuNavIconWrap}>
                    <IconComp size={20} strokeWidth={2} color={colors.primary} />
                  </View>
                  <View style={styles.menuNavTextCol}>
                    <Text style={styles.menuNavTitle}>{item.title}</Text>
                    <Text style={styles.menuNavSub}>{item.subtitle}</Text>
                  </View>
                  <ChevronRight size={20} strokeWidth={2} color={colors.textMuted} />
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {/* 5. Card: Ketentuan Keamanan Akun (edit.blade.php:323-333) */}
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

        {/* 6. Tombol Keluar dari Sistem */}
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
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 20,
    color: colors.primaryDarkest,
  },
  mainSubtitle: {
    ...typography.bodySm,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryPanel: {
    ...cardSurface,
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 20,
    gap: spacing.md,
    overflow: 'hidden',
  },
  summaryTop: {
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  avatarDarkBox: {
    width: 64,
    height: 64,
    borderRadius: rounded.xl,
    backgroundColor: colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarDarkText: {
    ...typography.headlineMd,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 22,
    color: colors.onPrimary,
  },
  summaryName: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansExtraBold,
    fontSize: 18,
    color: colors.onSurface,
    textAlign: 'center',
  },
  emailPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: rounded.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    maxWidth: '100%',
  },
  emailPillText: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoMedium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  summaryRows: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm + 4,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryLabel: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryValueBold: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
    color: colors.onSurface,
    textAlign: 'right',
    flexShrink: 1,
  },
  summaryValueMono: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 12,
    color: colors.onSurface,
    textAlign: 'right',
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: rounded.sm + 2,
  },
  roleBadgeAdmin: {
    backgroundColor: colors.primary,
  },
  roleBadgeLight: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  roleBadgeText: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 11,
  },
  roleBadgeTextAdmin: {
    color: colors.onPrimary,
  },
  roleBadgeTextLight: {
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
    color: colors.success,
  },
  sectionCard: {
    ...cardSurface,
    borderRadius: rounded.card,
    padding: spacing.md,
    gap: spacing.sm + 4,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingBottom: spacing.sm + 2,
  },
  cardHeaderIconBox: {
    width: 40,
    height: 40,
    borderRadius: rounded.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTextWrap: {
    flex: 1,
  },
  cardHeaderSubtitle: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
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
    color: colors.primaryDarkest,
  },
  fieldItem: {
    gap: 4,
  },
  fieldLabel: {
    ...typography.labelSm,
    fontFamily: fontFamilies.sansBold,
    fontSize: 12,
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
    paddingVertical: 8,
    gap: 8,
  },
  readonlyInputValue: {
    ...typography.bodySm,
    fontFamily: fontFamilies.sansMedium,
    fontSize: 12.5,
    color: colors.onSurface,
    flex: 1,
  },
  readonlyInputValueMono: {
    ...typography.labelMono,
    fontFamily: fontFamilies.monoBold,
    fontSize: 12,
    color: colors.onSurface,
    flex: 1,
    letterSpacing: 0.3,
  },
  fieldHelperText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  cardFooterSaveWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm + 4,
  },
  changePassBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: rounded.md,
    backgroundColor: colors.primaryDarkest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
  },
  changePassBtnPressed: {
    backgroundColor: colors.primaryContainer,
  },
  changePassBtnText: {
    ...typography.labelMd,
    fontFamily: fontFamilies.sansBold,
    fontSize: 13,
    color: colors.onPrimary,
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
});
