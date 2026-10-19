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
      className={`inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ${className}`}
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
    <div className="flex gap-3 text-sm">
      <dt className="w-24 shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-gray-200 [overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

function telHref(raw: string): string {
  return `tel:${raw.replace(/[^\d+]/g, '')}`
}

function waHref(raw: string): string {
  return `https://wa.me/${raw.replace(/\D/g, '')}`
}

/**
 * Official business details below the community content (Chris's rule: the
 * Place stays the community object; the business is an added layer).
 * Server-rendered → crawlable, Nessa-owned content.
 */
export function PlaceOfficialSection({ business }: { business: PublicBusinessProfile }) {
  const rows: React.ReactNode[] = []
  if (business.hours) rows.push(<Row key="hours" label="Hours"><span className="whitespace-pre-line">{business.hours}</span></Row>)
  if (business.checkIn || business.checkOut) {
    rows.push(
      <Row key="check" label="Check-in">
        {[business.checkIn ? `from ${business.checkIn}` : null, business.checkOut ? `out by ${business.checkOut}` : null]
          .filter(Boolean)
          .join(' · ')}
      </Row>,
    )
  }
  if (business.phone) rows.push(<Row key="phone" label="Phone"><a href={telHref(business.phone)} className="text-violet-300 hover:text-violet-200">{business.phone}</a></Row>)
  if (business.whatsapp) rows.push(<Row key="wa" label="WhatsApp"><a href={waHref(business.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:text-violet-200">{business.whatsapp}</a></Row>)
  if (business.website) {
    let label = business.website
    try { label = new URL(business.website).hostname } catch { /* keep raw */ }
    rows.push(<Row key="web" label="Website"><a href={business.website} target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:text-violet-200">{label}</a></Row>)
  }
  if (business.amenities?.length) rows.push(<Row key="am" label="Amenities">{business.amenities.join(' · ')}</Row>)
  if (business.languages?.length) rows.push(<Row key="lang" label="Staff speak">{business.languages.map(l => l.toUpperCase()).join(', ')}</Row>)

  return (
    <section className="mt-6 w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 text-left">
      <div className="flex items-start gap-3">
        {business.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- business-provided https URL
          <img src={business.logoUrl} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-white">{business.name}</h2>
            <VerifiedBadge />
          </div>
          <p className="text-xs text-gray-500">
            Official information from the {CATEGORY_LABELS[business.category ?? ''] ?? 'business'}
          </p>
        </div>
      </div>
      {business.description ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-300">{business.description}</p>
      ) : null}
      {rows.length ? <dl className="mt-3 space-y-2">{rows}</dl> : null}
    </section>
  )
}
