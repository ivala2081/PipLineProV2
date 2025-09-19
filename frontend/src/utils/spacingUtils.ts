// Spacing Utility System
// Centralized spacing management for consistent UI/UX

export const spacingTokens = {
  // Card spacing - consistent across all cards
  card: {
    padding: {
      sm: 'p-4',      // 16px
      md: 'p-6',      // 24px
      lg: 'p-8',      // 32px
    },
    gap: {
      sm: 'gap-3',    // 12px
      md: 'gap-4',    // 16px
      lg: 'gap-6',    // 24px
    }
  },

  // Section spacing
  section: {
    margin: {
      sm: 'mb-4',     // 16px
      md: 'mb-6',     // 24px
      lg: 'mb-8',     // 32px
      xl: 'mb-12',    // 48px
    },
    padding: {
      sm: 'py-4',     // 16px
      md: 'py-6',     // 24px
      lg: 'py-8',     // 32px
    }
  },

  // Grid spacing
  grid: {
    gap: {
      sm: 'gap-3',    // 12px
      md: 'gap-4',    // 16px
      lg: 'gap-6',    // 24px
      xl: 'gap-8',    // 32px
    }
  },

  // Component spacing
  component: {
    padding: {
      xs: 'p-2',      // 8px
      sm: 'p-3',      // 12px
      md: 'p-4',      // 16px
      lg: 'p-6',      // 24px
    },
    margin: {
      xs: 'm-2',      // 8px
      sm: 'm-3',      // 12px
      md: 'm-4',      // 16px
      lg: 'm-6',      // 24px
    },
    gap: {
      xs: 'gap-2',    // 8px
      sm: 'gap-3',    // 12px
      md: 'gap-4',    // 16px
      lg: 'gap-6',    // 24px
    }
  },

  // Text spacing
  text: {
    margin: {
      xs: 'mb-1',     // 4px
      sm: 'mb-2',     // 8px
      md: 'mb-3',     // 12px
      lg: 'mb-4',     // 16px
    },
    padding: {
      xs: 'px-2 py-1', // 8px 4px
      sm: 'px-3 py-2', // 12px 8px
      md: 'px-4 py-3', // 16px 12px
    }
  },

  // Border radius consistency
  radius: {
    sm: 'rounded-md',   // 6px
    md: 'rounded-lg',   // 8px
    lg: 'rounded-xl',   // 12px
    xl: 'rounded-2xl',  // 16px
    full: 'rounded-full'
  }
};

// Utility functions for consistent spacing
export const getCardSpacing = (size: 'sm' | 'md' | 'lg' = 'md') => {
  return {
    padding: spacingTokens.card.padding[size],
    gap: spacingTokens.card.gap[size]
  };
};

export const getSectionSpacing = (size: 'sm' | 'md' | 'lg' = 'md') => {
  return {
    margin: spacingTokens.section.margin[size],
    padding: spacingTokens.section.padding[size]
  };
};

export const getGridSpacing = (size: 'sm' | 'md' | 'lg' | 'xl' = 'md') => {
  return spacingTokens.grid.gap[size];
};

export const getComponentSpacing = (size: 'xs' | 'sm' | 'md' | 'lg' = 'md') => {
  return {
    padding: spacingTokens.component.padding[size],
    margin: spacingTokens.component.margin[size],
    gap: spacingTokens.component.gap[size]
  };
};

export const getTextSpacing = (size: 'xs' | 'sm' | 'md' = 'sm') => {
  return {
    margin: spacingTokens.text.margin[size],
    padding: spacingTokens.text.padding[size]
  };
};

export const getRadius = (size: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md') => {
  return spacingTokens.radius[size];
};
