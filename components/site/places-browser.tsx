'use client'

/**
 * /places: search, category and town filters over the public directory.
 * Filters live in the URL (?q=, ?type=, ?town=) so results can be shared.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Icon } from '@/components/dash/icons'
import { PlaceCard } from '@/components/site/place-card'
import { cx, siteButtonClass } from '@/components/site/ui'
import { siteRoutes } from '@/lib/constants'
import { useDirectoryPlaces } from '@/lib/place-directory-client'
import {
  PLACE_CATEGORIES,
  filterByCategory,
  filterByTown,
  foldText,
  placeCategory,
  searchPlaces,
  topTowns,
  type DirectoryPlace,
  type PlaceCategory,
} from '@/lib/place-directory'

const PAGE = 24

function readCategory(v: string | null): PlaceCategory {
  return PLACE_CATEGORIES.some(c => c.value === v) ? (v as PlaceCategory) : 'all'
}

export function PlacesBrowser({ places: initialPlaces }: { places: DirectoryPlace[] }) {
  const { places, loading } = useDirectoryPlaces(initialPlaces)
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [category, setCategory] = useState<PlaceCategory>(readCategory(params.get('type')))
  const [town, setTown] = useState<string | null>(params.get('town'))
  const [limit, setLimit] = useState(PAGE)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (window.location.hash === '#search') inputRef.current?.focus()
  }, [])

  // Keep the URL in sync (replace: filters aren't history entries).
  useEffect(() => {
    const next = new URLSearchParams()
    if (query.trim()) next.set('q', query.trim())
    if (category !== 'all') next.set('type', category)
    if (town) next.set('town', town)
    const qs = next.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    if (url !== `${pathname}${window.location.search}`) router.replace(url, { scroll: false })
  }, [query, category, town, pathname, router])

  const towns = useMemo(() => topTowns(places, 12), [places])
  const inTown = useMemo(() => filterByTown(places, town), [places, town])
  const searched = useMemo(() => searchPlaces(inTown, query), [inTown, query])
  const results = useMemo(() => filterByCategory(searched, category), [searched, category])
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: searched.length }
    for (const p of searched) {
      const k = placeCategory(p.placeType)
      if (k) c[k] = (c[k] ?? 0) + 1
    }
    return c
  }, [searched])
  const townLabel = town ? (towns.find(t => foldText(t.town) === foldText(town))?.town ?? town) : null

  const reset = () => {
    setQuery('')
    setCategory('all')
    setTown(null)
    setLimit(PAGE)
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <form
          role="search"
          onSubmit={e => {
            e.preventDefault()
            inputRef.current?.blur()
          }}
          className="relative max-w-2xl"
        >
          <label htmlFor="places-search" className="sr-only">
            Search places
          </label>
          <Icon name="search" size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-n-subtle" />
          <input
            ref={inputRef}
            id="places-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setLimit(PAGE)
            }}
            placeholder="Search by name, town or country"
            className="h-14 w-full rounded-2xl border border-n-line-strong bg-n-surface pr-12 pl-12 text-[16px] text-n-ink shadow-n-card outline-none placeholder:text-n-faint focus:border-n-accent focus:ring-4 focus:ring-n-accent/12 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-n-subtle hover:bg-n-hover hover:text-n-ink"
            >
              <Icon name="x" size={16} />
            </button>
          ) : null}
        </form>

        <div className="-mx-4 overflow-x-auto px-4 n-no-scrollbar sm:mx-0 sm:px-0">
          <div role="group" aria-label="Type of place" className="flex w-max gap-2">
            {PLACE_CATEGORIES.map(c => {
              const n = counts[c.value] ?? 0
              const on = category === c.value
              if (n === 0 && !on && c.value !== 'all') return null
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setCategory(c.value)
                    setLimit(PAGE)
                  }}
                  className={cx(
                    'inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-colors',
                    on ? 'border-n-ink bg-n-ink text-white' : 'border-n-line bg-n-surface text-n-ink-2 hover:border-n-line-strong',
                  )}
                >
                  {c.label}
                  <span className={cx('text-[12px] tabular-nums', on ? 'text-white/70' : 'text-n-faint')}>{n}</span>
                </button>
              )
            })}
          </div>
        </div>

        {towns.length > 1 ? (
          <div className="-mx-4 overflow-x-auto px-4 n-no-scrollbar sm:mx-0 sm:px-0">
            <div role="group" aria-label="Town" className="flex w-max items-center gap-1.5">
              <span className="mr-1 text-[13px] text-n-subtle">Town:</span>
              <button
                type="button"
                aria-pressed={!town}
                onClick={() => setTown(null)}
                className={cx('rounded-full px-3 py-1.5 text-[13px] font-medium', !town ? 'bg-n-accent-soft text-n-accent-strong' : 'text-n-muted hover:bg-n-hover')}
              >
                All
              </button>
              {towns.map(t => {
                const on = town ? foldText(town) === foldText(t.town) : false
                return (
                  <button
                    key={t.town}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setTown(on ? null : t.town)
                      setLimit(PAGE)
                    }}
                    className={cx('rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap', on ? 'bg-n-accent-soft text-n-accent-strong' : 'text-n-muted hover:bg-n-hover')}
                  >
                    {t.town}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <div className="n-skeleton aspect-[4/3] rounded-2xl" />
              <div className="n-skeleton mt-3 h-4 w-2/3 rounded" />
              <div className="n-skeleton mt-2 h-3 w-1/2 rounded" />
            </li>
          ))}
        </ul>
      ) : null}
      <p className={cx('mt-8 text-[14px] text-n-muted', loading && 'sr-only')} aria-live="polite">
        {results.length === 0
          ? 'No places found'
          : `${results.length.toLocaleString('en')} ${results.length === 1 ? 'place' : 'places'}`}
        {townLabel ? ` in ${townLabel}` : ''}
        {query.trim() ? ` for “${query.trim()}”` : ''}
      </p>

      {loading ? null : results.length ? (
        <>
          <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-3 xl:grid-cols-4">
            {results.slice(0, limit).map((place, i) => (
              <li key={place.placeId}>
                <PlaceCard place={place} priority={i < 4} />
              </li>
            ))}
          </ul>
          {results.length > limit ? (
            <div className="mt-10 flex justify-center">
              <button type="button" onClick={() => setLimit(l => l + PAGE)} className={siteButtonClass('secondary', 'lg')}>
                Show more places
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-n-line-strong bg-n-surface px-6 py-12 text-center">
          <Icon name="compass" size={28} className="mx-auto text-n-faint" />
          <p className="mt-3 text-[17px] font-semibold">Nothing here yet</p>
          <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-6 text-n-muted">
            Places appear on Nessa once travellers recommend them in the app. Try another name or town.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={reset} className={siteButtonClass('secondary', 'md')}>
              Clear filters
            </button>
            <Link
              href={`${siteRoutes.forBusinesses}${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}#find`}
              className={siteButtonClass('ghost', 'md')}
            >
              Own this place? Add and claim it
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

/** Server-rendered fallback (no JS / crawlers): the full list as links. */
export function PlacesGridStatic({ places }: { places: DirectoryPlace[] }) {
  return (
    <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9 lg:grid-cols-3 xl:grid-cols-4">
      {places.map(place => (
        <li key={place.placeId}>
          <PlaceCard place={place} />
        </li>
      ))}
    </ul>
  )
}
