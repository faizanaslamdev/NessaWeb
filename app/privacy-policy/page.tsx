import type { Metadata } from 'next'

import { MarketingPageShell } from '@/components/landing/marketing-page-shell'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `Privacy Policy | ${siteConfig.name}`,
  description: `How ${siteConfig.name} collects, uses, and protects your information.`,
}

export default function PrivacyPolicyPage() {
  return (
    <MarketingPageShell title="Privacy Policy">
      <p className="text-gray-400">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Introduction</h2>
        <p>
          {siteConfig.name} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy. This policy
          describes how we handle information when you use our website, web-based Instant Chat, and related
          services. For app-specific practices, refer to the same principles in our mobile applications.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Information we collect</h2>
        <ul className="list-inside list-disc space-y-2 text-gray-300">
          <li>
            <strong className="text-gray-200">Account &amp; profile:</strong> when you register, we may collect
            display name, email, language preferences, and profile details you choose to provide.
          </li>
          <li>
            <strong className="text-gray-200">Messages &amp; content:</strong> message text, attachments, and
            metadata needed to deliver chat, translation, and moderation features.
          </li>
          <li>
            <strong className="text-gray-200">Instant Chat (web):</strong> ephemeral sessions may use anonymous
            authentication; we still process messages and session data required to operate the room.
          </li>
          <li>
            <strong className="text-gray-200">Technical data:</strong> device type, approximate region, IP address,
            cookies or similar technologies, and diagnostic logs to keep the service secure and reliable.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">How we use information</h2>
        <p>We use data to provide, improve, and secure our services, including to:</p>
        <ul className="mt-2 list-inside list-disc space-y-2 text-gray-300">
          <li>Deliver messages, calls, translations, and notifications you request.</li>
          <li>Maintain safety, prevent abuse, and comply with legal obligations.</li>
          <li>Analyze aggregated usage to improve performance and user experience.</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Sharing &amp; processors</h2>
        <p>
          We use trusted infrastructure providers (for example cloud hosting and authentication). They process data
          only on our instructions and under appropriate agreements. We do not sell your personal messages.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Security</h2>
        <p>
          We apply industry-standard safeguards including encryption in transit, access controls, and monitoring.
          No method of transmission over the Internet is 100% secure; we work continuously to reduce risk.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Your choices</h2>
        <p>
          Where applicable, you may access, update, or delete certain account information in the app. You can
          delete your account under Settings → Delete account, or use our{' '}
          <a href="/request-deletion" className="text-purple-400 underline hover:text-purple-300">
            account &amp; data deletion request page
          </a>
          . You can control cookies through your browser. Contact us at{' '}
          <a href={`mailto:${siteConfig.supportEmail}`} className="text-purple-400 underline hover:text-purple-300">
            {siteConfig.supportEmail}
          </a>{' '}
          for privacy-related requests.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Changes</h2>
        <p>
          We may update this policy from time to time. Material changes will be reflected on this page with an
          updated date.
        </p>
      </section>
    </MarketingPageShell>
  )
}
