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
import { useAuthStore } from '../store/useAuthStore';
import { useFeedbackStore } from '../store/useFeedbackStore';

interface ProfileScreenProps {
  onLogout: () => void;
  onNavigateAuditLog: () => void;
  onNavigatePegawai: () => void;
  onNavigateChangePassword: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onLogout,
  onNavigateAuditLog,
  onNavigatePegawai,
  onNavigateChangePassword,
}) => {
  const { user, logout } = useAuthStore();
  const [whatsapp, setWhatsapp] = useState(user?.phone ?? '');

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

  const handleChangePassword = () => {
    onNavigateChangePassword();
  };

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SUBTITLE & IDENTITAS RESMI */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Profil ASN</Text>
          <Text style={styles.mainSubtitle}>
            Informasi kepegawaian dan akun kedinasan LLDIKTI Wilayah X
          </Text>
        </View>

        {/* KARTU PROFIL PEGAWAI RESMI ASN */}
        <View style={styles.heroCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarInner}>
                <MaterialIcons name="person" size={48} color={colors.primary} />
              </View>
            </View>

            <View style={styles.profileMetaInfo}>
              <Text style={styles.profileName}>
                {user?.name ?? 'Nama pengguna'}
              </Text>
              <Text style={styles.profileRoleTitle}>
                {user?.jabatan ?? 'Jabatan tidak tersedia'}
              </Text>
              <Text style={styles.profileMetaSub} numberOfLines={2}>
                {[user?.pangkatGolongan, user?.unitKerja].filter(Boolean).join(' • ') || 'Informasi unit belum tersedia'}
              </Text>
            </View>
          </View>

          {/* STATISTIK KEHADIRAN (3-COLUMN PROPORTIONAL GRID) */}
          <View style={styles.performanceSection}>
            <Text style={styles.performanceHeader}>Statistik Kehadiran</Text>

            <View style={styles.perfGrid}>
              <View style={styles.perfCol}>
                <Text style={styles.perfLabel}>Total Agenda</Text>
                <Text style={styles.perfValue}>{user?.attendanceStats?.totalAgendas ?? '—'}</Text>
                <Text style={styles.perfSub}>Agenda yang dapat diakses</Text>
              </View>

              <View style={styles.perfCol}>
                <Text style={styles.perfLabel}>Kehadiran</Text>
                <Text style={styles.perfValue}>{user?.attendanceStats?.attendanceRateLabel ?? '—'}</Text>
                <Text style={styles.perfSub}>Tervalidasi</Text>
              </View>

              <View style={styles.perfCol}>
                <Text style={styles.perfLabel}>Tepat Waktu</Text>
                <Text style={styles.perfValue}>{user?.attendanceStats?.onTimeRateLabel ?? '—'}</Text>
                <Text style={styles.perfSub}>Presensi Awal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 2: INFORMASI AKUN KEDINASAN */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Informasi Akun Kedinasan</Text>

          {/* NIP Field (Without redundant "Terkunci" tag) */}
          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>NIP</Text>
            <View style={styles.readonlyInputRow}>
              <MaterialIcons name="badge" size={18} color={colors.outline} />
              <Text style={styles.readonlyInputValueMono}>
                {user?.nip || '—'}
              </Text>
            </View>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.readonlyInputRow}>
              <MaterialIcons name="alternate-email" size={18} color={colors.outline} />
              <Text style={styles.readonlyInputValue}>
                {user?.username ?? '—'}
              </Text>
            </View>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Email Kedinasan</Text>
            <View style={styles.readonlyInputRow}>
              <MaterialIcons name="mail" size={18} color={colors.outline} />
              <Text style={styles.readonlyInputValue} numberOfLines={1}>
                {user?.email || '—'}
              </Text>
            </View>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>WhatsApp Kedinasan</Text>
            <View style={styles.editableInputRow}>
              <MaterialIcons name="phone-iphone" size={18} color={colors.outline} />
              <TextInput
                style={styles.editableInput}
                value={whatsapp}
                onChangeText={setWhatsapp}
                keyboardType="phone-pad"
                placeholder="Nomor WhatsApp"
                placeholderTextColor={colors.outline}
              />
            </View>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Hak Akses</Text>
            <View style={styles.readonlyInputRow}>
              <MaterialIcons name="security" size={18} color={colors.outline} />
              <Text style={styles.readonlyInputValueBold}>
                Superadmin Wilayah
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 3: KEAMANAN AKUN */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Keamanan Akun</Text>

          <View style={styles.authActionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.authActionTitle}>Kata Sandi</Text>
              <Text style={styles.authActionSub}>
                Terakhir diperbarui 30 hari yang lalu
              </Text>
            </View>
            <Pressable
              onPress={handleChangePassword}
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
          <Text style={styles.sectionTitle}>Administrasi Sistem</Text>

          <Pressable
            onPress={onNavigatePegawai}
            style={({ pressed }) => [styles.menuNavCard, pressed && styles.itemPressed]}
            accessibilityRole="button"
            accessibilityLabel="Buka Direktori Pegawai"
          >
            <View style={styles.menuNavIconWrap}>
              <MaterialIcons name="groups" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuNavTextCol}>
              <Text style={styles.menuNavTitle}>Direktori Pegawai ASN</Text>
              <Text style={styles.menuNavSub}>
                Daftar 79 pegawai ASN dan pembagian unit kerja
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
          </Pressable>

          <View style={styles.menuDivider} />

          <Pressable
            onPress={onNavigateAuditLog}
            style={({ pressed }) => [styles.menuNavCard, pressed && styles.itemPressed]}
            accessibilityRole="button"
            accessibilityLabel="Buka Log Aktivitas Sistem"
          >
            <View style={styles.menuNavIconWrap}>
              <MaterialIcons name="history" size={20} color={colors.primary} />
            </View>
            <View style={styles.menuNavTextCol}>
              <Text style={styles.menuNavTitle}>Log Audit Sistem</Text>
              <Text style={styles.menuNavSub}>
                Rekam jejak aktivitas, autentikasi, dan presensi
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
          </Pressable>
        </View>

        {/* SECTION 5: LOGOUT BUTTON */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Keluar Akun"
        >
          <MaterialIcons name="logout" size={18} color={colors.error} />
          <Text style={styles.logoutButtonText}>Keluar Akun</Text>
        </Pressable>

        <Text style={styles.versionNote}>
          SIPERAPAT LLDIKTI Wilayah X • v1.0.0
        </Text>
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  mainSubtitle: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    gap: spacing.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
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
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 35, 111, 0.2)',
  },
  avatarInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMetaInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    ...typography.headlineSm,
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  profileRoleTitle: {
    ...typography.labelMd,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  profileMetaSub: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  performanceSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.4)',
    paddingTop: spacing.sm + 2,
  },
  performanceHeader: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  perfGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  perfCol: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
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
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2,
  },
  perfSub: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.45)',
    gap: spacing.sm + 2,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.4)',
    paddingBottom: spacing.xs + 2,
  },
  fieldItem: {
    gap: 4,
  },
  fieldLabel: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  readonlyInputRow: {
    height: 40,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  readonlyInputValue: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurface,
    flex: 1,
  },
  readonlyInputValueMono: {
    ...typography.labelMono,
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
    flex: 1,
    letterSpacing: 0.3,
  },
  readonlyInputValueBold: {
    ...typography.bodySm,
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  editableInputRow: {
    height: 40,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  editableInput: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurface,
    flex: 1,
    paddingVertical: 0,
  },
  authActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  authActionTitle: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  authActionSub: {
    ...typography.bodySm,
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  changePassBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: rounded.full,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.65)',
    backgroundColor: colors.surfaceContainerLowest,
  },
  changePassBtnText: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  menuNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  itemPressed: {
    opacity: 0.7,
  },
  menuNavIconWrap: {
    width: 36,
    height: 36,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuNavTextCol: {
    flex: 1,
  },
  menuNavTitle: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  menuNavSub: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(197, 197, 211, 0.35)',
    marginVertical: 2,
  },
  logoutButton: {
    height: 44,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.35)',
    backgroundColor: colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  logoutButtonPressed: {
    backgroundColor: 'rgba(186, 26, 26, 0.05)',
  },
  logoutButtonText: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.error,
  },
  versionNote: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.outline,
    textAlign: 'center',
    marginTop: 2,
  },
});
