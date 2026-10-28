'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

/** Sign in ⇄ sign up link that keeps `?next=` so people land where they were going. */
export function AuthSwitchLink({ href, children }: { href: string; children: React.ReactNode }) {
  const params = useSearchParams()
  const next = params.get('next')
  return (
    <Link href={next ? `${href}?next=${encodeURIComponent(next)}` : href} className="font-medium text-n-accent-strong hover:underline">
      {children}
    </Link>
  )
}
