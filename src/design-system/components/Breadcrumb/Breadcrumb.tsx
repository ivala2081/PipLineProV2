import { CaretRight } from '@phosphor-icons/react'
import type { ComponentProps, FC, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@ds/utils'

export type BreadcrumbProps = ComponentProps<'nav'>
export const Breadcrumb: FC<BreadcrumbProps> = ({ className, ...props }) => (
  <nav aria-label="breadcrumb" className={className} {...props} />
)
Breadcrumb.displayName = 'Breadcrumb'

export type BreadcrumbListProps = ComponentProps<'ol'>
export const BreadcrumbList: FC<BreadcrumbListProps> = ({ className, ...props }) => (
  <ol
    className={cn(
      'flex flex-wrap items-center gap-1.5 break-words text-sm text-black/40 sm:gap-2.5',
      className,
    )}
    {...props}
  />
)
BreadcrumbList.displayName = 'BreadcrumbList'

export type BreadcrumbItemProps = ComponentProps<'li'>
export const BreadcrumbItem: FC<BreadcrumbItemProps> = ({ className, ...props }) => (
  <li className={cn('inline-flex items-center gap-1.5', className)} {...props} />
)
BreadcrumbItem.displayName = 'BreadcrumbItem'

export type BreadcrumbLinkProps = ComponentProps<'a'> & { asChild?: boolean }
export const BreadcrumbLink: FC<BreadcrumbLinkProps> = ({ className, ...props }) => (
  <a className={cn('transition-colors hover:text-black', className)} {...props} />
)
BreadcrumbLink.displayName = 'BreadcrumbLink'

export type BreadcrumbPageProps = ComponentProps<'span'>
export const BreadcrumbPage: FC<BreadcrumbPageProps> = ({ className, ...props }) => (
  <span
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn('font-normal text-black', className)}
    {...props}
  />
)
BreadcrumbPage.displayName = 'BreadcrumbPage'

export type BreadcrumbSeparatorProps = ComponentProps<'li'> & { children?: ReactNode }
export const BreadcrumbSeparator: FC<BreadcrumbSeparatorProps> = ({
  children,
  className,
  ...props
}) => (
  <li role="presentation" aria-hidden="true" className={cn('[&>svg]:h-3.5 [&>svg]:w-3.5', className)} {...props}>
    {children ?? <CaretRight />}
  </li>
)
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator'

export type BreadcrumbEllipsisProps = ComponentProps<'span'>
export const BreadcrumbEllipsis: FC<BreadcrumbEllipsisProps> = ({ className, ...props }) => {
  const { t } = useTranslation('components')
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn('flex h-9 w-9 items-center justify-center', className)}
      {...props}
    >
      &#8230;
      <span className="sr-only">{t('breadcrumb.more')}</span>
    </span>
  )
}
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis'
