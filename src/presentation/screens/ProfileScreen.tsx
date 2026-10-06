import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Pressable,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing, elevations } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { useAuthStore } from '../store/useAuthStore';

interface ProfileScreenProps {
  onLogout: () => void;
  onNavigateAuditLog: () => void;
  onNavigatePegawai: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onLogout,
  onNavigateAuditLog,
  onNavigatePegawai,
}) => {
  const { user, logout } = useAuthStore();
  const [biometrics, setBiometrics] = useState(user?.biometricEnabled ?? true);
  const [whatsapp, setWhatsapp] = useState('+62 812-6789-2026');

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari akun kedinasan SIPERAPAT?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await logout();
            onLogout();
          },
        },
      ]
    );
  };

  const handleEditWhatsapp = () => {
    Alert.prompt
      ? Alert.prompt(
          'Ubah Nomor WhatsApp Dinas',
          'Masukkan nomor WhatsApp kedinasan aktif:',
          (text) => text && setWhatsapp(text),
          'plain-text',
          whatsapp
        )
      : Alert.alert('Ubah Kontak', `Nomor WhatsApp saat ini: ${whatsapp}`);
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Ubah Kata Sandi SSO Dikti',
      'Tautan pembaruan kata sandi akun SSO telah dikirimkan ke email resmi kedinasan Anda.'
    );
  };

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SUBTITLE & BADGE IDENTITAS RESMI */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Profil ASN</Text>
          <Text style={styles.mainSubtitle}>
            Informasi kepegawaian dan akun kedinasan LLDIKTI Wilayah X
          </Text>
        </View>

        {/* KARTU PROFIL PEGAWAI RESMI ASN (BENTO HERO) */}
        <View style={styles.heroCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarInner}>
                <MaterialIcons name="person" size={54} color={colors.primary} />
              </View>
            </View>

            <View style={styles.profileMetaInfo}>
              <Text style={styles.profileName}>
                {user?.name ?? 'Afdalisma, SH, M.Pd'}
              </Text>
              <Text style={styles.profileRoleTitle}>
                Kepala Lembaga (Superadmin SIPERAPAT)
              </Text>

              <View style={styles.profileDataGrid}>
                <View style={styles.dataPill}>
                  <Text style={styles.dataPillLabel}>NIP:</Text>
                  <Text style={styles.dataPillValueMono}>
                    {user?.nip ?? '197012051992032002'}
                  </Text>
                </View>

                <View style={styles.dataPill}>
                  <Text style={styles.dataPillLabel}>Pangkat:</Text>
                  <Text style={styles.dataPillValue}>
                    Pembina Utama Muda (IV/c)
                  </Text>
                </View>

                <View style={[styles.dataPill, { width: '100%' }]}>
                  <Text style={styles.dataPillLabel}>Unit Kerja:</Text>
                  <Text style={styles.dataPillValue} numberOfLines={1}>
                    Pimpinan & Lintas Unit (Pusat LLDIKTI X Padang)
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* PERFORMA KEHADIRAN SIDANG (4-GRID METRICS) */}
          <View style={styles.performanceSection}>
            <Text style={styles.performanceHeader}>
              PERFORMA KEHADIRAN SIDANG & RAPAT (SEMESTER BERJALAN)
            </Text>

            <View style={styles.perfGrid}>
              <View style={styles.perfCol}>
                <Text style={styles.perfLabel}>Rerata Kehadiran</Text>
                <Text style={styles.perfValue}>98.5%</Text>
                <Text style={styles.perfSub}>Sangat Patuh</Text>
              </View>

              <View style={styles.perfCol}>
                <Text style={styles.perfLabel}>Total Rapat</Text>
                <Text style={styles.perfValue}>24 Agenda</Text>
                <Text style={styles.perfSub}>LLDIKTI & Nasional</Text>
              </View>

              <View style={styles.perfCol}>
                <Text style={styles.perfLabel}>Bulan Ini</Text>
                <Text style={styles.perfValue}>6 Rapat</Text>
                <Text style={styles.perfSub}>100% Berita Acara</Text>
              </View>

              <View style={styles.perfCol}>
                <Text style={styles.perfLabel}>Kepatuhan Waktu</Text>
                <Text style={styles.perfValue}>100%</Text>
                <Text style={styles.perfSub}>Tepat Waktu</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 2: DATA MASTER KEDINASAN */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Informasi Akun Kedinasan</Text>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>NIP Resmi Kedinasan</Text>
            <View style={styles.lockedInputRow}>
              <MaterialIcons name="fingerprint" size={18} color={colors.outline} />
              <Text style={styles.lockedInputValueMono}>
                {user?.nip ?? '197012051992032002'}
              </Text>
              <Text style={styles.lockedTag}>Terkunci</Text>
            </View>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Username SIPERAPAT</Text>
            <View style={styles.readonlyInputRow}>
              <MaterialIcons name="alternate-email" size={18} color={colors.outline} />
              <Text style={styles.readonlyInputValue}>
                {user?.username ?? 'afdalisma'}
              </Text>
            </View>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Email Resmi Kedinasan</Text>
            <View style={styles.readonlyInputRow}>
              <MaterialIcons name="mail" size={18} color={colors.outline} />
              <Text style={styles.readonlyInputValue} numberOfLines={1}>
                {user?.email ?? 'afdalisma@lldiktiwilayahx.kemdiktisaintek.go.id'}
              </Text>
            </View>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Nomor WhatsApp Kedinasan</Text>
            <View style={styles.editableInputRow}>
              <MaterialIcons name="phone-iphone" size={18} color={colors.outline} />
              <TextInput
                style={styles.editableInput}
                value={whatsapp}
                onChangeText={setWhatsapp}
              />
              <Pressable onPress={handleEditWhatsapp} style={styles.editLinkBtn}>
                <Text style={styles.editLinkText}>Ubah</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldItem}>
            <Text style={styles.fieldLabel}>Tingkat Otoritas Sistem</Text>
            <View style={styles.readonlyInputRow}>
              <MaterialIcons name="security" size={18} color={colors.outline} />
              <Text style={styles.readonlyInputValueBold}>
                Administrator (Superadmin Wilayah)
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 3: AUTENTIKASI & KEAMANAN SESI */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Autentikasi & Keamanan Sesi</Text>

          <View style={styles.authActionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.authActionTitle}>
                Kata Sandi Kedinasan (SSO Dikti)
              </Text>
              <Text style={styles.authActionSub}>
                Terakhir diperbarui 30 hari yang lalu
              </Text>
            </View>
            <Pressable onPress={handleChangePassword} style={styles.changePassBtn}>
              <Text style={styles.changePassBtnText}>Ganti Sandi</Text>
            </Pressable>
          </View>

          <View style={styles.switchActionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.authActionTitle}>Autentikasi Biometrik ASN</Text>
              <Text style={styles.authActionSub}>
                Masuk cepat menggunakan sidik jari atau sensor biometrik perangkat
              </Text>
            </View>
            <Switch
              value={biometrics}
              onValueChange={setBiometrics}
              trackColor={{ false: colors.borderSubtle, true: colors.secondaryContainer }}
              thumbColor={biometrics ? colors.primary : '#FFFFFF'}
            />
          </View>

          <Pressable
            onPress={onNavigatePegawai}
            style={({ pressed }) => [styles.navItem, pressed && styles.itemPressed]}
          >
            <View style={styles.navItemLeft}>
              <MaterialIcons name="groups" size={20} color={colors.primary} />
              <Text style={styles.navItemTitle}>Kelola Pegawai & Unit Kerja</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
          </Pressable>

          <Pressable
            onPress={onNavigateAuditLog}
            style={({ pressed }) => [styles.navItem, pressed && styles.itemPressed]}
          >
            <View style={styles.navItemLeft}>
              <MaterialIcons name="security" size={20} color={colors.primary} />
              <Text style={styles.navItemTitle}>Log Aktivitas & Audit Trail</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
          </Pressable>
        </View>

        {/* SECTION 4: LOGOUT BUTTON */}
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={18} color={colors.error} />
          <Text style={styles.logoutButtonText}>
            Keluar Akun (Logout Sesi Kedinasan)
          </Text>
        </Pressable>

        <Text style={styles.versionNote}>
          SIPERAPAT LLDIKTI X v1.0.0 • Kementerian Pendidikan Tinggi, Sains, dan Teknologi
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
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    gap: spacing.md,
    ...elevations.level1,
  },
  profileTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(197, 197, 211, 0.6)',
  },
  avatarInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMetaInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    ...typography.headlineSm,
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  profileRoleTitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    marginBottom: 4,
  },
  profileDataGrid: {
    gap: 4,
  },
  dataPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  dataPillLabel: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  dataPillValue: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.onSurface,
    fontWeight: '600',
    flex: 1,
  },
  dataPillValueMono: {
    ...typography.labelMono,
    fontSize: 11,
    color: colors.onSurface,
    fontWeight: '700',
  },
  performanceSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.4)',
    paddingTop: spacing.sm + 2,
  },
  performanceHeader: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  perfGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  perfCol: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    justifyContent: 'space-between',
    minHeight: 72,
  },
  perfLabel: {
    ...typography.labelSm,
    fontSize: 9.5,
    color: colors.onSurfaceVariant,
  },
  perfValue: {
    ...typography.headlineSm,
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 2,
  },
  perfSub: {
    ...typography.labelSm,
    fontSize: 8.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    gap: spacing.sm + 2,
    ...elevations.level1,
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.4)',
    paddingBottom: spacing.xs + 2,
  },
  fieldItem: {
    gap: 3,
  },
  fieldLabel: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  lockedInputRow: {
    height: 38,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  lockedInputValueMono: {
    ...typography.labelMono,
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
    flex: 1,
  },
  lockedTag: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.outline,
  },
  readonlyInputRow: {
    height: 38,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  readonlyInputValue: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurface,
    flex: 1,
  },
  readonlyInputValueBold: {
    ...typography.bodySm,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurface,
    flex: 1,
  },
  editableInputRow: {
    height: 38,
    borderRadius: rounded.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  editableInput: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurface,
    flex: 1,
  },
  editLinkBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  editLinkText: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  authActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
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
    marginTop: 1,
  },
  changePassBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  changePassBtnText: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.onSurface,
  },
  navItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 197, 211, 0.3)',
  },
  itemPressed: {
    opacity: 0.7,
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navItemTitle: {
    ...typography.labelMd,
    fontSize: 12.5,
    color: colors.onSurface,
    fontWeight: '500',
  },
  logoutButton: {
    height: 44,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.4)',
    backgroundColor: colors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  logoutButtonText: {
    ...typography.labelMd,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.error,
  },
  versionNote: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.outline,
    textAlign: 'center',
    marginTop: 2,
  },
});
