import { Platform } from 'react-native';

export const colors = {
  primary: '#E85D4C',
  primaryDark: '#C94A3B',
  primarySoft: '#FFE8E3',
  teal: '#2A9D8F',
  tealDark: '#1F7A70',
  tealSoft: '#D8F3EF',
  navy: '#1C2430',
  ink: '#243042',
  muted: '#7A756F',
  line: '#E8E1D8',
  cream: '#F6F1EA',
  sand: '#EFE6DA',
  paper: '#FFFBF7',
  white: '#FFFFFF',
  warning: '#E2A03F',
  danger: '#D64545',
  success: '#2F9E73',
  kakao: '#FEE500',
  kakaoInk: '#191600',
  overlay: 'rgba(28, 36, 48, 0.46)',
  map: '#D7E6DF',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 40,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const shadow = {
  card: Platform.select({
    web: { boxShadow: '0 8px 24px rgba(28, 36, 48, 0.08)' },
    default: {
      shadowColor: '#1C2430',
      shadowOpacity: 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
  }) as object,
  floating: Platform.select({
    web: { boxShadow: '0 12px 32px rgba(28, 36, 48, 0.14)' },
    default: {
      shadowColor: '#1C2430',
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  }) as object,
} as const;

export const fonts = {
  regular: 'Pretendard',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

export const layout = {
  phoneWidth: 430,
  maxContent: 430,
  tabBarHeight: 72,
} as const;
