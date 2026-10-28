import type { Metadata } from 'next'

import { MarketingPageShell } from '@/components/landing/marketing-page-shell'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Cookie Policy | ${siteConfig.name}`,
  description: `How ${siteConfig.name} uses cookies and similar technologies on the web.`,
}

export default function CookiePolicyPage() {
  return (
    <MarketingPageShell title="Cookie Policy">
      <p className="text-n-muted">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">What are cookies?</h2>
        <p>
          Cookies are small text files stored on your device. We also use similar technologies (e.g. local storage)
          where needed for authentication, preferences, or analytics on our website and web apps.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">How we use them</h2>
        <ul className="list-inside list-disc space-y-2 text-n-ink-2">
          <li>
            <strong className="text-n-ink">Essential:</strong> session and security cookies required to log you
            in, protect forms, and maintain Instant Chat sessions.
          </li>
          <li>
            <strong className="text-n-ink">Preferences:</strong> remember language or UI choices where we offer
            them on the web.
          </li>
          <li>
            <strong className="text-n-ink">Analytics (optional):</strong> aggregated usage to improve performance
            and reliability—we aim to minimize personally identifiable data.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">Third parties</h2>
        <p>
          Our authentication and cloud providers may set their own cookies as part of delivering the Service (for
          example Firebase / Google identity flows). Their use is governed by their respective policies.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">Your controls</h2>
        <p>
          Most browsers let you block or delete cookies. Blocking essential cookies may prevent parts of{' '}
          {siteConfig.name} from working. You can also use private browsing modes for a fresh session without
          retained cookies.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[20px] font-semibold tracking-[-0.015em] text-n-ink">Updates</h2>
        <p>
          We may update this Cookie Policy when our practices change. Check this page periodically. Questions?{' '}
          <a href={`mailto:${siteConfig.supportEmail}`} className="font-medium text-n-accent-strong underline underline-offset-2">
            {siteConfig.supportEmail}
          </a>
        </p>
      </section>
    </MarketingPageShell>
  )
}
