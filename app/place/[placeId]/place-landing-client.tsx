'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'

import {
  placeAppDeepLink,
  siteConfig,
} from '@/lib/constants'
import { buildPlacePageTitle } from '@/lib/place-title'
import {
  fetchPublicPlaceLanding,
  fetchPublicPlaceRecommenders,
  fetchPublicStoryComments,
  isPublicPlaceIdValid,
  PublicPlaceLandingError,
  type PublicPlaceComment,
  type PublicPlaceLanding,
  type PublicPlaceRecommender,
  type PublicPlaceStoryPreview,
} from '@/lib/place-landing'
import { Icon, type IconName } from '@/components/dash/icons'
import { StoryPhotoCollage } from '@/components/place/story-photo-collage'
import { StoryMediaViewer } from '@/components/place/story-media-viewer'
import { PlaceSheet } from '@/components/place/place-sheet'
import { PlaceCoverShareQr } from '@/components/place/place-share-qr'
import { PlacePrearrivalCopy } from '@/components/place/place-prearrival-copy'
import { PlaceOfficialSection, VerifiedBadge } from '@/components/place/place-official-section'
import { PlaceWifiCard } from '@/components/place/place-wifi-card'
import { Container, StoreBadges, siteButtonClass } from '@/components/site/ui'
import { accountRoutes } from '@/lib/account/constants'
import { placeTypeLabel } from '@/lib/place-directory'
import { isNessaPhotoUrl, placePhotoUrlForWebVariant } from '@/lib/place-photo'
import {
  GoogleMapsMark,
  GooglePhotoCredit,
  NessaPhotoCredit,
  PlaceGallerySection,
} from '@/components/place/place-photos'
import { isValidPlaceSlug, placeChatCanonicalPath } from '@/lib/place-slug'
import {
  PLACE_CHAT_DEFAULT_RETENTION_HOURS,
  placeChatRetentionLabel,
} from '@/lib/place-chat/retention'

type PlaceLandingClientProps = {
  placeId: string
  /** Canonical public slug (`/places/{slug}`) when known. */
  slug?: string | null
  /**
   * Server-fetched landing (SSR): rendered immediately so the HTML carries
   * the real content for crawlers / link previews, then refreshed quietly.
   */
  initialPlace?: PublicPlaceLanding | null
}

const subscribeNoop = () => () => {}

/**
 * False during SSR and hydration, true afterwards. Relative times ("5m ago")
 * depend on the clock and the server HTML may be cached, so they render only
 * on the client to avoid hydration mismatches.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; place: PublicPlaceLanding }
  | { kind: 'invalid' }
  | { kind: 'error'; title: string; body: string }

function formatLocation(place: PublicPlaceLanding): string {
  const parts = [place.city, place.country].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(', ')
  }
  return place.formattedAddress?.trim() || ''
}

function formatCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  }
  return String(n)
}

function formatRelativeDate(iso?: string): string | null {
  if (!iso) {
    return null
  }
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) {
    return null
  }
  const diffMs = Date.now() - then
  if (diffMs < 0) {
    return null
  }
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) {
    return 'Just now'
  }
  if (mins < 60) {
    return `${mins}m ago`
  }
  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `${days}d ago`
  }
  const months = Math.floor(days / 30)
  if (months < 12) {
    return `${months}mo ago`
  }
  return `${Math.floor(months / 12)}y ago`
}

function formatStoryType(type?: string): string | null {
  if (!type?.trim()) {
    return null
  }
  const labels: Record<string, string> = {
    language_question: 'Language Question',
    travel_update: 'Travel Update',
    recommendation: 'Recommendation',
    daily_life: 'Daily Life',
    cultural_post: 'Cultural Post',
  }
  return labels[type] ?? type.trim().replace(/_/g, ' ')
}

function storyTypeClasses(type?: string): string {
  switch (type) {
    case 'language_question':
      return 'bg-[#eeebfd] text-[#4a36c9]'
    case 'travel_update':
      return 'bg-[#e6effc] text-[#1f5fbf]'
    case 'recommendation':
      return 'bg-[#e3f2ee] text-[#0e6b5c]'
    case 'daily_life':
      return 'bg-[#fbf0dd] text-[#8a4a06]'
    case 'cultural_post':
      return 'bg-[#fbeee4] text-[#a2531c]'
    default:
      return 'bg-n-sunken text-n-ink-2'
  }
}

function storyMediaUris(story: PublicPlaceStoryPreview): string[] {
  if (Array.isArray(story.media) && story.media.length > 0) {
    return story.media.map(m => m.url).filter(Boolean)
  }
  return story.thumbnailUrl ? [story.thumbnailUrl] : []
}

function initialLetter(name: string): string {
  const ch = name.trim().charAt(0)
  return ch ? ch.toUpperCase() : '?'
}

/**
 * Public Place page: who recommends it, their stories, the live chat, guest
 * Wi-Fi and the verified business layer. Server-rendered content hydrates
 * here, then refreshes quietly.
 */
export function PlaceLandingClient({
  placeId,
  slug,
  initialPlace,
}: PlaceLandingClientProps) {
  const deepLink = useMemo(() => placeAppDeepLink(placeId), [placeId])
  const placeIdValid = isPublicPlaceIdValid(placeId)
  const hasInitialPlace = Boolean(placeIdValid && initialPlace)
  const [state, setState] = useState<LoadState>(() => {
    if (!placeIdValid) {
      return { kind: 'invalid' }
    }
    return initialPlace ? { kind: 'ready', place: initialPlace } : { kind: 'loading' }
  })
  const [coverViewerOpen, setCoverViewerOpen] = useState(false)
  const [coverBroken, setCoverBroken] = useState(false)

  useEffect(() => {
    if (state.kind === 'ready') {
      document.title = buildPlacePageTitle(state.place.name)
      return
    }
    if (state.kind === 'invalid') {
      document.title = `Invalid place | ${siteConfig.name}`
    }
  }, [state])

  useEffect(() => {
    if (!placeIdValid) {
      return
    }

    let cancelled = false
    if (!hasInitialPlace) {
      queueMicrotask(() => {
        if (!cancelled) {
          setState({ kind: 'loading' })
        }
      })
    }

    fetchPublicPlaceLanding(placeId)
      .then(place => {
        if (!cancelled) {
          if (!hasInitialPlace) {
            setCoverBroken(false)
            setCoverViewerOpen(false)
          }
          setState({ kind: 'ready', place })
        }
      })
      .catch((e: unknown) => {
        if (cancelled) {
          return
        }
        if (hasInitialPlace) {
          // Keep the server-rendered content; the refresh was best-effort.
          return
        }
        if (e instanceof PublicPlaceLandingError) {
          if (e.code === 'invalid-argument') {
            setState({ kind: 'invalid' })
            return
          }
          setState({
            kind: 'error',
            title:
              e.code === 'not-found' ? 'Place not found' : 'Couldn’t load place',
            body: e.message,
          })
          return
        }
        setState({
          kind: 'error',
          title: 'Couldn’t load place',
          body: 'Please try again in a moment.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [placeId, placeIdValid, hasInitialPlace])

  if (!placeIdValid || state.kind === 'invalid') {
    return (
      <StatusBlock
        title="This place link isn’t valid"
        body="The QR code or link doesn’t point to a place on NessaChat."
      />
    )
  }

  if (state.kind === 'error') {
    return (
      <StatusBlock title={state.title} body={state.body}>
        <a href={deepLink} className={siteButtonClass('secondary', 'md')}>
          Open in the app
        </a>
      </StatusBlock>
    )
  }

  if (state.kind !== 'ready') {
    return <PlaceSkeleton />
  }

  const { place } = state
  const location = formatLocation(place)
  const recommenders = place.recommenders ?? []
  const stories = place.stories ?? []
  const moreStories = Math.max(0, place.storyCount - stories.length)
  const rawCoverUrl = place.coverImageUrl?.trim() || ''
  // NessaChat's own cover, or Google's photo (fallback, shown with its credits).
  const nessaCover = place.coverSource === 'nessa' || isNessaPhotoUrl(rawCoverUrl)
  const coverUrl = nessaCover
    ? rawCoverUrl
    : (placePhotoUrlForWebVariant(rawCoverUrl, 'lightbox') ?? rawCoverUrl)
  const coverLightboxUrl = coverUrl
  const hasCover = (coverUrl.startsWith('https://') || nessaCover) && !coverBroken
  // Name, address and type come from Google Maps for every Place.
  const showsGoogleData = Boolean(place.formattedAddress || place.placeType)
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

  return (
    <>
      <Container className="pt-6 pb-16 sm:pt-8 lg:pb-20">
        <nav aria-label="Breadcrumb" className="mb-5 flex min-w-0 items-center gap-1.5 text-[13px] text-n-subtle">
          <Link href="/places" className="shrink-0 text-n-subtle no-underline hover:text-n-ink">
            Places
          </Link>
          {place.city ? (
            <>
              <span aria-hidden>/</span>
              <Link
                href={`/places?town=${encodeURIComponent(place.city)}`}
                className="shrink-0 text-n-subtle no-underline hover:text-n-ink"
              >
                {place.city}
              </Link>
            </>
          ) : null}
          <span aria-hidden>/</span>
          <span aria-current="page" className="truncate text-n-ink-2">
            {place.name}
          </span>
        </nav>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-n-accent-strong">{placeTypeLabel(place.placeType)}</p>
            <h1 className="n-display mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-[32px] leading-[1.1] sm:text-[44px]">
              <span className="[overflow-wrap:anywhere]">{place.name}</span>
              {place.business ? <VerifiedBadge className="translate-y-0.5" /> : null}
            </h1>
            {location || place.formattedAddress ? (
              <p className="mt-2 flex items-start gap-1.5 text-[15px] text-n-muted">
                <Icon name="pin" size={16} className="mt-0.5 shrink-0" />
                <span>
                  {place.formattedAddress && place.formattedAddress !== location ? place.formattedAddress : location}
                </span>
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

        <div className="relative mt-6 overflow-hidden rounded-3xl bg-n-sunken">
          <div className={hasCover ? 'aspect-[4/3] w-full sm:aspect-[2/1] lg:aspect-[5/2]' : 'h-36 w-full sm:h-44'}>
            {hasCover && nessaCover ? (
              <button
                type="button"
                onClick={() => setCoverViewerOpen(true)}
                className="group relative block h-full w-full cursor-zoom-in p-0"
                aria-label={`View photo of ${place.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- our own photo (Firebase Storage) */}
                <img
                  src={coverUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                  onError={() => {
                    setCoverBroken(true)
                    setCoverViewerOpen(false)
                  }}
                />
                <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
              </button>
            ) : hasCover ? (
              // Google's photo: loaded in the browser only (key-bearing, billed
              // per load), never enlarged, always credited.
              // eslint-disable-next-line @next/next/no-img-element -- remote Google Places media URL
              <img
                src={coverUrl}
                alt=""
                className="h-full w-full object-cover"
                fetchPriority="high"
                onError={() => setCoverBroken(true)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-n-faint">
                <Icon name="image" size={36} strokeWidth={1.4} />
                <span className="text-[13px]">No photo yet</span>
              </div>
            )}
          </div>
          {hasCover ? (
            <div className="pointer-events-none absolute right-3 bottom-3 left-3 flex justify-end [&_a]:pointer-events-auto">
              {nessaCover ? (
                <NessaPhotoCredit name={place.coverCredit} />
              ) : (
                <GooglePhotoCredit attribution={place.googlePhotoAttribution} />
              )}
            </div>
          ) : null}
        </div>

        <StoryMediaViewer
          key={coverViewerOpen ? `cover-${coverLightboxUrl}` : 'cover-closed'}
          open={coverViewerOpen && hasCover && nessaCover}
          uris={hasCover ? [coverLightboxUrl] : []}
          initialIndex={0}
          onClose={() => setCoverViewerOpen(false)}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <div className="min-w-0 space-y-10">
            {/* Phones: Wi-Fi first — it's what guests scanning a QR look for. */}
            {place.wifi ? <PlaceWifiCard wifi={place.wifi} className="lg:hidden" /> : null}
            {place.business ? <PlaceOfficialSection business={place.business} /> : null}
            {place.photos?.length ? <PlaceGallerySection photos={place.photos} placeName={place.name} /> : null}

            {recommenders.length > 0 ? (
              <RecommendedBySection
                placeId={place.googlePlaceId}
                recommenders={recommenders}
                recommenderCount={place.recommenderCount}
              />
            ) : null}

            {stories.length > 0 ? (
              <StoriesSection stories={stories} moreCount={moreStories} />
            ) : null}

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
                Place name, address and type from <GoogleMapsMark className="text-n-muted" />.
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
                Talk with everyone at {place.name} — guests, locals{place.business ? ' and the team' : ''}. Messages are
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

            {place.wifi ? <PlaceWifiCard wifi={place.wifi} className="hidden lg:block" /> : null}

            {place.business ? (
              <section className="rounded-2xl border border-n-line bg-n-surface p-5">
                <p className="text-[14px] text-n-muted">
                  Managed by <span className="font-semibold text-n-ink">{place.business.name}</span>, a verified
                  business on Nessa.
                </p>
                <Link href={accountRoutes.business} className="mt-2 inline-block text-[13px] font-semibold text-n-accent-strong no-underline hover:underline">
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
                      Claim {place.name} for free to add official details and guest Wi-Fi, and to welcome guests in the
                      live chat.
                    </p>
                  </div>
                </div>
                <Link href={claimHref} className={siteButtonClass('dark', 'md', 'mt-4 w-full')}>
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
      </Container>

      {/* Phone: the main action stays in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-n-line bg-n-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <a href={chatHref} className={siteButtonClass('primary', 'lg', 'w-full')}>
          <Icon name="chat" size={18} />
          Join live chat
        </a>
      </div>
    </>
  )
}

function StatPill({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-n-line bg-n-surface px-3 py-1.5 text-n-ink-2">
      <Icon name={icon} size={14} className="text-n-accent" />
      <span className="font-semibold text-n-ink tabular-nums">{formatCount(value)}</span> {label}
    </li>
  )
}

function RecommenderCard({ person }: { person: PublicPlaceRecommender }) {
  const hydrated = useHydrated()
  const relative = hydrated ? formatRelativeDate(person.createdAt) : null
  const note = person.note?.trim()

  return (
    <li className="rounded-2xl border border-n-line bg-n-surface px-4 py-3.5">
      <div className="flex items-start gap-3">
        <PersonAvatar name={person.displayName} avatarUrl={person.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="truncate text-[15px] font-semibold text-n-ink">
              {person.displayName}
            </p>
            {relative ? (
              <p className="text-[12px] text-n-subtle">{relative}</p>
            ) : null}
          </div>
          {note ? (
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-6 text-n-ink-2">
              {note}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function RecommendedBySection({
  placeId,
  recommenders,
  recommenderCount,
}: {
  placeId: string
  recommenders: PublicPlaceRecommender[]
  recommenderCount: number
}) {
  const [open, setOpen] = useState(false)
  const moreCount = Math.max(0, recommenderCount - recommenders.length)

  return (
    <section aria-labelledby="recs-title" className="w-full text-left">
      <h2 id="recs-title" className="mb-4 text-[20px] font-semibold tracking-[-0.015em]">Recommended by</h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {recommenders.map((person, index) => (
          <RecommenderCard
            key={`${person.displayName}-${person.createdAt ?? index}`}
            person={person}
          />
        ))}
      </ul>
      {moreCount > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 text-[14px] font-semibold text-n-accent-strong hover:underline"
        >
          View all {formatCount(recommenderCount)} recommendations
        </button>
      ) : null}

      <RecommendersSheet
        open={open}
        onClose={() => setOpen(false)}
        placeId={placeId}
        initial={recommenders}
        totalCount={recommenderCount}
      />
    </section>
  )
}

function StoriesSection({
  stories,
  moreCount,
}: {
  stories: PublicPlaceStoryPreview[]
  moreCount: number
}) {
  const [viewer, setViewer] = useState<{
    uris: string[]
    index: number
  } | null>(null)
  const [commentsStory, setCommentsStory] = useState<PublicPlaceStoryPreview | null>(
    null,
  )
  const hydrated = useHydrated()

  return (
    <section aria-labelledby="stories-title" className="w-full text-left">
      <h2 id="stories-title" className="mb-4 text-[20px] font-semibold tracking-[-0.015em]">
        Stories from this place
      </h2>
      <ul className="space-y-4">
        {stories.map(story => {
          const uris = storyMediaUris(story)
          const typeLabel = formatStoryType(story.type)
          const relative = hydrated ? formatRelativeDate(story.createdAt) : null
          const comments = story.commentsPreview ?? []
          const commentCount = story.commentCount ?? 0

          return (
            <li
              key={story.id}
              className="overflow-hidden rounded-2xl border border-n-line bg-n-surface"
            >
              <div className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <PersonAvatar
                    name={story.author.displayName}
                    avatarUrl={story.author.avatarUrl}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-n-ink">
                        {story.author.displayName}
                      </p>
                      {typeLabel ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${storyTypeClasses(story.type)}`}
                        >
                          {typeLabel}
                        </span>
                      ) : null}
                    </div>
                    {relative ? (
                      <p className="mt-0.5 text-[12px] text-n-subtle">{relative}</p>
                    ) : null}
                  </div>
                </div>

                {story.caption ? (
                  <p className="whitespace-pre-wrap text-[15px] leading-6 text-n-ink-2">
                    {story.caption}
                  </p>
                ) : null}
              </div>

              {uris.length > 0 ? (
                <div className="px-2 pb-2 sm:px-3 sm:pb-3">
                  <StoryPhotoCollage
                    uris={uris}
                    onPressPhoto={index => setViewer({ uris, index })}
                  />
                </div>
              ) : null}

              {(comments.length > 0 || commentCount > 0) && (
                <div className="space-y-2.5 border-t border-n-line-soft px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-n-subtle">
                    Comments
                    {commentCount > 0 ? (
                      <span className="ml-1 font-medium normal-case text-n-muted">
                        · {formatCount(commentCount)}
                      </span>
                    ) : null}
                  </p>
                  {comments.length > 0 ? (
                    <ul className="space-y-2.5">
                      {comments.map((comment, index) => (
                        <li
                          key={`${story.id}-c-${index}`}
                          className="flex gap-2.5"
                        >
                          <PersonAvatar
                            name={comment.displayName}
                            avatarUrl={comment.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] text-n-ink-2">
                              <span className="font-semibold text-n-ink">
                                {comment.displayName}
                              </span>{' '}
                              <span>{comment.text}</span>
                            </p>
                            {hydrated && formatRelativeDate(comment.createdAt) ? (
                              <p className="mt-0.5 text-[11px] text-n-subtle">
                                {formatRelativeDate(comment.createdAt)}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {commentCount > comments.length ? (
                    <button
                      type="button"
                      onClick={() => setCommentsStory(story)}
                      className="text-[13px] font-semibold text-n-accent-strong hover:underline"
                    >
                      View all {formatCount(commentCount)} comments
                    </button>
                  ) : null}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {moreCount > 0 ? (
        <p className="mt-3 text-[13px] text-n-subtle">
          +{formatCount(moreCount)} more stor{moreCount === 1 ? 'y' : 'ies'} in the{' '}
          {siteConfig.name} app
        </p>
      ) : null}

      <StoryMediaViewer
        key={
          viewer
            ? `${viewer.uris[0] ?? 'x'}-${viewer.index}-${viewer.uris.length}`
            : 'closed'
        }
        open={Boolean(viewer)}
        uris={viewer?.uris ?? []}
        initialIndex={viewer?.index ?? 0}
        onClose={() => setViewer(null)}
      />

      <CommentsSheet
        open={Boolean(commentsStory)}
        onClose={() => setCommentsStory(null)}
        story={commentsStory}
      />
    </section>
  )
}

function RecommendersSheet({
  open,
  onClose,
  placeId,
  initial,
  totalCount,
}: {
  open: boolean
  onClose: () => void
  placeId: string
  initial: PublicPlaceRecommender[]
  totalCount: number
}) {
  const [items, setItems] = useState<PublicPlaceRecommender[]>(initial)
  const [cursor, setCursor] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) {
        return
      }
      setItems(initial)
      setCursor(undefined)
      setError(null)
      setLoading(true)
      setBooted(false)
      fetchPublicPlaceRecommenders({ placeId, pageSize: 20 })
        .then(page => {
          if (cancelled) {
            return
          }
          setItems(page.recommenders)
          setCursor(page.nextCursor)
          setBooted(true)
        })
        .catch(() => {
          if (!cancelled) {
            setError('Could not load recommendations.')
            setBooted(true)
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
          }
        })
    })
    return () => {
      cancelled = true
    }
  }, [open, placeId, initial])

  const loadMore = () => {
    if (!cursor || loading) {
      return
    }
    setLoading(true)
    fetchPublicPlaceRecommenders({ placeId, cursor, pageSize: 20 })
      .then(page => {
        setItems(prev => [...prev, ...page.recommenders])
        setCursor(page.nextCursor)
      })
      .catch(() => setError('Could not load more.'))
      .finally(() => setLoading(false))
  }

  return (
    <PlaceSheet
      open={open}
      onClose={onClose}
      title={`Recommended by · ${formatCount(totalCount)}`}
      footer={
        cursor ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="w-full rounded-xl border border-n-line-strong bg-n-surface px-4 py-2.5 text-sm font-semibold text-n-ink hover:bg-n-hover disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : null
      }
    >
      {loading && !booted ? (
        <ul className="space-y-2.5" aria-busy="true">
          {[0, 1, 2, 3].map(i => (
            <li
              key={i}
              className="rounded-xl border border-n-line bg-n-surface px-3 py-2.5"
            >
              <div className="flex items-start gap-3">
                <SkeletonBone className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonBone className="h-3.5 w-28 rounded" />
                  <SkeletonBone className="h-3 w-full rounded" />
                  <SkeletonBone className="h-3 w-2/3 rounded" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-n-muted">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-n-subtle">
          No recommendations yet.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((person, index) => (
            <RecommenderCard
              key={`${person.displayName}-${person.createdAt ?? index}`}
              person={person}
            />
          ))}
        </ul>
      )}
    </PlaceSheet>
  )
}

function CommentsSheet({
  open,
  onClose,
  story,
}: {
  open: boolean
  onClose: () => void
  story: PublicPlaceStoryPreview | null
}) {
  const [items, setItems] = useState<PublicPlaceComment[]>([])
  const [cursor, setCursor] = useState<string | undefined>()
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    if (!open || !story) {
      return
    }
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) {
        return
      }
      setItems(story.commentsPreview ?? [])
      setTotal(story.commentCount ?? 0)
      setCursor(undefined)
      setError(null)
      setLoading(true)
      setBooted(false)
      fetchPublicStoryComments({ storyId: story.id, pageSize: 20 })
        .then(page => {
          if (cancelled) {
            return
          }
          setItems(page.comments)
          setTotal(page.commentCount)
          setCursor(page.nextCursor)
          setBooted(true)
        })
        .catch(() => {
          if (!cancelled) {
            setError('Could not load comments.')
            setBooted(true)
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
          }
        })
    })
    return () => {
      cancelled = true
    }
  }, [open, story])

  const loadMore = () => {
    if (!story || !cursor || loading) {
      return
    }
    setLoading(true)
    fetchPublicStoryComments({
      storyId: story.id,
      cursor,
      pageSize: 20,
    })
      .then(page => {
        setItems(prev => [...prev, ...page.comments])
        setCursor(page.nextCursor)
        setTotal(page.commentCount)
      })
      .catch(() => setError('Could not load more.'))
      .finally(() => setLoading(false))
  }

  return (
    <PlaceSheet
      open={open}
      onClose={onClose}
      title={`Comments · ${formatCount(total)}`}
      footer={
        cursor ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="w-full rounded-xl border border-n-line-strong bg-n-surface px-4 py-2.5 text-sm font-semibold text-n-ink hover:bg-n-hover disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : null
      }
    >
      {loading && !booted ? (
        <ul className="space-y-3" aria-busy="true">
          {[0, 1, 2, 3, 4].map(i => (
            <li key={i} className="flex gap-2.5">
              <SkeletonBone className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <SkeletonBone className="h-3 w-24 rounded" />
                <SkeletonBone className="h-3 w-full rounded" />
                <SkeletonBone className="h-2.5 w-12 rounded" />
              </div>
            </li>
          ))}
        </ul>
      ) : error && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-n-muted">{error}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-n-subtle">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((comment, index) => (
            <li
              key={`${comment.displayName}-${comment.createdAt ?? index}`}
              className="flex gap-2.5"
            >
              <PersonAvatar
                name={comment.displayName}
                avatarUrl={comment.avatarUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-n-ink-2">
                  <span className="font-semibold text-n-ink">
                    {comment.displayName}
                  </span>{' '}
                  <span>{comment.text}</span>
                </p>
                {formatRelativeDate(comment.createdAt) ? (
                  <p className="mt-0.5 text-[11px] text-n-subtle">
                    {formatRelativeDate(comment.createdAt)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </PlaceSheet>
  )
}

function PersonAvatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string
  avatarUrl?: string
  size?: 'sm' | 'md'
}) {
  const [failed, setFailed] = useState(false)
  const dim = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'
  const showImage = Boolean(avatarUrl) && !failed

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full bg-n-accent-soft ${dim}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- Firebase download URLs
        <img
          src={avatarUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold text-n-accent-strong">
          {initialLetter(name)}
        </span>
      )}
    </div>
  )
}

function SkeletonBone({ className }: { className?: string }) {
  return <div className={`n-skeleton ${className ?? ''}`} aria-hidden />
}

function PlaceSkeleton() {
  return (
    <Container className="pt-6 pb-20 sm:pt-8">
      <span className="sr-only" role="status" aria-busy="true">
        Loading place…
      </span>
      <SkeletonBone className="h-3 w-40 rounded" />
      <SkeletonBone className="mt-6 h-4 w-24 rounded" />
      <SkeletonBone className="mt-3 h-10 w-2/3 max-w-md rounded-lg" />
      <SkeletonBone className="mt-3 h-4 w-1/2 max-w-sm rounded" />
      <SkeletonBone className="mt-6 aspect-[4/3] w-full rounded-3xl sm:aspect-[2/1] lg:aspect-[5/2]" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        <div className="space-y-3">
          <SkeletonBone className="h-5 w-40 rounded" />
          <SkeletonBone className="h-24 w-full rounded-2xl" />
          <SkeletonBone className="h-24 w-full rounded-2xl" />
        </div>
        <SkeletonBone className="h-56 w-full rounded-2xl" />
      </div>
    </Container>
  )
}

function StatusBlock({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children?: React.ReactNode
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
          {children}
        </div>
      </div>
    </Container>
  )
}
