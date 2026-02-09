import type { ComponentProps, FC } from 'react'
import { cn } from '@ds/utils'

export type SkeletonProps = ComponentProps<'div'>

export const Skeleton: FC<SkeletonProps> = ({ className, ...props }) => (
  <div
    className={cn('animate-pulse rounded-md bg-black/5', className)}
    {...props}
  />
)

Skeleton.displayName = 'Skeleton'
