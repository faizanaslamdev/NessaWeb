import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'

import { AccountShell } from '@/components/account/account-shell'
import { SignInForm } from '@/components/account/sign-in-form'
import { accountRoutes } from '@/lib/account/constants'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Sign in | ${siteConfig.name}`,
  robots: { index: false, follow: false },
}

export default function SignInPage() {
  return (
    <AccountShell
      title="Sign in"
      subtitle="Use the same email and password as the Nessa app."
      footer={
        <>
          New to Nessa?{' '}
          <Link href={accountRoutes.signUp} className="font-medium text-n-accent-strong hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AccountShell>
  )
}
