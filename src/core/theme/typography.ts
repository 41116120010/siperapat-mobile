import { Platform, TextStyle } from 'react-native';

export const fontFamilies = {
  sansRegular: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansSemiBold: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
  sansExtraBold: 'PlusJakartaSans_800ExtraBold',
  monoRegular: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoSemiBold: 'IBMPlexMono_600SemiBold',
  monoBold: 'IBMPlexMono_700Bold',
} as const;

const androidPaddingReset: Pick<TextStyle, 'includeFontPadding'> =
  Platform.OS === 'android' ? { includeFontPadding: false } : {};

export const baseTextStyle: TextStyle = {
  fontFamily: fontFamilies.sansRegular,
  ...androidPaddingReset,
};

/**
 * SIPERAPAT Typography Scale
 * Plus Jakarta Sans for UI & Headlines, IBM Plex Mono for Tabular NIP & Code Data
 */
export const typography = {
  headlineLg: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 30,
    lineHeight: 38,
    ...androidPaddingReset,
  } as TextStyle,
  headlineLgMobile: {
    fontFamily: fontFamilies.sansBold,
    fontSize: 24,
    lineHeight: 32,
    ...androidPaddingReset,
  } as TextStyle,
  headlineMd: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 20,
    lineHeight: 28,
    ...androidPaddingReset,
  } as TextStyle,
  headlineSm: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 16,
    lineHeight: 24,
    ...androidPaddingReset,
  } as TextStyle,
  bodyLg: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 16,
    lineHeight: 24,
    ...androidPaddingReset,
  } as TextStyle,
  bodyMd: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 14,
    lineHeight: 20,
    ...androidPaddingReset,
  } as TextStyle,
  bodySm: {
    fontFamily: fontFamilies.sansRegular,
    fontSize: 12,
    lineHeight: 16,
    ...androidPaddingReset,
  } as TextStyle,
  labelLg: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 14,
    lineHeight: 20,
    ...androidPaddingReset,
  } as TextStyle,
  labelMd: {
    fontFamily: fontFamilies.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    ...androidPaddingReset,
  } as TextStyle,
  labelSm: {
    fontFamily: fontFamilies.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    ...androidPaddingReset,
  } as TextStyle,
  labelMono: {
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 13,
    lineHeight: 18,
    // Tabular numbers prevents horizontal jitter on real-time NIP scans
    fontVariant: ['tabular-nums'],
    ...androidPaddingReset,
  } as TextStyle,
};
