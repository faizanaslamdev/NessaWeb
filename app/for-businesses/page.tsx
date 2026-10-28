import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'

import { Icon, type IconName } from '@/components/dash/icons'
import { FindYourPlace } from '@/components/site/find-your-place'
import { SiteShell } from '@/components/site/site-shell'
import { Container, Eyebrow, SectionHeading, SiteButton } from '@/components/site/ui'
import { accountRoutes } from '@/lib/account/constants'
import { siteConfig } from '@/lib/constants'
import { getPlaceDirectory } from '@/lib/place-directory-server'
import { PLACE_PUBLIC_ORIGIN } from '@/lib/place-slug'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'For businesses — claim your place | NessaChat',
  description:
    'Claim your hotel, hostel, café, restaurant or school on NessaChat for free: a verified page, your own live chat with guests, QR codes for every spot and simple stats.',
  alternates: { canonical: `${PLACE_PUBLIC_ORIGIN}/for-businesses` },
  openGraph: {
    title: 'Claim your place on NessaChat — free',
    description: 'A verified page, your own live chat with guests, QR codes for every spot and simple stats.',
    url: `${PLACE_PUBLIC_ORIGIN}/for-businesses`,
    siteName: 'NessaChat',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'NessaChat for businesses' }],
  },
}

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'badge-check',
    title: 'Verified page and official details',
    body: 'A Verified badge with your website, phone, WhatsApp, hours, check-in times, amenities and the languages your team speaks.',
  },
  {
    icon: 'chat',
    title: 'Your place’s live chat',
    body: 'Guests and travellers chat in your place’s live chat. Pin a welcome message; your replies are labelled as the business.',
  },
  {
    icon: 'qr',
    title: 'QR codes for every spot',
    body: 'Print a QR code for reception, tables or rooms. Each spot is counted separately, so you see which ones guests use.',
  },
  {
    icon: 'wifi',
    title: 'Guest Wi-Fi and pre-arrival links',
    body: 'Show your Wi-Fi on your page so nobody has to ask, and send guests your page and chat before they arrive.',
  },
  {
    icon: 'chart',
    title: 'Simple, private stats',
    body: 'Page visits, chat joins and where guests come from over 7 and 30 days. Counts only — never personal data.',
  },
  {
    icon: 'users',
    title: 'Your team',
    body: 'Invite managers by email for the places you choose. You stay the owner and can change their access any time.',
  },
]

const STEPS = [
  { title: 'Find your place', body: 'Search for it above. If it isn’t on Nessa yet, find it on Google Maps — we’ll add it.' },
  { title: 'Tell us who you are', body: 'Sign in (or create a free account) with your work email, then add a few details about your business.' },
  { title: 'We verify and switch you on', body: 'A person on our team checks every claim. Once approved, your page shows Verified and your business tools open.' },
]

const FAQ = [
  {
    q: 'How much does it cost?',
    a: 'Claiming your place and using the business tools is free.',
  },
  {
    q: 'My business isn’t on Nessa. Can I still claim it?',
    a: 'Yes. Choose “Not on Nessa yet”, sign in and find your business on Google Maps. It’s added to Nessa when you send your claim, and appears publicly once we’ve verified you.',
  },
  {
    q: 'How do you verify a claim?',
    a: 'A person on our team reviews every claim, usually by email or phone using the details you give us. We may ask for something that shows you run the business.',
  },
  {
    q: 'I manage the place, but I’m not the owner.',
    a: 'Choose “Manager” on the claim form. If the place is already verified, ask its owner to invite you from Team in their business tools — no shared passwords.',
  },
  {
    q: 'Can guests use the live chat without the app?',
    a: 'Yes. Anyone can open your page or scan your QR code and join the chat in their browser. Messages are translated into each person’s language.',
  },
  {
    q: 'What do guests see about my business?',
    a: 'Only what you add: description, contacts, hours, amenities, languages and guest Wi-Fi. Recommendations and stories stay the community’s own.',
  },
]

export default async function ForBusinessesPage() {
  const directory = await getPlaceDirectory()
  const places = directory?.places ?? []
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }} />
      <section className="border-b border-n-line-soft">
        <Container className="grid gap-10 pt-10 pb-14 sm:pt-16 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-14 lg:pt-20 lg:pb-20">
          <div className="lg:pt-6">
            <Eyebrow className="mb-4">For hotels, hostels, cafés, restaurants and schools</Eyebrow>
            <h1 className="n-display text-[40px] leading-[1.05] sm:text-[54px]">Claim your place on Nessa. It’s free.</h1>
            <p className="mt-5 max-w-xl text-[17px] leading-7 text-n-muted sm:text-[18px]">
              Travellers already find places on Nessa through people’s recommendations, and talk in each place’s live
              chat. Claim yours to welcome them as the business — with a verified page, your own chat and QR codes.
            </p>
            <ul className="mt-7 space-y-2.5 text-[15px] text-n-ink-2">
              {['Free — no contracts, no fees', 'Every claim is checked by a person', 'Works for guests without the app'].map(t => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="flex size-5 items-center justify-center rounded-full bg-n-ok-soft text-n-ok">
                    <Icon name="check" size={13} strokeWidth={2.5} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[14px] text-n-muted">
              Already verified?{' '}
              <Link href={accountRoutes.business} className="font-semibold text-n-accent-strong no-underline hover:underline">
                Open your business tools →
              </Link>
            </p>
          </div>
          <div id="find" className="scroll-mt-24">
            <h2 className="mb-3 text-[15px] font-semibold text-n-ink">
              <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-n-ink text-[12px] text-white">
                1
              </span>
              Find your business
            </h2>
            <Suspense fallback={<div className="n-skeleton h-[260px] rounded-[24px]" aria-hidden />}>
              <FindYourPlace places={places} />
            </Suspense>
          </div>
        </Container>
      </section>

      <section aria-labelledby="steps-title" className="py-16 sm:py-20">
        <Container>
          <SectionHeading id="steps-title" eyebrow="How claiming works" title="Three steps, then you’re live" />
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-n-line bg-n-surface p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-n-accent text-[15px] font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.015em]">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-n-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section aria-labelledby="features-title" className="border-y border-n-line-soft bg-n-surface py-16 sm:py-20">
        <Container>
          <SectionHeading
            id="features-title"
            eyebrow="What you get"
            title="Everything to welcome guests — in one place"
            description="Manage it all from the Business dashboard on the web, on any device."
          />
          <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(f => (
              <li key={f.title}>
                <span className="flex size-11 items-center justify-center rounded-xl bg-n-accent-soft text-n-accent">
                  <Icon name={f.icon} size={22} />
                </span>
                <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">{f.title}</h3>
                <p className="mt-1.5 text-[15px] leading-6 text-n-muted">{f.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="faq-title" className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHeading id="faq-title" eyebrow="Questions" title="Good to know" />
            <p className="mt-4 text-[15px] leading-6 text-n-muted">
              Something else? Email{' '}
              <a href={`mailto:${siteConfig.supportEmail}`} className="font-semibold text-n-accent-strong no-underline hover:underline">
                {siteConfig.supportEmail}
              </a>
              .
            </p>
          </div>
          <div className="divide-y divide-n-line rounded-2xl border border-n-line bg-n-surface">
            {FAQ.map(f => (
              <details key={f.q} className="group px-5 py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Icon name="chevron-down" size={18} className="shrink-0 text-n-subtle transition-transform group-open:rotate-180" />
                </summary>
                <p className="pb-4 text-[15px] leading-6 text-n-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-16 sm:pb-20">
        <Container>
          <div className="flex flex-col items-start gap-5 rounded-[28px] bg-n-ink p-8 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h2 className="n-display text-[26px] leading-tight sm:text-[32px]">Ready when your guests are.</h2>
              <p className="mt-2 text-[15px] text-[#cfcac2]">Find your place and send your claim in a couple of minutes.</p>
            </div>
            <SiteButton href="#find" size="lg" className="bg-white! text-n-ink! hover:bg-[#f1efea]!" icon="search">
              Find your business
            </SiteButton>
          </div>
        </Container>
      </section>
    </SiteShell>
  )
}
