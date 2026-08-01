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

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-2 text-lg font-semibold text-white">Option 1: In the app (fastest)</h2>
        <p className="text-gray-300">
          Open {siteConfig.name} → <strong className="text-white">Profile</strong> →{' '}
          <strong className="text-white">Settings</strong> → scroll down and tap{' '}
          <strong className="text-white">Delete account</strong>. Confirm to permanently delete your account and
          data. This cannot be undone.
        </p>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-2 text-lg font-semibold text-white">Option 2: By email</h2>
        <p className="text-gray-300">
          If you cannot access the app, send an email with the subject{' '}
          <strong className="text-white">Account and data deletion request</strong> and the email address you used
          to sign up. We will process your request in line with our Privacy Policy.
        </p>
        <p className="mt-3">
          <a href={mailto} className="break-all text-violet-400 underline hover:text-violet-300">
            Request deletion by email ({siteConfig.supportEmail})
          </a>
        </p>
      </section>

      <p className="text-sm text-gray-500">
        <Link href={siteRoutes.privacyPolicy} className="text-violet-400 underline hover:text-violet-300">
          Privacy Policy
        </Link>
        {' · '}
        <Link href={siteRoutes.termsOfService} className="text-violet-400 underline hover:text-violet-300">
          Terms of Service
        </Link>
      </p>
    </MarketingPageShell>
  )
}
