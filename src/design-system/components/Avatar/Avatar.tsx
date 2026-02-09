import * as AvatarPrimitive from '@radix-ui/react-avatar'
import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export type AvatarProps = ComponentProps<typeof AvatarPrimitive.Root>

export const Avatar: FC<AvatarProps> = ({ className, ...props }) => (
  <AvatarPrimitive.Root
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className,
    )}
    {...props}
  />
)
Avatar.displayName = 'Avatar'

export type AvatarImageProps = ComponentProps<typeof AvatarPrimitive.Image>

export const AvatarImage: FC<AvatarImageProps> = ({ className, ...props }) => (
  <AvatarPrimitive.Image
    className={cn('aspect-square h-full w-full', className)}
    {...props}
  />
)
AvatarImage.displayName = 'AvatarImage'

export type AvatarFallbackProps = ComponentProps<typeof AvatarPrimitive.Fallback>

export const AvatarFallback: FC<AvatarFallbackProps> = ({
  className,
  ...props
}) => (
  <AvatarPrimitive.Fallback
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full bg-black/5 text-sm font-medium text-black/60',
      className,
    )}
    {...props}
  />
)
AvatarFallback.displayName = 'AvatarFallback'
