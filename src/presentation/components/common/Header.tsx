import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../core/theme/colors';
import { typography } from '../../../core/theme/typography';
import { spacing } from '../../../core/theme/tokens';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'SIPERAPAT LLDIKTI X',
  subtitle = 'Sistem Presensi Rapat Kedinasan',
  showBack = false,
  onBack,
  rightAction,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0
  );

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.contentRow}>
        {showBack ? (
          <View style={styles.navRow}>
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Kembali"
            >
              <MaterialIcons
                name="chevron-left"
                size={28}
                color={colors.primary}
              />
            </Pressable>
            <View style={[styles.textContainer, rightAction ? { paddingRight: 48 } : undefined]}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.centeredBrandContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../../assets/images/tut-wuri-handayani.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandTextContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </View>
        )}

        {rightAction ? (
          <View style={styles.rightActionAbsolute}>{rightAction}</View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    zIndex: 10,
  },
  contentRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    position: 'relative',
    width: '100%',
  },
  centeredBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 34,
    height: 34,
  },
  brandTextContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  backButtonPressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.headlineSm,
    fontSize: 15,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    marginTop: 1,
  },
  rightActionAbsolute: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
