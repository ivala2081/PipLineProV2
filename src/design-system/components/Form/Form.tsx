import type { ComponentProps, FC, FormEvent } from 'react'
import { cn } from '@ds/utils'
import { Label } from '../Label'

export type FormProps = ComponentProps<'form'>
export const Form: FC<FormProps> = ({ className, onSubmit, ...props }) => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit?.(e)
  }
  return <form className={cn('space-y-6', className)} onSubmit={handleSubmit} {...props} />
}
Form.displayName = 'Form'

export type FormFieldProps = ComponentProps<'div'>
export const FormField: FC<FormFieldProps> = ({ className, ...props }) => (
  <div className={cn('space-y-2', className)} {...props} />
)
FormField.displayName = 'FormField'

export type FormLabelProps = ComponentProps<typeof Label>
export const FormLabel: FC<FormLabelProps> = ({ className, ...props }) => (
  <Label className={cn('text-sm font-medium text-black', className)} {...props} />
)
FormLabel.displayName = 'FormLabel'

export type FormDescriptionProps = ComponentProps<'p'>
export const FormDescription: FC<FormDescriptionProps> = ({ className, ...props }) => (
  <p className={cn('text-xs text-black/40', className)} {...props} />
)
FormDescription.displayName = 'FormDescription'

export type FormMessageProps = ComponentProps<'p'> & { error?: boolean }
export const FormMessage: FC<FormMessageProps> = ({ className, error = true, ...props }) => (
  <p className={cn('text-xs', error ? 'text-red' : 'text-green', className)} {...props} />
)
FormMessage.displayName = 'FormMessage'
