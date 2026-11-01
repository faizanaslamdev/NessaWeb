/**
 * Credits on the public Place page (server-safe, no client JS).
 *
 * Google Maps Platform terms: a Google photo is shown with its author
 * attribution(s) and a link to the photo on Google Maps; Places content shown
 * outside a Google map carries a "Google Maps" attribution. NessaChat's own
 * photos get a plain credit.
 */

import { cx } from '@/components/site/ui'
import type { GooglePhotoAttribution } from '@/lib/place-landing'

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

export function NessaPhotoCredit({ name, className }: { name?: string; className?: string }) {
  if (!name) return null
  return <CreditPill className={className}>Photo: {name}</CreditPill>
}

/** "Photo: Author · Google Maps" with links, for a Google photo. */
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
