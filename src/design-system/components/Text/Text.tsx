import { cva, type VariantProps } from 'class-variance-authority'
import type { ElementType, ReactNode } from 'react'
import { cn } from '@ds/utils'
import type { PolymorphicProps, TextSize } from '@ds/types'

const defaultTag = 'span'

const textStyles = cva(['font-normal transition-all'], {
  variants: {
    size: {
      64: 'text-[4rem] leading-[4.875rem]',
      48: 'text-[3rem] leading-[3.625rem]',
      32: 'text-[2rem] leading-[2.5rem]',
      24: 'text-2xl',
      18: 'text-lg',
      16: 'text-base',
      14: 'text-sm',
      12: 'text-xs',
      default: 'text-base',
    },
    semibold: {
      true: 'font-semibold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
    italic: {
      true: 'italic',
    },
    underline: {
      true: 'underline',
    },
  },
  defaultVariants: {
    align: 'left',
  },
})

export type TextProps<C extends ElementType = typeof defaultTag> =
  PolymorphicProps<C> &
    VariantProps<typeof textStyles> & {
      size?: TextSize
    }

export function Typography<C extends ElementType = typeof defaultTag>({
  as,
  size,
  semibold,
  align,
  italic,
  underline,
  className,
  children,
  ...props
}: TextProps<C>): ReactNode {
  const Component = as ?? defaultTag

  return (
    <Component
      className={cn(textStyles({ size: size ?? 'default', semibold, align, italic, underline }), className)}
      {...props}
    >
      {children}
    </Component>
  )
}

Typography.displayName = 'Typography'
