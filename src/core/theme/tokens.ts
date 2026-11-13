import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';
import { typography } from './typography';

export const MIN_TOUCH_TARGET = 44;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  gutter: 16,
  margin: 16,
};

export const rounded = {
  sm: 4,
  md: 8,
  lg: 12,
  card: 14,
  xl: 16,
  full: 9999,
};

export const cardSurface: ViewStyle = {
  backgroundColor: colors.surfaceCard,
  borderRadius: rounded.card,
  borderWidth: 1,
  borderColor: colors.borderSubtle,
  ...Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
    android: {
      elevation: 0,
    },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
  }),
};

export const elevations = {
  level0: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,
  level1: {
    ...Platform.select<ViewStyle>({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 0,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
    }),
  } as ViewStyle,
  level2: {
    ...Platform.select<ViewStyle>({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
        shadowColor: 'rgba(15, 23, 42, 0.2)',
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
    }),
  } as ViewStyle,
  level3: {
    ...Platform.select<ViewStyle>({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
        shadowColor: 'rgba(15, 23, 42, 0.25)',
      },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
    }),
  } as ViewStyle,
};

export const theme = {
  colors,
  typography,
  spacing,
  rounded,
  MIN_TOUCH_TARGET,
  cardSurface,
  elevations,
};

export type Theme = typeof theme;
