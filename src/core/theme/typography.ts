import { TextStyle } from 'react-native';

/**
 * SIPERAPAT Typography Scale
 * Plus Jakarta Sans for Headlines, Inter for Microcopy & Tabular NIP Data
 */
export const typography = {
  headlineLg: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
  } as TextStyle,
  headlineLgMobile: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  } as TextStyle,
  headlineMd: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  } as TextStyle,
  headlineSm: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  } as TextStyle,
  bodyLg: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  } as TextStyle,
  bodyMd: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  } as TextStyle,
  bodySm: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  } as TextStyle,
  labelLg: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  } as TextStyle,
  labelMd: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  } as TextStyle,
  labelSm: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  } as TextStyle,
  labelMono: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    // Tabular numbers prevents horizontal jitter on real-time NIP scans
    fontVariant: ['tabular-nums'],
  } as TextStyle,
};
