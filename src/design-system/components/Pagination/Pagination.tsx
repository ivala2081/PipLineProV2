import { CaretLeft, CaretRight, DotsThree } from '@phosphor-icons/react'
import type { ComponentProps, FC } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@ds/utils'
import { Button, type ButtonProps } from '../Button'

export type PaginationProps = ComponentProps<'nav'>
export const Pagination: FC<PaginationProps> = ({ className, ...props }) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
)
Pagination.displayName = 'Pagination'

export type PaginationContentProps = ComponentProps<'ul'>
export const PaginationContent: FC<PaginationContentProps> = ({ className, ...props }) => (
  <ul className={cn('flex flex-row items-center gap-1', className)} {...props} />
)
PaginationContent.displayName = 'PaginationContent'

export type PaginationItemProps = ComponentProps<'li'>
export const PaginationItem: FC<PaginationItemProps> = (props) => <li {...props} />
PaginationItem.displayName = 'PaginationItem'

export type PaginationLinkProps = ButtonProps & { isActive?: boolean }
export const PaginationLink: FC<PaginationLinkProps> = ({ className, isActive, ...props }) => (
  <Button
    aria-current={isActive ? 'page' : undefined}
    variant={isActive ? 'filled' : 'borderless'}
    size="sm"
    className={cn('h-8 w-8 p-0', className)}
    {...props}
  />
)
PaginationLink.displayName = 'PaginationLink'

export type PaginationPreviousProps = PaginationLinkProps
export const PaginationPrevious: FC<PaginationPreviousProps> = ({ className, ...props }) => {
  const { t } = useTranslation('components')
  return (
    <PaginationLink
      aria-label={t('pagination.goToPrevious')}
      className={cn('gap-1 pl-2.5', className)}
      {...props}
    >
      <CaretLeft size={16} />
      <span>{t('pagination.previous')}</span>
    </PaginationLink>
  )
}
PaginationPrevious.displayName = 'PaginationPrevious'

export type PaginationNextProps = PaginationLinkProps
export const PaginationNext: FC<PaginationNextProps> = ({ className, ...props }) => {
  const { t } = useTranslation('components')
  return (
    <PaginationLink
      aria-label={t('pagination.goToNext')}
      className={cn('gap-1 pr-2.5', className)}
      {...props}
    >
      <span>{t('pagination.next')}</span>
      <CaretRight size={16} />
    </PaginationLink>
  )
}
PaginationNext.displayName = 'PaginationNext'

export type PaginationEllipsisProps = ComponentProps<'span'>
export const PaginationEllipsis: FC<PaginationEllipsisProps> = ({ className, ...props }) => {
  const { t } = useTranslation('components')
  return (
    <span
      aria-hidden
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      <DotsThree size={16} />
      <span className="sr-only">{t('pagination.morePages')}</span>
    </span>
  )
}
PaginationEllipsis.displayName = 'PaginationEllipsis'
