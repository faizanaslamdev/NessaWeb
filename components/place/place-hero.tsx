'use client'

/**
 * Place page hero image. Never Google's photo (see lib/place-public-view):
 * our own cover (optimized with next/image, zoomable), else the verified
 * business's cover or logo, else a neutral placeholder. A broken image falls
 * back to the placeholder.
 */

import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'

import { Icon } from '@/components/dash/icons'
import { NessaPhotoCredit } from '@/components/place/place-credits'
import type { PlaceHeroImage } from '@/lib/place-public-view'

// The viewer only loads when someone opens the photo.
const StoryMediaViewer = dynamic(
  () => import('@/components/place/story-media-viewer').then(m => m.StoryMediaViewer),
  { ssr: false },
)

const STORAGE_PREFIX = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || ''}`

/** next/image only optimizes our own bucket's files (next.config remotePatterns). */
function isOptimizable(url: string): boolean {
  return url.startsWith(STORAGE_PREFIX)
}

function Placeholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-n-faint">
      <Icon name="image" size={36} strokeWidth={1.4} />
      <span className="text-[13px]">No photo yet</span>
    </div>
  )
}

export function PlaceHero({ image, placeName }: { image: PlaceHeroImage; placeName: string }) {
  const [broken, setBroken] = useState(false)
  const [open, setOpen] = useState(false)
  // A server-rendered image can fail before hydration attaches onError:
  // check its state once it's in the DOM.
  const checkLoaded = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth === 0) setBroken(true)
  }, [])
  const kind = broken ? 'none' : image.kind
  const wide = kind === 'photo' || kind === 'business-cover'

  return (
    <div className="relative mt-6 overflow-hidden rounded-3xl bg-n-sunken">
      <div className={wide ? 'relative aspect-[4/3] w-full sm:aspect-[2/1] lg:aspect-[5/2]' : 'h-36 w-full sm:h-44'}>
        {kind === 'photo' && image.kind === 'photo' ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative block h-full w-full cursor-zoom-in p-0"
            aria-label={`View photo of ${placeName}`}
          >
            <Image
              src={image.url}
              alt=""
              fill
              sizes="(min-width: 1200px) 1136px, (min-width: 1024px) calc(100vw - 64px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
              className="object-cover"
              preload
              unoptimized={!isOptimizable(image.url)}
              ref={checkLoaded}
              onError={() => setBroken(true)}
            />
            <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
          </button>
        ) : kind === 'business-cover' && image.kind === 'business-cover' ? (
          // eslint-disable-next-line @next/next/no-img-element -- business-provided URL (any host)
          <img
            src={image.url}
            alt=""
            className="h-full w-full object-cover"
            fetchPriority="high"
            ref={checkLoaded}
            onError={() => setBroken(true)}
          />
        ) : kind === 'logo' && image.kind === 'logo' ? (
          <div className="flex h-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- business logo (any host) */}
            <img
              src={image.url}
              alt={`${image.name} logo`}
              className="max-h-24 max-w-[60%] rounded-2xl object-contain sm:max-h-28"
              ref={checkLoaded}
              onError={() => setBroken(true)}
            />
          </div>
        ) : (
          <Placeholder />
        )}
      </div>
      {kind === 'photo' && image.kind === 'photo' && image.credit ? (
        <div className="pointer-events-none absolute right-3 bottom-3 left-3 flex justify-end">
          <NessaPhotoCredit name={image.credit} />
        </div>
      ) : null}
      {open && image.kind === 'photo' && !broken ? (
        <StoryMediaViewer open uris={[image.url]} initialIndex={0} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  )
}
