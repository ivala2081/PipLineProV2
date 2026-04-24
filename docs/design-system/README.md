# PipLinePro Design System

**Status:** Living spec · reflects codebase as of `main` on 2026-04-24
**Scope:** Everything exported from `src/design-system/` under the `@ds` alias
**Audience:** Engineers shipping features in this repo; reviewers; future contributors

> This spec is the source of truth for *what the design system guarantees*. If the code disagrees with the spec, one of them is wrong — fix the code or fix the spec. Don't fork a silent third variant inside a feature folder.

---

## Table of contents

| File | Covers |
|---|---|
| [tokens.md](./tokens.md) | Color, type, spacing, radius, shadow, motion, breakpoint tokens |
| [theming.md](./theming.md) | Light / dark / system theme, CSS-var strategy, `ThemeProvider`, `data-theme` attribute |
| [components.md](./components.md) | Full reference for every component in `@ds` — props, variants, states, usage rules |
| [patterns.md](./patterns.md) | Composed patterns: page layout, responsive tables, forms, filter bars, dialogs-on-mobile |
| [accessibility.md](./accessibility.md) | Focus, touch targets, reduced motion, screen readers, i18n, RTL readiness |

---

## 1. Mission

Give every page in PipLinePro the same look, feel, and behavior using the **smallest** component API we can get away with. The system is optimized for:

1. **Data density** — this app is a financial/ops tool; tables, numbers, and filter bars are the main UI surface.
2. **Dual-mode (web + PWA)** — every layout must work in a desktop browser *and* a phone installed as a standalone PWA.
3. **Multi-locale (EN/TR)** — Turkish strings are ~30% longer than English; no fixed-width labels, no truncation without tooltip.
4. **Theme parity** — every screen must look intentional in both light and dark modes; we never ship a light-only screen.

## 2. Non-goals

- **No general-purpose form library.** `Form`/`FormField`/`FormLabel`/`FormMessage` are thin layout primitives. Schema validation and field binding happen at the feature level (react-hook-form + zod, where used).
- **No chart components.** Charts live in feature code with Recharts; colors come from `--color-deposit`, `--color-withdrawal`, `--color-net-line`, `--color-commission-chart`, `--color-settlement` (see [tokens.md](./tokens.md)).
- **No complex data grid.** The `Table` primitives are opinionated HTML elements with a responsive `cardOnMobile` mode. Virtualization is opt-in via `VirtualTableBody`. We don't ship sorting, filtering, or column-resize logic.
- **No icon library wrapper.** Phosphor Icons are imported directly (`@phosphor-icons/react`).
- **No animation library.** Motion uses CSS `@keyframes` and Tailwind utilities; Framer Motion is not part of the DS.
- **No toast *helper* hook yet.** The `Toaster` primitives are Radix toasts; the `toast()` helper is a feature-level gap and should be added before shipping anything that notifies the user.

## 3. Foundations

### 3.1 Stack

- **React 19** + **TypeScript 5.9 strict**
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin; tokens declared with `@theme { ... }` in [src/styles/index.css](../../src/styles/index.css)
- **Radix UI primitives** for every interactive surface that needs a11y (dropdown, dialog, select, tooltip, etc.)
- **Phosphor Icons** for all iconography (`@phosphor-icons/react`)
- **class-variance-authority (cva)** for variant APIs; **tailwind-merge + clsx** via [`cn`](../../src/design-system/utils/cn.ts) for conflict-safe class merging
- **i18next** for text — no user-visible string is hardcoded in a DS component without a `t('key')` fallback

### 3.2 Folder layout

```
src/design-system/
├── index.ts              # Barrel: re-exports components, tokens, hooks, utils, types
├── components/           # One folder per component (Button/Button.tsx + index.ts)
│   └── index.ts          # Component barrel
├── tokens/
│   ├── colors.ts         # JS mirror of CSS color vars
│   ├── typography.ts     # Font sizes (12/14/16/18/24/32/48/64)
│   ├── spacing.ts        # 4px-based scale + semantic aliases (xs/sm/md/card/lg/xl/2xl)
│   ├── radius.ts         # Radius scale + semantic aliases
│   ├── shadows.ts        # shadows + blur
│   └── animations.ts     # durations, easings, animation names
├── hooks/
│   ├── useTheme.tsx      # ThemeProvider + useTheme()
│   ├── useIsMobile.ts    # Media-query hook (<768px default)
│   └── useLocale.ts      # i18n locale getter + setter
├── utils/
│   └── cn.ts             # clsx + tailwind-merge
└── types/
    └── index.ts          # Shared TS types: ButtonVariant, Size, TextSize, etc.
```

### 3.3 Aliases

- `@` → `src/`
- `@ds` → `src/design-system/`

Import rule: **everything public** goes through `@ds`. Subpath imports are forbidden.

```tsx
//  yes
import { Button, Card, cn, useTheme } from '@ds'

//  no — breaks the barrel contract
import { Button } from '@ds/components/Button/Button'
```

## 4. Design principles

These are the constraints that make the system *small*. Fight them with care.

### P1 — Tokens over values

Never write a color hex, font size, spacing value, or radius as a raw number in feature code. Use the token. If the token doesn't exist, add it to the relevant file in `src/design-system/tokens/` *and* the corresponding CSS variable in [src/styles/index.css](../../src/styles/index.css).

### P2 — One visual variant per meaning

Don't branch on className at callsites for common styles. If you find yourself writing `className="bg-red/20 text-red px-2 py-0.5 rounded-md"`, that's a `<Tag variant="red">`. Add the variant to the component if it doesn't exist.

### P3 — Radix for behavior, CSS for skin

Every interactive primitive that needs keyboard/focus/aria handling wraps a Radix component. The DS is responsible only for the *skin* (classes), never for re-implementing a11y.

### P4 — Mobile is the first render

`md:` (≥768px) is the "progressive enhancement" breakpoint. Base classes target phones; `md:`, `lg:`, `xl:` add desktop affordances. There are no `max-md:` overrides as the default pattern.

### P5 — Theme-aware by default

Colors that render differently in light vs dark (`--color-black`, `--color-white`, `--color-brand`, `--color-bg1/2/5`, `--color-green`, `--color-net-line`) are the **only** palette most components should touch. Static colors (`--color-red`, `--color-blue`, etc.) are for status pills and charts where identity matters more than surface tone. See [theming.md](./theming.md).

### P6 — `cn()` at every merge point

Any component that forwards `className` merges it through [`cn()`](../../src/design-system/utils/cn.ts) so callers can override tokens without specificity wars. New components must follow this contract.

### P7 — i18n is not optional

Strings inside DS components go through `useTranslation('components')`. Keys live under `src/locales/{en,tr}/components.json`. See [accessibility.md §i18n](./accessibility.md#i18n).

## 5. Versioning & change policy

The DS is internal — there's no npm release cycle. Changes ship in regular PRs. The contract is:

- **Minor (safe):** adding a component, adding a non-breaking prop, adding a token, adding a variant value.
- **Major (coordinated):** renaming a component or prop, removing a variant, changing a default, moving a component out of `@ds`.
  - Grep every callsite (the barrel makes this trivial: `grep -r "from '@ds'"` then inspect destructuring).
  - Update callsites in the *same* PR — no deprecation window.
  - If the PR touches more than ~15 callsites, split into: (1) add new API, (2) migrate callsites, (3) remove old API. Ship (2) and (3) as follow-ups.

## 6. How to add a new component

1. **Check it isn't a pattern.** If the need can be satisfied by composing existing primitives + a small helper in the feature folder, do that.
2. **Put it in `src/design-system/components/<Name>/`** with `<Name>.tsx` + `index.ts`.
3. **Export it** from [src/design-system/components/index.ts](../../src/design-system/components/index.ts).
4. **Wrap a Radix primitive** if it has any interactive behavior (menu, popover, checkbox, etc.).
5. **Define variants with `cva`**, not ad-hoc conditionals.
6. **Merge `className`** with `cn()` so callers can override.
7. **Add it to [components.md](./components.md)** in the same PR, with props, variants, and one real usage example from the app.

## 7. How to deprecate a component

1. Mark it with `/** @deprecated Use X instead. Migrated callsites: … */` above the export.
2. Open a tracking issue linking the callsites to migrate.
3. Remove it after callsites are zero. Do not leave deprecated components in the barrel indefinitely.

## 8. Out-of-scope gaps (known)

Things that are *not* in the DS today and where to look instead:

| Need | Current approach | Future? |
|---|---|---|
| Toast helper (`toast.success(...)`) | Feature code wires Radix `Toast` manually | Yes — should be added |
| Data grid with sort / column resize | `Table` primitives + feature-level logic in `useTransfersQuery.ts` | Likely no — too domain-specific |
| Rich text editor | N/A | N/A — not needed |
| Charts | Recharts in feature folders, colors from CSS vars | No wrapper planned |
| Form schema | react-hook-form + zod at feature level | No wrapper — `Form` stays presentational |
| File upload | N/A | Add when first needed |
| Command palette (Cmd-K) | N/A | Add when first needed |
