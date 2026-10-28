import type { Metadata } from 'next'
import Link from 'next/link'

import { MarketingPageShell } from '@/components/landing/marketing-page-shell'
import { siteConfig, siteRoutes } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Request account & data deletion | ${siteConfig.name}`,
  description: `How to delete your ${siteConfig.name} account and associated data.`,
}

export default function RequestDeletionPage() {
  const mailto = `mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent('Account and data deletion request')}`

  return (
    <MarketingPageShell title="Request account & data deletion">
      <p>
        You can request that your {siteConfig.name} account and associated data be deleted at any time. Choose one
        of the options below.
      </p>

      <section className="rounded-2xl border border-n-line bg-n-surface p-5">
        <h2 className="mb-2 text-lg font-semibold text-n-ink">Option 1: In the app (fastest)</h2>
        <p className="text-n-ink-2">
          Open {siteConfig.name} → <strong className="font-semibold text-n-ink">Profile</strong> →{' '}
          <strong className="font-semibold text-n-ink">Settings</strong> → scroll down and tap{' '}
          <strong className="font-semibold text-n-ink">Delete account</strong>. Confirm to permanently delete your account and
          data. This cannot be undone.
        </p>
      </section>

      <section className="rounded-2xl border border-n-line bg-n-surface p-5">
        <h2 className="mb-2 text-lg font-semibold text-n-ink">Option 2: By email</h2>
        <p className="text-n-ink-2">
          If you cannot access the app, send an email with the subject{' '}
          <strong className="font-semibold text-n-ink">Account and data deletion request</strong> and the email address you used
          to sign up. We will process your request in line with our Privacy Policy.
        </p>
        <p className="mt-3">
          <a href={mailto} className="break-all font-medium text-n-accent-strong underline underline-offset-2">
            Request deletion by email ({siteConfig.supportEmail})
          </a>
        </p>
      </section>

      <p className="text-sm text-n-subtle">
        <Link href={siteRoutes.privacyPolicy} className="font-medium text-n-accent-strong underline underline-offset-2">
          Privacy Policy
        </Link>
        {' · '}
        <Link href={siteRoutes.termsOfService} className="font-medium text-n-accent-strong underline underline-offset-2">
          Terms of Service
        </Link>
      </p>
    </MarketingPageShell>
  )
}
