# Component reference

Every component exported from `@ds`. Source path is relative to repo root. Props marked **required** have no default; others use the listed default.

Groups:

- [Primitives](#primitives) — `Text`, `Button`, `Input`, `Label`, `Link`, `Separator`, `Skeleton`, `Avatar`, `Tag`, `Badge`
- [Layout](#layout) — `Card`, `Grid`, `PageHeader`, `EmptyState`, `StatCard`
- [Forms](#forms) — `Form`, `FormField`, `FormLabel`, `FormDescription`, `FormMessage`, `Select`, `DateInput`, `DatePicker`, `DatePickerField`, `Calendar`
- [Overlays](#overlays) — `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Tooltip`, `Toaster`, `ManagerPinDialog`
- [Navigation](#navigation) — `Tabs`, `Breadcrumb`, `Pagination`, `Sidebar`
- [Data](#data) — `Table`, `VirtualTableBody`

---

## Primitives

### `Text` / `Typography`
[src/design-system/components/Text/Text.tsx](../../src/design-system/components/Text/Text.tsx)

Polymorphic text primitive. Renders a `<span>` by default; change with `as`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `size` | `12 \| 14 \| 16 \| 18 \| 24 \| 32 \| 48 \| 64` | `16` | Maps to `text-xs/sm/base/lg/2xl/[2rem]/[3rem]/[4rem]` |
| `semibold` | `boolean` | `false` | `font-semibold` |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | |
| `italic` | `boolean` | `false` | |
| `underline` | `boolean` | `false` | |
| `as` | `ElementType` | `'span'` | Polymorphic tag |

**Exports:** `Typography`, `Text` (re-export alias).

```tsx
<Text size={14} className="text-black/60">Caption</Text>
<Typography as="h2" size={24} semibold>Section title</Typography>
```

### `Button`
[src/design-system/components/Button/Button.tsx](../../src/design-system/components/Button/Button.tsx)

Polymorphic button. Icon-only mode activates when no `label` / `children` are passed.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'borderless' \| 'ghost' \| 'gray' \| 'outline' \| 'filled'` | `'borderless'` | |
| `size` | `'sm' \| 'md' \| 'lg'` | `'sm'` | Padding + radius |
| `label` | `string` | — | Text label; wrapped in `<Typography size={textSize} semibold>` |
| `textSize` | `TextSize` | `16` | Only used when `label` is set |
| `leftContent` | `JSX.Element` | — | Icon before label |
| `rightContent` | `JSX.Element` | — | Icon after label |
| `as` | `ElementType` | `'button'` | For `<Link>`, `<a>`, etc. |

**Variant visual map:**

| Variant | Use for |
|---|---|
| `borderless` / `ghost` | Toolbar actions, table row actions, pagination arrows |
| `gray` | Secondary buttons inside already-elevated surfaces |
| `outline` | Cancel / secondary destination, e.g. dialog footers |
| `filled` | Primary CTA — one per view max |

**Focus ring:** `focus:ring-4 focus:ring-brand/20` (4px halo, brand-tinted). Active state has a subtle `scale(0.97)` press feedback.

```tsx
<Button variant="filled" size="md" label="Save" leftContent={<Check size={16} />} />
<Button variant="ghost" size="sm" aria-label="More"><DotsThree size={16} /></Button>
<Button as={Link} to="/dashboard" variant="outline">Go home</Button>
```

### `Input`
[src/design-system/components/Input/Input.tsx](../../src/design-system/components/Input/Input.tsx)

Wraps `<input>` with the DS field skin: `bg-bg2/75 inset-ring inset-ring-black/15 focus:ring-4 focus:ring-brand/20`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `inputSize` | `'sm' \| 'md' \| 'lg'` | `'md'` | `sm: h-9`, `md: h-10`, `lg: p-5 py-4 text-lg` |
| `title` | `string` | — | When set, renders a floating label that rises above the placeholder on focus |
| ...standard `<input>` props | | | `ref` forwarded |

**Exports:** `Input`, plus three class constants (`basicInputClasses`, `disabledInputClasses`, `focusInputClasses`) and `InputSize` — consumed by `Select`, `DateInput`, and `DatePickerField` to reuse the same skin.

**Rule:** never hand-craft another field skin. If you need a custom input, compose with the three `*Classes` constants so focus/disabled states stay consistent.

```tsx
<Input inputSize="md" placeholder="Search name, CRM ID…" />
<Input title="Amount" inputMode="decimal" />
```

### `Label`
[src/design-system/components/Label/Label.tsx](../../src/design-system/components/Label/Label.tsx)

Wraps Radix `@radix-ui/react-label`. Default class: `text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50`.

```tsx
<Label htmlFor="name">Name</Label>
<Input id="name" />
```

### `Link`
[src/design-system/components/Link/Link.tsx](../../src/design-system/components/Link/Link.tsx)

Plain `<a>` with brand color and hover underline. **Not a router link** — use `react-router-dom` `Link` and pass `as={RouterLink}` to `Button` if you need routing.

### `Separator`
[src/design-system/components/Separator/Separator.tsx](../../src/design-system/components/Separator/Separator.tsx)

Wraps Radix separator. Horizontal 1px divider by default; pass `orientation="vertical"` for 1px vertical line.

### `Skeleton`
[src/design-system/components/Skeleton/Skeleton.tsx](../../src/design-system/components/Skeleton/Skeleton.tsx)

`animate-pulse bg-black/5 rounded-md`. Pass explicit dimensions via `className`.

### `Avatar`, `AvatarImage`, `AvatarFallback`
[src/design-system/components/Avatar/Avatar.tsx](../../src/design-system/components/Avatar/Avatar.tsx)

Wraps Radix avatar. 40×40 circle by default.

```tsx
<Avatar>
  <AvatarImage src={user.photoUrl} />
  <AvatarFallback>{initials}</AvatarFallback>
</Avatar>
```

### `Tag`
[src/design-system/components/Tag/Tag.tsx](../../src/design-system/components/Tag/Tag.tsx)

Color-coded pill. Used for: currency (`USDT`, `TL`), category (`Deposit`/`Withdrawal`), type (`Client`/`BLOCKED`/`PAYMENT`), status labels.

| Prop | Type | Default |
|---|---|---|
| `variant` | `'default' \| 'purple' \| 'blue' \| 'green' \| 'red' \| 'yellow' \| 'orange' \| 'indigo' \| 'cyan' \| 'mint'` | `'default'` |

Shape: `rounded-md px-2 py-0.5 text-xs font-medium`. Background is the color at 20% opacity; text is the full-strength color. `default` is black-at-5%.

```tsx
<Tag variant="green">USDT</Tag>
<Tag variant="red">BLOCKED</Tag>
```

### `Badge`, `BadgeComponent`
[src/design-system/components/Badge/Badge.tsx](../../src/design-system/components/Badge/Badge.tsx)

Notification dot badge that overlays its child at top-right. Renders nothing when `content` is empty.

```tsx
<Badge content={unreadCount}>
  <Bell size={16} />
</Badge>
```

---

## Layout

### `Card`
[src/design-system/components/Card/Card.tsx](../../src/design-system/components/Card/Card.tsx)

Composes `.ui-surface` + `border-black/10` + responsive radius.

| Prop | Type | Default | Resolves to |
|---|---|---|---|
| `bordered` | `boolean` | `false` | `true` adds `border-black/25` |
| `padding` | `'none' \| 'compact' \| 'default' \| 'spacious'` | `'default'` | `none:` nothing · `compact: p-3 md:p-md (12→16)` · `default: p-3 md:p-card (12→20)` · `spacious: p-md md:p-lg (16→24)` |

Radius: `rounded-xl md:rounded-2xl` (12→16px).

### `Grid`
[src/design-system/components/Grid/Grid.tsx](../../src/design-system/components/Grid/Grid.tsx)

Responsive grid that collapses to 1 column on phones.

| `cols` | Pattern |
|---|---|
| `1` | `grid-cols-1` |
| `2` | `grid-cols-1 sm:grid-cols-2` |
| `3` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| `4` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` |
| `5` | `grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5` |

Default `gap: md` (16px). Other `gap` values: `xs`, `sm`, `lg`.

**Rule:** don't write bare `grid grid-cols-4`. Use `<Grid cols={4} gap="md">` so the responsive collapse is guaranteed.

### `PageHeader`
[src/design-system/components/PageHeader/PageHeader.tsx](../../src/design-system/components/PageHeader/PageHeader.tsx)

```tsx
<PageHeader
  title="Transfers"
  subtitle={`${count} this month`}
  actions={<><Button>Export</Button><Button variant="filled">New transfer</Button></>}
/>
```

- Mobile: title stacked on top, actions wrap below
- Desktop (≥sm): title left, actions right on the same row
- Title size: `text-base sm:text-lg md:text-xl`, semibold

**Rule:** every page starts with `<PageHeader>`. Do not hand-roll `<h1>` at the page level.

### `EmptyState`
[src/design-system/components/EmptyState/EmptyState.tsx](../../src/design-system/components/EmptyState/EmptyState.tsx)

Centered placeholder with icon badge, title, optional description, optional action.

```tsx
<EmptyState
  icon={Inbox}
  title={t('transfers.emptyTitle')}
  description={t('transfers.emptyDescription')}
  action={<Button variant="filled" onClick={onNew}>New transfer</Button>}
/>
```

### `StatCard`
[src/design-system/components/StatCard/StatCard.tsx](../../src/design-system/components/StatCard/StatCard.tsx)

KPI card: icon + uppercase caption + value + optional trend node. Built on `Card`.

| Prop | Type | Default |
|---|---|---|
| `icon` | `ComponentType<IconProps>` | — |
| `iconBg` | `string` | `'bg-black/5'` |
| `iconColor` | `string` | `'text-black/40'` |
| `label` | `string` (**required**) | — |
| `value` | `string \| number` (**required**) | — |
| `isLoading` | `boolean` | `false` | When `true`, skeletons the value |
| `trend` | `ReactNode` | — | Up/down delta chip at right |

Value text is `tabular-nums` to keep digit alignment across rows.

---

## Forms

### `Form`, `FormField`, `FormLabel`, `FormDescription`, `FormMessage`
[src/design-system/components/Form/Form.tsx](../../src/design-system/components/Form/Form.tsx)

Pure presentational wrappers:

- `<Form onSubmit={fn}>` — calls `preventDefault()` then your handler. Applies `space-y-md md:space-y-lg`.
- `<FormField>` — `space-y-sm` wrapper (label + input + help).
- `<FormLabel>` — `Label` with `text-sm font-medium text-black`.
- `<FormDescription>` — `text-xs text-black/40` helper text.
- `<FormMessage error={true|false}>` — `text-xs text-red` (or `text-green` when `error={false}`) for inline errors/success.

**Scope:** validation belongs to react-hook-form + zod in feature code. Do not extend `Form.tsx` into a schema binder.

### `Select` (family)
[src/design-system/components/Select/Select.tsx](../../src/design-system/components/Select/Select.tsx)

Wraps `@radix-ui/react-select`.

**Exports:** `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectLabel`, `SelectSeparator`.

`SelectTrigger` reuses the `Input` skin (`basicInputClasses`, `focusInputClasses`, `disabledInputClasses`). Size matches via `selectSize: InputSize` (default `'md'`). Trigger auto-appends a `CaretDown` icon.

`SelectContent` composes `ui-surface` + `backdrop-blur-xl` + `shadow-xl`. Defaults to `position="popper"`.

`SelectItem` has check indicator on the left (absolute, 9px from start) and `data-[highlighted]:bg-brand/10 data-[highlighted]:text-brand` for keyboard nav.

```tsx
<Select value={currency} onValueChange={setCurrency}>
  <SelectTrigger selectSize="md">
    <SelectValue placeholder="Select currency" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="TL">Turkish Lira</SelectItem>
    <SelectItem value="USDT">Tether</SelectItem>
  </SelectContent>
</Select>
```

### `DateInput`
[src/design-system/components/DateInput/DateInput.tsx](../../src/design-system/components/DateInput/DateInput.tsx)

Native `<input type="date"|"datetime-local">` with a phospor `CalendarBlank` icon overlaid on the left (the native picker icon is hidden). Optional `onClear` shows an `×` button when the field has a value.

Used for simple form fields where you want the OS picker (mobile) and a clean icon (desktop).

### `DatePicker`
[src/design-system/components/DatePicker/DatePicker.tsx](../../src/design-system/components/DatePicker/DatePicker.tsx)

**Filter-bar date picker.** Not a form field — uses `Popover` + presets + calendar.

Props:
```
dateFrom, dateTo: string | null    (YYYY-MM-DD)
onChange: (from, to) => void
placeholder?: string
minWidth?: string  (default '10rem')
```

Presets: Today, Yesterday, Last 7 days, Last 30 days, This month, Last month (i18n keys under `datePicker.*`).

**Rule:** wherever a page has a date-range filter at the top (Transfers, Accounting, Reports), use `DatePicker`. Don't build a bespoke one.

### `DatePickerField`
[src/design-system/components/DatePicker/DatePickerField.tsx](../../src/design-system/components/DatePicker/DatePickerField.tsx)

**Form-field** variant of the date picker. Works with react-hook-form (takes `name`, `onBlur`, forwards `ref` to a hidden input). Value is a single `YYYY-MM-DD` string.

Use this inside `<FormField>`. Use `<DatePicker>` for filter bars.

### `Calendar`
[src/design-system/components/Calendar/Calendar.tsx](../../src/design-system/components/Calendar/Calendar.tsx)

Controlled month grid. 280px wide. Localized day/month names via `useTranslation().i18n.language`. Rarely used standalone — it's the building block of `DatePicker` and `DatePickerField`.

---

## Overlays

### `Dialog` (family)
[src/design-system/components/Dialog/Dialog.tsx](../../src/design-system/components/Dialog/Dialog.tsx)

Wraps `@radix-ui/react-dialog`.

**Exports:** `Dialog`, `DialogTrigger`, `DialogClose`, `DialogPortal`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`.

`DialogContent` is **fullscreen on mobile, centered modal on desktop** (`md:`+). Mobile has a sticky top bar with a close button; desktop has an absolute close button at top-right.

| `size` | Max width (desktop) |
|---|---|
| `sm` | `md:max-w-sm` |
| `md` (default) | `md:max-w-md` |
| `lg` | `md:max-w-lg` |
| `xl` | `md:max-w-xl` |
| `2xl` | `md:max-w-2xl` |

**Close button accessibility:** built-in `<span className="sr-only">{t('dialog.close')}</span>` (i18n key `components:dialog.close`).

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent size="lg">
    <DialogHeader>
      <DialogTitle>Confirm action</DialogTitle>
      <DialogDescription>This will delete the record.</DialogDescription>
    </DialogHeader>
    {/* body */}
    <DialogFooter>
      <Button variant="outline" onClick={close}>Cancel</Button>
      <Button variant="filled" onClick={confirm}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### `Sheet` (family)
[src/design-system/components/Sheet/Sheet.tsx](../../src/design-system/components/Sheet/Sheet.tsx)

Same Radix primitive as Dialog, but as a **slide-in drawer** from one edge.

**Exports:** `Sheet`, `SheetTrigger`, `SheetClose`, `SheetPortal`, `SheetOverlay`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`.

`SheetContent` variants:

| `side` | Layout |
|---|---|
| `top` | `inset-x-0 top-0 border-b` |
| `bottom` | `inset-x-0 bottom-0 border-t` |
| `left` | `inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm` |
| `right` (default) | `inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm` |

**Use cases:** mobile filter drawer, sidebar on mobile, inline edit forms that shouldn't interrupt the page.

### `Popover`
[src/design-system/components/Popover/Popover.tsx](../../src/design-system/components/Popover/Popover.tsx)

Wraps `@radix-ui/react-popover`. Content is a 288px (`w-72`) glass panel with `ui-surface` + blur.

**Exports:** `Popover`, `PopoverTrigger`, `PopoverAnchor`, `PopoverContent`.

### `DropdownMenu` (family)
[src/design-system/components/DropdownMenu/DropdownMenu.tsx](../../src/design-system/components/DropdownMenu/DropdownMenu.tsx)

Wraps `@radix-ui/react-dropdown-menu`.

**Exports:** `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuRadioGroup`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`.

Item skin: `rounded-xl`, hover `bg-black/5`, highlighted `bg-brand/10 text-brand`. Checkbox/radio items have their indicator in a 16×16 slot at the left.

### `Tooltip`
[src/design-system/components/Tooltip/Tooltip.tsx](../../src/design-system/components/Tooltip/Tooltip.tsx)

Wraps `@radix-ui/react-tooltip`.

**Exports:** `TooltipProvider`, `Tooltip`, `TooltipTrigger`, `TooltipContent`.

Content: `rounded-lg bg-black px-3 py-1.5 text-xs text-white`. `TooltipProvider` must wrap the app (`src/app/providers/`).

### `Toaster` (Radix toast family)
[src/design-system/components/Toaster/Toaster.tsx](../../src/design-system/components/Toaster/Toaster.tsx)

Wraps `@radix-ui/react-toast`.

**Exports:** `ToastProvider`, `ToastViewport`, `Toast`, `ToastAction`, `ToastClose`, `ToastTitle`, `ToastDescription`.

Variants: `default`, `success`, `error`, `warning`.

**Gap:** there is no `useToast()` / `toast()` helper yet. Callers wire Radix primitives manually — that's awkward and invites drift. Before shipping more notifications, add a helper hook (see [README §8](./README.md#8-out-of-scope-gaps-known)).

### `ManagerPinDialog`
[src/design-system/components/ManagerPinDialog/ManagerPinDialog.tsx](../../src/design-system/components/ManagerPinDialog/ManagerPinDialog.tsx)

Domain-ish dialog that belongs in the DS because it's reused across Transfers Settings and anywhere else that gates a change behind the org's manager PIN. Uses `useVerifyOrgPin` RPC hook, rate-limited server-side.

---

## Navigation

### `Tabs`
[src/design-system/components/Tabs/Tabs.tsx](../../src/design-system/components/Tabs/Tabs.tsx)

Wraps `@radix-ui/react-tabs`.

**Exports:** `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.

`TabsList` auto-scrolls horizontally on small screens (`overflow-x-auto` + custom `.tabs-list-scroll` class that hides the scrollbar). On touch devices, adds scroll-snap.

Active state: `data-[state=active]:bg-white data-[state=active]:shadow-sm`.

### `Breadcrumb` (family)
[src/design-system/components/Breadcrumb/Breadcrumb.tsx](../../src/design-system/components/Breadcrumb/Breadcrumb.tsx)

**Exports:** `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`.

Pure HTML with proper ARIA (`role="navigation" aria-label="breadcrumb"`, current item has `aria-current="page"`).

### `Pagination` (family)
[src/design-system/components/Pagination/Pagination.tsx](../../src/design-system/components/Pagination/Pagination.tsx)

**Exports:** `Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`.

Links render as `Button` with `size="sm"`, active link uses `variant="filled"`. Touch size: `size-10` on mobile, `size-8` on desktop.

### `Sidebar`
[src/design-system/components/Sidebar/Sidebar.tsx](../../src/design-system/components/Sidebar/Sidebar.tsx)

**The biggest file in the DS** (~400 lines). Exports a provider + context hook + ~20 sub-components (`SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, etc.). On mobile it renders as a `Sheet`.

Key behavior:
- Width: `14rem` expanded, `2.75rem` collapsed
- Persists open/closed to `sidebar:state` cookie (7-day max-age)
- Keyboard shortcut: `Ctrl/Cmd + B` to toggle
- Mobile: renders inside a `Sheet`; open/closed via `openMobile` context state
- `useSidebar()` hook — throws if used outside `<SidebarProvider>`

Since the Sidebar's API is pass-through to shadcn/Radix conventions and the full API surface is large, treat the file as authoritative. New consumers should look at `src/app/providers/` and any existing nav to copy the shape.

---

## Data

### `Table` (family)
[src/design-system/components/Table/Table.tsx](../../src/design-system/components/Table/Table.tsx)

**Exports:** `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`.

These are HTML table elements with DS skins — **not** a full data-grid. Sorting, filtering, pagination live in the feature code that owns the data.

Key props:

- `Table` has a `cardOnMobile?: boolean` prop. When `true`, adds `data-card-mobile=""` to the `<table>` which triggers the mobile card-layout CSS in [src/styles/index.css:444–497](../../src/styles/index.css#L444-L497). See [patterns.md §Responsive tables](./patterns.md#responsive-tables).
- `TableCell` has an `isActions?: boolean` prop. When `true`, adds `data-actions=""` which styles the cell as the actions row at the bottom of the mobile card.
- `TableCell` should receive `data-label="Column title"` when `cardOnMobile` is enabled — the label renders as the left-side caption in card mode via CSS `::before { content: attr(data-label); }`.

### `VirtualTableBody`
[src/design-system/components/Table/VirtualTableBody.tsx](../../src/design-system/components/Table/VirtualTableBody.tsx)

Opt-in virtualized body for long tables. Replaces `<TableBody>` when row counts exceed a few hundred. Look at the file for the exact API; in practice we only use it in places with >500 rows.

---

## Component matrix (at a glance)

| Component | Radix? | Variants | Responsive | i18n strings |
|---|---|---|---|---|
| Text / Typography | — | size × semibold × align × italic × underline | — | — |
| Button | — | variant × size × icon-only | — | — |
| Input | — | inputSize | — | — |
| Label | ✓ react-label | — | — | — |
| Link | — | — | — | — |
| Separator | ✓ react-separator | orientation | — | — |
| Skeleton | — | — | — | — |
| Avatar | ✓ react-avatar | — | — | — |
| Tag | — | variant (10 colors) | — | — |
| Badge | — | — | — | — |
| Card | — | bordered × padding | ✓ radius | — |
| Grid | — | cols (1–5) × gap | ✓ collapse | — |
| PageHeader | — | — | ✓ stacked→row | — |
| EmptyState | — | — | ✓ padding | via caller |
| StatCard | — | — | — | — |
| Form / FormField / … | — | — | ✓ spacing | — |
| Select family | ✓ react-select | selectSize | — | — |
| DateInput | — | inputSize | — | via caller |
| DatePicker | — | — | ✓ popover | ✓ `datePicker.*` |
| DatePickerField | — | inputSize | — | ✓ `datePicker.*` |
| Calendar | — | — | fixed 280px | locale from i18n |
| Dialog family | ✓ react-dialog | size | ✓ fullscreen on mobile | ✓ `dialog.close` |
| Sheet family | ✓ react-dialog | side | ✓ always-drawer | ✓ `sheet.close` |
| Popover | ✓ react-popover | — | — | — |
| DropdownMenu family | ✓ react-dropdown-menu | — | — | — |
| Tooltip | ✓ react-tooltip | — | — | — |
| Toaster family | ✓ react-toast | variant | ✓ top-mobile / bottom-right-desktop | — |
| ManagerPinDialog | built on Dialog | — | — | ✓ `transfers.settings.*` |
| Tabs family | ✓ react-tabs | — | ✓ horizontal-scroll on mobile | — |
| Breadcrumb family | — | — | — | ✓ `breadcrumb.more` |
| Pagination family | — | — | ✓ touch sizing | ✓ `pagination.*` |
| Sidebar + ~20 subs | ✓ multiple | — | ✓ Sheet on mobile | via caller |
| Table family | — | cardOnMobile | ✓ table→cards | — |
| VirtualTableBody | — | — | — | — |
