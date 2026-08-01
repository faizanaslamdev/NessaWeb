import type { Metadata } from 'next'
import Link from 'next/link'

import { MarketingPageShell } from '@/components/landing/marketing-page-shell'
import { siteConfig, siteRoutes } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Acceptable Use Policy | ${siteConfig.name}`,
  description: `Rules for using ${siteConfig.name} lawfully and respectfully.`,
}

export default function AcceptableUsePage() {
  return (
    <MarketingPageShell title="Acceptable Use Policy">
      <p className="text-gray-400">
        Last updated:{' '}
        {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <p>
        You must use {siteConfig.name} in a lawful and respectful way. By using the app or website you agree to
        this Acceptable Use Policy.
      </p>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">No abuse or harassment</h2>
        <p>
          You may not harass, bully, threaten, or abuse other users. Hate speech, discrimination, and targeted
          abuse are prohibited.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">No illegal activity</h2>
        <p>
          You may not use the service for any illegal purpose or to facilitate illegal activity. This includes
          fraud, impersonation, and distribution of illegal content.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">No harmful content</h2>
        <p>
          You may not share content that exploits minors, promotes violence, or contains non-consensual intimate
          imagery. Spam and deceptive practices are prohibited.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">No circumvention</h2>
        <p>
          You may not bypass security, abuse reporting, or account restrictions. Automated scraping or bulk
          collection of user data is not allowed.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Consequences</h2>
        <p>
          Violations may result in warnings, temporary or permanent suspension, or termination of your account. We
          may report illegal activity to authorities.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Reporting</h2>
        <p>
          If you see content or behavior that violates this policy, please report it through the app. We will
          review and take appropriate action.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Changes</h2>
        <p>We may update this policy. Continued use after changes constitutes acceptance.</p>
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
