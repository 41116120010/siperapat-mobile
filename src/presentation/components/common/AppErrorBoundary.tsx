import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';
import { colors } from '../../../core/theme/colors';
import { cardSurface, MIN_TOUCH_TARGET, rounded, spacing } from '../../../core/theme/tokens';
import { fontFamilies, typography } from '../../../core/theme/typography';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Global React ErrorBoundary untuk mencegah force-close tanpa pesan pemulihan
 * saat terjadi galat runtime tak terduga di pohon komponen.
 */
export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    if (__DEV__) {
      console.error('[AppErrorBoundary]', error.message);
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <AlertTriangle size={28} color={colors.error} strokeWidth={2} />
          </View>
          <Text style={styles.title}>Terjadi Kendala Aplikasi</Text>
          <Text style={styles.message}>
            Tampilan mengalami gangguan tak terduga. Silakan muat ulang aplikasi untuk melanjutkan.
          </Text>
          <Pressable
            onPress={this.handleReset}
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Muat Ulang Aplikasi"
          >
            <RotateCcw size={18} color={colors.onPrimary} strokeWidth={2} />
            <Text style={styles.retryButtonText}>Muat Ulang Aplikasi</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    ...cardSurface,
    width: '100%',
    maxWidth: 380,
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: rounded.full,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineSm,
    fontFamily: fontFamilies.sansBold,
    color: colors.primaryDarkest,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    minHeight: MIN_TOUCH_TARGET,
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: rounded.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  retryButtonPressed: {
    backgroundColor: colors.primaryContainer,
  },
  retryButtonText: {
    ...typography.labelLg,
    fontFamily: fontFamilies.sansSemiBold,
    color: colors.onPrimary,
  },
});
