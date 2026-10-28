import type { Metadata } from 'next'

import { Icon, type IconName } from '@/components/dash/icons'
import { SiteShell } from '@/components/site/site-shell'
import { Container, Eyebrow, SiteButton } from '@/components/site/ui'
import { siteConfig, siteRoutes } from '@/lib/constants'
import { PLACE_PUBLIC_ORIGIN } from '@/lib/place-slug'

export const metadata: Metadata = {
  title: `About | ${siteConfig.name}`,
  description:
    'NessaChat helps travellers and locals discover places through people they trust — and talk live with everyone at the same spot, in their own language.',
  alternates: { canonical: `${PLACE_PUBLIC_ORIGIN}/about` },
}

const PRINCIPLES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'users',
    title: 'People, not algorithms',
    body: 'Places on Nessa come from recommendations and stories by people who’ve been there — not from paid rankings.',
  },
  {
    icon: 'languages',
    title: 'Every language welcome',
    body: 'Live chats and instant chats translate automatically, so nobody is left out of the conversation.',
  },
  {
    icon: 'shield',
    title: 'Private by default',
    body: 'Business stats are counts, never personal tracking. Instant chats are temporary and disappear on their own.',
  },
  {
    icon: 'store',
    title: 'Good for local places',
    body: 'Hostels, cafés, schools and guides claim their page for free and talk to their guests directly.',
  },
]

export default function AboutPage() {
  return (
    <SiteShell>
      <section className="border-b border-n-line-soft">
        <Container className="py-14 sm:py-20">
          <div className="max-w-3xl">
            <Eyebrow className="mb-4">About NessaChat</Eyebrow>
            <h1 className="n-display text-[38px] leading-[1.06] sm:text-[54px]">
              Travel feels better when you can talk to the people around you.
            </h1>
            <p className="mt-6 text-[18px] leading-8 text-n-muted">
              NessaChat is built on a simple idea: the best way to find a good place is to ask someone who’s been
              there — and the best way to enjoy it is to meet the people who are there now. So every place on Nessa
              has the recommendations and stories of travellers and locals, and its own live chat that anyone can join,
              in any language.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container>
          <h2 className="n-display text-[28px] sm:text-[34px]">What we care about</h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {PRINCIPLES.map(p => (
              <li key={p.title} className="rounded-2xl border border-n-line bg-n-surface p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-n-accent-soft text-n-accent">
                  <Icon name={p.icon} size={22} />
                </span>
                <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.015em]">{p.title}</h3>
                <p className="mt-1.5 text-[15px] leading-6 text-n-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="pb-16 sm:pb-24">
        <Container>
          <div className="grid gap-8 rounded-[28px] border border-n-line bg-n-surface p-6 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <h2 className="n-display text-[26px] leading-tight sm:text-[32px]">Where we’re going</h2>
              <p className="mt-3 text-[16px] leading-7 text-n-muted">
                We’re building NessaChat into a place to discover where to go, join the communities around each town
                and place, and keep in touch with the people you meet — on the web and in the app. We’re starting with
                the places our community loves most and growing from there.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <SiteButton href="/places" size="lg" icon="compass">
                Explore places
              </SiteButton>
              <SiteButton href={siteRoutes.forBusinesses} size="lg" variant="secondary">
                For businesses
              </SiteButton>
            </div>
          </div>
          <p className="mt-10 text-[15px] text-n-muted">
            Say hello:{' '}
            <a href={`mailto:${siteConfig.supportEmail}`} className="font-semibold text-n-accent-strong no-underline hover:underline">
              {siteConfig.supportEmail}
            </a>
          </p>
        </Container>
      </section>
    </SiteShell>
  )
}
