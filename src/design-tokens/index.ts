/**
 * Design System Tokens
 * Centralized export for all design tokens
 */

export { colorTokens, getColorClass } from './colors';
export { spacingTokens, getSpacingClass } from './spacing';
export { typographyTokens, getTypographyClass } from './typography';

export type {
  ColorToken,
  SurfaceColor,
  TextColor,
  InteractiveColor,
  StatusColor,
} from './colors';

export type {
  SpacingToken,
  SpacingScale,
} from './spacing';

export type {
  TypographyToken,
  FontSize,
  FontWeight,
  HeadingLevel,
  BodySize,
} from './typography';

// Utility function to combine design token classes
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Design system theme configuration
export const designSystem = {
  colors: colorTokens,
  spacing: spacingTokens,
  typography: typographyTokens,
} as const;