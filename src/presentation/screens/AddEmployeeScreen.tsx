import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing } from '../../core/theme/tokens';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { AgendaOptionModal } from '../components/modals/AgendaOptionModal';
import { OFFICIAL_UNITS, PANGKAT_GOLONGAN_OPTIONS } from '../constants/employeeOptions';
import { useEmployeeStore } from '../store/useEmployeeStore';
import { cleanNIP, validateNIP } from '../../core/utils/nipValidator';

interface AddEmployeeScreenProps {
  onBack?: () => void;
  onSuccess?: () => void;
}

export const AddEmployeeScreen: React.FC<AddEmployeeScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const { addEmployee, isLoading, error, clearError } = useEmployeeStore();

  // Form State
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [pangkatGolongan, setPangkatGolongan] = useState('Penata Tingkat I (III/d)');
  const [unit, setUnit] = useState('Bagian Akademik & Kemahasiswaan');
  const [role, setRole] = useState<'Administrator' | 'Admin Unit' | 'Staff'>('Staff');
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [username, setUsername] = useState('');
  const [isUsernameCustom, setIsUsernameCustom] = useState(false);
  const [email, setEmail] = useState('');
  const [isEmailCustom, setIsEmailCustom] = useState(false);
  const [phone, setPhone] = useState('');

  // Modals
  const [activeModal, setActiveModal] = useState<'none' | 'unit' | 'pangkat'>('none');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<{
    name: string;
    nip: string;
    unit: string;
    role: string;
  } | null>(null);

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
        setEmail(`${simplified}@lldikti10.kemdikbud.go.id`);
      }
    }
  };

  const handleNipChange = (val: string) => {
    const cleaned = cleanNIP(val);
    setNip(cleaned);
  };

  // NIP validation info
  const nipValidation = validateNIP(nip);
  const isNipComplete = nip.length === 18;
  const isFormValid =
    name.trim().length >= 3 &&
    isNipComplete &&
    nipValidation.isValid &&
    jabatan.trim().length >= 3 &&
    unit.length > 0 &&
    pangkatGolongan.length > 0;

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;

    clearError();
    const finalUsername = username.trim().startsWith('@')
      ? username.trim()
      : `@${username.trim()}`;

    const result = await addEmployee({
      name: name.trim(),
      nip,
      jabatan: jabatan.trim(),
      pangkatGolongan,
      unit,
      role,
      status,
      username: finalUsername || `@asn_${nip.slice(-4)}`,
      email: email.trim() || `${nip}@lldikti10.kemdikbud.go.id`,
      phone: phone.trim() || '-',
    });

    if (result) {
      setCreatedSummary({
        name: result.name,
        nip: result.nip,
        unit: result.unit,
        role: result.role,
      });
      setShowSuccessModal(true);
    }
  };

  const handleSuccessClose = () => {
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
        title="Tambah Pegawai ASN"
        subtitle="Registrasi Personel & Akun Kedinasan"
        showBack={Boolean(onBack)}
        onBack={onBack}
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
              <MaterialIcons name="error-outline" size={18} color={colors.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

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
                placeholder="contoh: Dr. H. Syahril, M.Pd"
                value={name}
                onChangeText={handleNameChange}
                containerStyle={styles.inputContainerReset}
                leftIcon={
                  <MaterialIcons name="person" size={18} color={colors.outline} />
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
                  <MaterialIcons name="fingerprint" size={18} color={colors.outline} />
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
                  <MaterialIcons
                    name={
                      isNipComplete && nipValidation.isValid
                        ? 'check-circle'
                        : 'info-outline'
                    }
                    size={14}
                    color={
                      isNipComplete && nipValidation.isValid
                        ? colors.secondary
                        : colors.onSurfaceVariant
                    }
                  />
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
              <Text style={styles.label}>
                Jabatan Kedinasan / Fungsional <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="contoh: Analis Kepegawaian Ahli Muda"
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
                  <Text style={styles.selectorActionText}>Pilih</Text>
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

            {/* Peran Sistem (Role) */}
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
                placeholder="@username_resmi"
                value={username}
                onChangeText={(val) => {
                  setUsername(val);
                  setIsUsernameCustom(true);
                }}
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
                onChangeText={(val) => {
                  setEmail(val);
                  setIsEmailCustom(true);
                }}
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
              title="Simpan Pegawai Baru"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={!isFormValid}
              icon={
                <MaterialIcons
                  name="person-add"
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
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalSuccessIconWrap}>
              <MaterialIcons name="check" size={32} color="#005A36" />
            </View>

            <Text style={styles.modalTitle}>Pegawai Berhasil Didaftarkan</Text>
            <Text style={styles.modalDesc}>
              Akun kedinasan aparatur sipil negara telah resmi tercatat di sistem SIPERAPAT LLDIKTI X.
            </Text>

            {createdSummary && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Nama</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {createdSummary.name}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>NIP</Text>
                  <Text style={[styles.summaryValue, styles.monoText]}>
                    {createdSummary.nip}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Unit</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>
                    {createdSummary.unit}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Peran</Text>
                  <Text style={styles.summaryValue}>{createdSummary.role}</Text>
                </View>
              </View>
            )}

            <Button
              title="Kembali ke Direktori Pegawai"
              onPress={handleSuccessClose}
              variant="primary"
              size="md"
              fullWidth
            />
          </View>
        </View>
      </Modal>
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
  nipCounter: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    backgroundColor: 'rgba(0, 102, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 102, 68, 0.25)',
  },
  nipValidationPending: {
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  nipValidationText: {
    ...typography.bodySm,
    fontSize: 11,
  },
  nipValidationTextSuccess: {
    color: '#005A36',
    fontWeight: '600',
  },
  nipValidationTextPending: {
    color: colors.onSurfaceVariant,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: 'rgba(197, 197, 211, 0.5)',
      },
    }),
  },
  modalSuccessIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 102, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.headlineSm,
    fontSize: 16,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
  },
  modalDesc: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 17,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: spacing.sm + 4,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    ...typography.bodySm,
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurface,
    maxWidth: '65%',
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
});
