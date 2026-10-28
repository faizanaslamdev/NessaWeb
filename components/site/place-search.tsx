'use client'

/**
 * Place search box (combobox). Filters the directory in the browser — no
 * request per keystroke. Picking a result opens it (or calls onPick);
 * Enter without a pick submits the query (onSubmit, default: /places?q=).
 */

import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'

import { Icon } from '@/components/dash/icons'
import { PlaceRow } from '@/components/site/place-card'
import { cx } from '@/components/site/ui'
import { placeHref, searchPlaces, type DirectoryPlace } from '@/lib/place-directory'

export function PlaceSearch({
  places,
  placeholder = 'Search places or towns',
  size = 'lg',
  autoFocus,
  onPick,
  onSubmit,
  onQueryChange,
  footer,
  label = 'Search places',
  className,
  initialQuery = '',
}: {
  places: DirectoryPlace[]
  placeholder?: string
  size?: 'md' | 'lg'
  autoFocus?: boolean
  onPick?: (place: DirectoryPlace) => void
  onSubmit?: (query: string) => void
  onQueryChange?: (query: string) => void
  /** Extra row under the results (e.g. "Not listed? …"). */
  footer?: (query: string) => React.ReactNode
  label?: string
  className?: string
  initialQuery?: string
}) {
  const router = useRouter()
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState(initialQuery)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const results = useMemo(() => (query.trim() ? searchPlaces(places, query).slice(0, 7) : []), [places, query])
  const showList = open && query.trim().length > 0

  const pick = (place: DirectoryPlace) => {
    setOpen(false)
    if (onPick) onPick(place)
    else router.push(placeHref(place))
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (active >= 0 && results[active]) return pick(results[active])
    if (onPick && results[0]) return pick(results[0])
    const q = query.trim()
    setOpen(false)
    if (onSubmit) onSubmit(q)
    else router.push(q ? `/places?q=${encodeURIComponent(q)}` : '/places')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive(i => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(-1, i - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  const big = size === 'lg'
  return (
    <form role="search" onSubmit={submit} className={cx('relative', className)}>
      <label htmlFor={`${id}-q`} className="sr-only">
        {label}
      </label>
      <div
        className={cx(
          'flex items-center gap-2 rounded-2xl border border-n-line-strong bg-n-surface shadow-[0_1px_2px_rgb(27_26_23/0.05),0_6px_20px_rgb(27_26_23/0.06)] transition-colors focus-within:border-n-accent focus-within:ring-4 focus-within:ring-n-accent/12',
          big ? 'h-[60px] pr-2 pl-4' : 'h-12 pr-1.5 pl-3.5',
        )}
      >
        <Icon name="search" size={big ? 20 : 18} className="shrink-0 text-n-subtle" />
        <input
          ref={inputRef}
          id={`${id}-q`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          autoFocus={autoFocus}
          value={query}
          placeholder={placeholder}
          onChange={e => {
            setQuery(e.target.value)
            setActive(-1)
            setOpen(true)
            onQueryChange?.(e.target.value)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className={cx(
            'min-w-0 flex-1 bg-transparent text-n-ink outline-none placeholder:text-n-faint [&::-webkit-search-cancel-button]:hidden',
            big ? 'text-[17px]' : 'text-[15px]',
          )}
          style={{ outline: 'none' }}
        />
        <button
          type="submit"
          className={cx(
            'shrink-0 rounded-xl bg-n-accent font-semibold text-white transition-colors hover:bg-n-accent-strong',
            big ? 'h-11 px-5 text-[15px]' : 'h-9 px-3.5 text-[14px]',
          )}
        >
          Search
        </button>
      </div>
      {showList ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-n-line bg-n-surface shadow-n-pop">
          {results.length ? (
            <ul id={`${id}-list`} role="listbox" aria-label="Places" className="max-h-[min(420px,60vh)] overflow-y-auto p-1.5">
              {results.map((place, i) => (
                <li
                  key={place.placeId}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={e => {
                    e.preventDefault()
                    pick(place)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cx('cursor-pointer rounded-xl px-2.5 py-2', i === active ? 'bg-n-hover' : '')}
                >
                  <PlaceRow place={place} />
                </li>
              ))}
            </ul>
          ) : (
            <p id={`${id}-list`} className="px-4 py-4 text-[14px] text-n-muted">
              No places on Nessa match “{query.trim()}”.
            </p>
          )}
          {footer ? <div className="border-t border-n-line-soft bg-n-surface-2 px-4 py-3">{footer(query.trim())}</div> : null}
        </div>
      ) : null}
    </form>
  )
}
