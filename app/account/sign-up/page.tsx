import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'

import { AccountShell } from '@/components/account/account-shell'
import { SignUpForm } from '@/components/account/sign-up-form'
import { accountRoutes } from '@/lib/account/constants'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Create account | ${siteConfig.name}`,
  robots: { index: false, follow: false },
}

export default function SignUpPage() {
  return (
    <AccountShell
      title="Create your account"
      subtitle="For business owners managing their place on Nessa."
      footer={
        <>
          Already have an account?{' '}
          <Link href={accountRoutes.signIn} className="font-medium text-n-accent-strong hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <SignUpForm />
      </Suspense>
    </AccountShell>
  )
}
