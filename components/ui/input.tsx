import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const inputVariants = cva(
  [
    'file:text-foreground selection:bg-primary selection:text-primary-foreground w-full min-w-0 border text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm',
    'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    'focus-visible:ring-[3px]',
    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'placeholder:text-muted-foreground rounded-md border-input bg-transparent px-3 py-1 dark:bg-input/30',
          'focus-visible:border-ring focus-visible:ring-ring/50',
        ].join(' '),
        landing: [
          'rounded-lg border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-gray-500',
          'focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20',
        ].join(' '),
      },
      /** Avoid name `size` — conflicts with native HTML input `size`. */
      inputSize: {
        default: 'h-9',
        lg: 'h-auto min-h-11 py-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  },
)

function Input({
  className,
  type,
  variant,
  inputSize,
  ...props
}: React.ComponentProps<'input'> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, inputSize }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants }
