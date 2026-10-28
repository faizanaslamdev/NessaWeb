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
      <p className="text-n-muted">
        Last updated:{' '}
        {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <p>
        You must use {siteConfig.name} in a lawful and respectful way. By using the app or website you agree to
        this Acceptable Use Policy.
      </p>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">No abuse or harassment</h2>
        <p>
          You may not harass, bully, threaten, or abuse other users. Hate speech, discrimination, and targeted
          abuse are prohibited.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">No illegal activity</h2>
        <p>
          You may not use the service for any illegal purpose or to facilitate illegal activity. This includes
          fraud, impersonation, and distribution of illegal content.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">No harmful content</h2>
        <p>
          You may not share content that exploits minors, promotes violence, or contains non-consensual intimate
          imagery. Spam and deceptive practices are prohibited.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">No circumvention</h2>
        <p>
          You may not bypass security, abuse reporting, or account restrictions. Automated scraping or bulk
          collection of user data is not allowed.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">Consequences</h2>
        <p>
          Violations may result in warnings, temporary or permanent suspension, or termination of your account. We
          may report illegal activity to authorities.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">Reporting</h2>
        <p>
          If you see content or behavior that violates this policy, please report it through the app. We will
          review and take appropriate action.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">Changes</h2>
        <p>We may update this policy. Continued use after changes constitutes acceptance.</p>
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
