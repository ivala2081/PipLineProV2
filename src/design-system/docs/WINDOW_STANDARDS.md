# Window Design Standards

This document defines the default UI/UX rules for all app windows (`Dialog`, `Sheet`, popup forms).

Use this as the single source of truth when creating or updating window-based flows.

## 1) Core Layout Rules

- Use compact window sizes for data-entry:
  - Preferred: `max-w-xl`
  - Keep vertical space controlled: `max-h-[85vh]` + `overflow-y-auto`
  - Inner spacing: `p-4 sm:p-5`
- Form density should be compact:
  - Control height around `h-10`
  - Small labels (`text-xs`) and compact hints/errors (`text-[11px]`)
- Default field flow is single-column for readability.
- Only pair related fields side-by-side.
  - Current approved pairs:
    - `Date & Time` + `Currency`
    - `CRM ID` + `META ID`

## 2) Footer and Action Placement

- `Cancel` button is always bottom-left.
- Primary actions are bottom-right.
- Recommended button order (right group):
  1. Secondary quick action (example: `Save & New`)
  2. Primary action (`Save`)

## 3) Close Behavior

- Data-entry windows must **not** close on outside click.
- Require explicit user intent:
  - `Cancel` button
  - Close icon (if shown)
  - Optional keyboard `Esc` behavior (project decision per flow)

Implementation hint:

```tsx
<DialogContent onInteractOutside={(event) => event.preventDefault()} />
```

## 4) Input and Select UX

- Inputs and selects use compact DS classes (shared look/feel).
- Selects should be searchable for long lists:
  - Embedded search input in dropdown content
  - `No results` fallback state
- Keep validation messages short and local to field.

## 5) Fast Data Entry Patterns

- Add `Save & New` on create dialogs where repeated entry is common.
- Remember last used frequent fields in local storage:
  - payment method
  - category
  - currency
  - psp
  - type
- Re-apply remembered values only for new records, not edit mode.

## 6) Dark Mode Window Rules

- Use `ui-surface` for window/popup surfaces.
- In dark mode:
  - Outer borders should not feel harsh (transparent/minimal border look).
  - Surface fill should separate clearly from page background.
  - Overlay behind modal must be dark and neutral (not white haze).

## 7) Accessibility and Keyboard

- Maintain visible focus states on controls.
- Ensure logical tab order top-to-bottom.
- Keep labels explicit and close to controls.
- Use concise helper/error text for faster scanning.

## 8) Delivery Checklist

Before merging any new window UI:

- [ ] Uses compact spacing and control sizes.
- [ ] Uses single-column flow with only approved field pairs.
- [ ] `Cancel` is on bottom-left.
- [ ] Primary action group is on bottom-right.
- [ ] Outside-click close is disabled for data-entry.
- [ ] Searchable select is used where option count is high.
- [ ] Dark mode surface/overlay follows standards.

