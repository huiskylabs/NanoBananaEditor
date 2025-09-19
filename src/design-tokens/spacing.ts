/**
 * Design System Spacing Tokens
 * Consistent spacing scale for layouts and components
 */

export const spacingTokens = {
  // Base spacing scale (in rem)
  scale: {
    xs: '0.5',    // 8px  - Minimal gaps
    sm: '0.75',   // 12px - Small gaps
    md: '1',      // 16px - Default spacing
    lg: '1.5',    // 24px - Larger gaps
    xl: '2',      // 32px - Section spacing
    '2xl': '3',   // 48px - Large sections
    '3xl': '4',   // 64px - Page sections
  },

  // Component-specific spacing
  component: {
    buttonPadding: {
      sm: 'px-3 py-1.5',
      md: 'px-4 py-2',
      lg: 'px-6 py-3',
    },
    inputPadding: 'px-3 py-2',
    cardPadding: 'p-6',
    sectionGap: 'space-y-6',
    itemGap: 'space-y-4',
  },

  // Layout spacing
  layout: {
    panelPadding: 'p-6',
    containerMaxWidth: 'max-w-7xl',
    sidebarWidth: {
      collapsed: 'w-8',
      expanded: 'w-80',
    },
  }
} as const;

// Helper function to get spacing class
export const getSpacingClass = (
  token: keyof typeof spacingTokens.scale,
  type: 'p' | 'm' | 'px' | 'py' | 'pt' | 'pb' | 'pl' | 'pr' | 'mx' | 'my' | 'mt' | 'mb' | 'ml' | 'mr' = 'p'
): string => {
  return `${type}-${spacingTokens.scale[token]}`;
};

export type SpacingToken = typeof spacingTokens;
export type SpacingScale = keyof typeof spacingTokens.scale;