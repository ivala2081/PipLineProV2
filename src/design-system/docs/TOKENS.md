# Design Tokens Reference

Based on **SnowUI / ByeWind Design System**.

## Colors

### Theme-aware (swap automatically in light/dark mode)

| Token          | Light                    | Dark                     | Tailwind class      |
|----------------|--------------------------|--------------------------|---------------------|
| `black`        | `rgb(0, 0, 0)`          | `rgb(255, 255, 255)`    | `text-black`        |
| `white`        | `rgb(255, 255, 255)`    | `rgb(0, 0, 0)`          | `text-white`        |
| `brand`        | `rgb(0, 0, 0)`          | `rgb(159, 159, 248)`    | `bg-brand`          |
| `brand-hover`  | `rgb(102, 102, 102)`    | `rgb(95, 95, 149)`      | `bg-brand-hover`    |
| `bg1`          | `rgb(255, 255, 255)`    | `rgb(42, 42, 42)`       | `bg-bg1`            |
| `bg2`          | `rgb(249, 249, 250)`    | `rgb(255, 255, 255)`    | `bg-bg2`            |
| `bg5`          | `rgb(255, 255, 255)`    | `rgb(229, 229, 229)`    | `bg-bg5`            |

### Static colors (same in both modes)

| Token    | Value                     | Tailwind class |
|----------|---------------------------|----------------|
| `purple` | `rgba(201, 179, 237, 1)` | `bg-purple`    |
| `indigo` | `rgba(159, 159, 248, 1)` | `bg-indigo`    |
| `blue`   | `rgba(146, 191, 255, 1)` | `bg-blue`      |
| `cyan`   | `rgba(174, 199, 237, 1)` | `bg-cyan`      |
| `mint`   | `rgba(150, 226, 214, 1)` | `bg-mint`      |
| `green`  | `rgba(148, 233, 184, 1)` | `bg-green`     |
| `yellow` | `rgba(255, 219, 86, 1)`  | `bg-yellow`    |
| `orange` | `rgba(255, 181, 91, 1)`  | `bg-orange`    |
| `red`    | `rgba(255, 71, 71, 1)`   | `bg-red`       |
| `bg3`    | `rgba(230, 241, 253, 1)` | `bg-bg3`       |
| `bg4`    | `rgba(237, 238, 252, 1)` | `bg-bg4`       |

### Opacity scales

Use Tailwind syntax: `text-black/80`, `bg-white/10`, etc.

Available levels: 100%, 80%, 40%, 20%, 10%, 5%, 4%

## Typography

- **Font family:** Inter, sans-serif
- **Tailwind:** `font-normal`

| Size | Weight   | Tailwind                              |
|------|----------|---------------------------------------|
| 12px | Regular  | `text-xs`                             |
| 12px | Semibold | `text-xs font-semibold`               |
| 14px | Regular  | `text-sm`                             |
| 14px | Semibold | `text-sm font-semibold`               |
| 16px | Regular  | `text-base`                           |
| 18px | Regular  | `text-lg`                             |
| 18px | Semibold | `text-lg font-semibold`               |
| 24px | Regular  | `text-2xl`                            |
| 24px | Semibold | `text-2xl font-semibold`              |
| 32px | Semibold | `text-[2rem] leading-[2.5rem] font-semibold` |
| 48px | Semibold | `text-[3rem] leading-[3.625rem] font-semibold` |
| 64px | Semibold | `text-[4rem] leading-[4.875rem] font-semibold` |

## Spacing

All values are multiples of 4. Keep under 16 values.

| Token | Value | Tailwind |
|-------|-------|----------|
| 0     | 0px   | `p-0`    |
| 4     | 4px   | `p-1`    |
| 8     | 8px   | `p-2`    |
| 12    | 12px  | `p-3`    |
| 16    | 16px  | `p-4`    |
| 20    | 20px  | `p-5`    |
| 24    | 24px  | `p-6`    |
| 28    | 28px  | `p-7`    |
| 32    | 32px  | `p-8`    |
| 40    | 40px  | `p-10`   |
| 48    | 48px  | `p-12`   |
| 80    | 80px  | `p-20`   |

## Border Radius

Same scale as spacing.

| Semantic | Value  | Tailwind       |
|----------|--------|----------------|
| none     | 0      | `rounded-none` |
| sm       | 8px    | `rounded-lg`   |
| md       | 12px   | `rounded-xl`   |
| lg       | 16px   | `rounded-2xl`  |
| xl       | 24px   | `rounded-3xl`  |
| full     | 9999px | `rounded-full` |

## Effects

| Effect          | Value       |
|-----------------|-------------|
| Background blur | `blur(20px)` |

## Animations

Duration: 300ms, Easing: ease-out

Available: accordion-down, accordion-up, animate-in, animate-out,
slide-in-from-{top,right,bottom,left}, slide-out-to-{top,right,bottom,left},
zoom-in-95, zoom-out-95
