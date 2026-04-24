# Accessibility, responsiveness, internationalization

Three orthogonal concerns that every DS component must satisfy before merging. Gaps are called out inline.

---

## 1. Focus & keyboard

### 1.1 Focus styles

The DS uses two distinct focus rings depending on context:

| Context | Ring | Offset | Used by |
|---|---|---|---|
| Primary interactive (buttons, inputs, selects, date pickers) | `ring-4 ring-brand/20` + `inset-ring-brand/55` on the input border | — | `Button`, `Input`, `Select`, `DateInput`, `DatePickerField` |
| Secondary interactive (links, dialog close, tabs, pagination) | `ring-2 ring-black/5` | `ring-offset-2` | `Link`, `Tabs`, `Dialog`/`Sheet` close, `Pagination` nav links |

**Rule:** never set `outline: none` / `focus:outline-hidden` without replacing it with a ring. The current helpers do this for you — use them instead of rolling your own.

The shared focus-input classes live at [src/design-system/components/Input/Input.tsx:14–15](../../src/design-system/components/Input/Input.tsx#L14-L15):

```ts
focusInputClasses = 'focus:outline-none focus:ring-4 focus:ring-brand/20 focus:inset-ring-brand/55 active:inset-ring-brand/45'
```

Any field-like component (Select trigger, DateInput, DatePickerField) composes this so the focus ring is identical everywhere.

### 1.2 Keyboard behavior (by component)

All Radix-based components inherit correct keyboard handling out of the box:

- **Dialog / Sheet:** `Esc` closes, focus trapped inside, focus returns to trigger on close.
- **Select / Dropdown:** `↑` / `↓` to move, `Enter` to select, `Esc` to close, typeahead.
- **Tabs:** `←` / `→` between tabs, `Home` / `End` jump to first/last, `Space`/`Enter` activates.
- **Popover:** `Esc` closes, focus trap optional via Radix props.
- **Tooltip:** appears on keyboard focus *and* hover; `Esc` dismisses.
- **Sidebar:** `Ctrl/Cmd + B` toggles (shortcut is documented in [src/design-system/components/Sidebar/Sidebar.tsx:31](../../src/design-system/components/Sidebar/Sidebar.tsx#L31)).

**Rule:** don't reimplement any of these. If a Radix primitive doesn't exist for your need, ask before rolling a custom popover.

### 1.3 Escape-to-close

Every modal-ish surface (`Dialog`, `Sheet`, `Popover`, `DropdownMenu`) supports `Esc` via Radix. Don't suppress it.

## 2. ARIA & semantics

### 2.1 What the DS provides automatically

- **Buttons** render as `<button type="button">` unless `as` is overridden.
- **Breadcrumb:** `role="navigation" aria-label="breadcrumb"`, current item marked `aria-current="page"` (see [Breadcrumb.tsx:40–41](../../src/design-system/components/Breadcrumb/Breadcrumb.tsx#L40-L41)).
- **Pagination:** `role="navigation" aria-label="pagination"`, previous/next/ellipsis buttons all have `aria-label` + `sr-only` text (see [Pagination.tsx:11](../../src/design-system/components/Pagination/Pagination.tsx#L11)).
- **Dialog/Sheet close buttons:** include `<span className="sr-only">{t('dialog.close')}</span>` / `{t('sheet.close')}`.
- **Tooltip:** Radix handles the `aria-describedby` wiring between trigger and content.
- **Separator:** `role="separator"` with correct orientation via Radix.

### 2.2 What feature code must supply

- **Every icon-only button gets `aria-label`.** Example: `<Button variant="ghost" aria-label="Edit transfer"><PencilSimple /></Button>`. The DS can't guess.
- **Every form field gets a `<Label>` linked via `htmlFor` / `id`.** Even if the label is visually hidden, wrap it:
  ```tsx
  <Label htmlFor="search" className="sr-only">Search</Label>
  <Input id="search" placeholder="Search…" />
  ```
- **Loading regions get `aria-busy`.** Wrapping a skeleton in a `<div role="status" aria-busy="true">` lets screen readers announce the state.
- **Destructive actions get confirmation.** A plain Button with `onClick={delete}` isn't enough — wrap in `<Dialog>` confirm pattern (see [patterns.md §5.1](./patterns.md#51-confirm--destructive)).

### 2.3 Live regions

For toasts, Radix's `<ToastProvider>` already manages the polite live region. For inline data changes (e.g. "3 new transfers loaded"), wrap the status text in `<div role="status" aria-live="polite">`.

## 3. Touch & pointer

### 3.1 Touch target minimum

Enforced globally via [src/styles/index.css:513–531](../../src/styles/index.css#L513-L531):

```css
@media (pointer: coarse) {
  button, a, [role='button'], [role='tab'], [role='menuitem'],
  input[type='checkbox'], input[type='radio'] {
    min-height: 44px;
    min-width: 44px;
  }
}
```

Exceptions — elements that opt out of the 44px minimum:

- `.inline-link` — inline text links that would break their paragraph layout.
- `[data-compact-touch]` — icon-only buttons in dense rows (set by the consumer when the visual is small but the hitbox is padded by its container).

**Rule:** never override `min-height`/`min-width` on a button to shrink below 44px on mobile. If the visual target needs to look smaller, increase padding instead.

### 3.2 iOS zoom prevention

Inputs get `font-size: max(16px, 1em)` on iOS ([index.css:550–556](../../src/styles/index.css#L550-L556)) so focusing an input doesn't zoom the viewport. The `Input` component's `sm`/`md` sizes already use `text-base md:text-sm` to match this.

### 3.3 Press feedback

On coarse pointers, the `.press-scale` utility gives a 3% scale-down on active. Buttons already have `active:scale-[0.97]` inline; feel free to add `.press-scale` to list items or other tappable elements.

### 3.4 Momentum scrolling

Scrollable containers that need iOS momentum scrolling + rubber-band prevention get the `.scroll-touch` class ([index.css:558–562](../../src/styles/index.css#L558-L562)).

## 4. Responsive

### 4.1 Breakpoints we actually use

| Prefix | Min width | Primary use |
|---|---|---|
| — (default) | 0px | Mobile base layout |
| `sm:` | 640px | Small tablets, wide phones in landscape — *rarely used for layout switches* |
| `md:` | 768px | **The main "desktop" breakpoint.** Full table, bottom nav hidden, dialogs centered |
| `lg:` | 1024px | Multi-column dashboards, `Grid cols={3}` resolves here |
| `xl:` | 1280px | Widest grid variants (`Grid cols={4/5}`) |
| `2xl:` | 1536px | Rarely used |

### 4.2 Default mental model

- Start every layout in **mobile mode**. It must be usable at 360px wide.
- Add `md:` variants for the desktop affordance: multi-column, hover states, non-sticky UI, bigger typography.
- `sm:` is for transitional tweaks (e.g. "stack→row at small-tablet width"). Use sparingly.

### 4.3 Bottom-nav reservation

Pages that render inside the app shell reserve space for the fixed 80px bottom nav on mobile:

```tsx
<div className="pb-20 md:pb-6">…</div>
```

This is a *pattern rule*, not a token — new pages copy it from existing pages.

### 4.4 PWA standalone

When installed as a PWA, the app runs in standalone mode. Effects:

- Header auto-pads `env(safe-area-inset-top)` (see [index.css:539–543](../../src/styles/index.css#L539-L543)).
- Bottom nav must pad `env(safe-area-inset-bottom)` to clear the home indicator.

Layout components that go to the absolute bottom/top of the viewport need to use `padding-bottom: var(--safe-bottom)` or similar.

### 4.5 Reduced motion

Global preference respected at [index.css:276–284](../../src/styles/index.css#L276-L284). Components don't need to check `prefers-reduced-motion` individually.

### 4.6 Print

We don't support print. Anyone asking for "print-friendly transfers" should export CSV instead (already implemented in the bulk toolbar).

## 5. Internationalization

### 5.1 The contract

- Every user-visible string goes through `useTranslation(ns)` with namespace `'common' | 'components' | 'pages'`.
- Translation files: `src/locales/{en,tr}/{common,components,pages}.json`.
- **Exception:** brand-like words that don't translate (e.g. "USDT", "TL", "CRYPPAY") can be hardcoded.

### 5.2 Namespace conventions

| Namespace | Used by | Examples |
|---|---|---|
| `common` | Verbs and generic UI words | `save`, `cancel`, `delete`, `loading` |
| `components` | Strings inside DS components | `dialog.close`, `sheet.close`, `pagination.previous`, `datePicker.today` |
| `pages` | Feature-specific strings | `transfers.title`, `transfers.filters.allEmployees` |

### 5.3 String length

Turkish is **on average 30–40% longer than English**. Design rules:

- Never set fixed pixel widths on elements containing text.
- Buttons must allow the label to wrap or elide with a tooltip on hover.
- Tables can truncate text in a cell but the full value must be available via `title` attribute or tooltip.
- Form labels stack above the input, never to the left — a left-aligned Turkish label can exceed its column width.

### 5.4 Placeholders and interpolation

Use `{{variable}}` interpolation. Don't concatenate strings:

```tsx
// yes
t('transfers.count', { count })

// no
`${t('transfers.countBefore')} ${count} ${t('transfers.countAfter')}`
```

### 5.5 Date & number formatting

See [patterns.md §10–12](./patterns.md#10-numeric-formatting).

### 5.6 RTL readiness

We don't ship an RTL locale today (Arabic is not planned). But:

- Prefer logical properties where cheap: `ms-*` / `me-*` over `ml-*` / `mr-*`, `ps-*` / `pe-*` over `pl-*` / `pr-*`.
- Don't use `text-left` / `text-right` for visual symmetry — use `text-start` / `text-end`.

We won't rewrite existing code for this, but new code should default to logical properties so future-RTL is cheaper.

### 5.7 `useLocale()` hook

[src/design-system/hooks/useLocale.ts](../../src/design-system/hooks/useLocale.ts) — thin wrapper around `useTranslation()`:

```ts
const { locale, changeLocale, locales, localeNames } = useLocale()
//        ^ 'en' | 'tr'
//                  ^ setter (persisted by i18next-browser-languagedetector)
//                                ^ ['en', 'tr']
//                                           ^ { en: 'English', tr: 'Türkçe' }
```

Use in the language picker; feature code reads locale directly from `useTranslation().i18n.language`.

## 6. Screen readers

### 6.1 `sr-only` helper

Tailwind's built-in `.sr-only` class is used throughout. Examples:

- Dialog/Sheet close: `<span className="sr-only">{t('dialog.close')}</span>`
- Pagination ellipsis: `<span className="sr-only">{t('pagination.morePages')}</span>`
- Breadcrumb ellipsis: `<span className="sr-only">{t('breadcrumb.more')}</span>`

**Rule:** icon-only elements that convey meaning must have screen-reader text. `aria-label` is equivalent but `sr-only` is preferred when the text is already a translation key (easier to audit).

### 6.2 Don't hide meaning behind color

Status pills, chart legends, error messages must include text or an icon, not color alone. Color-blind users can't read "red = bad, green = good" unaided.

- `<Tag variant="red">BLOCKED</Tag>`  — text + color
- A red pill with no text  — not OK

### 6.3 Order matters

Visual order and DOM order must agree. The `flex-col-reverse md:flex-row` pattern used in `DialogFooter` is fine (keeps primary button on the right on desktop, on top on mobile) — but don't reverse content that has to be read top-to-bottom.

## 7. Known a11y gaps

Tracked so we don't forget:

| Gap | Severity | Notes |
|---|---|---|
| No `toast()` helper — feature code wires Radix toasts ad-hoc | Medium | Risk of inconsistent polite regions |
| `TableHead` doesn't set `scope="col"` automatically | Low | Add when next touched |
| Sidebar collapse state isn't announced when toggled via shortcut | Low | Add a polite live region on toggle |
| No focus-visible polyfill for old browsers | Low | Chrome/Firefox/Safari stable all support natively — we don't target legacy |

## 8. Testing checklist

Before merging a component or a non-trivial feature change, step through:

- [ ] **Keyboard only:** can I reach every interactive element, operate it, and escape the flow?
- [ ] **Screen reader:** do icon-only controls announce their purpose? Do forms announce validation errors?
- [ ] **Zoom 200%:** does layout hold without overflow?
- [ ] **Mobile viewport (≤400px):** no horizontal scroll? Touch targets ≥44px?
- [ ] **Dark mode:** still readable? No hardcoded hex?
- [ ] **Turkish locale:** no labels clipped or wrapping badly?
- [ ] **Reduced motion:** do animations feel instant?
- [ ] **Tab order:** matches visual order?

This isn't a CI check — it's a human review. Keep it short enough to actually do.
