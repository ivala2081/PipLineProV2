# Design tokens

Every value in this file is both a **CSS custom property** (consumed by Tailwind utilities through `@theme`) and a **JS constant** (for Recharts, canvas, inline styles). The two must stay in lockstep.

| Category | CSS source | JS source |
|---|---|---|
| Colors | [src/styles/index.css:75–102](../../src/styles/index.css#L75-L102) | [src/design-system/tokens/colors.ts](../../src/design-system/tokens/colors.ts) |
| Typography | [src/styles/index.css:11–12](../../src/styles/index.css#L11-L12) | [src/design-system/tokens/typography.ts](../../src/design-system/tokens/typography.ts) |
| Spacing | [src/styles/index.css:33–39](../../src/styles/index.css#L33-L39) | [src/design-system/tokens/spacing.ts](../../src/design-system/tokens/spacing.ts) |
| Containers | [src/styles/index.css:47–73](../../src/styles/index.css#L47-L73) | *(CSS only)* |
| Radius | *(uses Tailwind defaults)* | [src/design-system/tokens/radius.ts](../../src/design-system/tokens/radius.ts) |
| Shadows | *(uses Tailwind defaults + `.ui-surface`)* | [src/design-system/tokens/shadows.ts](../../src/design-system/tokens/shadows.ts) |
| Animations | [src/styles/index.css:104–274](../../src/styles/index.css#L104-L274) | [src/design-system/tokens/animations.ts](../../src/design-system/tokens/animations.ts) |

When you add a token, **update both sources in the same commit.**

---

## 1. Colors

### 1.1 Theme-aware palette (the default palette)

These tokens flip between light and dark mode. They are the only colors most UI should use.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--color-black` | `#000000` | `#e6e9f2` | Primary foreground (text, icons) |
| `--color-white` | `#ffffff` | `#0f141f` | Inverse foreground (on brand surfaces) |
| `--color-brand` | `#000000` | `#5aa6c8` | Accent for CTAs, focus rings, links |
| `--color-brand-hover` | `#666666` | `#75b9d6` | Brand hover state |
| `--color-bg1` | `#ffffff` | `#0d1119` | Page background, top-level surfaces |
| `--color-bg2` | `#f9f9fa` | `#141b26` | Inputs, subtle surfaces |
| `--color-bg5` | `#ffffff` | `#1b2533` | Elevated cards, popovers, dialogs (aka `.ui-surface`) |

> **Naming caution.** `--color-black` does *not* mean "#000" — it means "primary foreground", which happens to be black in light mode and a light gray in dark mode. The same applies to `--color-white`. Do not reach for these to get literal black/white; you'll break dark mode.

**Tailwind usage:** `bg-bg1`, `text-black`, `text-black/60`, `bg-brand`, `hover:text-brand-hover`, etc.

### 1.2 Static colors (identity palette)

Same in both themes. Used for *semantic identity*: status tags, chart series, badges.

| Token | Hex | Tailwind |
|---|---|---|
| `--color-purple` | `#c9b3ed` | `bg-purple`, `text-purple` |
| `--color-indigo` | `#9f9ff8` | `bg-indigo` |
| `--color-blue` | `#92bfff` | `bg-blue` |
| `--color-cyan` | `#aec7ed` | `bg-cyan` |
| `--color-mint` | `#96e2d6` | `bg-mint` |
| `--color-green` | `#16a34a` (light) / `#94e9b8` (dark) | `bg-green`, `text-green` — theme-aware despite being in the "static" group |
| `--color-yellow` | `#ffdb56` | `bg-yellow` |
| `--color-orange` | `#ffb55b` | `bg-orange` |
| `--color-red` | `#f87171` | `bg-red`, `text-red` |
| `--color-bg3` | `#e6f1fd` | Light-blue subtle surface |
| `--color-bg4` | `#edeefc` | Light-indigo subtle surface |

> **`--color-green` is an exception** — its value overrides to `#94e9b8` in `[data-theme='dark']`. See [src/styles/index.css:292–302](../../src/styles/index.css#L292-L302).

### 1.3 Domain / chart colors

Used by Recharts series and domain pills. Stable across themes (override for `--color-net-line` only).

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-deposit` | `#4ade80` | `#4ade80` | Deposit bars/tags |
| `--color-withdrawal` | `#f87171` | `#f87171` | Withdrawal bars/tags |
| `--color-net-line` | `#18181b` | `#94e9b8` | Net-total line on charts |
| `--color-commission-chart` | `#fb923c` | `#fb923c` | Commission series |
| `--color-settlement` | `#f59e0b` | `#f59e0b` | PSP settlement series |

**Rule:** For SVG fills/strokes in Recharts, prefer `var(--color-deposit)` over hex. For `stroke` props on `<Line>`, you can reach into the JS map via `domainColors.deposit[resolvedTheme]`.

### 1.4 Opacity scales

JS helpers for mathematical opacity on black/white (used inline in feature code where Tailwind `/opacity` notation doesn't compose cleanly):

```ts
blackOpacity:   100, 80, 60, 40, 20, 10, 5, 4
whiteOpacity:   100, 80, 40, 20, 10, 5
```

See [src/design-system/tokens/colors.ts:56–74](../../src/design-system/tokens/colors.ts#L56-L74). **Prefer Tailwind's `text-black/40` notation at the template level**; keep the JS objects for charts and canvas.

### 1.5 Semantic aliases

```ts
semanticColors = {
  success:  staticColors.green,
  error:    staticColors.red,
  warning:  staticColors.yellow,
  info:     staticColors.blue,
  blocked:  staticColors.red,
  pending:  staticColors.yellow,
  neutral:  staticColors.cyan,
}
```

These exist *only* in JS ([src/design-system/tokens/colors.ts:80–88](../../src/design-system/tokens/colors.ts#L80-L88)) for code that needs to pick a color by meaning rather than name. Not exposed as Tailwind utilities — write `text-green` / `text-red` directly for success/error text.

## 2. Typography

### 2.1 Font stack

```css
--font-normal: 'Inter', sans-serif;
```

**One font family.** No serif, no mono beyond browser defaults (for tabular numbers we use `font-mono tabular-nums` utilities; the underlying font is the browser's mono, not a shipped one).

### 2.2 Size scale

| Key | px | rem | Tailwind | Line height |
|---|---|---|---|---|
| 12 | 12 | 0.75 | `text-xs` | 1rem |
| 14 | 14 | 0.875 | `text-sm` | 1.25rem |
| 16 | 16 | 1 | `text-base` | 1.5rem |
| 18 | 18 | 1.125 | `text-lg` | 1.75rem |
| 24 | 24 | 1.5 | `text-2xl` | 2rem |
| 32 | 32 | 2 | `text-[2rem]` | 2.5rem |
| 48 | 48 | 3 | `text-[3rem]` | 3.625rem |
| 64 | 64 | 4 | `text-[4rem]` | 4.875rem |

**Rule:** use the `Typography` / `Text` component (`<Text size={14} />`) when typography is semantic. Drop to raw `text-*` utilities for one-offs.

### 2.3 Weights

| Key | Value | When |
|---|---|---|
| `regular` | 400 | Body text |
| `medium` | 500 | Labels, column headers |
| `semibold` | 600 | Buttons, page titles, card titles |
| `bold` | 700 | Reserved — rarely used |

### 2.4 Headings

There is no `<H1>/<H2>/<H3>` component. Headings come from `PageHeader` (`<h1 class="text-base font-semibold tracking-tight text-black sm:text-lg md:text-xl">`) and *section titles* from raw `<h2 class="text-sm font-semibold text-black">` patterns in feature code. Standardize through `PageHeader` wherever possible.

## 3. Spacing

### 3.1 Raw scale

```ts
spacing = { 0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 80 }  // px
```

Multiples of 4, capped at 12 values per the 90% principle (if you need a 13th, rethink the design).

### 3.2 Semantic aliases (Tailwind utilities)

| Token | Value | Use case | Examples |
|---|---|---|---|
| `xs` | 4px | Icon + label gap, tight inline elements | `gap-xs`, `p-xs` |
| `sm` | 8px | Button groups, row-level gaps | `gap-sm`, `space-y-sm` |
| `md` | 16px | Filter grids, card inner sections, form columns | `gap-md`, `p-md` |
| `card` | 20px | `Card` default padding *(only)* | `p-card` |
| `lg` | 24px | Page-section gap, major vertical groups | `space-y-lg`, `gap-lg` |
| `xl` | 32px | Page-level separation (rare) | `space-y-xl` |
| `2xl` | 48px | Hero / major layout blocks (rare) | `space-y-2xl` |

**Rule:** for structural spacing (page layout, section rhythm) use these tokens. Fine-grained visual tweaks (`gap-1.5`, `py-2.5`) are allowed for nudging elements inside a component.

### 3.3 Container max-widths

Tailwind v4 treats named spacing as a lookup for `max-w-*`. To prevent `max-w-sm` from resolving to "8px", we define explicit container tokens at [src/styles/index.css:47–73](../../src/styles/index.css#L47-L73):

```
max-w-3xs → 16rem (256px)
max-w-2xs → 18rem
max-w-xs  → 20rem
max-w-sm  → 24rem
max-w-md  → 28rem
max-w-lg  → 32rem
max-w-xl  → 36rem
max-w-2xl → 42rem
max-w-3xl → 48rem
max-w-4xl → 56rem
max-w-5xl → 64rem
max-w-6xl → 72rem
max-w-7xl → 80rem
```

## 4. Border radius

### 4.1 Raw scale

```ts
radius = { 0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 80 }  // px
```

### 4.2 Semantic aliases

```ts
radiusSemantic = { none: 0, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, full: 9999 }
```

### 4.3 Per-component conventions

| Component | Radius | Tailwind |
|---|---|---|
| `Button sm` | 8px | `rounded-lg` |
| `Button md` | 12px | `rounded-xl` |
| `Button lg` | 16px | `rounded-2xl` |
| `Input sm/md` | 12px | `rounded-xl` |
| `Input lg` | 16px | `rounded-2xl` |
| `Card` | 12→16px responsive | `rounded-xl md:rounded-2xl` |
| `Tag` | 6px | `rounded-md` |
| `DropdownMenu / Popover / Select content` | 16px | `rounded-2xl` |
| `Tooltip content` | 8px | `rounded-lg` |
| Avatar | full circle | `rounded-full` |

## 5. Shadows & elevation

We keep this deliberately thin — under 5 styles.

```ts
shadows.none  // 'none'
shadows.sm    // 0 1px 2px 0 rgba(0,0,0,.05)
shadows.md    // 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)
shadows.lg    // 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1)
shadows.xl    // 0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)
```

### 5.1 `.ui-surface` — the elevation primitive

Instead of hand-picking a shadow per component, elevated surfaces apply the `.ui-surface` class ([src/styles/index.css:378–393](../../src/styles/index.css#L378-L393)):

- **Light mode:** plain `bg-bg5` (white)
- **Dark mode:** `bg-bg5` mixed with 10% `bg-bg2` + `box-shadow: 0 10px 26px rgba(2,8,20,0.28)`

Used by: `Card`, `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Select` content, `Toast`.

**Rule:** when a component needs to look elevated (appears above the page), use `ui-surface`, not a bespoke `shadow-lg`.

### 5.2 Blur

```ts
blur.bg20 = 'blur(20px)'  // glass overlays
```

Popovers, dropdowns, and selects use Tailwind's `backdrop-blur-xl` on `bg-bg1/95` to get a glass effect.

## 6. Motion

### 6.1 Durations

```ts
durations = { fast: 150, normal: 200, slow: 300 }  // ms
```

### 6.2 Easings

```ts
easings = {
  easeOut:   'ease-out',
  easeInOut: 'ease-in-out',
  spring:    'cubic-bezier(0.34, 1.56, 0.64, 1)',
}
```

### 6.3 Named animations

Wired as Tailwind `animate-*` utilities via CSS vars in [src/styles/index.css:104–118](../../src/styles/index.css#L104-L118):

```
animate-in, animate-out                        (fade, 150ms)
animate-accordion-down, animate-accordion-up   (200ms)
animate-slide-in-from-{top,right,left,bottom}  (200ms ease-out)
animate-slide-out-to-{top,right,left,bottom}   (150ms ease-in)
animate-zoom-in-95, animate-zoom-out-95        (200/150ms)
```

Keyframes in [src/styles/index.css:125–273](../../src/styles/index.css#L125-L273).

### 6.4 Reduced motion

Global override at [src/styles/index.css:276–284](../../src/styles/index.css#L276-L284):

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Implication for components:** you don't need to special-case reduced motion in individual components. The global rule handles it.

### 6.5 Press feedback (touch)

On coarse pointers, the `.press-scale` utility gives a 3% scale-down on active ([src/styles/index.css:576–583](../../src/styles/index.css#L576-L583)). Apply to buttons you want to feel tappable in PWA.

## 7. Breakpoints

Tailwind v4 defaults — we don't override them:

| Prefix | Min width |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

**Mobile-mode threshold:** `useIsMobile()` uses 768px (same as `md`) by default.

**Canonical responsive pattern:**

```tsx
<div className="flex-col sm:flex-row">       // filter bars
<div className="md:hidden">                  // mobile-only
<div className="hidden md:block">            // desktop-only
<table data-card-mobile>                     // table → card list on <md
```

## 8. Z-index

There is **no formal z-index scale**. Layering conventions in use today:

| Layer | z-index | Component |
|---|---|---|
| Content | default (auto) | — |
| Sticky header | 40 | App header |
| Overlays (modal backdrop) | 50 | `DialogOverlay`, `SheetOverlay`, `DropdownMenu`, `Popover`, `Select` content, `Tooltip` |
| Toast viewport | 100 | `ToastViewport` |

If you need a new layer, add it here first. Prefer Radix portaling over raw z-index gymnastics.

## 9. Safe areas (PWA)

On notched devices, [src/styles/index.css:505–509](../../src/styles/index.css#L505-L509) exposes:

```css
--safe-top:    env(safe-area-inset-top, 0px)
--safe-bottom: env(safe-area-inset-bottom, 0px)
```

And when running in standalone PWA mode, the header auto-pads its top ([src/styles/index.css:539–543](../../src/styles/index.css#L539-L543)). Layout code should reference `--safe-top` / `--safe-bottom` for any full-bleed fixed UI (bottom nav, stickies).

## 10. What is NOT a token

We've been deliberate about *not* tokenizing:

- **Letter spacing** — `tracking-tight`, `tracking-wider` are used raw per-case; no semantic system.
- **Font styles** — italic/underline are boolean props on `<Text>`, not tokens.
- **Transition property lists** — `transition-colors`, `transition-all`, `transition-transform` are composed ad-hoc in each component.
- **Stroke widths / icon sizes** — iconography uses `size={14|16|18|20}` numbers directly; no semantic scale. Keep sizes in the 14–24 range for inline icons.
