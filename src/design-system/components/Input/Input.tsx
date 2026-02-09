'use client'

import { type ComponentProps, type FC, useState } from 'react'
import { cn } from '@ds/utils'
import { Label } from '../Label'

export const basicInputClasses =
  'peer py-4 px-5 transition-all rounded-2xl bg-white/80 inset-ring inset-ring-black/10 placeholder:text-black/20 hover:inset-ring-black/40 text-black/100'

export const disabledInputClasses =
  'disabled:bg-black/5 disabled:text-black/10 disabled:inset-ring-0 disabled:cursor-not-allowed'

export const focusInputClasses =
  'text-lg focus:ring-4 focus:ring-black/5 focus:outline-none active:inset-ring-black/40 focus:inset-ring-black/40'

export type InputProps = ComponentProps<'input'> & {
  title?: string
}

export const Input: FC<InputProps> = ({
  className,
  value: clientValue,
  defaultValue,
  id,
  title,
  placeholder,
  onChange,
  ref,
  ...props
}) => {
  const [value, setInputValue] = useState(clientValue)
  const changeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value)
    if (onChange) {
      onChange(event)
    }
  }

  return (
    <div className="relative w-full">
      <input
        ref={ref}
        id={id}
        className={cn(
          basicInputClasses,
          disabledInputClasses,
          focusInputClasses,
          'w-full',
          className,
        )}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={changeHandler}
        {...props}
      />
      {title && (
        <Label
          htmlFor={id}
          className="absolute left-5 top-1 text-xs text-black/40 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs"
        >
          {title}
        </Label>
      )}
    </div>
  )
}

Input.displayName = 'Input'
