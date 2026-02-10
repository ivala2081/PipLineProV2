'use client'

import { type ComponentProps, type FC, useState } from 'react'
import { cn } from '@ds/utils'
import { Label } from '../Label'

export const basicInputClasses =
  'peer rounded-2xl px-5 py-4 text-black transition-all bg-bg2/75 inset-ring inset-ring-black/15 placeholder:text-black/45 hover:bg-bg2/90 hover:inset-ring-black/30'

export const disabledInputClasses =
  'disabled:cursor-not-allowed disabled:bg-bg2/45 disabled:text-black/35 disabled:inset-ring-black/8'

export const focusInputClasses =
  'text-lg focus:outline-none focus:ring-4 focus:ring-brand/20 focus:inset-ring-brand/55 active:inset-ring-brand/45'

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
          className="absolute left-5 top-1 text-xs text-black/55 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1 peer-focus:text-xs"
        >
          {title}
        </Label>
      )}
    </div>
  )
}

Input.displayName = 'Input'
