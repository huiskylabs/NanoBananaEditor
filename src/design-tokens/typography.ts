/**
 * Design System Typography Tokens
 * Consistent typography scale for text hierarchy
 */

export const typographyTokens = {
  // Font families
  fontFamily: {
    sans: 'font-sans',
    mono: 'font-mono',
  },

  // Font weights
  fontWeight: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },

  // Font sizes with line heights
  fontSize: {
    xs: 'text-xs',      // 12px
    sm: 'text-sm',      // 14px
    base: 'text-base',  // 16px
    lg: 'text-lg',      // 18px
    xl: 'text-xl',      // 20px
    '2xl': 'text-2xl',  // 24px
    '3xl': 'text-3xl',  // 30px
  },

  // Semantic text styles
  heading: {
    h1: 'text-2xl font-bold',
    h2: 'text-xl font-semibold',
    h3: 'text-lg font-semibold',
    h4: 'text-base font-semibold',
    h5: 'text-sm font-semibold',
    h6: 'text-xs font-semibold',
  },

  body: {
    large: 'text-base font-normal',
    default: 'text-sm font-normal',
    small: 'text-xs font-normal',
  },

  label: {
    large: 'text-sm font-medium',
    default: 'text-xs font-medium',
    small: 'text-xs font-normal',
  },

  // Special text styles
  code: 'font-mono text-sm',
  caption: 'text-xs font-normal',
  overline: 'text-xs font-medium uppercase tracking-wider',
} as const;

// Helper function to combine typography classes
export const getTypographyClass = (...classes: string[]): string => {
  return classes.filter(Boolean).join(' ');
};

export type TypographyToken = typeof typographyTokens;
export type FontSize = keyof typeof typographyTokens.fontSize;
export type FontWeight = keyof typeof typographyTokens.fontWeight;
export type HeadingLevel = keyof typeof typographyTokens.heading;
export type BodySize = keyof typeof typographyTokens.body;