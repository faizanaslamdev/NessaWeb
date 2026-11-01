/**
 * Public Place page body — a Server Component. Only the interactive parts
 * are client islands (share / QR, hero zoom, Wi-Fi, traveller content
 * sheets, Message button), so the page ships little JavaScript and the
 * Place data isn't embedded a second time as one big client prop.
 *
 * Takes the Google-free view (lib/place-public-view.ts): no Google photo,
 * attribution or street address reaches the HTML or the RSC payload.
 */

import Link from 'next/link'

import { Icon, type IconName } from '@/components/dash/icons'
import { RecommendedBySection, StoriesSection } from '@/components/place/place-community'
import { GoogleMapsMark } from '@/components/place/place-credits'
import { PlaceHero } from '@/components/place/place-hero'
import { PlaceMessageSlot } from '@/components/place/place-message-slot'
import { PlaceOfficialSection } from '@/components/place/place-official-section'
import { PlaceGallerySection } from '@/components/place/place-photos'
import { PlacePrearrivalCopy } from '@/components/place/place-prearrival-copy'
import { PlaceCoverShareQr } from '@/components/place/place-share-qr'
import { PlaceWifiSlot } from '@/components/place/place-wifi-slot'
import { PlaceCard } from '@/components/site/place-card'
import { Container, StoreBadges, siteButtonClass } from '@/components/site/ui'
import { VerifiedBadge } from '@/components/site/verified-badge'
import { accountRoutes } from '@/lib/account/constants'
import { placeAppDeepLink, siteConfig } from '@/lib/constants'
import { hasMessageSlot } from '@/lib/customer-messages'
import { placeTypeLabel, type DirectoryPlace } from '@/lib/place-directory'
import type { CityHub, CountryHub } from '@/lib/place-geo'
import { PLACE_CHAT_DEFAULT_RETENTION_HOURS, placeChatRetentionLabel } from '@/lib/place-chat/retention'
import { placeHeroImage, type PublicPlaceView } from '@/lib/place-public-view'
import { isValidPlaceSlug, placeChatCanonicalPath } from '@/lib/place-slug'

function formatCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  }
  return String(n)
}

function StatPill({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-n-line bg-n-surface px-3 py-1.5 text-n-ink-2">
      <Icon name={icon} size={14} className="text-n-accent" />
      <span className="font-semibold text-n-ink tabular-nums">{formatCount(value)}</span> {label}
    </li>
  )
}

/**
 * The name with the verified seal in the text flow: the seal follows the last
 * word (never alone on a new line) and is sized in `em`, so it stays centred
 * on the capitals at 32 and 44 px. Very long last words may still break.
 */
function TitleWithBadge({ name }: { name: string }) {
  const cut = name.lastIndexOf(' ')
  const head = cut >= 0 ? name.slice(0, cut + 1) : ''
  const last = cut >= 0 ? name.slice(cut + 1) : name
  return (
    <>
      {head}
      <span className={last.length <= 14 ? 'whitespace-nowrap' : undefined}>
        {last}
        <VerifiedBadge variant="icon" className="ml-[0.2em]" />
      </span>
    </>
  )
}

export type PlaceViewHubs = {
  /** Destination pages this Place belongs to (null: the town has no page). */
  country: Pick<CountryHub, 'name' | 'path'> | null
  city: Pick<CityHub, 'cityName' | 'path'> | null
}

export function PlaceView({
  place,
  placeId,
  slug,
  hubs,
  moreInCity,
}: {
  place: PublicPlaceView
  placeId: string
  slug?: string | null
  hubs?: PlaceViewHubs | null
  /** Other Places in the same town (from the cached directory). */
  moreInCity?: DirectoryPlace[]
}) {
  const deepLink = placeAppDeepLink(placeId)
  const location = [place.city, place.country].filter(Boolean).join(', ')
  // Our own address for a verified business (never Google's formatted address).
  const address = place.business?.address?.trim() || location
  const recommenders = place.recommenders ?? []
  const stories = place.stories ?? []
  const moreStories = Math.max(0, place.storyCount - stories.length)
  const canonicalSlug = place.slug ?? slug ?? null
  const realPlaceId = place.googlePlaceId || placeId
  // Clean chat URL when the Place has a slug; legacy chat route otherwise.
  const chatHref =
    canonicalSlug && isValidPlaceSlug(canonicalSlug)
      ? placeChatCanonicalPath(canonicalSlug)
      : `/place/${encodeURIComponent(place.googlePlaceId)}/chat`
  const retention = placeChatRetentionLabel(place.chatRetentionHours ?? PLACE_CHAT_DEFAULT_RETENTION_HOURS)
  const claimHref = `${accountRoutes.claim}/${encodeURIComponent(realPlaceId)}`
  const hasCommunity = recommenders.length > 0 || stories.length > 0
  // Places / Country / Town / this Place — destination pages when the town has one.
  const crumbs: { name: string; href: string; phoneHidden?: boolean }[] = [{ name: 'Places', href: '/places' }]
  if (hubs?.country) crumbs.push({ name: hubs.country.name, href: hubs.country.path, phoneHidden: true })
  if (place.city) {
    crumbs.push({ name: place.city, href: hubs?.city?.path ?? `/places?town=${encodeURIComponent(place.city)}` })
  }
  const business = place.business ?? null
  // Name and type (and the town) come from Google Maps for every Place.
  const showsGoogleData = Boolean(place.placeType || place.name)
  const messageBusiness = business
    ? { verified: business.verified, businessId: business.businessId, messagingEnabled: business.messagingEnabled, name: business.name }
    : null

  return (
    <>
      <Container className="pt-6 pb-16 sm:pt-8 lg:pb-20">
        <nav aria-label="Breadcrumb" className="mb-5 flex min-w-0 items-center gap-1.5 text-[13px] text-n-subtle">
          {crumbs.map(c => (
            <span key={c.href} className={c.phoneHidden ? 'contents max-sm:hidden' : 'contents'}>
              <Link href={c.href} className="shrink-0 text-n-subtle no-underline hover:text-n-ink">
                {c.name}
              </Link>
              <span aria-hidden>/</span>
            </span>
          ))}
          <span aria-current="page" className="truncate text-n-ink-2">
            {place.name}
          </span>
        </nav>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-n-accent-strong">{placeTypeLabel(place.placeType)}</p>
            <h1 className="n-display mt-1 text-[32px] leading-[1.1] [overflow-wrap:anywhere] sm:text-[44px]">
              {business ? <TitleWithBadge name={place.name} /> : place.name}
            </h1>
            {address ? (
              <p className="mt-2 flex items-start gap-1.5 text-[15px] text-n-muted">
                <Icon name="pin" size={16} className="mt-0.5 shrink-0" />
                <span>{address}</span>
              </p>
            ) : null}
            <ul className="mt-4 flex flex-wrap gap-2 text-[13px]">
              <StatPill icon="star" value={place.recommenderCount} label="recommended" />
              <StatPill icon="image" value={place.storyCount} label={place.storyCount === 1 ? 'story' : 'stories'} />
              {place.visitedCount > 0 ? <StatPill icon="users" value={place.visitedCount} label="visited" /> : null}
            </ul>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <PlaceCoverShareQr placeId={realPlaceId} slug={canonicalSlug} placeName={place.name} variant="buttons" />
            <a
              href={deepLink}
              title={`Opens this place in ${siteConfig.name} so you can recommend it.`}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-n-line-strong bg-n-surface px-3 text-[13px] font-semibold text-n-ink no-underline shadow-n-card transition-colors hover:bg-n-hover sm:h-10 sm:gap-2 sm:px-3.5 sm:text-[14px]"
            >
              <Icon name="star" size={16} />
              Recommend
            </a>
          </div>
        </div>

        <PlaceHero image={placeHeroImage(place)} placeName={place.name} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <div className="min-w-0 space-y-10">
            {/* Phones: Wi-Fi first — it's what guests scanning a QR look for. */}
            {place.hasWifi ? <PlaceWifiSlot placeId={realPlaceId} className="lg:hidden" /> : null}
            {business ? <PlaceOfficialSection business={business} placeId={realPlaceId} /> : null}
            {place.photos?.length ? <PlaceGallerySection photos={place.photos} placeName={place.name} /> : null}

            {recommenders.length > 0 ? (
              <RecommendedBySection
                placeId={place.googlePlaceId}
                recommenders={recommenders}
                recommenderCount={place.recommenderCount}
              />
            ) : null}

            {stories.length > 0 ? <StoriesSection stories={stories} moreCount={moreStories} /> : null}

            {!hasCommunity ? (
              <section className="rounded-2xl border border-dashed border-n-line-strong bg-n-surface px-6 py-10 text-center">
                <Icon name="star" size={26} className="mx-auto text-n-faint" />
                <h2 className="mt-3 text-[17px] font-semibold">Be the first to recommend {place.name}</h2>
                <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-6 text-n-muted">
                  Been here? Add a recommendation or a story in the NessaChat app so other travellers know what to
                  expect.
                </p>
                <a href={deepLink} className={siteButtonClass('secondary', 'md', 'mt-5')}>
                  Recommend in the app
                </a>
              </section>
            ) : null}
            {showsGoogleData ? (
              <p className="text-[12px] text-n-subtle">
                Place name and type from <GoogleMapsMark className="text-n-muted" />.
              </p>
            ) : null}
          </div>

          <aside aria-label="Live chat and guest info" className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section aria-labelledby="live-chat-title" className="rounded-2xl border border-n-line bg-n-surface p-5 shadow-n-card">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full rounded-full bg-[#1f9d6b] opacity-30" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-[#1f9d6b]" />
                </span>
                <h2 id="live-chat-title" className="text-[16px] font-semibold">
                  Live chat
                </h2>
              </div>
              <p className="mt-2 text-[14px] leading-6 text-n-muted">
                Talk with everyone at {place.name} — guests, locals{business ? ' and the team' : ''}. Messages are
                translated into your language and last {retention}.
              </p>
              <a href={chatHref} className={siteButtonClass('primary', 'lg', 'mt-4 w-full')}>
                <Icon name="chat" size={18} />
                Join live chat
              </a>
              <p className="mt-2.5 text-center text-[12px] text-n-subtle">No app or sign-up needed.</p>
              <div className="mt-3 border-t border-n-line-soft pt-3 text-center">
                <PlacePrearrivalCopy placeId={realPlaceId} slug={canonicalSlug} placeName={place.name} />
              </div>
            </section>

            {place.hasWifi ? <PlaceWifiSlot placeId={realPlaceId} className="hidden lg:block" /> : null}

            {business ? (
              <section className="rounded-2xl border border-n-line bg-n-surface p-5">
                <p className="text-[14px] text-n-muted">
                  Managed by <span className="font-semibold text-n-ink">{business.name}</span>, a verified business on
                  Nessa.
                </p>
                <Link
                  href={accountRoutes.business}
                  prefetch={false}
                  className="mt-2 inline-block text-[13px] font-semibold text-n-accent-strong no-underline hover:underline"
                >
                  Work here? Open business tools →
                </Link>
              </section>
            ) : (
              <section aria-labelledby="claim-title" className="rounded-2xl border border-n-accent-line bg-n-accent-soft p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-n-accent text-white">
                    <Icon name="store" size={18} />
                  </span>
                  <div className="min-w-0">
                    <h2 id="claim-title" className="text-[15px] font-semibold">
                      Is this your business?
                    </h2>
                    <p className="mt-1 text-[14px] leading-6 text-n-ink-2">
                      Claim {place.name} for free to add official details and guest <span className="whitespace-nowrap">Wi-Fi</span>, and to welcome guests in the
                      live chat.
                    </p>
                  </div>
                </div>
                <Link href={claimHref} prefetch={false} className={siteButtonClass('dark', 'md', 'mt-4 w-full')}>
                  Claim this place
                </Link>
              </section>
            )}

            <section className="rounded-2xl border border-n-line bg-n-surface p-5">
              <h2 className="text-[15px] font-semibold">Recommend it in the app</h2>
              <p className="mt-1 text-[14px] leading-6 text-n-muted">
                Add your recommendation, post stories and follow travellers with the NessaChat app.
              </p>
              <StoreBadges className="mt-4" tone="light" />
            </section>
          </aside>
        </div>

        {moreInCity?.length && place.city ? (
          <MoreInCity city={place.city} places={moreInCity} hubPath={hubs?.city?.path ?? null} />
        ) : null}
      </Container>

      {/* Phone: the main actions stay in reach. Message follows the same
          rules as the business section's button (hidden when messaging is
          off; the business's own team gets "Open inbox"). */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-n-line bg-n-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        {messageBusiness && hasMessageSlot(messageBusiness) ? (
          <PlaceMessageSlot
            placeId={realPlaceId}
            business={messageBusiness}
            variant="secondary"
            size="lg"
            compact
            className="min-w-0 flex-1 px-3!"
          />
        ) : null}
        <a href={chatHref} className={siteButtonClass('primary', 'lg', 'min-w-0 flex-[1.4] px-3!')}>
          <Icon name="chat" size={18} />
          Join live chat
        </a>
      </div>
    </>
  )
}

/** Internal links to other Places in the same town (and its destination page). */
function MoreInCity({ city, places, hubPath }: { city: string; places: DirectoryPlace[]; hubPath: string | null }) {
  return (
    <section aria-labelledby="more-in-city-title" className="mt-14 border-t border-n-line-soft pt-10 sm:mt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="more-in-city-title" className="text-[20px] font-semibold tracking-[-0.015em]">
          More in {city}
        </h2>
        {hubPath ? (
          <Link href={hubPath} className="text-[14px] font-semibold text-n-accent-strong no-underline hover:underline">
            All places in {city} →
          </Link>
        ) : null}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-6">
        {places.map(p => (
          <li key={p.placeId}>
            <PlaceCard place={p} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Server-rendered status page (invalid link, Place unavailable). */
export function PlaceStatus({
  title,
  body,
  placeId,
  retryHref,
}: {
  title: string
  body: string
  /** Offer "Open in the app" for this Place. */
  placeId?: string
  /** Offer "Try again" (same URL). */
  retryHref?: string
}) {
  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-lg rounded-3xl border border-n-line bg-n-surface p-8 text-center shadow-n-card">
        <Icon name="pin" size={28} className="mx-auto text-n-faint" />
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 text-[15px] leading-6 text-n-muted">{body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/places" className={siteButtonClass('primary', 'md')}>
            Explore places
          </Link>
          {retryHref ? (
            <a href={retryHref} className={siteButtonClass('secondary', 'md')}>
              Try again
            </a>
          ) : null}
          {placeId ? (
            <a href={placeAppDeepLink(placeId)} className={siteButtonClass('secondary', 'md')}>
              Open in the app
            </a>
          ) : null}
        </div>
      </div>
    </Container>
  )
}
