'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'

import { Icon, type IconName } from '@/components/dash/icons'
import { VerifiedMark, cx } from '@/components/site/ui'
import { cardPhotoUrl, loadDirectoryPhotos } from '@/lib/place-directory-client'
import { compactCount, placeCategory, placeHref, placeTypeLabel, type DirectoryPlace } from '@/lib/place-directory'

/* One shared photo map for every card on the page (one callable per tab). */
let photos: Record<string, string> = {}
let requested = false
const listeners = new Set<() => void>()
function subscribe(fn: () => void) {
  listeners.add(fn)
  if (!requested) {
    requested = true
    void loadDirectoryPhotos().then(p => {
      photos = p
      listeners.forEach(l => l())
    })
  }
  return () => listeners.delete(fn)
}
function usePhotoUrl(place: DirectoryPlace): string | null {
  const fromMap = useSyncExternalStore(
    subscribe,
    () => photos[place.placeId] ?? null,
    () => null,
  )
  return place.photoUrl ?? fromMap
}

const CATEGORY_ICON: Record<string, IconName> = { stay: 'home', eat: 'chat', beach: 'sparkle', do: 'compass' }
const CATEGORY_TINT: Record<string, string> = {
  stay: 'bg-[#efe9fb] text-[#5b46e5]',
  eat: 'bg-[#fbeee4] text-[#a2531c]',
  beach: 'bg-[#e4f1f2] text-[#0f6f73]',
  do: 'bg-[#eaf1e4] text-[#3f6b1f]',
}

export function PlacePhoto({
  place,
  className,
  sizes = 480,
}: {
  place: DirectoryPlace
  className?: string
  sizes?: number
}) {
  const url = usePhotoUrl(place)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailed(false)
  }, [url])
  const category = placeCategory(place.placeType) ?? 'do'
  return (
    <div className={cx('relative overflow-hidden', CATEGORY_TINT[category], className)}>
      <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
        <Icon name={place.placeType.toLowerCase() === 'locality' ? 'pin' : CATEGORY_ICON[category]} size={34} strokeWidth={1.5} />
      </div>
      {url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google Places media URLs
        <img
          src={cardPhotoUrl(url, sizes)}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  )
}

export function PlaceCard({ place, priority = false }: { place: DirectoryPlace; priority?: boolean }) {
  const where = [place.city, place.country].filter(Boolean).join(', ')
  return (
    <Link
      href={placeHref(place)}
      prefetch={priority ? undefined : false}
      className="group block rounded-2xl text-n-ink no-underline outline-offset-4"
    >
      <PlacePhoto place={place} className="aspect-[4/3] rounded-2xl" />
      <div className="mt-3 px-0.5">
        <div className="flex items-center gap-1.5">
          <h3 className="min-w-0 truncate text-[16px] font-semibold tracking-[-0.01em] group-hover:underline group-hover:underline-offset-4">
            {place.name}
          </h3>
          {place.verified ? <VerifiedMark className="shrink-0" /> : null}
        </div>
        <p className="mt-0.5 truncate text-[14px] text-n-muted">
          {placeTypeLabel(place.placeType)}
          {where ? ` · ${where}` : ''}
        </p>
        <PlaceStatsLine place={place} className="mt-1.5" />
      </div>
    </Link>
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
  const body = (
    <>
      <PlacePhoto place={place} className="size-12 shrink-0 rounded-xl [&_svg]:size-5" sizes={160} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold text-n-ink">{place.name}</span>
          {place.verified ? <VerifiedMark className="shrink-0 [&_svg]:size-4" /> : null}
        </span>
        <span className="block truncate text-[13px] text-n-muted">
          {placeTypeLabel(place.placeType)}
          {where ? ` · ${where}` : ''}
        </span>
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
