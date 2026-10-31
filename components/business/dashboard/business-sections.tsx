'use client'

/**
 * Business dashboard sections: Live chat, QR codes, Stats, Guest info,
 * Team and Business details. Each call is authorized by its Cloud Function
 * (business membership / place access); these components only render.
 */

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ExternalLink, useBusiness } from '@/components/business/dashboard/business-shell'
import { OpeningHoursEditor } from '@/components/business/dashboard/opening-hours-editor'
import { PlaceStatsPanel } from '@/components/business/place-stats-panel'
import { TeamPanel } from '@/components/business/team-panel'
import { ShellTitle } from '@/components/dash/app-shell'
import { Icon } from '@/components/dash/icons'
import {
  Button,
  ButtonLink,
  CopyButton,
  Field,
  Notice,
  PageHeader,
  Panel,
  PanelFooter,
  PanelHeader,
  Segmented,
  cx,
  fieldClass,
  hintClass,
  labelClass,
} from '@/components/dash/ui'
import { QrStudio } from '@/components/manage/qr-studio'
import { PlacePhotosManager } from '@/components/manage/photos-panel'
import { PlaceWifiPanel } from '@/components/manage/wifi-panel'
import { accountRoutes } from '@/lib/account/constants'
import {
  BUSINESS_CATEGORY_LABELS,
  BusinessActionError,
  listQrPlacements,
  setBusinessMessaging,
  setPlaceChatPinnedInfo,
  updateBusinessProfile,
  type BusinessCategory,
  type QrPlacement,
} from '@/lib/business'
import {
  buildBusinessProfilePayload,
  draftFromProfile,
  splitList,
  type BusinessDetailsDraft,
} from '@/lib/business-form'
import {
  BUSINESS_PROFILE_LIMITS,
  PRICE_RANGES,
  SOCIAL_LABELS,
  SOCIAL_NETWORKS,
  type PriceRange,
  type SocialNetwork,
} from '@/lib/business-profile'
import { placeChatRetentionLabel } from '@/lib/place-chat/retention'
import {
  fetchPublicPlaceLanding,
  type PublicPlaceLanding,
} from '@/lib/place-landing'
import { buildPrearrivalCopy } from '@/lib/place-prearrival'
import { placeChatOutboundUrl, placeOutboundUrl } from '@/lib/place-slug'

function usePlaceLanding(placeId: string, reloadKey = 0): PublicPlaceLanding | null {
  const [landing, setLanding] = useState<PublicPlaceLanding | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchPublicPlaceLanding(placeId)
      .then(l => !cancelled && setLanding(l))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [placeId, reloadKey])
  return landing
}

/* ───────────── Live chat ───────────── */

const PINNED_MAX = 300

export function BusinessChatSection() {
  const { place, patchPlace } = useBusiness()
  const landing = usePlaceLanding(place.placeId)
  const chatUrl = placeChatOutboundUrl({ placeId: place.placeId, slug: place.slug })
  const [text, setText] = useState(place.pinnedText ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  // Reset the editor when switching places (not after our own save).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(place.pinnedText ?? '')
    setSaved(null)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by place only
  }, [place.placeId])

  const current = place.pinnedText ?? ''
  const dirty = text.trim() !== current.trim()

  const save = async (clear = false) => {
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      const result = await setPlaceChatPinnedInfo(place.placeId, clear ? '' : text)
      setText(result.text)
      patchPlace(place.placeId, { pinnedText: result.text })
      setSaved(result.cleared ? 'Pinned message removed.' : 'Pinned in the live chat.')
    } catch (e) {
      setError(e instanceof BusinessActionError ? e.message : 'Could not save the pinned message.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ShellTitle crumbs={[{ label: 'Live chat' }]} />
      <PageHeader
        title="Live chat"
        description="Guests and travelers nearby chat together in their browser — no app needed, auto-translated."
        actions={
          <>
            <CopyButton text={chatUrl} label="Copy chat link" size="md" />
            <ButtonLink href={chatUrl} external icon="chat" variant="primary">
              Open live chat
            </ButtonLink>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel
          as="form"
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            void save()
          }}
          aria-labelledby="pinned-h"
          noValidate
        >
          <PanelHeader
            id="pinned-h"
            icon="sparkle"
            title="Pinned welcome"
            description="Shown at the top of the chat for everyone. Keep it short and useful."
          />
          <div className="space-y-3 px-5 pb-5 max-sm:px-4">
            <label htmlFor="pinned-text" className="sr-only">
              Pinned welcome in the live chat
            </label>
            <textarea
              id="pinned-text"
              value={text}
              onChange={e => setText(e.target.value.slice(0, PINNED_MAX))}
              maxLength={PINNED_MAX}
              rows={4}
              placeholder="Welcome! Breakfast 7–10, kite lessons at the beach desk. Ask us anything here."
              className={cx(fieldClass, 'mt-0 min-h-28 resize-y')}
            />
            <div className="flex items-center justify-between text-xs text-n-subtle">
              <span>Messages you send in the chat are labelled as the business.</span>
              <span className="tabular-nums">
                {text.length}/{PINNED_MAX}
              </span>
            </div>
            {error ? <Notice tone="danger">{error}</Notice> : null}
            {saved ? <Notice tone="ok">{saved}</Notice> : null}
          </div>
          <PanelFooter>
            {current ? (
              <Button variant="quiet-danger" onClick={() => void save(true)} disabled={busy}>
                Remove
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" variant="primary" loading={busy} disabled={!dirty || !text.trim()}>
              {current ? 'Update pinned message' : 'Pin message'}
            </Button>
          </PanelFooter>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Preview" description="How the top of your chat looks." />
            <div className="px-5 pb-5 max-sm:px-4">
              <div className="rounded-xl bg-[#111] p-3 text-white">
                <p className="text-[13px] font-semibold">{place.name} Chat</p>
                <div className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-[13px] leading-5">
                  <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#c4b5fd]">
                    <Icon name="pin" size={12} /> Pinned by {place.name}
                  </p>
                  {text.trim() || <span className="text-white/50">Your welcome message appears here.</span>}
                </div>
              </div>
            </div>
          </Panel>
          <Panel>
            <PanelHeader icon="clock" title="Message history" />
            <p className="px-5 pb-5 text-[13px] leading-5 text-n-muted max-sm:px-4">
              Messages in this chat disappear after{' '}
              <span className="font-medium text-n-ink">{placeChatRetentionLabel(landing?.chatRetentionHours ?? 24)}</span>. The room stays
              open. Contact Nessa if your place needs a longer history.
            </p>
          </Panel>
        </div>
      </div>
    </>
  )
}

/* ───────────── QR codes ───────────── */

export function BusinessQrSection() {
  const { place } = useBusiness()
  const [placements, setPlacements] = useState<QrPlacement[] | null>(null)
  const [limit, setLimit] = useState(50)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlacements(null)
    listQrPlacements(place.placeId)
      .then(r => {
        if (cancelled) return
        setPlacements(r.placements)
        setLimit(r.limit)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof BusinessActionError ? e.message : 'Could not load QR placements.')
      })
    return () => {
      cancelled = true
    }
  }, [place.placeId])

  return (
    <>
      <ShellTitle crumbs={[{ label: 'QR codes' }]} />
      <PageHeader
        title="QR codes"
        description="Print a QR for each spot guests pass — reception, tables, room cards — and see which one brings people in."
      />
      {error ? (
        <Notice tone="danger" className="mb-4">
          {error}
        </Notice>
      ) : null}
      <QrStudio
        placeId={place.placeId}
        slug={place.slug}
        placeName={place.name}
        placements={placements}
        limit={limit}
        onPlacementsChange={setPlacements}
      />
    </>
  )
}

/* ───────────── Stats ───────────── */

export function BusinessStatsSection() {
  const { place } = useBusiness()
  return (
    <>
      <ShellTitle crumbs={[{ label: 'Stats' }]} />
      <PageHeader title="Stats" description={`Visits to ${place.name}’s page and chat — counted, never tracked personally.`} />
      <PlaceStatsPanel placeId={place.placeId} />
    </>
  )
}

/* ───────────── Guest info ───────────── */

export function BusinessGuestsSection() {
  const { place, patchPlace } = useBusiness()
  const [reloadKey, setReloadKey] = useState(0)
  const landing = usePlaceLanding(place.placeId, reloadKey)
  return (
    <>
      <ShellTitle crumbs={[{ label: 'Guest info' }]} />
      <PageHeader title="Guest info" description="Answers guests look for before and after they arrive." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PlaceWifiPanel
          key={`${place.placeId}:${landing ? 'l' : 'n'}`}
          placeId={place.placeId}
          initial={landing?.wifi ?? null}
          hasWifi={place.hasWifi}
          onChange={has => {
            patchPlace(place.placeId, { hasWifi: has })
            setReloadKey(k => k + 1)
          }}
        />
        <PrearrivalPanel />
      </div>
    </>
  )
}

/* ───────────── Photos ───────────── */

export function BusinessPhotosSection() {
  const { place } = useBusiness()
  return (
    <>
      <ShellTitle crumbs={[{ label: 'Photos' }]} />
      <PageHeader
        title="Photos"
        description="Your cover, logo and gallery on NessaChat. Your own photos always come before Google’s."
        actions={<ExternalLink href={placeOutboundUrl({ placeId: place.placeId, slug: place.slug })}>See your public page</ExternalLink>}
      />
      <PlacePhotosManager
        key={place.placeId}
        placeId={place.placeId}
        placeName={place.name}
        actor="business"
      />
    </>
  )
}

function PrearrivalPanel() {
  const { place } = useBusiness()
  const placeUrl = placeOutboundUrl({ placeId: place.placeId, slug: place.slug }, { ref: 'pre' })
  const chatUrl = placeChatOutboundUrl({ placeId: place.placeId, slug: place.slug }, { ref: 'pre' })
  const items = buildPrearrivalCopy({ placeName: place.name, placeUrl, chatUrl })
  const [channel, setChannel] = useState(items[0]?.channel ?? 'whatsapp')
  const item = items.find(i => i.channel === channel) ?? items[0]
  return (
    <Panel aria-labelledby="pre-h">
      <PanelHeader
        id="pre-h"
        icon="send"
        title="Before guests arrive"
        description="Paste into your booking confirmation, WhatsApp or welcome email. Visits count as “pre-arrival” in Stats."
      />
      <div className="space-y-3 px-5 pb-5 max-sm:px-4">
        <div role="tablist" aria-label="Message for" className="flex flex-wrap gap-1.5">
          {items.map(i => (
            <button
              key={i.channel}
              type="button"
              role="tab"
              aria-selected={i.channel === channel}
              onClick={() => setChannel(i.channel)}
              className={cx(
                'rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors max-md:py-2',
                i.channel === channel ? 'bg-n-ink text-white' : 'bg-n-sunken text-n-ink-2 hover:bg-n-hover',
              )}
            >
              {i.label}
            </button>
          ))}
        </div>
        {item ? (
          <>
            <pre className="max-h-64 overflow-auto rounded-[10px] bg-n-surface-2 p-3.5 font-sans text-[13px] leading-6 break-words whitespace-pre-wrap text-n-ink-2 ring-1 ring-n-line-soft">
              {item.text}
            </pre>
            <div className="flex justify-end">
              <CopyButton text={item.text} label="Copy message" variant="primary" size="md" />
            </div>
          </>
        ) : null}
      </div>
    </Panel>
  )
}

/* ───────────── Team ───────────── */

export function BusinessTeamSection() {
  const { business } = useBusiness()
  const router = useRouter()
  return (
    <>
      <ShellTitle crumbs={[{ label: 'Team' }]} />
      <PageHeader title="Team" description={`People who manage ${business.profile.name} on NessaChat.`} />
      <TeamPanel businessId={business.businessId} onLeft={() => router.replace(accountRoutes.business)} />
    </>
  )
}

/* ───────────── Business details ───────────── */

const PRICE_OPTIONS: { value: PriceRange | ''; label: string }[] = [
  { value: '', label: 'Not set' },
  ...PRICE_RANGES.map(p => ({ value: p, label: p })),
]

const SOCIAL_PLACEHOLDERS: Record<SocialNetwork, string> = {
  instagram: '@yourplace or instagram.com/yourplace',
  facebook: 'facebook.com/yourplace',
  tiktok: '@yourplace or tiktok.com/@yourplace',
  youtube: 'youtube.com/@yourplace',
  x: '@yourplace or x.com/yourplace',
}

const PAYMENT_SUGGESTIONS = ['Cash', 'Card', 'Pix', 'Apple Pay', 'Google Pay']

export function BusinessDetailsSection() {
  const { business, reload, place, href } = useBusiness()
  const [draft, setDraft] = useState<BusinessDetailsDraft>(() => draftFromProfile(business.profile))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof BusinessDetailsDraft>(key: K, value: BusinessDetailsDraft[K]) => {
    setDraft(d => ({ ...d, [key]: value }))
    setSaved(false)
  }
  const paymentList = splitList(draft.paymentMethods)
  const togglePayment = (method: string) => {
    const has = paymentList.some(p => p.toLowerCase() === method.toLowerCase())
    set(
      'paymentMethods',
      (has ? paymentList.filter(p => p.toLowerCase() !== method.toLowerCase()) : [...paymentList, method]).join(', '),
    )
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
    // Every field is sent: the callable replaces the whole editable set.
    const result = buildBusinessProfilePayload(draft)
    if (result.error !== undefined) {
      setError(result.error)
      return
    }
    setBusy(true)
    try {
      await updateBusinessProfile(business.businessId, result.profile)
      setSaved(true)
      void reload()
    } catch (e) {
      setError(e instanceof BusinessActionError ? e.message : 'Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ShellTitle crumbs={[{ label: 'Business details' }]} />
      <PageHeader
        title="Business details"
        description="Shown as “Verified” on your place pages. Leave anything blank to hide it."
        actions={
          <ExternalLink href={placeOutboundUrl({ placeId: place.placeId, slug: place.slug })}>See your public page</ExternalLink>
        }
      />
      <MessagingPanel />
      <form onSubmit={e => void onSubmit(e)} noValidate className="mt-6 space-y-6">
        <Panel>
          <PanelHeader title="About" />
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 max-sm:px-4">
            <Field label="Business name">
              <input value={draft.name} onChange={e => set('name', e.target.value)} maxLength={80} required className={fieldClass} />
            </Field>
            <Field label="Category">
              <select value={draft.category} onChange={e => set('category', e.target.value as BusinessCategory | '')} className={fieldClass}>
                <option value="">—</option>
                {(Object.keys(BUSINESS_CATEGORY_LABELS) as BusinessCategory[]).map(c => (
                  <option key={c} value={c}>
                    {BUSINESS_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Short description" className="sm:col-span-2" hint={`${draft.description.length}/600 · The first ~150 characters show up in search results.`}>
              <textarea
                value={draft.description}
                onChange={e => set('description', e.target.value)}
                maxLength={600}
                rows={4}
                className={cx(fieldClass, 'resize-y')}
              />
            </Field>
            <Field label="Street address" className="sm:col-span-2" hint="Shown publicly. Street and number, so guests can find you. City and country come from your place.">
              <input
                value={draft.address}
                onChange={e => set('address', e.target.value.replace(/[\r\n]+/g, ' '))}
                maxLength={BUSINESS_PROFILE_LIMITS.ADDRESS_MAX}
                // Public business data: never let the browser fill in the owner's own address.
                autoComplete="off"
                placeholder="Rua das Dunas, 120"
                className={fieldClass}
              />
            </Field>
            <p className="text-[13px] text-n-muted sm:col-span-2">
              Logo and photos: <Link href={href('photos')} className="font-medium text-n-accent-strong">Photos</Link>.
            </p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Contact" />
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3 max-sm:px-4">
            <Field label="Website">
              <input value={draft.website} onChange={e => set('website', e.target.value)} inputMode="url" maxLength={300} autoComplete="off" placeholder="yourplace.com" className={fieldClass} />
            </Field>
            {/* Contact fields are published on the Place page: autofill is off so the
                browser never fills in the owner's personal phone or email. */}
            <Field label="Phone" hint="Shown publicly on your Place page.">
              <input value={draft.phone} onChange={e => set('phone', e.target.value)} inputMode="tel" maxLength={32} autoComplete="off" className={fieldClass} />
            </Field>
            <Field label="WhatsApp" hint="Shown publicly on your Place page.">
              <input value={draft.whatsapp} onChange={e => set('whatsapp', e.target.value)} inputMode="tel" maxLength={32} autoComplete="off" className={fieldClass} />
            </Field>
            <Field label="Public email" className="sm:col-span-2 lg:col-span-1" hint="Shown publicly on your Place page — use a business address.">
              <input
                type="email"
                value={draft.email}
                onChange={e => set('email', e.target.value)}
                maxLength={BUSINESS_PROFILE_LIMITS.EMAIL_MAX}
                autoComplete="off"
                placeholder="hello@yourplace.com"
                className={fieldClass}
              />
            </Field>
            <Field label="Booking link" hint="Shown as a “Book now” button.">
              <input value={draft.bookingUrl} onChange={e => set('bookingUrl', e.target.value)} inputMode="url" maxLength={300} placeholder="https://" className={fieldClass} />
            </Field>
            <Field label="Menu link" hint="Shown as a “See menu” button.">
              <input value={draft.menuUrl} onChange={e => set('menuUrl', e.target.value)} inputMode="url" maxLength={300} placeholder="https://" className={fieldClass} />
            </Field>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Social media" description="Paste a link, or an @handle for Instagram, TikTok and X." />
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3 max-sm:px-4">
            {SOCIAL_NETWORKS.map(network => (
              <Field key={network} label={SOCIAL_LABELS[network]}>
                <input
                  value={draft.socials[network]}
                  onChange={e => set('socials', { ...draft.socials, [network]: e.target.value })}
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={300}
                  placeholder={SOCIAL_PLACEHOLDERS[network]}
                  className={fieldClass}
                />
              </Field>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            icon="clock"
            title="Opening hours"
            description="Shown as a weekly timetable on your page and to search engines. A closing time earlier than the opening time means after midnight."
          />
          <div className="space-y-4 px-5 pb-5 max-sm:px-4">
            <OpeningHoursEditor value={draft.week} onChange={week => set('week', week)} />
            <Field label="Hours note" hint="Anything the timetable doesn’t cover — holidays, kitchen hours, seasons.">
              <textarea
                value={draft.hours}
                onChange={e => set('hours', e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="Kitchen closes at 21:00. Closed on 25 Dec."
                className={cx(fieldClass, 'resize-y')}
              />
            </Field>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Stay & services" />
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2 max-sm:px-4">
            <Field label="Check-in from">
              <input value={draft.checkIn} onChange={e => set('checkIn', e.target.value)} maxLength={20} placeholder="14:00" className={fieldClass} />
            </Field>
            <Field label="Check-out by">
              <input value={draft.checkOut} onChange={e => set('checkOut', e.target.value)} maxLength={20} placeholder="11:00" className={fieldClass} />
            </Field>
            <div className="sm:col-span-2">
              <span className={labelClass}>
                Price range
              </span>
              <div className="mt-1.5">
                <Segmented
                  label="Price range"
                  value={draft.priceRange}
                  options={PRICE_OPTIONS}
                  onChange={v => set('priceRange', v)}
                />
              </div>
              <span className={hintClass}>From $ (budget) to $$$$ (high end), compared with places nearby.</span>
            </div>
            <Field label="Payment methods" hint="Separate with commas. Up to 10." className="sm:col-span-2">
              <input
                value={draft.paymentMethods}
                onChange={e => set('paymentMethods', e.target.value)}
                placeholder="Cash, Card, Pix"
                className={fieldClass}
              />
            </Field>
            <div className="-mt-2 flex flex-wrap gap-1.5 sm:col-span-2" role="group" aria-label="Common payment methods">
              {PAYMENT_SUGGESTIONS.map(method => {
                const active = paymentList.some(p => p.toLowerCase() === method.toLowerCase())
                return (
                  <button
                    key={method}
                    type="button"
                    aria-pressed={active}
                    onClick={() => togglePayment(method)}
                    className={cx(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-medium transition-colors max-md:py-1.5',
                      active ? 'bg-n-accent-soft text-n-accent-strong' : 'bg-n-sunken text-n-ink-2 hover:bg-n-hover',
                    )}
                  >
                    <Icon name={active ? 'check' : 'plus'} size={13} />
                    {method}
                  </button>
                )
              })}
            </div>
            <Field label="Amenities" hint="Separate with commas." className="sm:col-span-2">
              <input
                value={draft.amenities}
                onChange={e => set('amenities', e.target.value)}
                placeholder="Wi-Fi, Pool, Kite storage"
                className={fieldClass}
              />
            </Field>
            <Field label="Languages your staff speak" hint="Language codes, separated with commas." className="sm:col-span-2">
              <input value={draft.languages} onChange={e => set('languages', e.target.value)} placeholder="pt, en, es" className={fieldClass} />
            </Field>
          </div>
        </Panel>

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-n-line bg-n-surface/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:rounded-[14px] md:border md:px-5">
          <div className="flex flex-wrap items-center justify-end gap-3">
            {error ? <p role="alert" className="mr-auto text-sm text-n-danger">{error}</p> : null}
            {saved ? (
              <p role="status" className="mr-auto inline-flex items-center gap-1.5 text-sm text-n-ok">
                <Icon name="check" size={16} /> Saved
              </p>
            ) : null}
            <Button type="submit" variant="primary" loading={busy}>
              Save details
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}

/* ───────────── Messaging switch ───────────── */

/**
 * "Let travelers message you" (businesses/{id}.messagingEnabled; absent =
 * on). Owners only — setBusinessMessaging refuses managers, who see it
 * read-only.
 */
function MessagingPanel() {
  const { business, isOwner, reload, href } = useBusiness()
  const serverValue = business.profile.messagingEnabled !== false
  const [enabled, setEnabled] = useState(serverValue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- follow the server value after a reload
    setEnabled(serverValue)
  }, [serverValue])

  const toggle = async () => {
    if (!isOwner || busy) return
    const next = !enabled
    setBusy(true)
    setError(null)
    setSaved(null)
    setEnabled(next)
    try {
      const result = await setBusinessMessaging(business.businessId, next)
      setEnabled(result.messagingEnabled)
      setSaved(result.messagingEnabled ? 'Travelers can message you again.' : 'Messaging is off. Existing conversations stay in your inbox.')
      void reload()
    } catch (e) {
      setEnabled(!next)
      setError(e instanceof BusinessActionError ? e.message : 'Could not change messaging. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <PanelHeader
        icon="inbox"
        title="Messages"
        description={
          <>
            Private conversations between travelers and {business.profile.name || 'your business'}.
            Replies are in your <Link href={href('inbox')} className="font-medium text-n-accent-strong">Inbox</Link>, translated both ways.
          </>
        }
      />
      <div className="px-5 pb-5 max-sm:px-4">
        <div className="flex items-start justify-between gap-4 rounded-[10px] border border-n-line-soft bg-n-surface-2 px-4 py-3">
          <div className="min-w-0">
            <p id="messaging-switch-label" className="text-sm font-medium text-n-ink">
              Let travelers message you
            </p>
            <p className="mt-0.5 text-[13px] leading-5 text-n-muted">
              {enabled
                ? 'On — travelers can message you from your Place in the NessaChat app.'
                : 'Off — travelers can’t start or continue conversations. Your team can still reply to existing ones.'}
            </p>
            {!isOwner ? (
              <p className="mt-1 text-xs text-n-subtle">Only the business owner can change this.</p>
            ) : null}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-labelledby="messaging-switch-label"
            disabled={!isOwner || busy}
            onClick={() => void toggle()}
            className={cx(
              'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed',
              enabled ? 'bg-n-accent' : 'bg-n-line-strong',
              !isOwner ? 'opacity-60' : '',
            )}
          >
            <span
              aria-hidden
              className={cx(
                'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                enabled ? 'translate-x-[22px]' : 'translate-x-0.5',
              )}
            />
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-n-danger">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="mt-2 inline-flex items-center gap-1.5 text-sm text-n-ok">
            <Icon name="check" size={16} /> {saved}
          </p>
        ) : null}
      </div>
    </Panel>
  )
}
