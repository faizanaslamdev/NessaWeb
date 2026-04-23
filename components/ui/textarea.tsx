import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const textareaVariants = cva(
  [
    'flex w-full text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'focus-visible:ring-[3px]',
    'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'field-sizing-content min-h-16 rounded-md border border-input bg-transparent px-3 py-2',
          'placeholder:text-muted-foreground dark:bg-input/30',
          'focus-visible:border-ring focus-visible:ring-ring/50',
        ].join(' '),
        landing: [
          'min-h-[120px] resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-gray-500',
          'focus-visible:border-purple-500/50 focus-visible:ring-purple-500/20',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Textarea({
  className,
  variant,
  ...props
}: React.ComponentProps<'textarea'> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }
