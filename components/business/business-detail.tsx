'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'

import {
  accountButtonClass,
  accountCardClass,
  accountFieldClass,
} from '@/components/account/account-shell'
import { PlaceWifiManageSheet } from '@/components/place/place-wifi-manage-sheet'
import { accountRoutes } from '@/lib/account/constants'
import {
  BUSINESS_CATEGORY_LABELS,
  BusinessActionError,
  getMyBusinesses,
  splitList,
  updateBusinessProfile,
  type BusinessCategory,
  type MyBusiness,
} from '@/lib/business'
import { siteConfig } from '@/lib/constants'
import { placeChatCanonicalPath, placeCanonicalPath } from '@/lib/place-slug'

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; business: MyBusiness }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }

export function BusinessDetail({ businessId }: { businessId: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [wifiPlaceId, setWifiPlaceId] = useState<string | null>(null)

  const load = () =>
    getMyBusinesses()
      .then(data => {
        const business = data.businesses.find(b => b.businessId === businessId)
        setState(business ? { kind: 'ready', business } : { kind: 'missing' })
      })
      .catch((e: unknown) =>
        setState({
          kind: 'error',
          message: e instanceof BusinessActionError ? e.message : 'Could not load this business.',
        }),
      )

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on id change only
  }, [businessId])

  if (state.kind === 'loading') {
    return <p className="text-center text-sm text-gray-400">Loading…</p>
  }
  if (state.kind === 'missing') {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p className="text-sm text-gray-300">You don’t have access to this business.</p>
        <Link href={accountRoutes.business} className="text-sm text-violet-400 hover:text-violet-300">
          Back
        </Link>
      </div>
    )
  }
  if (state.kind === 'error') {
    return (
      <div className={`${accountCardClass} text-center`}>
        <p className="text-sm text-red-300">{state.message}</p>
      </div>
    )
  }

  const { business } = state
  const wifiPlace = business.places.find(p => p.placeId === wifiPlaceId)

  return (
    <div className="space-y-4">
      <div className={accountCardClass}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your places</p>
        <ul className="space-y-3">
          {business.places.map(p => {
            const pagePath = p.slug ? placeCanonicalPath(p.slug) : `/place/${encodeURIComponent(p.placeId)}`
            const chatPath = p.slug ? placeChatCanonicalPath(p.slug) : `/place/${encodeURIComponent(p.placeId)}/chat`
            return (
              <li key={p.placeId} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
                <p className="text-sm font-semibold text-white">{p.name}</p>
                {p.city ? <p className="text-xs text-gray-400">{[p.city, p.country].filter(Boolean).join(', ')}</p> : null}
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  <Link href={pagePath} className="text-violet-400 hover:text-violet-300">Place page</Link>
                  <Link href={chatPath} className="text-violet-400 hover:text-violet-300">Live chat</Link>
                  <button
                    type="button"
                    onClick={() => setWifiPlaceId(p.placeId)}
                    className="text-violet-400 hover:text-violet-300"
                  >
                    {p.hasWifi ? 'Edit Wi-Fi' : 'Add Wi-Fi'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="text-[11px] leading-4 text-gray-600">
          QR codes and sharing links are on each place page (cover photo → share / QR).
        </p>
      </div>

      <ProfileForm business={business} onSaved={() => void load()} />

      <PlaceWifiManageSheet
        open={Boolean(wifiPlace)}
        placeId={wifiPlace?.placeId ?? ''}
        initialWifi={null}
        mode="business"
        onClose={() => setWifiPlaceId(null)}
        onSaved={() => void load()}
      />
    </div>
  )
}

function ProfileForm({ business, onSaved }: { business: MyBusiness; onSaved: () => void }) {
  const p = business.profile
  const [name, setName] = useState(p.name ?? '')
  const [category, setCategory] = useState<BusinessCategory | ''>(p.category ?? '')
  const [description, setDescription] = useState(p.description ?? '')
  const [website, setWebsite] = useState(p.website ?? '')
  const [phone, setPhone] = useState(p.phone ?? '')
  const [whatsapp, setWhatsapp] = useState(p.whatsapp ?? '')
  const [hours, setHours] = useState(p.hours ?? '')
  const [checkIn, setCheckIn] = useState(p.checkIn ?? '')
  const [checkOut, setCheckOut] = useState(p.checkOut ?? '')
  const [amenities, setAmenities] = useState((p.amenities ?? []).join(', '))
  const [languages, setLanguages] = useState((p.languages ?? []).join(', '))
  const [logoUrl, setLogoUrl] = useState(p.logoUrl ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await updateBusinessProfile(business.businessId, {
        name: name.trim(),
        category,
        description: description.trim(),
        website: website.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        hours: hours.trim(),
        checkIn: checkIn.trim(),
        checkOut: checkOut.trim(),
        amenities: splitList(amenities),
        languages: splitList(languages),
        logoUrl: logoUrl.trim(),
      })
      setSaved(true)
      onSaved()
      window.setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof BusinessActionError ? e.message : 'Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const field = (label: string, value: string, set: (v: string) => void, extra: Record<string, unknown> = {}) => (
    <label className="block text-left text-xs text-gray-400">
      {label}
      <input value={value} onChange={e => set(e.target.value)} className={accountFieldClass} {...extra} />
    </label>
  )

  return (
    <form onSubmit={onSubmit} className={accountCardClass} noValidate>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Official details</p>
      <p className="text-[11px] leading-4 text-gray-600">
        Shown as “Verified” on your place page on {siteConfig.name}. Leave anything blank to hide it.
      </p>
      {field('Business name', name, setName, { maxLength: 80, required: true })}
      <label className="block text-left text-xs text-gray-400">
        Category
        <select value={category} onChange={e => setCategory(e.target.value as BusinessCategory | '')} className={accountFieldClass}>
          <option value="">—</option>
          {(Object.keys(BUSINESS_CATEGORY_LABELS) as BusinessCategory[]).map(c => (
            <option key={c} value={c}>{BUSINESS_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </label>
      <label className="block text-left text-xs text-gray-400">
        Short description
        <textarea value={description} onChange={e => setDescription(e.target.value)} className={`${accountFieldClass} min-h-24`} maxLength={600} />
      </label>
      {field('Website', website, setWebsite, { inputMode: 'url', maxLength: 300 })}
      {field('Phone', phone, setPhone, { inputMode: 'tel', maxLength: 32 })}
      {field('WhatsApp', whatsapp, setWhatsapp, { inputMode: 'tel', maxLength: 32 })}
      <label className="block text-left text-xs text-gray-400">
        Opening hours
        <textarea value={hours} onChange={e => setHours(e.target.value)} className={`${accountFieldClass} min-h-16`} maxLength={200} placeholder={'Mon–Sun 8:00–22:00'} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        {field('Check-in from', checkIn, setCheckIn, { maxLength: 20, placeholder: '14:00' })}
        {field('Check-out by', checkOut, setCheckOut, { maxLength: 20, placeholder: '11:00' })}
      </div>
      {field('Amenities (comma-separated)', amenities, setAmenities, { placeholder: 'Wi-Fi, Pool, Kite storage' })}
      {field('Languages staff speak (codes, comma-separated)', languages, setLanguages, { placeholder: 'pt, en, es' })}
      {field('Logo image URL (https)', logoUrl, setLogoUrl, { inputMode: 'url', maxLength: 300 })}
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      <button type="submit" disabled={busy} className={accountButtonClass}>
        {busy ? 'Saving…' : saved ? 'Saved' : 'Save details'}
      </button>
    </form>
  )
}
