'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useAdminHref } from '@/components/admin/admin-shell'
import { ShellTitle } from '@/components/dash/app-shell'
import { Icon } from '@/components/dash/icons'
import { Badge, Button, EmptyState, LoadingBlock, Notice, PageHeader, Panel, cx, fieldClass } from '@/components/dash/ui'
import { listConsolePlaces, toSlugPrefix, type ConsolePlaceRow } from '@/lib/admin-console'
import { parsePlaceRef, resolvePlaceRef } from '@/lib/admin-chats'
import { placeChatRetentionLabel } from '@/lib/place-chat/retention'

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; places: ConsolePlaceRow[]; more: boolean; q: string }
  | { kind: 'error'; message: string }

function placeHref(adminHref: (p: string) => string, placeId: string) {
  return adminHref(`places/${encodeURIComponent(placeId)}`)
}

export function AdminPlacesList() {
  const router = useRouter()
  const adminHref = useAdminHref()
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [q, setQ] = useState('')
  const [busyMore, setBusyMore] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const seq = useRef(0)

  const load = useCallback(async (query: string) => {
    const mine = ++seq.current
    setState({ kind: 'loading' })
    try {
      const res = await listConsolePlaces({ q: query })
      if (mine === seq.current) setState({ kind: 'ready', places: res.places, more: res.more, q: query })
    } catch (e) {
      if (mine === seq.current) setState({ kind: 'error', message: e instanceof Error ? e.message : 'Could not load places.' })
    }
  }, [])

  const submitQuery = async (raw: string) => {
    const value = raw.trim()
    setNotice(null)
    // A Place ID or a full Nessa link opens the place directly.
    if (value.startsWith('ChIJ') || value.includes('/')) {
      const ref = parsePlaceRef(value)
      const id = ref ? await resolvePlaceRef(ref) : null
      if (id) {
        router.push(placeHref(adminHref, id))
        return
      }
      setNotice('No Nessa place uses that link or ID.')
    }
    void load(value.includes('/') ? '' : toSlugPrefix(value))
  }

  // ?place=<slug|id|link> (old deep links) opens the place; ?q= prefills the search.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const legacy = params.get('place')
    if (legacy) {
      const ref = parsePlaceRef(legacy)
      if (ref) {
        void resolvePlaceRef(ref).then(id => {
          if (id) router.replace(placeHref(adminHref, id))
          else {
            setNotice('No Nessa place uses that link.')
            void load('')
          }
        })
        return
      }
    }
    const initial = params.get('q') ?? ''
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(initial)
    void submitQuery(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    try {
      const url = new URL(window.location.href)
      if (q.trim()) url.searchParams.set('q', q.trim())
      else url.searchParams.delete('q')
      url.searchParams.delete('place')
      window.history.replaceState(null, '', url.toString())
    } catch {
      // ignore
    }
    void submitQuery(q)
  }

  const loadMore = async () => {
    if (state.kind !== 'ready') return
    const last = state.places[state.places.length - 1]
    if (!last?.slug) return
    setBusyMore(true)
    try {
      const res = await listConsolePlaces({ q: state.q, after: last.slug })
      setState(s => (s.kind === 'ready' ? { ...s, places: [...s.places, ...res.places], more: res.more } : s))
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not load more places.')
    } finally {
      setBusyMore(false)
    }
  }

  return (
    <>
      <ShellTitle crumbs={[{ label: 'Places' }]} />
      <PageHeader
        title="Places"
        description="Live chat settings, QR codes, stats, business and history for any place — including places no business manages yet."
      />

      <Panel>
        <form onSubmit={onSubmit} role="search" className="flex flex-wrap items-center gap-2 border-b border-n-line-soft p-4 max-sm:p-3">
          <div className="relative min-w-0 flex-1">
            <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-n-faint" />
            <label htmlFor="places-q" className="sr-only">
              Search places
            </label>
            <input
              id="places-q"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Address (e.g. cumbuco), Place ID or Nessa link"
              autoComplete="off"
              className={cx(fieldClass, 'mt-0 pl-9')}
            />
          </div>
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>

        {notice ? (
          <div className="px-4 pt-4">
            <Notice tone="warn">{notice}</Notice>
          </div>
        ) : null}

        {state.kind === 'loading' ? (
          <LoadingBlock rows={6} label="Loading places…" />
        ) : state.kind === 'error' ? (
          <div className="p-4">
            <Notice tone="danger">{state.message}</Notice>
          </div>
        ) : state.places.length === 0 ? (
          <EmptyState icon="pin" title={state.q ? `No place address starts with “${state.q}”` : 'No places yet'}>
            Search by the start of a place’s address (nessachat.com/places/<strong>…</strong>), or paste its Place ID or link.
          </EmptyState>
        ) : (
          <>
            {/* Table on tablet + desktop */}
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Places</caption>
                <thead>
                  <tr className="border-b border-n-line-soft text-xs text-n-muted">
                    <th scope="col" className="px-5 py-2.5 font-medium">Place</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Business</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Live chat</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Recommended</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-n-line-soft">
                  {state.places.map(p => (
                    <tr key={p.placeId} className="group relative transition-colors hover:bg-n-surface-2">
                      <td className="px-5 py-3">
                        <Link
                          href={placeHref(adminHref, p.placeId)}
                          className="font-medium text-n-ink no-underline after:absolute after:inset-0 hover:underline"
                        >
                          {p.name}
                        </Link>
                        <span className="block truncate text-[13px] text-n-muted">
                          {p.slug ? `/places/${p.slug}` : 'No address yet'}
                          {p.city ? ` · ${p.city}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {p.businessId ? <Badge tone="ok" dot>Managed</Badge> : <span className="text-n-subtle">—</span>}
                      </td>
                      <td className="px-3 py-3 text-n-ink-2">
                        {p.hasRoom ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="clock" size={14} className="text-n-faint" />
                            {placeChatRetentionLabel(p.retentionHours ?? 24)}
                          </span>
                        ) : (
                          <span className="text-n-subtle">No chat yet</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-n-ink-2 tabular-nums">{p.recommendations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Cards on phones */}
            <ul className="divide-y divide-n-line-soft md:hidden">
              {state.places.map(p => (
                <li key={p.placeId}>
                  <Link
                    href={placeHref(adminHref, p.placeId)}
                    className="flex min-h-16 items-center gap-3 px-4 py-3 text-n-ink no-underline active:bg-n-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block truncate text-[13px] text-n-muted">
                        {p.slug ? `/places/${p.slug}` : p.city || 'Place'}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {p.businessId ? <Badge tone="ok">Managed</Badge> : null}
                        {p.hasRoom ? <Badge>{placeChatRetentionLabel(p.retentionHours ?? 24)} chat</Badge> : null}
                      </span>
                    </span>
                    <Icon name="chevron-right" size={16} className="text-n-faint" />
                  </Link>
                </li>
              ))}
            </ul>
            {state.more ? (
              <div className="flex justify-center border-t border-n-line-soft p-3">
                <Button onClick={() => void loadMore()} loading={busyMore} size="sm">
                  Show more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Panel>
    </>
  )
}
