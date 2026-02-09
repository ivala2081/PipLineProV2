# Design System Usage Guide

## Quick Start

### Importing components

```tsx
// Import from the design system barrel
import { Button, Card, Typography, Tag } from '@ds'

// Or import specific modules
import { Button } from '@ds/components/Button'
import { themeColors } from '@ds/tokens/colors'
import { useTheme } from '@ds/hooks'
import { cn } from '@ds/utils'
```

### Using the `cn()` utility

```tsx
import { cn } from '@ds'

// Merge Tailwind classes safely (handles conflicts)
<div className={cn('px-4 py-2', isActive && 'bg-brand', className)} />
```

### Theme switching

```tsx
import { useTheme } from '@ds'

function ThemeToggle() {
  const { theme, toggleTheme, resolvedTheme } = useTheme()
  return (
    <button onClick={toggleTheme}>
      Current: {resolvedTheme}
    </button>
  )
}
```

Theme is managed via `data-theme` attribute on `<html>` and persisted to localStorage.

### Using tokens in JavaScript

```tsx
import { themeColors, staticColors, spacing } from '@ds/tokens'

// For chart libraries, canvas, etc.
const chartColor = staticColors.blue  // 'rgba(146, 191, 255, 1)'
const padding = spacing[16]           // 16
```

## Design Principles (SnowUI 90% Rule)

1. **Keep tokens minimal** – under 16 values for spacing, radius, icon sizes
2. **Keep colors minimal** – under 32 total colors
3. **Keep text styles minimal** – under 16 styles
4. **Keep effects minimal** – under 8 styles
5. If a token is used in less than 10% of the product, don't add it to the system

## File Structure

```
src/design-system/
├── tokens/        → Color, typography, spacing, radius, shadow, animation values
├── components/    → 25 UI components (Button, Card, Table, Sidebar, etc.)
├── hooks/         → useTheme, useIsMobile
├── utils/         → cn() class merger
├── types/         → Shared TypeScript types
├── docs/          → This documentation
└── index.ts       → Main barrel export
```

## Adding a New Component

1. Create `src/design-system/components/MyComponent/MyComponent.tsx`
2. Create `src/design-system/components/MyComponent/index.ts` (barrel export)
3. Add `export * from './MyComponent'` to `src/design-system/components/index.ts`
4. Use SnowUI patterns: CVA for variants, Radix for primitives, `cn()` for classes

## Color Usage Patterns

```tsx
// Theme-aware text
<p className="text-black">Primary text</p>
<p className="text-black/60">Secondary text</p>
<p className="text-black/40">Tertiary text</p>
<p className="text-black/20">Disabled text</p>

// Theme-aware backgrounds
<div className="bg-bg1">Main background</div>
<div className="bg-bg2">Secondary background</div>
<div className="bg-black/5">Subtle background</div>

// Static semantic colors
<span className="text-green">Success</span>
<span className="text-red">Error</span>
<span className="text-yellow">Warning</span>
<span className="text-blue">Info</span>

// Brand
<button className="bg-brand text-white hover:bg-brand-hover">CTA</button>
```
