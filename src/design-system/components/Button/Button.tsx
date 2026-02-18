import { cva, type VariantProps } from 'class-variance-authority'
import type { ElementType, JSX } from 'react'
import { cn } from '@ds/utils'
import type { ButtonVariant, PolymorphicProps, Size, TextSize } from '@ds/types'
import { Typography } from '../Text'

const defaultTag = 'button'

const buttonVariants = cva(
  'group transition-colors hover:cursor-pointer disabled:cursor-not-allowed text-black disabled:text-black/10 inline-flex justify-center items-center focus:outline-hidden focus:ring-4 focus:ring-black/10',
  {
    variants: {
      variant: {
        borderless: 'bg-transparent font-normal hover:bg-black/8',
        ghost: 'bg-transparent font-normal hover:bg-black/8',
        gray: 'bg-black/10 hover:bg-black/20 disabled:bg-black/5 focus:ring-offset-2',
        outline:
          'bg-transparent border border-black/20 border-solid hover:bg-black/8 disabled:border-black/10',
        filled:
          'text-white bg-brand hover:bg-brand-hover disabled:bg-black/4',
      },
      size: {
        sm: 'text-sm py-1 px-2 rounded-lg gap-1',
        md: 'text-base py-2 px-4 rounded-xl gap-2',
        lg: 'text-lg py-3 px-6 rounded-2xl gap-2',
      },
    },
    defaultVariants: {
      variant: 'borderless',
      size: 'sm',
    },
  },
)

const iconButtonPaddings: Record<Size, string> = {
  sm: 'p-1',
  md: 'p-2',
  lg: 'p-4',
}

export type ButtonProps<C extends ElementType = typeof defaultTag> =
  PolymorphicProps<C> &
    VariantProps<typeof buttonVariants> & {
      as?: C
      label?: string
      leftContent?: JSX.Element
      rightContent?: JSX.Element
      textSize?: TextSize
      variant?: ButtonVariant
    }

export function Button<C extends ElementType = typeof defaultTag>({
  as,
  className,
  label,
  leftContent,
  rightContent,
  size,
  textSize = 16,
  variant,
  children,
  ...props
}: ButtonProps<C>): JSX.Element {
  const Component = as ?? defaultTag
  const isIconOnly = !label && !children

  return (
    <Component
      className={cn(
        buttonVariants({ variant, size }),
        isIconOnly && size && iconButtonPaddings[size],
        className,
      )}
      {...props}
    >
      {leftContent}
      {label && (
        <Typography size={textSize} semibold>
          {label}
        </Typography>
      )}
      {children}
      {rightContent}
    </Component>
  )
}

Button.displayName = 'Button'

export { buttonVariants }
