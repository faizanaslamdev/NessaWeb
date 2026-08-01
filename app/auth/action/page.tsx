import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AuthActionClient } from '@/components/auth/auth-action-client'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Account action | ${siteConfig.name}`,
  description: 'Complete a secure account action for NessaChat.',
  robots: { index: false, follow: false },
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-sm text-gray-400">
          Loading…
        </div>
      }
    >
      <AuthActionClient />
    </Suspense>
  )
}
