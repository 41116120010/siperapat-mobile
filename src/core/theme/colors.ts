/**
 * SIPERAPAT - Gov-Tech Institutional Design Tokens
 * Source: stitch_lldikti_meeting_attendance_app/modern_gov_tech_institutional/DESIGN.md
 * Meets WCAG 2.1 AA Contrast standards.
 */

export const colors = {
  // Institutional Navy & Authority
  primary: '#00236F',
  primaryContainer: '#1E3A8A',
  onPrimary: '#FFFFFF',
  onPrimaryContainer: '#90A8FF',
  primaryFixed: '#DCE1FF',
  onPrimaryFixed: '#00164E',

  // Accent & Interactive
  secondary: '#0051D5',
  secondaryAccent: '#2563EB',
  secondaryContainer: '#316BF3',
  onSecondary: '#FFFFFF',
  onSecondaryContainer: '#FEFCFF',
  secondaryFixedDim: '#B4C5FF',
  onSecondaryFixed: '#00174B',

  // Surfaces & Backgrounds
  background: '#F8F9FF',
  surface: '#F8F9FF',
  surfaceCard: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#EFF4FF',
  surfaceContainer: '#E5EEFF',
  surfaceContainerHigh: '#DCE9FF',
  surfaceContainerHighest: '#D3E4FE',
  surfaceSubtle: '#F1F5F9',
  surfaceDim: '#CBDBF5',
  surfaceBright: '#F8F9FF',

  // Content & Typography
  onSurface: '#0B1C30',
  onSurfaceVariant: '#444651',
  textSecondary: '#334155',
  textMuted: '#64748B',
  inverseSurface: '#213145',
  inverseOnSurface: '#EAF1FF',
  textSplashMuted: '#E2E8F0',
  textSplashMinistry: 'rgba(226, 232, 240, 0.85)',

  // Neutral Scrim & Atmospheric Layers
  scrimNeutralTop: 'rgba(10, 15, 26, 0.60)',
  scrimNeutralMid: 'rgba(10, 15, 26, 0.42)',
  scrimNeutralBottom: 'rgba(4, 7, 14, 0.88)',

  // Borders & Outlines
  outline: '#757682',
  outlineVariant: '#C5C5D3',
  borderSubtle: '#E2E8F0',

  // Semantics: Success (Sah, Hadir, Terverifikasi, Geofence Valid)
  success: '#059669',
  successLight: '#10B981',
  successContainer: '#ECFDF5',
  onSuccessContainer: '#065F46',

  // Semantics: Warning / Ongoing (Presensi Dibuka, Sedang Berlangsung)
  warning: '#D97706',
  warningLight: '#F59E0B',
  warningContainer: '#FFFBEB',
  onWarningContainer: '#92400E',

  // Semantics: Error / Danger (Batal, Ditutup, Gagal, Di Luar Radius)
  error: '#BA1A1A',
  errorLight: '#E11D48',
  errorContainer: '#FFF1F2',
  onErrorContainer: '#93000A',

  // Tertiary Government Tech Accent
  tertiary: '#003120',
  tertiaryContainer: '#004A32',
  onTertiaryContainer: '#4AC08F',
} as const;

export type ColorKeys = keyof typeof colors;
