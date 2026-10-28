'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import { Icon, type IconName } from '@/components/dash/icons'
import { VerifiedMark, cx } from '@/components/site/ui'
import {
  compactCount,
  placeCategory,
  placeHref,
  placeTypeLabel,
  type DirectoryPlace,
  type GoogleListingPhoto,
} from '@/lib/place-directory'
import { useGoogleListingPhoto } from '@/lib/place-directory-client'
import { sizedGooglePlacePhotoUrl } from '@/lib/place-photo'

const CATEGORY_ICON: Record<string, IconName> = { stay: 'home', eat: 'chat', beach: 'sparkle', do: 'compass' }
const CATEGORY_TINT: Record<string, string> = {
  stay: 'bg-[#efe9fb] text-[#5b46e5]',
  eat: 'bg-[#fbeee4] text-[#a2531c]',
  beach: 'bg-[#e4f1f2] text-[#0f6f73]',
  do: 'bg-[#eaf1e4] text-[#3f6b1f]',
}

type ListingPhoto =
  | { kind: 'nessa'; url: string }
  | { kind: 'google'; url: string; authors: GoogleListingPhoto['authors']; googleMapsUri?: string }

/** True once the element is within `margin` of the viewport (stays true). */
function useNearViewport<T extends Element>(margin = '200px') {
  const ref = useRef<T | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (typeof IntersectionObserver === 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNear(true)
      return
    }
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setNear(true)
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [near, margin])
  return { ref, near }
}

/**
 * The card's photo: NessaChat's own photo (from the server HTML), else
 * Google's photo — looked up and loaded only once the card is near the
 * viewport (each Google image load is billed) — else none (placeholder).
 */
function useListingPhoto<T extends Element>(place: DirectoryPlace, px: number) {
  const { ref, near } = useNearViewport<T>()
  const google = useGoogleListingPhoto(place.placeId, near && !place.photoUrl)
  let photo: ListingPhoto | null = null
  if (place.photoUrl) photo = { kind: 'nessa', url: place.photoUrl }
  else if (google) {
    photo = { kind: 'google', url: sizedGooglePlacePhotoUrl(google.url, px), authors: google.authors }
    if (google.googleMapsUri) photo.googleMapsUri = google.googleMapsUri
  }
  return { ref, photo, near }
}

function PhotoFrame({
  place,
  photo,
  load,
  className,
  frameRef,
  onFailed,
}: {
  place: DirectoryPlace
  photo: ListingPhoto | null
  load: boolean
  className?: string
  frameRef?: React.Ref<HTMLDivElement>
  onFailed?: () => void
}) {
  const url = load ? (photo?.url ?? null) : null
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const category = placeCategory(place.placeType) ?? 'do'
  return (
    <div ref={frameRef} className={cx('relative overflow-hidden', CATEGORY_TINT[category], className)}>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
        <Icon name={place.placeType.toLowerCase() === 'locality' ? 'pin' : CATEGORY_ICON[category]} size={34} strokeWidth={1.5} />
      </div>
      {url && failedUrl !== url ? (
        // eslint-disable-next-line @next/next/no-img-element -- our own pre-sized variant, or Google's (browser-only)
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          data-photo-source={photo?.kind}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => {
            setFailedUrl(url)
            onFailed?.()
          }}
        />
      ) : null}
    </div>
  )
}

/** Required credits for a Google photo (author + Google Maps), compact. */
function GoogleCredit({
  photo,
  links,
  className,
}: {
  photo: Extract<ListingPhoto, { kind: 'google' }>
  links: boolean
  className?: string
}) {
  const author = photo.authors[0]
  const maps = (
    <span translate="no" className="font-[Roboto,Arial,sans-serif] font-medium">
      Google Maps
    </span>
  )
  return (
    <span className={className}>
      {author ? (
        <>
          Photo:{' '}
          {links && author.uri ? (
            <a href={author.uri} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
              {author.displayName}
            </a>
          ) : (
            author.displayName
          )}
          {' · '}
        </>
      ) : null}
      {links && photo.googleMapsUri ? (
        <a
          href={photo.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View this photo on Google Maps (opens in a new tab)"
          className="underline-offset-2 hover:underline"
        >
          {maps}
        </a>
      ) : (
        maps
      )}
    </span>
  )
}

/** Photo with the category placeholder — used where no credit line fits. */
export function PlacePhoto({ place, className }: { place: DirectoryPlace; className?: string }) {
  const { ref, photo, near } = useListingPhoto<HTMLDivElement>(place, 480)
  return <PhotoFrame place={place} photo={photo} load={near} className={className} frameRef={ref} />
}

export function PlaceCard({ place, priority = false }: { place: DirectoryPlace; priority?: boolean }) {
  const where = [place.city, place.country].filter(Boolean).join(', ')
  const { ref, photo, near } = useListingPhoto<HTMLDivElement>(place, 480)
  const [failed, setFailed] = useState(false)
  return (
    <div className="group relative">
      <PhotoFrame
        place={place}
        photo={photo}
        load={near}
        className="aspect-[4/3] rounded-2xl"
        frameRef={ref}
        onFailed={() => setFailed(true)}
      />
      <div className="mt-3 px-0.5">
        <div className="flex items-center gap-1.5">
          <h3 className="min-w-0 truncate text-[16px] font-semibold tracking-[-0.01em] group-hover:underline group-hover:underline-offset-4">
            {/* Stretched link: the whole card is clickable; the photo credits stay separate links. */}
            <Link
              href={placeHref(place)}
              prefetch={priority ? undefined : false}
              className="text-n-ink no-underline outline-offset-4 after:absolute after:inset-0 after:rounded-2xl after:content-['']"
            >
              {place.name}
            </Link>
          </h3>
          {place.verified ? <VerifiedMark className="shrink-0" /> : null}
        </div>
        <p className="mt-0.5 truncate text-[14px] text-n-muted">
          {placeTypeLabel(place.placeType)}
          {where ? ` · ${where}` : ''}
        </p>
        <PlaceStatsLine place={place} className="mt-1.5" />
      </div>
      {photo?.kind === 'google' && near && !failed ? (
        <span className="pointer-events-none absolute inset-x-0 top-0 z-10 flex aspect-[4/3] items-end p-2">
          <GoogleCredit
            photo={photo}
            links
            className="pointer-events-auto max-w-full truncate rounded-full bg-black/55 px-2 py-0.5 text-[11px] leading-4 text-white backdrop-blur-sm"
          />
        </span>
      ) : null}
    </div>
  )
}

export function PlaceStatsLine({ place, className }: { place: DirectoryPlace; className?: string }) {
  const bits: string[] = []
  if (place.recommenderCount > 0) bits.push(`${compactCount(place.recommenderCount)} recommended`)
  if (place.storyCount > 0) bits.push(`${compactCount(place.storyCount)} ${place.storyCount === 1 ? 'story' : 'stories'}`)
  if (bits.length === 0) return null
  return (
    <p className={cx('flex items-center gap-1.5 text-[13px] text-n-subtle', className)}>
      <Icon name="star" size={13} className="text-n-accent" strokeWidth={2} />
      <span>{bits.join(' · ')}</span>
    </p>
  )
}

/** Compact row for search results and claim lists. */
export function PlaceRow({
  place,
  action,
  href,
}: {
  place: DirectoryPlace
  action?: React.ReactNode
  href?: string
}) {
  const where = [place.city, place.country].filter(Boolean).join(', ')
  const { ref, photo, near } = useListingPhoto<HTMLDivElement>(place, 160)
  const [failed, setFailed] = useState(false)
  const body = (
    <>
      <PhotoFrame
        place={place}
        photo={photo}
        load={near}
        className="size-12 shrink-0 rounded-xl [&_svg]:size-5"
        frameRef={ref}
        onFailed={() => setFailed(true)}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold text-n-ink">{place.name}</span>
          {place.verified ? <VerifiedMark className="shrink-0 [&_svg]:size-4" /> : null}
        </span>
        <span className="block truncate text-[13px] text-n-muted">
          {placeTypeLabel(place.placeType)}
          {where ? ` · ${where}` : ''}
        </span>
        {photo?.kind === 'google' && near && !failed ? (
          // Rows sit inside links / options, so the credit is plain text here.
          <GoogleCredit photo={photo} links={false} className="block truncate text-[11px] leading-4 text-n-subtle" />
        ) : null}
      </span>
    </>
  )
  return (
    <div className="flex items-center gap-3">
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 no-underline">
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {action}
    </div>
  )
}
