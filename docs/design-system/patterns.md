# Patterns

Composed solutions to recurring UI problems. Every pattern here is already implemented at least once in the app; this file is the spec of *how to do it correctly the next time.*

---

## 1. Page scaffold

Every feature page follows the same top-level skeleton:

```tsx
export default function TransfersPage() {
  return (
    <div className="space-y-lg pb-20 md:pb-6">
      <PageHeader title={t('transfers.title')} subtitle={…} actions={…} />

      {/* Filter bar */}
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:gap-md">…</div>

      {/* KPI grid (optional) */}
      <Grid cols={3} gap="md">
        <StatCard … />
        <StatCard … />
        <StatCard … />
      </Grid>

      {/* Main content */}
      <Card padding="default">…</Card>
    </div>
  )
}
```

**Rules:**

- **`space-y-lg`** (24px) between page-level sections; never bare numbers.
- **`pb-20 md:pb-6`** reserves space for the mobile bottom nav (80px) and collapses to 24px on desktop where there's no bottom nav.
- Always wrap the page title in `<PageHeader>`. Actions belong in the `actions` slot, not free-floating.
- If the page has a filter bar, it lives *between* the header and the content, always as `flex-col gap-sm sm:flex-row`.

## 2. Filter bars

### 2.1 Shape

```tsx
<div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:gap-md">
  <Input inputSize="md" placeholder={t('search.placeholder')} className="sm:w-80" />
  <DatePicker dateFrom={…} dateTo={…} onChange={…} />
  <Button variant="outline" size="sm" onClick={openFilters} leftContent={<Funnel size={14} />}>
    {t('filters.label')} {activeCount > 0 && <Badge content={activeCount} />}
  </Button>
  <Button variant="borderless" size="sm" onClick={clearAll}>{t('filters.clear')}</Button>
</div>
```

**Rules:**

- **Always `flex-col sm:flex-row`** so filters stack cleanly on phones.
- Search input is always the first filter and should stretch (`flex-1` or `sm:w-80`).
- Date picker uses `DatePicker` (see [components.md](./components.md#datepicker)) — no bespoke date UIs.
- An "advanced filters" Sheet is opened via a `Button` with `Funnel` icon + an optional `<Badge>` showing the active filter count.
- A "Clear" button appears only when at least one filter is active.

### 2.2 Mobile filter drawer

When there are more than ~3 filters, move them into a `Sheet` drawer:

```tsx
<Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>{t('filters.title')}</SheetTitle>
    </SheetHeader>
    <div className="mt-md space-y-md">
      {/* form-style filters */}
    </div>
    <SheetFooter>
      <Button variant="outline" onClick={reset}>{t('filters.reset')}</Button>
      <Button variant="filled" onClick={apply}>{t('filters.apply')}</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

## 3. Responsive tables

Tables are our richest data surface. The DS gives you two patterns:

### 3.1 `cardOnMobile` — the default

Add `cardOnMobile` to `<Table>` and `data-label` to each `<TableCell>`. Below 768px the CSS in [src/styles/index.css:444–497](../../src/styles/index.css#L444-L497) transforms rows into stacked cards where each cell becomes a label/value row.

```tsx
<Table cardOnMobile>
  <TableHeader>
    <TableRow>
      <TableHead>{t('fullName')}</TableHead>
      <TableHead>{t('amount')}</TableHead>
      <TableHead className="text-right">{t('actions')}</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {rows.map((r) => (
      <TableRow key={r.id}>
        <TableCell data-label={t('fullName')}>{r.full_name}</TableCell>
        <TableCell data-label={t('amount')}>{format(r.amount)}</TableCell>
        <TableCell isActions>
          <Button variant="ghost" size="sm">…</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

Notes:
- The **actions cell** gets `isActions` (sets `data-actions=""`); on mobile it becomes a full-width row at the bottom of the card with no label.
- Below 768px the `<thead>` is hidden; above it, rows are normal table rows.
- Cards have `rounded-xl` + `1px border` + subtle press highlight on tap.

### 3.2 Grouped tables

When rows are grouped by date (Transfers, Accounting), render one group block per date with its own header row *outside* the table, then a nested `<Table>` per group:

```tsx
{groups.map((g) => (
  <section key={g.dateKey} className="space-y-xs">
    <header className="flex items-center gap-2 px-1 text-sm font-semibold">
      {g.label} <Tag variant="default">{g.transfers.length}</Tag>
      <span className="ml-auto text-xs text-black/40">
        {runningNetFormatted}
      </span>
    </header>
    <Table cardOnMobile>…</Table>
  </section>
))}
```

### 3.3 Long tables → virtualize

Above a few hundred rows, swap `<TableBody>` for `<VirtualTableBody>`. Keep the same `<Table>` / `<TableRow>` / `<TableCell>` skin.

## 4. Form patterns

### 4.1 Layout

```tsx
<Form onSubmit={handleSubmit(onSubmit)}>
  <Grid cols={2} gap="md">
    <FormField>
      <FormLabel htmlFor="amount">{t('form.amount')}</FormLabel>
      <Input id="amount" inputMode="decimal" {...register('amount')} />
      {errors.amount && <FormMessage>{errors.amount.message}</FormMessage>}
    </FormField>

    <FormField>
      <FormLabel>{t('form.date')}</FormLabel>
      <Controller
        name="date"
        control={control}
        render={({ field }) => <DatePickerField {...field} />}
      />
      {errors.date && <FormMessage>{errors.date.message}</FormMessage>}
    </FormField>
  </Grid>

  <div className="flex justify-end gap-sm">
    <Button variant="outline" type="button" onClick={onCancel}>{t('cancel')}</Button>
    <Button variant="filled" type="submit" disabled={!isValid || isSubmitting}>
      {isSubmitting ? t('saving') : t('save')}
    </Button>
  </div>
</Form>
```

**Rules:**

- **Validation is the feature's job** — use react-hook-form + zod. DS form components don't validate.
- **One FormMessage per field** for error text; show only when the field has an error.
- **Cancel is always `variant="outline"`**, submit is `variant="filled"`.
- Submit button is `disabled` while `isSubmitting || !isValid`.
- Button text changes during submission (`Saving…`, `Verifying…`) — see `ManagerPinDialog.tsx` for a reference.

### 4.2 Floating labels

If a form is super dense, use `Input`'s `title` prop for the floating-label style (see [components.md](./components.md#input)). Don't mix floating and block labels on the same form.

## 5. Dialog patterns

### 5.1 Confirm / destructive

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent size="sm">
    <DialogHeader>
      <DialogTitle>{t('delete.title')}</DialogTitle>
      <DialogDescription>{t('delete.description', { name })}</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={cancel}>{t('cancel')}</Button>
      <Button variant="filled" className="bg-red hover:bg-red/90" onClick={confirm}>
        {t('delete.confirm')}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Rule:** destructive actions override the filled button to `bg-red`. This is the **only** sanctioned override of `variant="filled"`.

### 5.2 Forms-in-dialog

Use `size="lg"` or `size="xl"`. Put the `<Form>` inside `<DialogContent>`. The mobile full-screen behavior + sticky close button means you get a mini-page treatment on phones for free.

### 5.3 Mobile-first detail view

A common pattern: "Daily summary", "Transfer details" — a read-only info panel on mobile, still a modal on desktop. Use `Dialog` (not `Sheet`) — mobile fullscreen is already built in.

## 6. Empty states

Anywhere a list can be empty, render `<EmptyState>` *in place of* the list (not above it):

```tsx
{loading ? (
  <TableSkeleton />
) : rows.length === 0 ? (
  <EmptyState
    icon={Inbox}
    title={t('transfers.emptyTitle')}
    description={activeFilters ? t('transfers.noResults') : t('transfers.empty')}
    action={!activeFilters && <Button variant="filled" onClick={onNew}>{t('transfers.new')}</Button>}
  />
) : (
  <Table cardOnMobile>…</Table>
)}
```

**Rules:**

- When filters are active, show "no results" copy + no CTA (there's nothing to create).
- When there's genuinely no data, show onboarding copy + a creation CTA.
- Always provide a **Phosphor icon** that describes the empty state (Inbox, FolderOpen, MagnifyingGlass, etc.).

## 7. Loading states

### 7.1 Skeletons (first load)

Use `<Skeleton className="h-N w-N" />` for first-load placeholders. Stick to the dimensions of the thing being loaded — don't shrink or skeleton-all-the-things.

### 7.2 Inline spinners (subsequent loads)

When refreshing data (e.g. `isFetching` from react-query but already have `data`), don't swap to a skeleton. Keep the data, dim slightly (`opacity-60`), and show a small spinner in the filter bar or header.

### 7.3 Buttons

`Button` has no built-in loading prop. Pattern:

```tsx
<Button variant="filled" disabled={isPending} onClick={submit}>
  {isPending ? <Spinner size={14} /> : t('save')}
</Button>
```

Where `Spinner` is a feature-level component (there isn't one in the DS yet — add if it becomes a pattern).

## 8. Status colors

When you need to pick a color for status, go through this table rather than inventing:

| Status | Token | `<Tag variant>` | Semantics |
|---|---|---|---|
| Success, confirmed | `--color-green` | `green` | Deposit, paid, active, positive delta |
| Error, destructive | `--color-red` | `red` | Withdrawal, blocked, deleted, negative delta |
| Warning, pending | `--color-yellow` | `yellow` | Pending review, needs attention |
| Info, neutral | `--color-blue` | `blue` | General informational chip |
| Brand accent | `--color-brand` | — (use `bg-brand text-white`) | Primary CTA |
| Deposit | `--color-deposit` | `green` | Chart bars, direction indicator |
| Withdrawal | `--color-withdrawal` | `red` | Chart bars, direction indicator |

**Don't** use `purple`, `indigo`, `mint`, `cyan`, `orange` to mean a status — they're reserved for category differentiation (e.g. distinguishing 7 PSPs in a chart legend).

## 9. Iconography

### 9.1 Library

**Always** `@phosphor-icons/react`. Do not ship SVGs for things Phosphor already has.

### 9.2 Sizes (inline)

| Context | Size |
|---|---|
| Inside `Button size="sm"` | 14 |
| Inside `Button size="md"`, filter bar | 16 |
| Inside `Button size="lg"`, page header | 18 |
| `StatCard` icon | 18 |
| `EmptyState` icon | 20 |
| Sidebar nav icon | 16 |

### 9.3 Weight

Default is `regular`. Use `weight="fill"` to indicate an active/selected state (examples: `DatePicker` calendar icon when a date is selected, sidebar active nav item).

### 9.4 Color

Icons inherit color from parent text via `currentColor`. Apply color through text utilities: `text-black/40` for muted, `text-brand` for active, `text-red` for destructive.

## 10. Numeric formatting

### 10.1 Rule

- Money/amount values: `font-mono tabular-nums` to keep digit alignment across rows.
- Counts, dates, everything else: default font.

```tsx
<span className="font-mono text-sm tabular-nums">{formatNumber(amount, lang)}</span>
```

### 10.2 Locale

Numbers always render via `toLocaleString(toLocale(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 })`. The `formatNumber` helper in `src/pages/transfers/transfersTableUtils.ts:80–86` is the canonical implementation — copy it into new pages if you need the same behavior. (Candidate to promote into `@ds/utils` when used in a third place.)

### 10.3 Sign color

- Positive: `text-green`
- Negative: `text-red`
- Zero / muted: `text-black/50` or `text-black/30`

## 11. Keyboard shortcuts

The DS surfaces exactly one shortcut: `Ctrl/Cmd + B` to toggle the sidebar (in `Sidebar.tsx`). Feature shortcuts are documented in-feature.

**Rule:** if you add a shortcut, render a visible hint (e.g. `<DropdownMenuShortcut>⌘K</DropdownMenuShortcut>`). Don't ship invisible shortcuts.

## 12. Currency & locale

| Locale | Numbers | Dates |
|---|---|---|
| `en` | `en-US` (1,234.56) | "Jan 1, 2026" |
| `tr` | `tr-TR` (1.234,56) | "1 Ocak 2026" |

Date grouping uses `localYMD` from `src/lib/date.ts` to stay in the user's timezone (Europe/Istanbul).

## 13. Don'ts

Things you might be tempted to do but shouldn't:

- **Don't** use `shadow-lg` alone — use `.ui-surface` or compose with `border-black/10`.
- **Don't** use raw `rounded-2xl` for a button — use `size="lg"`.
- **Don't** put a close button in a `Dialog` — it already has one (mobile sticky + desktop absolute).
- **Don't** wrap your own `<table>` when you need a mobile card view — use `cardOnMobile`.
- **Don't** set `z-50` on anything that isn't a Radix-portaled overlay.
- **Don't** gate a feature behind `useIsMobile()` just to change styles — prefer Tailwind's `md:` variants. Use the hook only when a *different component tree* is needed.
- **Don't** import from `@ds/components/X/X.tsx` — always from `@ds`.
- **Don't** render text without `useTranslation()` unless it's a technical identifier.
