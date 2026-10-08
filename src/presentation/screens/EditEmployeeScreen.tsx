import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { FeedbackModal } from '../components/modals/FeedbackModal';
import { OFFICIAL_UNITS, PANGKAT_GOLONGAN_OPTIONS } from '../constants/employeeOptions';
import { useEmployeeStore } from '../store/useEmployeeStore';

interface EditEmployeeScreenProps {
  employeeId: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

export const EditEmployeeScreen: React.FC<EditEmployeeScreenProps> = ({
  employeeId,
  onBack,
  onSuccess,
}) => {
  const {
    fetchEmployeeById,
    updateEmployee,
    selectedEmployee,
    isLoading,
    error,
    clearError,
  } = useEmployeeStore();

  const [isInitializing, setIsInitializing] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [pangkatGolongan, setPangkatGolongan] = useState('');
  const [unit, setUnit] = useState('');
  const [role, setRole] = useState<'Administrator' | 'Admin Unit' | 'Staff'>('Staff');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

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

  // Load employee data on mount
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsInitializing(true);
      const emp = await fetchEmployeeById(employeeId);
      if (emp && isMounted) {
        setName(emp.name);
        setNip(emp.nip);
        setJabatan(emp.jabatan || 'Pranata Komputer');
        setPangkatGolongan(emp.pangkatGolongan || 'Penata Tingkat I (III/d)');
        setUnit(emp.unit);
        setRole(emp.role);
        setStatus(emp.status);
        setUsername(emp.username);
        setEmail(emp.email || `${emp.nip}@lldikti10.kemdikbud.go.id`);
        setPhone(emp.phone || '');
      }
      if (isMounted) {
        setIsInitializing(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [employeeId, fetchEmployeeById]);

  const isFormValid =
    name.trim().length >= 3 &&
    jabatan.trim().length >= 3 &&
    unit.length > 0 &&
    pangkatGolongan.length > 0;

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    clearError();
    const finalUsername = username.trim().startsWith('@')
      ? username.trim()
      : `@${username.trim()}`;

    const result = await updateEmployee(employeeId, {
      name: name.trim(),
      jabatan: jabatan.trim(),
      pangkatGolongan,
      unit,
      role,
      status,
      username: finalUsername || selectedEmployee?.username || '@asn',
      email: email.trim(),
      phone: phone.trim() || '-',
    });

    if (result) {
      setUpdatedSummary({
        name: result.name,
        nip: result.nip,
        unit: result.unit,
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
          <MaterialIcons name="person-off" size={48} color={colors.outline} />
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
              <MaterialIcons name="error-outline" size={18} color={colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          {/* READONLY IDENTITY CONTEXT BANNER */}
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
                    <MaterialIcons name="lock" size={11} color={colors.primary} />
                    <Text style={styles.lockBadgeText}>NIP Terkunci Resmi</Text>
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
          </View>

          {/* BAGIAN 1: IDENTITAS APARATUR */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <MaterialIcons name="badge" size={16} color={colors.primary} />
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
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <MaterialIcons name="person" size={18} color={colors.outline} />
                }
              />
            </View>

            {/* NIP (READONLY / LOCKED) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>NIP 18 Digit Resmi</Text>
                <View style={styles.lockedIndicator}>
                  <MaterialIcons name="lock" size={12} color={colors.outline} />
                  <Text style={styles.lockedIndicatorText}>Permanen</Text>
                </View>
              </View>
              <Input
                value={nip}
                editable={false}
                isMono
                containerStyle={styles.inputContainerReset}
                style={styles.readonlyInput}
                leftIcon={
                  <MaterialIcons name="fingerprint" size={18} color={colors.outline} />
                }
                helperText="NIP aparatur sipil negara bersifat unik dan terkunci demi integritas riwayat presensi."
              />
            </View>

            {/* Jabatan Kedinasan */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Jabatan Kedinasan / Fungsional <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="Jabatan kedinasan..."
                value={jabatan}
                onChangeText={setJabatan}
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <MaterialIcons name="work-outline" size={18} color={colors.outline} />
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
                  <MaterialIcons
                    name="military-tech"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {pangkatGolongan}
                  </Text>
                </View>
                <View style={styles.selectorRight}>
                  <Text style={styles.selectorActionText}>Ubah</Text>
                  <MaterialIcons
                    name="unfold-more"
                    size={18}
                    color={colors.outline}
                  />
                </View>
              </Pressable>
            </View>
          </View>

          {/* BAGIAN 2: PENUGASAN UNIT & PERAN SISTEM */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <MaterialIcons name="account-tree" size={16} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Penugasan Unit & Peran Sistem</Text>
            </View>

            {/* Unit Kerja / Pokja Selector */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Unit Kerja / Tim Kerja <Text style={styles.required}>*</Text>
              </Text>
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
                  <MaterialIcons name="domain" size={18} color={colors.primary} />
                  <Text style={styles.selectorValue} numberOfLines={1}>
                    {unit}
                  </Text>
                </View>
                <View style={styles.selectorRight}>
                  <Text style={styles.selectorActionText}>Ubah</Text>
                  <MaterialIcons
                    name="unfold-more"
                    size={18}
                    color={colors.outline}
                  />
                </View>
              </Pressable>
            </View>

            {/* Peran Sistem */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Peran Akses Sistem SIPERAPAT <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.roleGrid}>
                {(['Staff', 'Admin Unit', 'Administrator'] as const).map((r) => {
                  const isSelected = role === r;
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
                        <MaterialIcons
                          name={
                            r === 'Administrator'
                              ? 'admin-panel-settings'
                              : r === 'Admin Unit'
                              ? 'manage-accounts'
                              : 'person-outline'
                          }
                          size={18}
                          color={isSelected ? colors.primary : colors.outline}
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
                >
                  <MaterialIcons
                    name="check-circle"
                    size={15}
                    color={status === 'Aktif' ? colors.secondary : colors.outline}
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
                >
                  <MaterialIcons
                    name="pause-circle-outline"
                    size={15}
                    color={status === 'Nonaktif' ? colors.error : colors.outline}
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
                <MaterialIcons name="contact-mail" size={16} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Akun & Kontak Kedinasan</Text>
            </View>

            {/* Username */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Username Aplikasi</Text>
              <Input
                placeholder="@username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <MaterialIcons name="alternate-email" size={18} color={colors.outline} />
                }
              />
            </View>

            {/* Email Kedinasan */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Kedinasan Resmi</Text>
              <Input
                placeholder="nama@lldikti10.kemdikbud.go.id"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <MaterialIcons name="mail-outline" size={18} color={colors.outline} />
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
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <MaterialIcons name="phone" size={18} color={colors.outline} />
                }
              />
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
                <MaterialIcons
                  name="save"
                  size={18}
                  color={colors.onPrimary}
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
        subtitle="Daftar 11 unit kerja kedinasan LLDIKTI Wilayah X"
        options={OFFICIAL_UNITS}
        selectedId={unit}
        onSelect={(opt) => {
          setUnit(opt.id);
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
    color: colors.onSurface,
    fontWeight: '700',
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
    backgroundColor: '#FFE4E6',
    padding: spacing.sm + 2,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  errorBannerText: {
    ...typography.bodySm,
    color: colors.error,
    flex: 1,
  },
  contextCard: {
    backgroundColor: 'rgba(0, 35, 111, 0.03)',
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 35, 111, 0.12)',
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
    fontSize: 16,
    color: colors.onPrimary,
    fontWeight: '700',
  },
  contextMeta: {
    flex: 1,
    gap: 3,
  },
  contextName: {
    ...typography.headlineSm,
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
  },
  lockBadgeText: {
    ...typography.labelSm,
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.primary,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.sm,
  },
  statusPillActive: {
    backgroundColor: 'rgba(0, 102, 68, 0.08)',
  },
  statusPillInactive: {
    backgroundColor: 'rgba(186, 26, 26, 0.08)',
  },
  statusPillText: {
    ...typography.labelSm,
    fontSize: 9.5,
    fontWeight: '600',
  },
  statusPillTextActive: {
    color: '#005A36',
  },
  statusPillTextInactive: {
    color: colors.error,
  },
  sectionCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: spacing.sm + 4,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 197, 211, 0.3)',
    paddingBottom: spacing.xs + 4,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 35, 111, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...typography.headlineSm,
    fontSize: 13.5,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '600',
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
    height: 48,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: rounded.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
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
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
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
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    borderRadius: rounded.md,
    padding: spacing.sm,
    gap: 3,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 35, 111, 0.04)',
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
    borderColor: 'rgba(197, 197, 211, 0.8)',
  },
  radioDotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  roleTitle: {
    ...typography.labelMd,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  roleTitleActive: {
    color: colors.primary,
  },
  roleDesc: {
    ...typography.bodySm,
    fontSize: 9.5,
    color: colors.onSurfaceVariant,
    lineHeight: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
    gap: 4,
  },
  segmentedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: rounded.sm,
    gap: 6,
  },
  segmentedBtnActive: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.6)',
  },
  segmentedBtnText: {
    ...typography.labelMd,
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  segmentedBtnTextActive: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  actionSection: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
