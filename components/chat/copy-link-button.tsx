 'use client'
 
 import { useState } from 'react'
 import { Button } from '@/components/ui/button'
 
 type CopyLinkButtonProps = {
   textToCopy: string
  label?: string
  copiedLabel?: string
  styleVariant?: 'gradient' | 'outline'
   /** Optional callback (e.g. show toast) */
   onCopied?: (ok: boolean) => void
   /** Button sizing should match existing usage */
   size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
   className?: string
 }
 
 async function copyText(text: string): Promise<boolean> {
   try {
     if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
       await navigator.clipboard.writeText(text)
       return true
     }
   } catch {
     // fall through
   }
 
   try {
     if (typeof document === 'undefined') return false
     const ta = document.createElement('textarea')
     ta.value = text
     ta.setAttribute('readonly', '')
     ta.style.position = 'fixed'
     ta.style.left = '-9999px'
     ta.style.top = '-9999px'
     document.body.appendChild(ta)
     ta.select()
     const ok = document.execCommand('copy')
     document.body.removeChild(ta)
     return ok
   } catch {
     return false
   }
 }
 
 export default function CopyLinkButton({
   textToCopy,
  label = 'Copy Link',
  copiedLabel = '✓ Copied',
  styleVariant = 'gradient',
   onCopied,
   size = 'sm',
   className,
 }: CopyLinkButtonProps) {
   const [copied, setCopied] = useState(false)
 
   const handleCopy = async () => {
     const ok = await copyText(textToCopy)
     onCopied?.(ok)
     if (!ok) return
     setCopied(true)
     setTimeout(() => setCopied(false), 1600)
   }
 
   return (
     <Button
       onClick={handleCopy}
       size={size}
      variant={styleVariant === 'outline' ? 'outline' : 'default'}
       className={[
        styleVariant === 'outline'
          ? 'border-white/20 text-white hover:bg-white/10 font-medium'
          : 'bg-linear-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium',
         className,
       ]
         .filter(Boolean)
         .join(' ')}
     >
      {copied ? copiedLabel : label}
     </Button>
   )
 }
