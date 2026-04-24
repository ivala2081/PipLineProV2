# Theming

## 1. Three modes, one attribute

We support three user-selectable modes:

| Mode | Meaning |
|---|---|
| `light` | Force light palette regardless of OS preference |
| `dark` | Force dark palette regardless of OS preference |
| `system` | Follow OS `prefers-color-scheme` (default) |

The *resolved* theme is always either `light` or `dark`. It drives a single DOM attribute:

```html
<html data-theme="light">  <!-- or "dark" -->
```

Every themed selector in CSS is gated on this attribute. There is no `.dark` class system, no duplicated Tailwind config — just one attribute and CSS var overrides.

Source of truth: [src/design-system/hooks/useTheme.tsx](../../src/design-system/hooks/useTheme.tsx).

## 2. `ThemeProvider`

Wraps the app at the top level (mounted in `src/app/providers/`).

```tsx
import { ThemeProvider } from '@ds'

<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>
```

**Behavior:**

- Reads the persisted choice from `localStorage` key `piplinepro-theme`.
- Falls back to `defaultTheme` (default: `'system'`) if nothing is stored.
- Sets `<html data-theme="...">` on mount and on every theme change.
- In `system` mode, subscribes to `window.matchMedia('(prefers-color-scheme: dark)')` and re-applies.
- Exposes `theme`, `resolvedTheme`, `setTheme`, `toggleTheme` via context.

**SSR safety:** the provider guards `typeof window === 'undefined'` for the initial value. There's no SSR setup in this repo today, but the provider is safe if/when one is added.

## 3. `useTheme()` hook

```ts
import { useTheme } from '@ds'

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  //      ^ 'light' | 'dark' | 'system'
  //                  ^ 'light' | 'dark'  — always resolved
}
```

**Contract:**

- `theme` is the user's raw preference (may be `'system'`).
- `resolvedTheme` is what's actually on screen (always `'light'` or `'dark'`).
- `setTheme(newTheme)` persists to `localStorage` and re-applies.
- `toggleTheme()` cycles `system → light → dark → system → …`.
- Throws if used outside a `<ThemeProvider>` (enforced by [useTheme.tsx:80–82](../../src/design-system/hooks/useTheme.tsx#L80-L82)).

**Rule:** feature code should prefer CSS vars over reading `resolvedTheme`. Reach for the hook only when:

- You're passing colors to a non-CSS consumer (Recharts `stroke`, canvas, `<svg>` props written in JS).
- You need to render different component trees (extremely rare — CSS should handle it).

## 4. How dark mode overrides work

Tailwind v4's default `dark:` variant is redefined at [src/styles/index.css:4](../../src/styles/index.css#L4):

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

So `dark:bg-bg2` compiles to `[data-theme=dark] .bg-bg2 { ... }` — fully scoped to the attribute.

Theme-aware CSS vars are overridden in two places:

1. **Explicit `[data-theme='dark']`** selector ([src/styles/index.css:290–302](../../src/styles/index.css#L290-L302)) — applies when the user has explicitly picked dark.
2. **`@media (prefers-color-scheme: dark)`** fallback ([src/styles/index.css:308–321](../../src/styles/index.css#L308-L321)) — applies when `data-theme` isn't `"light"` *and* the OS wants dark (handles `system` mode before JS runs).

This dual path means the page renders correctly on first paint, even before `ThemeProvider` has hydrated.

## 5. The theme-aware palette

Exactly these tokens flip between modes:

| Token | Light | Dark |
|---|---|---|
| `--color-black` | `#000000` | `#e6e9f2` |
| `--color-white` | `#ffffff` | `#0f141f` |
| `--color-brand` | `#000000` | `#5aa6c8` |
| `--color-brand-hover` | `#666666` | `#75b9d6` |
| `--color-bg1` | `#ffffff` | `#0d1119` |
| `--color-bg2` | `#f9f9fa` | `#141b26` |
| `--color-bg5` | `#ffffff` | `#1b2533` |
| `--color-green` | `#16a34a` | `#94e9b8` |
| `--color-net-line` | `#18181b` | `#94e9b8` |

`color-scheme: dark` / `light` is also set so native form controls (checkbox, scrollbar, date picker) pick up the right system chrome.

**All other colors are identical across modes.** If you need a dark-mode override on a color that isn't in this list, ask first — the bias is toward keeping the static palette static.

## 6. Body defaults

At the `html, body` level ([src/styles/index.css:323–327](../../src/styles/index.css#L323-L327)):

```css
html, body {
  background-color: var(--color-bg1);
  color: var(--color-black);
}
```

Default border color for `*` and pseudo-elements ([src/styles/index.css:329–335](../../src/styles/index.css#L329-L335)):

```css
border-color: color-mix(in srgb, var(--color-black) 10%, transparent);
```

So `border` with no color utility automatically becomes a theme-aware subtle divider. This is *intentional* — most borders in the app use this default.

## 7. Elevation — `.ui-surface`

Dark mode slightly tints and shadows elevated surfaces:

```css
.ui-surface {
  background-color: var(--color-bg5);
}

[data-theme='dark'] .ui-surface {
  background-color: color-mix(in srgb, var(--color-bg5) 90%, var(--color-bg2) 10%);
  box-shadow: 0 10px 26px rgba(2, 8, 20, 0.28);
}
```

**Rule:** any elevated component (Card, Dialog, Popover, Sheet, Dropdown, Select content, Toast) composes `ui-surface` so this behavior stays consistent. Don't replicate the background/shadow pair by hand.

## 8. Checklist when adding a dark-aware component

1. Use **theme-aware tokens** (`bg-bg1/2/5`, `text-black`, `text-brand`) for everything that isn't a semantic/identity color.
2. Use **`/opacity` Tailwind syntax** (`text-black/60`, `border-black/10`) so opacity composes over both themes.
3. Apply `.ui-surface` for elevation instead of shipping a bespoke dark-shadow rule.
4. Test both modes *before* merging. Switching with the toggle in the app is the fastest check.
5. If a specific element needs a dark-only override, prefer `dark:` Tailwind variants over writing raw `[data-theme='dark']` selectors in a component's CSS:
   ```tsx
   className="bg-bg2 dark:bg-bg5"   //  yes
   ```

## 9. What *not* to do

- **Don't hardcode hex values** in feature code. If the designer says "use #fafafa", ask which semantic token that corresponds to (probably `--color-bg2`).
- **Don't read `window.matchMedia('(prefers-color-scheme)')`** directly — use `useTheme()`.
- **Don't add a third theme.** If product wants "blue accent" or "high contrast", that's a variant *within* light/dark (e.g. by changing `--color-brand`), not a new `data-theme` value.
- **Don't use CSS inline styles for theme-aware colors.** `style={{ color: '#000' }}` freezes to light mode. Use a Tailwind utility or a CSS var: `style={{ color: 'var(--color-black)' }}`.
- **Don't use `--color-white` / `--color-black` as literal white/black.** They're semantic foreground tokens. For literal white text on a colored background (e.g. success toast), use `text-white` *and* verify the background is always the same color in both themes.

## 10. Persisted keys

The DS writes three localStorage keys. Keep this list updated:

| Key | Set by | Values |
|---|---|---|
| `piplinepro-theme` | `ThemeProvider` | `'light' \| 'dark' \| 'system'` |
| `sidebar:state` | `Sidebar` | `'true' \| 'false'` (expanded) |
| `piplinepro-org` | `OrganizationProvider` (outside DS) | org UUID |

None of these are PII. They're free to clear.
