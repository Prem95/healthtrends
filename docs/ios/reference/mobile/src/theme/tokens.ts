import type { TextStyle } from 'react-native';

/*
  bbiom design tokens for iOS. The same palette as the web (src/app/globals.css):
  warm paper, evergreen ink, one green-to-orange gradient family, and status
  colours that are reserved for results. Type is the system font (SF Pro) so
  it follows the user's Dynamic Type setting.
*/

export const colors = {
  page: '#F5F4EF',
  paper: '#FFFFFF',
  paper2: '#F3F2EC',
  paper3: '#E9E8E0',

  ink: '#13231F',
  ink2: '#40504B',
  ink3: '#62706B',

  line: 'rgba(19, 35, 31, 0.10)',
  lineStrong: 'rgba(19, 35, 31, 0.16)',

  brand: '#0F5C4D',
  brandStrong: '#0A4438',
  brandSoft: '#DCEBE6',
  warm: '#EE7420',
  warmSoft: '#FDEBD9',

  // Status: results only, always with a shape and a label.
  inRange: '#0A8F6C',
  inRangeSoft: '#DDF2EA',
  borderline: '#D07C00',
  borderlineSoft: '#FBEFD9',
  out: '#D1345B',
  outSoft: '#FBE3E9',
  neutral: '#84908C',

  chartLine: '#2A3A36',
  chartGrid: 'rgba(19, 35, 31, 0.09)',
  chartAxis: 'rgba(19, 35, 31, 0.22)',

  white: '#FFFFFF',
  scrim: 'rgba(6, 33, 29, 0.40)',
} as const;

/** The one gradient family: evergreen into orange. */
export const gradient = {
  brand: ['#0C5348', '#1C8C74', '#F3A23A', '#EA6A1F'] as const,
  brandLocations: [0, 0.4, 0.8, 1] as const,
  /** Faint wash for summary cards: green corner, orange corner. */
  wash: ['rgba(28,140,116,0.10)', 'rgba(255,255,255,0)', 'rgba(238,116,32,0.12)'] as const,
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;

export const radius = { chip: 999, pill: 999, control: 12, card: 20, panel: 28 } as const;

/** iOS text styles (sizes at the default Dynamic Type setting). Weight 500 at most. */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 40, fontWeight: '500', letterSpacing: -0.6 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '500', letterSpacing: -0.4 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '500', letterSpacing: -0.2 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '500' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  /** The big reading on a marker: proportional figures. */
  reading: { fontSize: 52, lineHeight: 56, fontWeight: '500', letterSpacing: -1.5 },
  /** Columns of numbers. */
  tabular: { fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

export const STATUS_COLOR = {
  IN_RANGE: colors.inRange,
  BORDERLINE_LOW: colors.borderline,
  BORDERLINE_HIGH: colors.borderline,
  LOW: colors.out,
  HIGH: colors.out,
  NO_RANGE: colors.neutral,
} as const;

export const STATUS_SOFT = {
  IN_RANGE: colors.inRangeSoft,
  BORDERLINE_LOW: colors.borderlineSoft,
  BORDERLINE_HIGH: colors.borderlineSoft,
  LOW: colors.outSoft,
  HIGH: colors.outSoft,
  NO_RANGE: colors.paper3,
} as const;

export const STATUS_SHORT = {
  LOW: 'Low',
  HIGH: 'High',
  IN_RANGE: 'In range',
  BORDERLINE_LOW: 'Borderline low',
  BORDERLINE_HIGH: 'Borderline high',
  NO_RANGE: 'No range',
} as const;
