import type { Metadata } from 'next'

import { AboutAnimatedSections } from '@/components/landing/about-animated-sections'
import { MarketingPageShell } from '@/components/landing/marketing-page-shell'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `About | ${siteConfig.name}`,
  description: `${siteConfig.name} — ${siteConfig.tagline}`,
}

export default function AboutPage() {
  return (
    <MarketingPageShell title={`About ${siteConfig.name}`}>
      <p className="text-lg font-medium text-gray-200">{siteConfig.tagline}</p>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Our mission</h2>
        <p>
          {siteConfig.name} exists so people can communicate without friction—across languages, devices, and contexts.
          Whether you drop into a temporary Instant Chat or stay in touch long-term in the app, we focus on clarity,
          speed, and respect for your time.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">What we believe</h2>
        <p className="mb-2">
          Scroll-driven cards below highlight how we think about product and trust—aligned with the same motion and
          visual language as our landing experience.
        </p>
        <AboutAnimatedSections />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-white">Contact</h2>
        <p>
          We&apos;d love to hear from you:{' '}
          <a href={`mailto:${siteConfig.supportEmail}`} className="text-purple-400 underline hover:text-purple-300">
            {siteConfig.supportEmail}
          </a>
        </p>
      </section>
    </MarketingPageShell>
  )
}
