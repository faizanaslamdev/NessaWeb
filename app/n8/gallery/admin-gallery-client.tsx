'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import GalleryFilters from '@/components/admin/gallery/gallery-filters'
import GalleryGrid, { type GalleryMediaItem } from '@/components/admin/gallery/gallery-grid'
import Lightbox from '@/components/admin/gallery/lightbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type MediaApiResponse = {
  items?: GalleryMediaItem[]
  total?: number
  error?: string
}

function filterTypeParam(filter: 'all' | 'images' | 'videos'): string {
  if (filter === 'images') {
    return 'image'
  }
  if (filter === 'videos') {
    return 'video'
  }
  return ''
}

export default function AdminGalleryClient() {
  const [sessionChecked, setSessionChecked] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [serverConfigured, setServerConfigured] = useState(true)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginBusy, setLoginBusy] = useState(false)

  const [filter, setFilter] = useState<'all' | 'images' | 'videos'>('all')
  const [items, setItems] = useState<GalleryMediaItem[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)

  const [selectedMedia, setSelectedMedia] = useState<GalleryMediaItem | null>(null)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const filteredMedia = useMemo(() => {
    if (filter === 'images') {
      return items.filter((m) => m.type === 'image')
    }
    if (filter === 'videos') {
      return items.filter((m) => m.type === 'video')
    }
    return items
  }, [filter, items])

  const refreshSession = useCallback(async () => {
    const res = await fetch('/api/admin-gallery/me', { credentials: 'include' })
    const data = (await res.json()) as { ok?: boolean; configured?: boolean }
    setServerConfigured(data.configured !== false)
    setAuthed(Boolean(data.ok))
    setSessionChecked(true)
  }, [])

  const loadMedia = useCallback(async (activeFilter: 'all' | 'images' | 'videos') => {
    setMediaLoading(true)
    setMediaError(null)
    try {
      const type = filterTypeParam(activeFilter)
      const params = new URLSearchParams()
      if (type) {
        params.set('type', type)
      }
      const qs = params.toString()
      const res = await fetch(`/api/admin-gallery/media${qs ? `?${qs}` : ''}`, { credentials: 'include' })
      const data = (await res.json()) as MediaApiResponse
      if (!res.ok) {
        throw new Error(data.error || `Could not load media (${res.status})`)
      }
      setItems(data.items ?? [])
    } catch (e) {
      setItems([])
      setMediaError(e instanceof Error ? e.message : 'Network error while loading media')
    } finally {
      setMediaLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/admin-gallery/me', { credentials: 'include' })
        const data = (await res.json()) as { ok?: boolean; configured?: boolean }
        if (cancelled) {
          return
        }
        setServerConfigured(data.configured !== false)
        setAuthed(Boolean(data.ok))
      } finally {
        if (!cancelled) {
          setSessionChecked(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!authed) {
      return
    }
    void loadMedia(filter)
  }, [authed, filter, loadMedia])

  const handleFilterChange = (next: 'all' | 'images' | 'videos') => {
    setFilter(next)
    setSelectedMedia(null)
    setIsLightboxOpen(false)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    setLoginBusy(true)
    try {
      const res = await fetch('/api/admin-gallery/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        setLoginError(err.error || 'Sign in failed')
        return
      }
      setPassword('')
      await refreshSession()
    } catch {
      setLoginError('Network error')
    } finally {
      setLoginBusy(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin-gallery/logout', { method: 'POST', credentials: 'include' })
    setSelectedMedia(null)
    setIsLightboxOpen(false)
    setItems([])
    setMediaError(null)
    await refreshSession()
  }

  const handleMediaClick = (media: GalleryMediaItem) => {
    setSelectedMedia(media)
    setIsLightboxOpen(true)
  }

  const handleCloseLightbox = () => {
    setIsLightboxOpen(false)
    setTimeout(() => setSelectedMedia(null), 300)
  }

  const handlePrevious = () => {
    if (!selectedMedia) {
      return
    }
    const currentIndex = filteredMedia.findIndex((m) => m.id === selectedMedia.id)
    if (currentIndex > 0) {
      setSelectedMedia(filteredMedia[currentIndex - 1])
    }
  }

  const handleNext = () => {
    if (!selectedMedia) {
      return
    }
    const currentIndex = filteredMedia.findIndex((m) => m.id === selectedMedia.id)
    if (currentIndex < filteredMedia.length - 1) {
      setSelectedMedia(filteredMedia[currentIndex + 1])
    }
  }

  if (!sessionChecked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-gray-400">
        Loading…
      </div>
    )
  }

  if (!serverConfigured) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-black px-6 text-center">
        <p className="text-lg text-white">Admin gallery is not configured</p>
        <p className="max-w-md text-sm text-gray-400">
          Set <code className="text-purple-300">ADMIN_GALLERY_PASSWORD</code> and{' '}
          <code className="text-purple-300">ADMIN_GALLERY_SECRET</code> on the server, then redeploy.
        </p>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-black px-4">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-linear-to-br from-purple-600/30 to-violet-600/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-linear-to-br from-purple-600/20 to-violet-600/30 blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-black/40 p-8 backdrop-blur-md">
          <h1 className="mb-1 text-center text-2xl font-bold text-white">Admin</h1>
          <p className="mb-6 text-center text-sm text-gray-400">Sign in to open the media gallery</p>
          <form onSubmit={(e) => void handleLogin(e)} className="flex flex-col gap-4">
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="landing"
              className="h-11"
            />
            {loginError ? <p className="text-center text-sm text-red-400">{loginError}</p> : null}
            <Button type="submit" disabled={loginBusy || !password.trim()} className="h-11 w-full font-semibold">
              {loginBusy ? 'Signing in…' : 'Continue'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <GalleryFilters activeFilter={filter} onFilterChange={handleFilterChange} />
            <Button type="button" variant="outline" onClick={() => void handleLogout()} className="shrink-0 border-white/20 text-white hover:bg-white/10">
              Sign out
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {mediaLoading
              ? 'Loading all media…'
              : filteredMedia.length > 0
                ? `${filteredMedia.length} item${filteredMedia.length === 1 ? '' : 's'} · newest first`
                : 'Newest first · all chats'}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {mediaLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-gray-400">Loading all media from database…</p>
            <p className="mt-2 text-sm text-gray-500">This may take a minute for large libraries.</p>
          </div>
        ) : mediaError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="text-lg text-red-400">Could not load media</p>
            <p className="max-w-lg text-sm text-gray-400">{mediaError}</p>
          </div>
        ) : filteredMedia.length > 0 ? (
          <GalleryGrid media={filteredMedia} onMediaClick={handleMediaClick} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
            <p className="text-lg text-gray-400">No media found</p>
            <p className="max-w-md text-sm text-gray-500">No image/video messages in chats, or none match the filter.</p>
          </div>
        )}
      </div>

      <Lightbox
        isOpen={isLightboxOpen}
        media={selectedMedia || undefined}
        allMedia={filteredMedia}
        onClose={handleCloseLightbox}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />
    </div>
  )
}
