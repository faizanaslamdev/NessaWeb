import type { Metadata } from 'next'
import Link from 'next/link'

import { AccountShell } from '@/components/account/account-shell'
import { ResetForm } from '@/components/account/reset-form'
import { accountRoutes } from '@/lib/account/constants'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Reset password | ${siteConfig.name}`,
  robots: { index: false, follow: false },
}

export default function ResetPage() {
  return (
    <AccountShell
      title="Reset your password"
      subtitle="We’ll email you a link to choose a new one."
      footer={
        <Link href={accountRoutes.signIn} className="font-medium text-n-accent-strong hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ResetForm />
    </AccountShell>
  )
}
