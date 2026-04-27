import type { Metadata } from 'next'

import { MarketingPageShell } from '@/components/landing/marketing-page-shell'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Terms of Service | ${siteConfig.name}`,
  description: `Terms governing your use of ${siteConfig.name} services.`,
}

export default function TermsOfServicePage() {
  return (
    <MarketingPageShell title="Terms of Service">
      <p className="text-gray-400">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Agreement</h2>
        <p>
          By accessing or using {siteConfig.name} (&quot;Service&quot;), you agree to these Terms. If you do not
          agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Eligibility &amp; accounts</h2>
        <p>
          You must be able to form a binding contract in your jurisdiction. You are responsible for safeguarding
          your credentials and for activity under your account. Notify us promptly of unauthorized use.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Acceptable use</h2>
        <ul className="list-inside list-disc space-y-2 text-gray-300">
          <li>No illegal, harmful, harassing, or hateful content or conduct.</li>
          <li>No attempts to disrupt, reverse engineer, or overload the Service.</li>
          <li>No scraping or automated access that violates our policies or applicable law.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Content</h2>
        <p>
          You retain rights to content you submit. You grant us a limited license to host, process, and display
          that content solely to operate and improve the Service. We may remove content that violates these Terms or
          the law.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Disclaimers</h2>
        <p>
          The Service is provided &quot;as is&quot; to the fullest extent permitted by law. We disclaim warranties of
          merchantability, fitness for a particular purpose, and non-infringement except where prohibited.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, {siteConfig.name} and its affiliates will not be liable for
          indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or goodwill.
          Our aggregate liability for claims relating to the Service shall not exceed the greater of amounts you paid
          us in the twelve months preceding the claim or fifty dollars (USD), unless applicable law requires otherwise.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Termination</h2>
        <p>
          We may suspend or terminate access for violations of these Terms or to protect users and the Service. You
          may stop using the Service at any time.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Changes</h2>
        <p>
          We may modify these Terms. Continued use after changes constitutes acceptance of the updated Terms. For
          questions, contact{' '}
          <a href={`mailto:${siteConfig.supportEmail}`} className="text-purple-400 underline hover:text-purple-300">
            {siteConfig.supportEmail}
          </a>
          .
        </p>
      </section>
    </MarketingPageShell>
  )
}
