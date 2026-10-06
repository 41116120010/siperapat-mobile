import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../core/theme/colors';
import { typography } from '../../core/theme/typography';
import { rounded, spacing, elevations } from '../../core/theme/tokens';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuthStore } from '../store/useAuthStore';
import { formatNIP, validateNIP, cleanNIP } from '../../core/utils/nipValidator';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

type AuthMode = 'nip' | 'username';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('nip');
  const [identifier, setIdentifier] = useState('19701205 199203 2 002');
  const [password, setPassword] = useState('lldikti2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  const { login, loginBiometric, isLoading, error, clearError } = useAuthStore();

  const rawDigits = useMemo(() => cleanNIP(identifier), [identifier]);
  const isNipComplete = rawDigits.length === 18;
  const nipValidation = useMemo(() => {
    if (authMode !== 'nip') return null;
    return validateNIP(identifier);
  }, [authMode, identifier]);

  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
    if (mode === 'nip') {
      setIdentifier('19701205 199203 2 002');
    } else {
      setIdentifier('afdalisma');
    }
    if (error) clearError();
  };

  const handleIdentifierChange = (val: string) => {
    if (authMode === 'nip') {
      setIdentifier(formatNIP(val));
    } else {
      setIdentifier(val);
    }
    if (error) clearError();
  };

  const handleLogin = async () => {
    const success = await login(identifier, password);
    if (success) {
      onLoginSuccess();
    }
  };

  const handleBiometricLogin = async () => {
    const success = await loginBiometric();
    if (success) {
      onLoginSuccess();
    }
  };

  const handleHelpdesk = () => {
    Linking.openURL('tel:0751123456').catch(() => {});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Identity & Institutional Header Bar */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image
              source={require('../../../assets/images/tut-wuri-handayani.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.appTitle}>SIPERAPAT</Text>
              <Text style={styles.appSubtitle}>LLDIKTI WILAYAH X</Text>
            </View>
          </View>
          <Text style={styles.welcomeTitle}>Masuk ke Akun Kedinasan</Text>
          <Text style={styles.welcomeSubtitle}>
            Gunakan NIP (18 Digit) atau Username terdaftar untuk memulai pencatatan presensi.
          </Text>
        </View>

        {/* Main Authentication Bento Card */}
        <View style={styles.card}>
          {/* Smart Mode Tab Selector */}
          <View style={styles.tabContainer}>
            <Pressable
              onPress={() => handleModeChange('nip')}
              style={[
                styles.tabButton,
                authMode === 'nip' && styles.tabButtonActive,
              ]}
            >
              <MaterialIcons
                name="badge"
                size={16}
                color={authMode === 'nip' ? colors.primary : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.tabText,
                  authMode === 'nip' && styles.tabTextActive,
                ]}
              >
                NIP (18 Digit)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleModeChange('username')}
              style={[
                styles.tabButton,
                authMode === 'username' && styles.tabButtonActive,
              ]}
            >
              <MaterialIcons
                name="person"
                size={16}
                color={authMode === 'username' ? colors.primary : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.tabText,
                  authMode === 'username' && styles.tabTextActive,
                ]}
              >
                Username ASN
              </Text>
            </Pressable>
          </View>

          {/* Identifier Input with Counter Badge */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>
                {authMode === 'nip'
                  ? 'Nomor Induk Pegawai (NIP)'
                  : 'Username ASN Terdaftar'}
              </Text>
              {authMode === 'nip' ? (
                <View
                  style={[
                    styles.counterBadge,
                    isNipComplete && styles.counterBadgeSuccess,
                  ]}
                >
                  <Text
                    style={[
                      styles.counterText,
                      isNipComplete && styles.counterTextSuccess,
                    ]}
                  >
                    {rawDigits.length} / 18
                  </Text>
                </View>
              ) : null}
            </View>

            <Input
              label=""
              placeholder={
                authMode === 'nip'
                  ? 'Contoh: 19701205 199203 2 002'
                  : 'Masukkan username dinas'
              }
              value={identifier}
              onChangeText={handleIdentifierChange}
              keyboardType={authMode === 'nip' ? 'number-pad' : 'default'}
              maxLength={authMode === 'nip' ? 23 : 32}
              isMono={authMode === 'nip'}
              leftIcon={
                <MaterialIcons
                  name={authMode === 'nip' ? 'badge' : 'person'}
                  size={20}
                  color={colors.outline}
                />
              }
            />

            {/* Real-time NIP Validation Banner */}
            {authMode === 'nip' && isNipComplete && nipValidation?.isValid ? (
              <View style={styles.validBanner}>
                <MaterialIcons name="verified" size={16} color="#065F46" />
                <Text style={styles.validBannerText}>
                  Format 18 digit NIP valid untuk verifikasi ASN
                </Text>
              </View>
            ) : null}
          </View>

          {/* Password Field with Aligned Forgot Link */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Kata Sandi Kedinasan</Text>
              <Pressable onPress={handleHelpdesk} hitSlop={6}>
                <Text style={styles.forgotLink}>Lupa Kata Sandi?</Text>
              </Pressable>
            </View>

            <Input
              label=""
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              leftIcon={
                <MaterialIcons name="lock" size={20} color={colors.outline} />
              }
              rightAction={
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={colors.outline}
                  />
                </Pressable>
              }
            />
          </View>

          {/* Remember Me Checkbox */}
          <Pressable
            onPress={() => setRememberDevice(!rememberDevice)}
            style={styles.rememberRow}
          >
            <MaterialIcons
              name={rememberDevice ? 'check-box' : 'check-box-outline-blank'}
              size={20}
              color={rememberDevice ? colors.primary : colors.outline}
            />
            <Text style={styles.rememberText}>
              Ingat perangkat ini (30 Hari)
            </Text>
          </Pressable>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Primary Submit Button: Masuk ke Sistem */}
          <Button
            title="Masuk ke Sistem"
            onPress={handleLogin}
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading || !identifier || !password}
            style={styles.submitBtn}
            icon={<MaterialIcons name="login" size={20} color={colors.onPrimary} />}
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ATAU</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Quick Biometric Authentication Button */}
          <Button
            title="Masuk dengan Biometrik ASN (Sidik Jari / Wajah)"
            onPress={handleBiometricLogin}
            variant="outline"
            size="md"
            fullWidth
            icon={
              <MaterialIcons
                name="fingerprint"
                size={22}
                color={colors.primary}
              />
            }
          />
        </View>

        {/* Institutional Footer & Security Badges */}
        <View style={styles.footer}>
          {/* Security Protocol Banner */}
          <View style={styles.securityBanner}>
            <MaterialIcons name="security" size={14} color={colors.primary} />
            <Text style={styles.securityBannerText}>
              Terkoneksi ke Server Otentikasi Terenkripsi SSL/TLS 256-bit LLDIKTI X
            </Text>
          </View>

          {/* Helpdesk */}
          <View style={styles.helpdeskRow}>
            <Text style={styles.helpdeskText}>Mengalami kendala akun? </Text>
            <Pressable onPress={handleHelpdesk} style={styles.helpdeskLinkWrap}>
              <Text style={styles.helpdeskLink}>
                Hubungi Helpdesk Subbag Kepegawaian
              </Text>
              <MaterialIcons name="open-in-new" size={12} color={colors.secondary} />
            </Pressable>
          </View>

          {/* Copyright */}
          <Text style={styles.copyrightText}>
            © 2026 Lembaga Layanan Pendidikan Tinggi Wilayah X. Seluruh hak cipta dilindungi undang-undang.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.sm + 2,
  },
  logo: {
    width: 48,
    height: 48,
  },
  appTitle: {
    ...typography.headlineSm,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  welcomeTitle: {
    ...typography.headlineLg,
    fontSize: 22,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    ...typography.bodySm,
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.5)',
    ...elevations.level1,
    gap: spacing.sm + 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: rounded.md,
    padding: 3,
    marginBottom: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm - 2,
    borderRadius: rounded.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.surfaceContainerLowest,
    ...elevations.level1,
  },
  tabText: {
    ...typography.labelMd,
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  inputGroup: {
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  inputLabel: {
    ...typography.labelMd,
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  counterBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  counterBadgeSuccess: {
    backgroundColor: '#ECFDF5',
  },
  counterText: {
    ...typography.labelSm,
    fontSize: 10,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  counterTextSuccess: {
    color: '#065F46',
  },
  validBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: rounded.sm,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 2,
  },
  validBannerText: {
    ...typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  forgotLink: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.secondary,
    fontWeight: '600',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginVertical: 2,
  },
  rememberText: {
    ...typography.labelMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.errorContainer,
    padding: spacing.sm,
    borderRadius: rounded.md,
  },
  errorText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.error,
    flex: 1,
  },
  submitBtn: {
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderSubtle,
  },
  dividerText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.outline,
    paddingHorizontal: spacing.sm,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: 'rgba(197, 197, 211, 0.4)',
  },
  securityBannerText: {
    ...typography.labelSm,
    fontSize: 10.5,
    color: colors.primary,
    fontWeight: '500',
  },
  helpdeskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  helpdeskText: {
    ...typography.bodySm,
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
  },
  helpdeskLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  helpdeskLink: {
    ...typography.labelSm,
    fontSize: 11.5,
    color: colors.secondary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  copyrightText: {
    ...typography.labelSm,
    fontSize: 10,
    color: colors.outline,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 14,
  },
});
