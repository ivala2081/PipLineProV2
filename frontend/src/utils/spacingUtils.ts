// Spacing Utility System
// Centralized spacing management for consistent UI/UX
// Updated to use the new design system

import { spacing } from '../lib/design-system';

export const spacingTokens = {
  // Card spacing - consistent across all cards
  card: {
    padding: {
      sm: `p-${spacing.lg}`,      // 16px
      md: `p-${spacing['2xl']}`,   // 24px
      lg: `p-${spacing['3xl']}`,   // 32px
    },
    gap: {
      sm: `gap-${spacing.md}`,     // 12px
      md: `gap-${spacing.lg}`,     // 16px
      lg: `gap-${spacing['2xl']}`, // 24px
    }
  },

  // Section spacing
  section: {
    margin: {
      sm: `mb-${spacing.lg}`,     // 16px
      md: `mb-${spacing['2xl']}`, // 24px
      lg: `mb-${spacing['3xl']}`, // 32px
      xl: `mb-${spacing['5xl']}`, // 48px
    },
    padding: {
      sm: `py-${spacing.lg}`,     // 16px
      md: `py-${spacing['2xl']}`, // 24px
      lg: `py-${spacing['3xl']}`, // 32px
    }
  },

  // Grid spacing
  grid: {
    gap: {
      sm: `gap-${spacing.md}`,     // 12px
      md: `gap-${spacing.lg}`,     // 16px
      lg: `gap-${spacing['2xl']}`, // 24px
      xl: `gap-${spacing['3xl']}`, // 32px
    }
  },

  // Component spacing
  component: {
    padding: {
      xs: `p-${spacing.sm}`,      // 8px
      sm: `p-${spacing.md}`,      // 12px
      md: `p-${spacing.lg}`,      // 16px
      lg: `p-${spacing['2xl']}`,  // 24px
    },
    margin: {
      xs: `m-${spacing.sm}`,      // 8px
      sm: `m-${spacing.md}`,      // 12px
      md: `m-${spacing.lg}`,      // 16px
      lg: `m-${spacing['2xl']}`,  // 24px
    }
  },

  // Form spacing
  form: {
    fieldGap: `gap-${spacing.lg}`,     // 16px
    labelGap: `gap-${spacing.sm}`,     // 8px
    inputPadding: `p-${spacing.md}`,   // 12px
    buttonGap: `gap-${spacing.md}`,    // 12px
  },

  // Navigation spacing
  nav: {
    itemGap: `gap-${spacing.md}`,      // 12px
    padding: `p-${spacing.lg}`,        // 16px
    margin: `m-${spacing.sm}`,         // 8px
  },

  // Button spacing
  button: {
    padding: `p-${spacing.md}`,        // 12px
    gap: `gap-${spacing.sm}`,          // 8px
    margin: `m-${spacing.xs}`,         // 4px
  },

  // Modal spacing
  modal: {
    padding: `p-${spacing['2xl']}`,    // 24px
    gap: `gap-${spacing.lg}`,          // 16px
    margin: `m-${spacing.lg}`,         // 16px
  },

  // Table spacing
  table: {
    cellPadding: `p-${spacing.md}`,    // 12px
    rowGap: `gap-${spacing.sm}`,       // 8px
    headerPadding: `p-${spacing.lg}`,  // 16px
  },

  // List spacing
  list: {
    itemGap: `gap-${spacing.sm}`,      // 8px
    padding: `p-${spacing.md}`,        // 12px
    margin: `m-${spacing.sm}`,         // 8px
  },
} as const;

// Helper functions for getting spacing values
export const getSpacing = (size: keyof typeof spacing) => spacing[size];

export const getSpacingPattern = (pattern: keyof typeof spacingTokens) => spacingTokens[pattern];

// Common spacing combinations
export const commonSpacing = {
  // Tight spacing for compact layouts
  tight: {
    padding: `p-${spacing.sm}`,
    margin: `m-${spacing.xs}`,
    gap: `gap-${spacing.xs}`,
  },
  
  // Normal spacing for standard layouts
  normal: {
    padding: `p-${spacing.lg}`,
    margin: `m-${spacing.md}`,
    gap: `gap-${spacing.md}`,
  },
  
  // Loose spacing for spacious layouts
  loose: {
    padding: `p-${spacing['2xl']}`,
    margin: `m-${spacing.lg}`,
    gap: `gap-${spacing.lg}`,
  },
  
  // Extra loose spacing for hero sections
  extraLoose: {
    padding: `p-${spacing['4xl']}`,
    margin: `m-${spacing['2xl']}`,
    gap: `gap-${spacing['2xl']}`,
  },
} as const;

// Responsive spacing patterns
export const responsiveSpacing = {
  // Mobile first approach
  mobile: {
    container: `p-${spacing.md}`,
    section: `py-${spacing.lg}`,
    card: `p-${spacing.lg}`,
    form: `gap-${spacing.md}`,
  },
  
  // Tablet spacing
  tablet: {
    container: `p-${spacing.lg}`,
    section: `py-${spacing['2xl']}`,
    card: `p-${spacing['2xl']}`,
    form: `gap-${spacing.lg}`,
  },
  
  // Desktop spacing
  desktop: {
    container: `p-${spacing['2xl']}`,
    section: `py-${spacing['4xl']}`,
    card: `p-${spacing['2xl']}`,
    form: `gap-${spacing.lg}`,
  },
  
  // Large desktop spacing
  large: {
    container: `p-${spacing['3xl']}`,
    section: `py-${spacing['5xl']}`,
    card: `p-${spacing['3xl']}`,
    form: `gap-${spacing['2xl']}`,
  },
} as const;

// Legacy function for backward compatibility
export const getRadius = (size: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full' = 'md') => {
  const radiusMap = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
    full: 'rounded-full',
  };
  return radiusMap[size];
};

// Legacy function for backward compatibility
export const getSectionSpacing = (size: 'sm' | 'md' | 'lg' | 'xl' = 'md') => {
  const spacingMap = {
    sm: {
      padding: `py-${spacing.lg}`,
      margin: `mb-${spacing.lg}`,
    },
    md: {
      padding: `py-${spacing['2xl']}`,
      margin: `mb-${spacing['2xl']}`,
    },
    lg: {
      padding: `py-${spacing['3xl']}`,
      margin: `mb-${spacing['3xl']}`,
    },
    xl: {
      padding: `py-${spacing['5xl']}`,
      margin: `mb-${spacing['5xl']}`,
    },
  };
  return spacingMap[size];
};

// Additional legacy functions for backward compatibility
export const getCardSpacing = (size: 'sm' | 'md' | 'lg' = 'md') => {
  return {
    padding: spacingTokens.card.padding[size],
    gap: spacingTokens.card.gap[size],
  };
};

export const getGridSpacing = (size: 'sm' | 'md' | 'lg' | 'xl' = 'md') => {
  return spacingTokens.grid.gap[size];
};

export const getComponentSpacing = (size: 'xs' | 'sm' | 'md' | 'lg' = 'md') => {
  return {
    padding: spacingTokens.component.padding[size],
    margin: spacingTokens.component.margin[size],
  };
};

export const getTextSpacing = (size: 'xs' | 'sm' | 'md' | 'lg' = 'md') => {
  const textSpacingMap = {
    xs: {
      margin: `mb-${spacing.xs}`,
    },
    sm: {
      margin: `mb-${spacing.sm}`,
    },
    md: {
      margin: `mb-${spacing.md}`,
    },
    lg: {
      margin: `mb-${spacing.lg}`,
    },
  };
  return textSpacingMap[size];
};

export default {
  spacingTokens,
  getSpacing,
  getSpacingPattern,
  commonSpacing,
  responsiveSpacing,
  getRadius,
  getSectionSpacing,
  getCardSpacing,
  getGridSpacing,
  getComponentSpacing,
  getTextSpacing,
};