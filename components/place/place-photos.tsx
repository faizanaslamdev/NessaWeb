'use client'

/**
 * Photo credits and the NessaChat gallery on the public Place page.
 *
 * Google Maps Platform terms: a Google photo is shown with its author
 * attribution(s) and a link to the photo on Google Maps; Places content shown
 * outside a Google map carries a "Google Maps" attribution. NessaChat's own
 * photos get a plain credit.
 */

import { useState } from 'react'

import { StoryMediaViewer } from '@/components/place/story-media-viewer'
import { cx } from '@/components/site/ui'
import type { GooglePhotoAttribution, PublicPlacePhoto } from '@/lib/place-landing'

/** "Google Maps" in the attribution style Google asks for (Roboto/Arial, no restyling). */
export function GoogleMapsMark({ className }: { className?: string }) {
  return (
    <span translate="no" className={cx('font-[Roboto,Arial,sans-serif] font-medium whitespace-nowrap', className)}>
      Google Maps
    </span>
  )
}

/** Small pill over a photo (bottom corner), readable on any image. */
function CreditPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cx(
        'max-w-[calc(100%-1.5rem)] truncate rounded-full bg-black/55 px-2.5 py-1 text-[12px] leading-4 text-white backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </p>
  )
}

export function GooglePhotoCredit({
  attribution,
  className,
}: {
  attribution?: GooglePhotoAttribution
  className?: string
}) {
  const authors = attribution?.authors ?? []
  return (
    <CreditPill className={className}>
      {authors.length ? (
        <>
          Photo:{' '}
          {authors.map((a, i) => (
            <span key={`${a.displayName}-${i}`}>
              {i > 0 ? ', ' : ''}
              {a.uri ? (
                <a href={a.uri} target="_blank" rel="noopener noreferrer" className="text-white underline-offset-2 hover:underline">
                  {a.displayName}
                </a>
              ) : (
                a.displayName
              )}
            </span>
          ))}
          {' · '}
        </>
      ) : null}
      {attribution?.googleMapsUri ? (
        <a
          href={attribution.googleMapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white underline-offset-2 hover:underline"
          aria-label="View this photo on Google Maps (opens in a new tab)"
        >
          <GoogleMapsMark />
        </a>
      ) : (
        <GoogleMapsMark />
      )}
    </CreditPill>
  )
}

export function NessaPhotoCredit({ name, className }: { name?: string; className?: string }) {
  if (!name) return null
  return <CreditPill className={className}>Photo: {name}</CreditPill>
}

/** Gallery of photos the Place's business (or Nessa) uploaded. */
export function PlaceGallerySection({ photos, placeName }: { photos: PublicPlacePhoto[]; placeName: string }) {
  const [viewer, setViewer] = useState<number | null>(null)
  if (photos.length === 0) return null
  const shown = photos.slice(0, 8)
  return (
    <section aria-labelledby="place-photos-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="place-photos-heading" className="text-[20px] font-semibold tracking-[-0.01em]">
          Photos
        </h2>
        <p className="text-[13px] text-n-subtle">{photos.length === 1 ? '1 photo' : `${photos.length} photos`}</p>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {shown.map((p, i) => (
          <li key={p.id} className={cx(i === 0 && shown.length > 2 ? 'col-span-2 row-span-2' : '')}>
            <button
              type="button"
              onClick={() => setViewer(i)}
              className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl bg-n-sunken p-0"
              aria-label={p.caption ? `${p.caption} — view photo` : `View photo ${i + 1} of ${placeName}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- our own pre-sized variant */}
              <img
                src={p.feedUrl || p.url}
                alt={p.caption ?? ''}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </button>
          </li>
        ))}
      </ul>
      {photos.some(p => p.creditName) ? (
        <p className="mt-2 text-[12px] text-n-subtle">
          Photos by {[...new Set(photos.map(p => p.creditName).filter(Boolean))].slice(0, 3).join(', ')}
        </p>
      ) : null}
      <StoryMediaViewer
        key={viewer === null ? 'gallery-closed' : `gallery-${viewer}`}
        open={viewer !== null}
        uris={photos.map(p => p.url)}
        initialIndex={viewer ?? 0}
        onClose={() => setViewer(null)}
      />
    </section>
  )
}
