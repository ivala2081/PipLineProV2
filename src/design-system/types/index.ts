import type {
  ComponentPropsWithoutRef,
  ElementType,
  JSX,
  PropsWithChildren,
} from 'react'

/* ------------------------------------------------------------------ */
/*  Polymorphic component helpers                                     */
/* ------------------------------------------------------------------ */

export type PolymorphicAsProp<E extends ElementType> = { as?: E }

export type PolymorphicProps<E extends ElementType> = PropsWithChildren<
  ComponentPropsWithoutRef<E> & PolymorphicAsProp<E>
>

/* ------------------------------------------------------------------ */
/*  Sizes                                                             */
/* ------------------------------------------------------------------ */

export type SimpleSize = 'sm' | 'lg'
export type Size = 'sm' | 'md' | 'lg'
export type TextSize = 12 | 14 | 16 | 18 | 24 | 32 | 48 | 64

/* ------------------------------------------------------------------ */
/*  Variants                                                          */
/* ------------------------------------------------------------------ */

export type ButtonVariant = 'borderless' | 'ghost' | 'gray' | 'outline' | 'filled'
export type ToggleVariant = 'borderless' | 'outline'

/* ------------------------------------------------------------------ */
/*  Status                                                            */
/* ------------------------------------------------------------------ */

export type StatusNotify = 'success' | 'error'
export type Status = StatusNotify | 'progress'
export type StatusExpanded = StatusNotify | 'warning' | 'default' | 'info'

/* ------------------------------------------------------------------ */
/*  Direction                                                         */
/* ------------------------------------------------------------------ */

export type Direction = 'horizontal' | 'vertical'

/* ------------------------------------------------------------------ */
/*  Navigation                                                        */
/* ------------------------------------------------------------------ */

export type BreadcrumbItem = {
  label: string
  id: string
  active?: boolean
  href?: string
  disabled?: boolean
}

export type NavigationItem = {
  label: string
  id: string
  items?: NavigationItem[]
  icon?: JSX.Element
}

export type ModifiedNavigationItem = NavigationItem & {
  expanded?: boolean
  active?: boolean
}

/* ------------------------------------------------------------------ */
/*  Generic utility types                                             */
/* ------------------------------------------------------------------ */

export type PickAndPartialOmit<T, K extends keyof T> = Pick<T, K> &
  Partial<Omit<T, K>>
