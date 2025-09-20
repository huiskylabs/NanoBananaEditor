/**
 * Design System Color Tokens
 * Semantic color definitions for consistent theming
 */

export const colorTokens = {
  // Surface colors - for backgrounds and containers
  surface: {
    primary: 'zinc-950',      // Main app background
    secondary: 'zinc-900',    // Panel backgrounds
    tertiary: 'zinc-800',     // Card/component backgrounds
    elevated: 'zinc-700',     // Hover states, elevated elements
    border: 'zinc-600',       // Default borders
    borderHover: 'zinc-500',  // Hover borders
    borderActive: 'zinc-400', // Active/focus borders
  },

  // Text colors - for readability hierarchy
  text: {
    primary: 'zinc-100',      // Main headings, important text
    secondary: 'zinc-200',    // Secondary headings, labels
    tertiary: 'zinc-300',     // Body text, descriptions
    muted: 'zinc-400',        // Placeholder text, disabled
    subtle: 'zinc-500',       // Helper text, captions
  },

  // Interactive colors - for user actions
  interactive: {
    primary: 'orange-500',        // Main CTA buttons (Tailwind default orange)
    primaryHover: 'orange-600',   // Primary button hover
    primaryText: 'white',         // Text on primary buttons
    ghost: 'transparent',         // Ghost button background
    ghostHover: 'zinc-800',       // Ghost button hover
  },

  // Status colors - for feedback and states
  status: {
    success: 'green-500',
    warning: 'orange-500',        // Using peel orange for warnings
    error: 'red-500',
    info: 'blue-500',
  },

  // Focus and accessibility
  focus: {
    ring: 'orange-500',           // Using orange for focus rings
    ringOffset: 'zinc-950',
  }
} as const;

// Helper function to get Tailwind class for a token
export const getColorClass = (
  token: string,
  prefix: 'bg' | 'text' | 'border' | 'ring' | 'ring-offset' = 'bg'
): string => {
  return `${prefix}-${token}`;
};

// Type definitions for better TypeScript support
export type ColorToken = typeof colorTokens;
export type SurfaceColor = keyof typeof colorTokens.surface;
export type TextColor = keyof typeof colorTokens.text;
export type InteractiveColor = keyof typeof colorTokens.interactive;
export type StatusColor = keyof typeof colorTokens.status;