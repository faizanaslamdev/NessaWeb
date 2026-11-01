'use client'

/**
 * The NessaChat gallery on the public Place page (business / admin uploads).
 * The photo viewer loads only when a photo is opened.
 */

import { useState } from 'react'
import dynamic from 'next/dynamic'

import { cx } from '@/components/site/ui'
import type { PublicPlacePhoto } from '@/lib/place-landing'

const StoryMediaViewer = dynamic(
  () => import('@/components/place/story-media-viewer').then(m => m.StoryMediaViewer),
  { ssr: false },
)

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
      {viewer !== null ? (
        <StoryMediaViewer
          key={`gallery-${viewer}`}
          open
          uris={photos.map(p => p.url)}
          initialIndex={viewer}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </section>
  )
}
