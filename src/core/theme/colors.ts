/**
 * SIPERAPAT - Gov-Tech Slate Monochrome Design Tokens
 * Single Source of Truth: lldikti-x/resources/css/app.css
 * Meets WCAG 2.1 AA Contrast standards.
 */

export const colors = {
  // Institutional Slate Navy & Authority
  primary: '#0F172A',
  primaryContainer: '#1E293B',
  primaryDarkest: '#020617',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#E2E8F0',
  primaryFixed: '#F1F5F9',
  onPrimaryFixed: '#0F172A',

  // Accent & Interactive
  secondary: '#334155',
  secondaryAccent: '#1E293B',
  secondaryContainer: '#475569',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#F8FAFC',
  secondaryFixedDim: '#CBD5E1',
  onSecondaryFixed: '#0F172A',

  // Surfaces & Backgrounds
  background: '#F8FAFC',
  surface: '#F8FAFC',
  surfaceBright: '#F8FAFC',
  surfaceCard: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceSoft: '#F1F5F9',
  surfaceContainerLow: '#F1F5F9',
  surfaceContainer: '#E2E8F0',
  surfaceContainerHigh: '#E2E8F0',
  surfaceContainerHighest: '#CBD5E1',
  surfaceSubtle: '#F1F5F9',
  surfaceDim: '#CBD5E1',

  // Content & Typography
  onSurface: '#0F172A',
  onSurfaceVariant: '#334155',
  textSecondary: '#334155',
  textMuted: '#64748B',
  inverseSurface: '#0F172A',
  inverseOnSurface: '#F8FAFC',
  textSplashMuted: '#E2E8F0',
  textSplashMinistry: 'rgba(226, 232, 240, 0.85)',

  // Neutral Scrim & Atmospheric Layers
  scrimNeutralTop: 'rgba(15, 23, 42, 0.65)',
  scrimNeutralMid: 'rgba(15, 23, 42, 0.45)',
  scrimNeutralBottom: 'rgba(2, 6, 23, 0.88)',

  // Borders & Outlines
  outline: '#64748B',
  outlineVariant: '#CBD5E1',
  borderSubtle: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Semantics: Success (Sah, Hadir, Terverifikasi, Geofence Valid)
  success: '#047857',
  successLight: '#059669',
  successContainer: '#ECFDF5',
  onSuccessContainer: '#065F46',
  successBorder: '#A7F3D0',

  // Semantics: Warning / Ongoing (Presensi Dibuka, Sedang Berlangsung)
  warning: '#B45309',
  warningLight: '#D97706',
  warningContainer: '#FFFBEB',
  onWarningContainer: '#92400E',
  warningBorder: '#FDE68A',
  warningSoftBg: '#FEF3C7',
  warningSoftText: '#B45309',

  // Semantics: Error / Danger (Batal, Ditutup, Gagal, Di Luar Radius)
  error: '#E11D48',
  errorLight: '#F43F5E',
  errorContainer: '#FFF1F2',
  onErrorContainer: '#BE123C',
  errorBorder: '#FECDD3',
  destructivePressed: '#FFE4E6',

  // Semantics: Info & Toast
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',
  infoText: '#1E40AF',
  toastBg: '#0F172A',
  toastBorder: '#334155',

  // Tertiary Government Tech Accent
  tertiary: '#003120',
  tertiaryContainer: '#004A32',
  onTertiaryContainer: '#4AC08F',
} as const;

export type ColorKeys = keyof typeof colors;
