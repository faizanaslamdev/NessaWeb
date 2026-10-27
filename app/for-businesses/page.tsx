import type { Metadata } from 'next'
import Link from 'next/link'

import { MarketingPageShell } from '@/components/landing/marketing-page-shell'
import { accountRoutes } from '@/lib/account/constants'
import { siteConfig } from '@/lib/constants'

export const metadata: Metadata = {
  title: `For businesses | ${siteConfig.name}`,
  description: `Claim your place on ${siteConfig.name}: official details, a verified badge, your live chat, QR codes for every spot and simple stats.`,
  alternates: { canonical: 'https://www.nessachat.com/for-businesses' },
}

const FEATURES: { title: string; body: string }[] = [
  {
    title: 'Verified page and official details',
    body: 'Your place shows a Verified badge with your website, phone, WhatsApp, hours, check-in times, amenities and the languages your team speaks.',
  },
  {
    title: 'Your live chat',
    body: 'Guests and travellers chat in your place’s live chat. Pin a welcome message, and your messages are labelled as the business.',
  },
  {
    title: 'QR codes for every spot',
    body: 'Print a QR for reception, tables or rooms. Each spot is counted separately, so you see which ones guests actually use.',
  },
  {
    title: 'Pre-arrival links and Wi-Fi',
    body: 'Send guests your page and chat before they arrive, and share your Wi-Fi on the page so nobody has to ask.',
  },
  {
    title: 'Simple stats',
    body: 'Page visits, chat joins and where guests come from over the last 7 and 30 days. Counts only — no personal data.',
  },
  {
    title: 'Your team',
    body: 'Invite managers by email for the places you choose. You stay the owner; you can change or remove their access any time.',
  },
]

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Open your place’s page on Nessa',
    body: 'From the Nessa app, a link someone shared, or a Nessa QR code. Pages look like nessachat.com/places/your-place.',
  },
  {
    title: 'Tap “Claim this place”',
    body: 'It’s at the bottom of the page. Sign in, or create a free account with your work email and verify it.',
  },
  {
    title: 'Nessa verifies you',
    body: 'We check every claim by hand, usually by email or phone. Once approved, your page shows Verified and your business tools open.',
  },
]

export default function ForBusinessesPage() {
  return (
    <MarketingPageShell title="Run your place on Nessa">
      <p className="text-lg text-gray-200">
        Travellers find places on {siteConfig.name}, recommend them, share Stories and talk in each place’s live chat. Claim your place to
        answer as the business and keep its details right.
      </p>

      <div className="flex flex-wrap gap-3">
        <Link
          href={accountRoutes.business}
          className="inline-flex items-center rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-violet-500"
        >
          Sign in to your business tools
        </Link>
        <a
          href={`mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent('My place on Nessa')}`}
          className="inline-flex items-center rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-white/5"
        >
          Can’t find your place? Email us
        </a>
      </div>

      <section aria-labelledby="what-you-get">
        <h2 id="what-you-get" className="mb-4 text-xl font-semibold text-white">
          What you get
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {FEATURES.map(f => (
            <li key={f.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-semibold text-white">{f.title}</p>
              <p className="mt-1 text-sm text-gray-400">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-to-claim">
        <h2 id="how-to-claim" className="mb-4 text-xl font-semibold text-white">
          How claiming works
        </h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <span>
                <span className="block font-semibold text-white">{s.title}</span>
                <span className="block text-sm text-gray-400">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="managers">
        <h2 id="managers" className="mb-3 text-xl font-semibold text-white">
          Managing a place for its owner?
        </h2>
        <p>
          Ask the owner to claim the place and invite you from <span className="text-white">Team</span> in their business tools. You’ll get
          a link to accept with your own account — no shared passwords.
        </p>
      </section>
    </MarketingPageShell>
  )
}
