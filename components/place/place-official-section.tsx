import { PlaceMessageButton } from '@/components/place/place-message-button'
import { PlaceOpeningHours } from '@/components/place/place-opening-hours'
import { siteButtonClass } from '@/components/site/ui'
import { SOCIAL_LABELS, SOCIAL_NETWORKS, type SocialNetwork } from '@/lib/business-profile'
import { canMessageBusiness } from '@/lib/customer-messages'
import type { PublicBusinessProfile } from '@/lib/place-landing'

const CATEGORY_LABELS: Record<string, string> = {
  hostel: 'Hostel',
  hotel: 'Hotel / Pousada',
  restaurant: 'Restaurant',
  bar: 'Bar',
  cafe: 'Café',
  kite_school: 'Kite / Surf school',
  tour: 'Tours & activities',
  shop: 'Shop',
  other: 'Business',
}

export function VerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-n-accent-soft px-2 py-0.5 text-[12px] font-semibold text-n-accent-strong ${className}`}
      title="Verified business"
    >
      <svg viewBox="0 0 20 20" aria-hidden className="size-3.5 fill-current">
        <path d="M10 1.5l2.3 1.6 2.8-.3 1 2.6 2.4 1.5-.6 2.8.6 2.8-2.4 1.5-1 2.6-2.8-.3L10 18.5l-2.3-1.6-2.8.3-1-2.6-2.4-1.5.6-2.8-.6-2.8 2.4-1.5 1-2.6 2.8.3L10 1.5zm-1.2 11.2l5-5-1.4-1.4-3.6 3.6-1.6-1.6-1.4 1.4 3 3z" />
      </svg>
      Verified
    </span>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 border-t border-n-line-soft py-2.5 text-[14px] first:border-t-0">
      <dt className="w-28 shrink-0 text-n-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 text-n-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

function telHref(raw: string): string {
  return `tel:${raw.replace(/[^\d+]/g, '')}`
}

function waHref(raw: string): string {
  return `https://wa.me/${raw.replace(/\D/g, '')}`
}

const PRICE_LABELS: Record<string, string> = {
  $: 'Inexpensive',
  $$: 'Moderate',
  $$$: 'Expensive',
  $$$$: 'Very expensive',
}

const linkClass = 'font-medium text-n-accent-strong hover:underline'

/** Simple brand marks (24×24, currentColor) — no icon dependency. */
function SocialGlyph({ network }: { network: SocialNetwork }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }
  switch (network) {
    case 'instagram':
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="3.8" />
          <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'facebook':
      return (
        <svg {...common}>
          <path d="M14.5 21v-7.5h2.6l.4-3H14.5V8.7c0-.9.3-1.5 1.5-1.5h1.6V4.6A21 21 0 0 0 15.3 4.5c-2.3 0-3.8 1.4-3.8 3.9v2.1H9v3h2.5V21" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg {...common}>
          <path d="M13.5 3.5v11.3a3.3 3.3 0 1 1-3.3-3.3" />
          <path d="M13.5 3.5c.4 2.6 2.4 4.6 5 4.8" />
        </svg>
      )
    case 'youtube':
      return (
        <svg {...common}>
          <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
          <path d="m10.2 9.3 4.6 2.7-4.6 2.7Z" fill="currentColor" />
        </svg>
      )
    case 'x':
      return (
        <svg {...common}>
          <path d="M4.5 4.5h4l11 15h-4Z" />
          <path d="M19.2 4.5 13.4 11M4.8 19.5l5.9-6.5" />
        </svg>
      )
  }
}

/**
 * Official business details below the community content (Chris's rule: the
 * Place stays the community object; the business is an added layer).
 * Server-rendered → crawlable, Nessa-owned content. `business` is already
 * sanitized (lib/business-profile.ts), so its links are safe http(s) URLs.
 */
export function PlaceOfficialSection({ business, placeId }: { business: PublicBusinessProfile; placeId: string }) {
  const rows: React.ReactNode[] = []
  if (business.address) rows.push(<Row key="addr" label="Address">{business.address}</Row>)
  if (business.openingHours) {
    rows.push(
      <Row key="hours" label="Hours">
        <div className="-ml-2">
          <PlaceOpeningHours hours={business.openingHours} />
        </div>
        {business.hours ? (
          <p className="mt-1.5 text-[13px] leading-5 whitespace-pre-line text-n-muted">{business.hours}</p>
        ) : null}
      </Row>,
    )
  } else if (business.hours) {
    rows.push(<Row key="hours" label="Hours"><span className="whitespace-pre-line">{business.hours}</span></Row>)
  }
  if (business.checkIn || business.checkOut) {
    rows.push(
      <Row key="check" label="Check-in">
        {[business.checkIn ? `from ${business.checkIn}` : null, business.checkOut ? `out by ${business.checkOut}` : null]
          .filter(Boolean)
          .join(' · ')}
      </Row>,
    )
  }
  if (business.phone) rows.push(<Row key="phone" label="Phone"><a href={telHref(business.phone)} className={linkClass}>{business.phone}</a></Row>)
  if (business.whatsapp) rows.push(<Row key="wa" label="WhatsApp"><a href={waHref(business.whatsapp)} target="_blank" rel="noopener noreferrer" className={linkClass}>{business.whatsapp}</a></Row>)
  if (business.email) rows.push(<Row key="email" label="Email"><a href={`mailto:${business.email}`} className={linkClass}>{business.email}</a></Row>)
  if (business.website) {
    let label = business.website
    try { label = new URL(business.website).hostname.replace(/^www\./, '') } catch { /* keep raw */ }
    rows.push(<Row key="web" label="Website"><a href={business.website} target="_blank" rel="noopener noreferrer" className={linkClass}>{label}</a></Row>)
  }
  if (business.priceRange) {
    rows.push(
      <Row key="price" label="Price">
        <span className="font-medium tracking-wide">{business.priceRange}</span>
        <span className="text-n-muted"> · {PRICE_LABELS[business.priceRange]}</span>
      </Row>,
    )
  }
  if (business.paymentMethods?.length) rows.push(<Row key="pay" label="Payment">{business.paymentMethods.join(' · ')}</Row>)
  if (business.amenities?.length) rows.push(<Row key="am" label="Amenities">{business.amenities.join(' · ')}</Row>)
  if (business.languages?.length) rows.push(<Row key="lang" label="Staff speak">{business.languages.map(l => l.toUpperCase()).join(', ')}</Row>)

  const socials = SOCIAL_NETWORKS.filter(n => business.socials?.[n])
  // Travelers can message a verified business unless it turned messaging off.
  const canMessage = canMessageBusiness(business)
  // The Message slot also shows team members "This is your business" (even
  // with messaging off); the button hides itself otherwise (`empty:hidden`).
  const messageSlot = canMessage || Boolean(business.verified === true && business.businessId)
  const hasActions = Boolean(messageSlot || business.bookingUrl || business.menuUrl)

  return (
    <section aria-label={`About ${business.name}`} className="w-full rounded-2xl border border-n-line bg-n-surface p-5 text-left shadow-n-card sm:p-6">
      <div className="flex items-start gap-3">
        {business.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- business-provided https URL
          <img src={business.logoUrl} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-semibold text-n-ink">{business.name}</h2>
            <VerifiedBadge />
          </div>
          <p className="text-[13px] text-n-muted">
            Official information from the {CATEGORY_LABELS[business.category ?? ''] ?? 'business'}
          </p>
        </div>
      </div>
      {business.description ? (
        <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-n-ink-2">{business.description}</p>
      ) : null}
      {hasActions ? (
        <div className="mt-4 flex flex-wrap gap-2 empty:hidden">
          {messageSlot ? (
            <PlaceMessageButton
              placeId={placeId}
              business={business}
              variant={business.bookingUrl ? 'secondary' : 'primary'}
              className="max-[400px]:flex-1"
            />
          ) : null}
          {business.bookingUrl ? (
            <a href={business.bookingUrl} target="_blank" rel="noopener noreferrer" className={siteButtonClass('primary', 'md', 'max-[400px]:flex-1')}>
              Book now
            </a>
          ) : null}
          {business.menuUrl ? (
            <a href={business.menuUrl} target="_blank" rel="noopener noreferrer" className={siteButtonClass('secondary', 'md', 'max-[400px]:flex-1')}>
              See menu
            </a>
          ) : null}
        </div>
      ) : null}
      {rows.length ? <dl className="mt-4">{rows}</dl> : null}
      {socials.length ? (
        <div className="mt-1 flex items-center gap-4 border-t border-n-line-soft pt-3">
          <span className="w-28 shrink-0 text-[14px] text-n-subtle">Follow</span>
          <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
            {socials.map(network => (
              <li key={network}>
                <a
                  href={business.socials?.[network]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${business.name} on ${SOCIAL_LABELS[network]}`}
                  title={SOCIAL_LABELS[network]}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-n-line text-n-ink-2 transition-colors hover:border-n-line-strong hover:bg-n-hover hover:text-n-ink"
                >
                  <SocialGlyph network={network} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
