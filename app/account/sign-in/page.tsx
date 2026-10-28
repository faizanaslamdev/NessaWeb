import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AccountShell } from '@/components/account/account-shell'
import { AuthSwitchLink } from '@/components/account/auth-switch-link'
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
      aside
      title="Sign in"
      subtitle="Use the same email and password as the Nessa app."
      footer={
        <>
          New to Nessa?{' '}
          <Suspense fallback={null}>
            <AuthSwitchLink href={accountRoutes.signUp}>Create an account</AuthSwitchLink>
          </Suspense>
        </>
      }
    >
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </AccountShell>
  )
}
