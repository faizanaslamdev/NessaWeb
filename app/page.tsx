import type { Metadata } from 'next'
import Link from 'next/link'

import { Icon, type IconName } from '@/components/dash/icons'
import { ChatPreview } from '@/components/site/chat-preview'
import { PlaceCard } from '@/components/site/place-card'
import { HomeSearch } from '@/components/site/home-search'
import { SiteShell } from '@/components/site/site-shell'
import { Container, Eyebrow, SectionHeading, SiteButton, StoreBadges } from '@/components/site/ui'
import { siteConfig, siteRoutes } from '@/lib/constants'
import { topTowns } from '@/lib/place-directory'
import { getPlaceDirectory } from '@/lib/place-directory-server'
import { PLACE_PUBLIC_ORIGIN } from '@/lib/place-slug'

export const revalidate = 600

export const metadata: Metadata = {
  title: 'NessaChat — Discover places and talk live with the people there',
  description:
    'Find places travellers recommend, read their stories and join each place’s live chat — translated into your language. Businesses can claim their place for free.',
  alternates: { canonical: PLACE_PUBLIC_ORIGIN },
}

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'compass',
    title: 'Discover through people',
    body: 'Every place on Nessa is recommended by travellers and locals who have been there — with their notes, photos and stories.',
  },
  {
    icon: 'chat',
    title: 'Join the live chat',
    body: 'Each place has its own chat. Ask what’s on tonight, find a ride or meet people nearby — right in your browser.',
  },
  {
    icon: 'languages',
    title: 'Talk in your language',
    body: 'Messages are translated automatically, so a guest from Berlin and a host in Brazil understand each other.',
  },
]

export default async function HomePage() {
  const directory = await getPlaceDirectory()
  const places = directory?.places ?? []
  const featured = places.slice(0, 8)
  const towns = topTowns(places, 10)
  const searchList = places.map(p => ({ ...p, photoUrl: undefined, lastActivityAt: undefined }))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${PLACE_PUBLIC_ORIGIN}/#org`,
        name: siteConfig.name,
        url: PLACE_PUBLIC_ORIGIN,
        logo: `${PLACE_PUBLIC_ORIGIN}/logo.png`,
        email: siteConfig.supportEmail,
      },
      {
        '@type': 'WebSite',
        '@id': `${PLACE_PUBLIC_ORIGIN}/#website`,
        name: siteConfig.name,
        url: PLACE_PUBLIC_ORIGIN,
        publisher: { '@id': `${PLACE_PUBLIC_ORIGIN}/#org` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${PLACE_PUBLIC_ORIGIN}/places?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }

  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      {/* Hero */}
      <section aria-labelledby="hero-title" className="border-b border-n-line-soft">
        <Container className="grid items-center gap-12 pt-10 pb-14 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pt-20 lg:pb-20">
          <div>
            <Eyebrow className="mb-4">Places · People · Live chat</Eyebrow>
            <h1 id="hero-title" className="n-display max-w-[16ch] text-[40px] leading-[1.04] sm:text-[56px] lg:text-[64px]">
              Discover places through the people who’ve been there.
            </h1>
            <p className="mt-5 max-w-[34rem] text-[17px] leading-7 text-n-muted sm:text-[18px]">
              See where travellers and locals recommend, read their stories, and talk live with everyone at the same
              spot — in your own language.
            </p>
            <HomeSearch places={searchList} className="mt-8 max-w-[34rem]" />
            {towns.length ? (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[13px] text-n-subtle">Popular:</span>
                {towns.slice(0, 5).map(t => (
                  <Link
                    key={t.town}
                    href={`/places?town=${encodeURIComponent(t.town)}`}
                    className="rounded-full border border-n-line bg-n-surface px-3 py-1.5 text-[13px] font-medium text-n-ink-2 no-underline hover:border-n-line-strong hover:text-n-ink"
                  >
                    {t.town}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <ChatPreview className="mx-auto w-full max-w-[440px] lg:mr-0" />
        </Container>
      </section>

      {/* Popular places */}
      {featured.length ? (
        <section aria-labelledby="popular-title" className="py-16 sm:py-20">
          <Container>
            <SectionHeading
              id="popular-title"
              eyebrow="Popular on Nessa"
              title="Places people recommend right now"
              description={`${directory!.total.toLocaleString('en')} places on Nessa so far — each with its own live chat.`}
              action={
                <SiteButton href="/places" variant="secondary" iconRight="arrow-right">
                  Explore all places
                </SiteButton>
              }
            />
            <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-4">
              {featured.map((place, i) => (
                <li key={place.placeId}>
                  <PlaceCard place={place} priority={i < 4} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* How it works */}
      <section aria-labelledby="how-title" className="border-y border-n-line-soft bg-n-surface py-16 sm:py-20">
        <Container>
          <SectionHeading id="how-title" eyebrow="How Nessa works" title="Real recommendations, real conversations" />
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-n-line bg-n-canvas p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-n-accent-soft text-n-accent">
                    <Icon name={step.icon} size={22} />
                  </span>
                  <span className="text-[13px] font-semibold text-n-faint tabular-nums">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.015em]">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-n-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Towns */}
      {towns.length > 1 ? (
        <section aria-labelledby="towns-title" className="py-16 sm:py-20">
          <Container>
            <SectionHeading id="towns-title" eyebrow="Explore by town" title="Where Nessa travellers are" />
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {towns.map(t => (
                <li key={t.town}>
                  <Link
                    href={`/places?town=${encodeURIComponent(t.town)}`}
                    className="flex h-full items-center justify-between gap-3 rounded-2xl border border-n-line bg-n-surface px-4 py-4 text-n-ink no-underline transition-colors hover:border-n-line-strong hover:bg-n-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{t.town}</span>
                      <span className="block text-[13px] text-n-muted">
                        {t.count} {t.count === 1 ? 'place' : 'places'}
                      </span>
                    </span>
                    <Icon name="arrow-right" size={16} className="shrink-0 text-n-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* Instant chat */}
      <section aria-labelledby="instant-title" className={towns.length > 1 ? 'pb-16 sm:pb-20' : 'py-16 sm:py-20'}>
        <Container>
          <div className="grid items-center gap-10 rounded-[28px] border border-n-line bg-n-surface p-6 sm:p-10 lg:grid-cols-2 lg:p-14">
            <div>
              <Eyebrow className="mb-3">Instant chat</Eyebrow>
              <h2 id="instant-title" className="n-display text-[30px] leading-[1.12] sm:text-[38px]">
                Talk to anyone, in any language — no sign-up.
              </h2>
              <p className="mt-4 max-w-md text-[16px] leading-7 text-n-muted">
                Open a room, share the link or QR code, and chat right away. Everyone writes in their own language and
                reads in theirs. Rooms are temporary and disappear when you’re done.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <SiteButton href="/chat" size="lg" icon="chat">
                  Start an instant chat
                </SiteButton>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: 'qr' as IconName, title: 'Link or QR code', body: 'Invite someone across the table or across the world.' },
                { icon: 'languages' as IconName, title: 'Auto-translated', body: 'Messages arrive in each person’s language.' },
                { icon: 'clock' as IconName, title: 'Temporary', body: 'Rooms expire on their own — nothing to clean up.' },
                { icon: 'globe' as IconName, title: 'Works in the browser', body: 'No download needed. The app adds more.' },
              ].map(f => (
                <li key={f.title} className="rounded-2xl bg-n-canvas p-5">
                  <Icon name={f.icon} size={20} className="text-n-accent" />
                  <p className="mt-3 text-[15px] font-semibold">{f.title}</p>
                  <p className="mt-1 text-[14px] leading-6 text-n-muted">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* For businesses */}
      <section aria-labelledby="biz-title" className="bg-n-ink py-16 text-white sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-3 text-[13px] font-semibold text-[#b9adf7]">For hotels, hostels, cafés and schools</p>
            <h2 id="biz-title" className="n-display text-[32px] leading-[1.1] sm:text-[42px]">
              Run a place? Claim it on Nessa — it’s free.
            </h2>
            <p className="mt-4 max-w-xl text-[16px] leading-7 text-[#cfcac2]">
              Get a verified page, answer guests in your place’s live chat, print QR codes for reception and tables, and
              see how many people visit — without tracking anyone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`${siteRoutes.forBusinesses}#find`}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[15px] font-semibold text-n-ink no-underline hover:bg-[#f1efea]"
              >
                <Icon name="search" size={18} />
                Find and claim your place
              </Link>
              <Link
                href={siteRoutes.forBusinesses}
                className="inline-flex h-12 items-center gap-2 rounded-xl px-5 text-[15px] font-semibold text-white no-underline ring-1 ring-white/25 hover:bg-white/10"
              >
                How it works
              </Link>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: 'badge-check' as IconName, t: 'Verified page', d: 'Official details, hours, Wi-Fi and contact.' },
              { icon: 'chat' as IconName, t: 'Your live chat', d: 'Pin a welcome note; replies show as the business.' },
              { icon: 'qr' as IconName, t: 'QR codes', d: 'One per spot — see which ones guests use.' },
              { icon: 'users' as IconName, t: 'Your team', d: 'Invite managers for the places you choose.' },
            ].map(f => (
              <li key={f.t} className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                <Icon name={f.icon} size={20} className="text-[#b9adf7]" />
                <p className="mt-3 text-[15px] font-semibold">{f.t}</p>
                <p className="mt-1 text-[14px] leading-6 text-[#cfcac2]">{f.d}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* App */}
      <section aria-labelledby="app-title" className="py-16 sm:py-20">
        <Container>
          <div className="flex flex-col items-start gap-6 rounded-[28px] border border-n-line bg-n-surface p-6 sm:p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 id="app-title" className="n-display text-[26px] leading-tight sm:text-[30px]">
              Recommend places and share stories in the app
            </h2>
            <p className="mt-2 text-[15px] leading-6 text-n-muted">
              The NessaChat app is where you add recommendations, post stories from your trips, follow people and keep
              your conversations.
            </p>
          </div>
          <StoreBadges />
          </div>
        </Container>
      </section>
    </SiteShell>
  )
}
