import type { Metadata } from 'next'
import { Suspense } from 'react'

import { AccountShell } from '@/components/account/account-shell'
import { AuthSwitchLink } from '@/components/account/auth-switch-link'
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
      aside
      title="Create your account"
      subtitle="One account for the NessaChat app and website."
      footer={
        <>
          Already have an account?{' '}
          <Suspense fallback={null}>
            <AuthSwitchLink href={accountRoutes.signIn}>Sign in</AuthSwitchLink>
          </Suspense>
        </>
      }
    >
      <Suspense fallback={null}>
        <SignUpForm />
      </Suspense>
    </AccountShell>
  )
}
