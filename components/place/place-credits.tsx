/**
 * Credits on the public Place page (server-safe, no client JS).
 *
 * Google Maps Platform terms: Places content shown outside a Google map
 * carries a "Google Maps" attribution. NessaChat's own photos get a plain
 * credit. (Google's photos are not shown on the website.)
 */

import { cx } from '@/components/site/ui'

/** "Google Maps" in the attribution style Google asks for (Roboto/Arial, no restyling). */
export function GoogleMapsMark({ className }: { className?: string }) {
  return (
    <span translate="no" className={cx('font-[Roboto,Arial,sans-serif] font-medium whitespace-nowrap', className)}>
      Google Maps
    </span>
  )
}

/** Small pill over a photo (bottom corner), readable on any image. */
export function NessaPhotoCredit({ name, className }: { name?: string; className?: string }) {
  if (!name) return null
  return (
    <p
      className={cx(
        'max-w-[calc(100%-1.5rem)] truncate rounded-full bg-black/55 px-2.5 py-1 text-[12px] leading-4 text-white backdrop-blur-sm',
        className,
      )}
    >
      Photo: {name}
    </p>
  )
}
