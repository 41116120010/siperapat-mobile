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
import { formatNIP } from '../../core/utils/nipValidator';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('19701205 199203 2 002');
  const [password, setPassword] = useState('lldikti2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  const { login, isLoading, error, clearError } = useAuthStore();

  const isNumericInput = useMemo(() => {
    const trimmed = identifier.trim();
    return trimmed.length > 0 && /^[0-9\s]+$/.test(trimmed);
  }, [identifier]);

  const handleIdentifierChange = (val: string) => {
    // Jika input berupa angka/spasi, terapkan pemformatan NIP cerdas
    if (/^[0-9\s]*$/.test(val)) {
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
          <View style={styles.logoTile}>
            <Image
              source={require('../../../assets/images/tut-wuri-handayani.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appTitle}>SIPERAPAT</Text>
          <Text style={styles.appSubtitle}>LLDIKTI WILAYAH X</Text>
          <Text style={styles.welcomeSubtitle}>
            Sistem Informasi Presensi Rapat Kedinasan Terpadu
          </Text>
        </View>

        {/* Main Authentication Bento Card */}
        <View style={styles.card}>
          {/* Unified NIP / Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>NIP (18 Digit) atau Username ASN</Text>
            <Input
              label=""
              placeholder="Contoh: 19701205 199203 2 002 atau afdalisma"
              value={identifier}
              onChangeText={handleIdentifierChange}
              keyboardType="default"
              maxLength={32}
              isMono={isNumericInput}
              leftIcon={
                <MaterialIcons
                  name={isNumericInput ? 'badge' : 'person'}
                  size={20}
                  color={colors.outline}
                />
              }
            />
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
        </View>

        {/* Institutional Footer */}
        <View style={styles.footer}>
          {/* Helpdesk */}
          <View style={styles.helpdeskRow}>
            <Text style={styles.helpdeskText}>Kendala akun kedinasan? </Text>
            <Pressable onPress={handleHelpdesk} style={styles.helpdeskLinkWrap}>
              <Text style={styles.helpdeskLink}>
                Hubungi Helpdesk Kepegawaian
              </Text>
              <MaterialIcons name="open-in-new" size={12} color={colors.secondary} />
            </Pressable>
          </View>

          {/* Copyright */}
          <Text style={styles.copyrightText}>
            © 2026 Lembaga Layanan Pendidikan Tinggi Wilayah X • Kemdiktisaintek
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoTile: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    ...elevations.level2,
    shadowColor: '#00236F',
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    ...typography.headlineLg,
    fontSize: 24,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  appSubtitle: {
    ...typography.labelSm,
    color: colors.secondary,
    letterSpacing: 1.2,
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  welcomeSubtitle: {
    ...typography.bodySm,
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 290,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    ...elevations.level2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
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
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs + 2,
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
