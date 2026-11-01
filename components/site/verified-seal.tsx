/**
 * The verified mark: a filled, symmetric 8-lobed seal with a white check
 * (Lucide "badge-check" geometry, ISC licence). Server-safe, no state. Size
 * and colour come from `className` (fill is `currentColor`, default accent).
 *
 * The outline is drawn with the same colour as the fill so the lobes stay
 * round and crisp at 14–18 px instead of turning into a spiky star.
 */

const SEAL =
  'M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z'

export const VERIFIED_TITLE = 'Verified by Nessa'
export const VERIFIED_BODY =
  'The Nessa team confirmed this place is run by its real owner. Official details, hours and messages come from the business.'

export function VerifiedSeal({ className = 'size-4 text-n-accent' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <path d={SEAL} fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" fill="none" stroke="#fff" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
