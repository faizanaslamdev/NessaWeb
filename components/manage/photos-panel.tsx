'use client'

/**
 * Photo library manager shared by the Business dashboard (Photos) and the
 * Admin console (Place → Photos).
 *
 * The Place's cover on NessaChat, in order: the business's pick → an admin's
 * pick → the best of our own photos (business uploads, then travellers'
 * public story photos) → Google's photo (Place page only, with credits).
 * Everything is enforced by the `managePlacePhotos` Cloud Function and audited.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import { Badge, Button, Dialog, EmptyState, LoadingBlock, Notice, Panel, PanelHeader, cx } from '@/components/dash/ui'
import { Icon } from '@/components/dash/icons'
import {
  PHOTO_ACCEPT,
  clearPlaceCover,
  listPlacePhotos,
  removeBusinessLogo,
  removePlacePhoto,
  setPlaceCover,
  setPlacePhotoHidden,
  uploadBusinessLogo,
  uploadPlacePhoto,
  type ManagedPlacePhoto,
  type PhotoActor,
  type PlacePhotoLibrary,
} from '@/lib/place-photos'

const SOURCE_LABEL: Record<ManagedPlacePhoto['source'], string> = {
  business: 'Business',
  admin: 'Nessa',
  community: 'Traveller',
  story: 'Story',
}

function errorText(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback
}

export function PlacePhotosManager({
  placeId,
  placeName,
  actor,
  onCoverChange,
}: {
  placeId: string
  placeName: string
  /** `business`: Business dashboard. `admin`: admin console (can hide photos). */
  actor: PhotoActor
  onCoverChange?: () => void
}) {
  const [lib, setLib] = useState<PlacePhotoLibrary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<ManagedPlacePhoto | null>(null)
  const [makeCover, setMakeCover] = useState(true)
  const photoInput = useRef<HTMLInputElement>(null)
  const logoInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const next = await listPlacePhotos(placeId, actor)
      setLib(next)
      setLoadError(null)
    } catch (e) {
      setLoadError(errorText(e, 'Could not load photos.'))
    }
  }, [placeId, actor])

  useEffect(() => {
    // State is set after the request resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const run = async (key: string, fn: () => Promise<unknown>, done: string, coverChanged = true) => {
    setBusy(key)
    setError(null)
    setStatus(null)
    try {
      await fn()
      await load()
      setStatus(done)
      if (coverChanged) onCoverChange?.()
    } catch (e) {
      setError(errorText(e, 'Something went wrong. Please try again.'))
    } finally {
      setBusy(null)
    }
  }

  if (loadError && !lib) {
    return (
      <Notice tone="danger" action={<Button size="sm" onClick={() => void load()}>Try again</Button>}>
        {loadError}
      </Notice>
    )
  }
  if (!lib) return <LoadingBlock label="Loading photos…" />

  const cover = lib.cover
  const uploads = lib.photos.filter(p => p.source === 'business' || p.source === 'admin')
  const community = lib.photos.filter(p => p.source === 'story' || p.source === 'community')
  const canUpload = uploads.filter(p => p.status === 'active').length < lib.maxUploads
  const myPick = actor === 'business' ? lib.coverPick.businessPhotoId : lib.coverPick.adminPhotoId
  const hasAnyPick = Boolean(lib.coverPick.businessPhotoId || lib.coverPick.adminPhotoId)
  const coverHow = !cover
    ? 'No NessaChat photo yet — the public page shows Google’s photo (credited) until you add one.'
    : cover.pickedBy === 'business'
      ? 'Chosen by the business.'
      : cover.pickedBy === 'admin'
        ? 'Chosen by Nessa.'
        : cover.source === 'business' || cover.source === 'admin'
          ? 'Picked automatically: your newest upload.'
          : 'Picked automatically: the most-liked public story photo.'

  const onPickPhoto = async (file: File | undefined) => {
    if (!file) return
    await run('upload', () => uploadPlacePhoto({ placeId, file, actor, makeCover }), 'Photo added.')
    if (photoInput.current) photoInput.current.value = ''
  }
  const onPickLogo = async (file: File | undefined) => {
    if (!file) return
    await run('logo', () => uploadBusinessLogo({ placeId, file, actor }), 'Logo updated.', false)
    if (logoInput.current) logoInput.current.value = ''
  }

  return (
    <div className="space-y-6">
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {status ? <Notice tone="ok">{status}</Notice> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Cover */}
        <Panel aria-labelledby={`cover-h-${placeId}`}>
          <PanelHeader
            id={`cover-h-${placeId}`}
            icon="image"
            title="Cover photo"
            description={`The first thing people see on ${placeName}’s page, in listings and when the link is shared.`}
            actions={
              myPick || (actor === 'admin' && hasAnyPick) ? (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={busy === 'clear'}
                  onClick={() => void run('clear', () => clearPlaceCover(placeId, actor), 'Cover choice cleared.')}
                >
                  {actor === 'admin' && hasAnyPick && !myPick ? 'Clear business choice' : 'Choose automatically'}
                </Button>
              ) : null
            }
          />
          <div className="px-5 pb-5 max-sm:px-4">
            <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-n-sunken">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- our own photo (Firebase Storage)
                <img src={cover.url} alt="" className="h-full w-full object-cover" data-testid="cover-preview" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-n-faint">
                  <Icon name="image" size={32} strokeWidth={1.4} />
                  <span className="text-[13px]">No cover yet</span>
                </div>
              )}
              {cover ? (
                <span className="absolute top-2.5 left-2.5">
                  <Badge tone="neutral" className="bg-white/90">
                    {SOURCE_LABEL[cover.source]}
                    {cover.creditName ? ` · ${cover.creditName}` : ''}
                  </Badge>
                </span>
              ) : null}
            </div>
            <p className="mt-2.5 text-[13px] text-n-muted">{coverHow}</p>
            {actor === 'admin' && lib.coverPick.businessPhotoId ? (
              <p className="mt-1 text-[12px] text-n-subtle">
                The business’s choice comes first. “Clear business choice” lets Nessa’s pick (or the automatic one) show.
              </p>
            ) : null}
          </div>
        </Panel>

        {/* Upload + logo */}
        <div className="space-y-6">
          <Panel aria-labelledby={`upload-h-${placeId}`}>
            <PanelHeader
              id={`upload-h-${placeId}`}
              icon="plus"
              title="Add a photo"
              description="JPEG, PNG or WebP. We resize it and remove location data before publishing."
            />
            <div className="space-y-3 px-5 pb-5 max-sm:px-4">
              <input
                ref={photoInput}
                type="file"
                accept={PHOTO_ACCEPT}
                className="sr-only"
                id={`photo-file-${placeId}`}
                data-testid="photo-file"
                onChange={e => void onPickPhoto(e.target.files?.[0])}
              />
              <label className="flex items-center gap-2 text-[13px] text-n-ink-2">
                <input type="checkbox" checked={makeCover} onChange={e => setMakeCover(e.target.checked)} className="size-4 accent-[#5B46E5]" />
                Use it as the cover
              </label>
              <Button
                variant="primary"
                icon="plus"
                className="w-full"
                loading={busy === 'upload'}
                disabled={!canUpload || Boolean(busy)}
                onClick={() => photoInput.current?.click()}
              >
                {busy === 'upload' ? 'Uploading…' : 'Choose a photo'}
              </Button>
              {!canUpload ? (
                <p className="text-[12px] text-n-subtle">You’ve reached {lib.maxUploads} photos. Remove one to add another.</p>
              ) : null}
            </div>
          </Panel>

          {lib.hasBusiness ? (
            <Panel aria-labelledby={`logo-h-${placeId}`}>
              <PanelHeader
                id={`logo-h-${placeId}`}
                icon="store"
                title="Logo"
                description="Square works best. Shown next to your verified details."
              />
              <div className="flex items-center gap-4 px-5 pb-5 max-sm:px-4">
                <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-n-line bg-n-sunken text-n-faint">
                  {lib.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- our own upload
                    <img src={lib.logoUrl} alt="Current logo" className="h-full w-full object-cover" />
                  ) : (
                    <Icon name="store" size={22} />
                  )}
                </span>
                <input
                  ref={logoInput}
                  type="file"
                  accept={PHOTO_ACCEPT}
                  className="sr-only"
                  data-testid="logo-file"
                  onChange={e => void onPickLogo(e.target.files?.[0])}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" loading={busy === 'logo'} disabled={Boolean(busy)} onClick={() => logoInput.current?.click()}>
                    {lib.logoUrl ? 'Replace logo' : 'Upload logo'}
                  </Button>
                  {lib.logoUrl ? (
                    <Button
                      size="sm"
                      variant="quiet-danger"
                      loading={busy === 'logo-remove'}
                      disabled={Boolean(busy)}
                      onClick={() => void run('logo-remove', () => removeBusinessLogo(placeId, actor), 'Logo removed.', false)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <PhotoGrid
        title={actor === 'business' ? 'Your photos' : 'Uploaded photos'}
        description={
          actor === 'business'
            ? 'Shown in the Photos section of your page. Choose any as the cover.'
            : 'Uploaded by the business or by Nessa.'
        }
        empty="No uploads yet."
        photos={uploads}
        lib={lib}
        actor={actor}
        busy={busy}
        onSetCover={p => void run(`cover-${p.id}`, () => setPlaceCover(placeId, p.id, actor), 'Cover updated.')}
        onRemove={p => setConfirmRemove(p)}
        onHide={(p, hidden) =>
          void run(`hide-${p.id}`, () => setPlacePhotoHidden(placeId, p.id, hidden), hidden ? 'Photo hidden.' : 'Photo restored.')
        }
      />

      <PhotoGrid
        title="From travellers"
        description="Photos from public stories tagged here. They can be the cover; only Nessa can hide them."
        empty="No public story photos yet."
        photos={community}
        lib={lib}
        actor={actor}
        busy={busy}
        onSetCover={p => void run(`cover-${p.id}`, () => setPlaceCover(placeId, p.id, actor), 'Cover updated.')}
        onRemove={p => setConfirmRemove(p)}
        onHide={(p, hidden) =>
          void run(`hide-${p.id}`, () => setPlacePhotoHidden(placeId, p.id, hidden), hidden ? 'Photo hidden.' : 'Photo restored.')
        }
      />

      <Dialog
        open={Boolean(confirmRemove)}
        onClose={() => setConfirmRemove(null)}
        title="Remove this photo?"
        description="It will be deleted from NessaChat. This can’t be undone."
        footer={
          <>
            <Button onClick={() => setConfirmRemove(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={busy === 'remove'}
              onClick={() => {
                const p = confirmRemove
                setConfirmRemove(null)
                if (p) void run('remove', () => removePlacePhoto(placeId, p.id, actor), 'Photo removed.')
              }}
            >
              Remove photo
            </Button>
          </>
        }
      />
    </div>
  )
}

function PhotoGrid({
  title,
  description,
  empty,
  photos,
  lib,
  actor,
  busy,
  onSetCover,
  onRemove,
  onHide,
}: {
  title: string
  description: string
  empty: string
  photos: ManagedPlacePhoto[]
  lib: PlacePhotoLibrary
  actor: PhotoActor
  busy: string | null
  onSetCover: (p: ManagedPlacePhoto) => void
  onRemove: (p: ManagedPlacePhoto) => void
  onHide: (p: ManagedPlacePhoto, hidden: boolean) => void
}) {
  return (
    <Panel aria-label={title}>
      <PanelHeader title={title} description={description} actions={<Badge>{photos.length}</Badge>} />
      {photos.length === 0 ? (
        <EmptyState compact icon="image" title={empty} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 px-5 pb-5 sm:grid-cols-3 lg:grid-cols-4 max-sm:px-4">
          {photos.map(p => {
            const isCover = lib.cover?.photoId === p.id
            const hidden = p.status === 'hidden'
            return (
              <li key={p.id} className="min-w-0" data-photo-id={p.id}>
                <div className={cx('relative aspect-[4/3] overflow-hidden rounded-xl bg-n-sunken', hidden && 'opacity-50')}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- our own photo */}
                  <img src={p.feedUrl || p.url} alt={p.caption ?? ''} loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute top-2 left-2 flex gap-1">
                    {isCover ? (
                      <Badge tone="accent" className="bg-white/95">
                        Cover
                      </Badge>
                    ) : null}
                    {hidden ? <Badge tone="warn">Hidden</Badge> : null}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-[12px] text-n-subtle">
                  {SOURCE_LABEL[p.source]}
                  {p.creditName ? ` · ${p.creditName}` : ''}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {!isCover && !hidden ? (
                    <Button size="sm" variant="ghost" loading={busy === `cover-${p.id}`} disabled={Boolean(busy)} onClick={() => onSetCover(p)}>
                      Make cover
                    </Button>
                  ) : null}
                  {actor === 'admin' ? (
                    <Button size="sm" variant="ghost" loading={busy === `hide-${p.id}`} disabled={Boolean(busy)} onClick={() => onHide(p, !hidden)}>
                      {hidden ? 'Unhide' : 'Hide'}
                    </Button>
                  ) : null}
                  {p.canRemove ? (
                    <Button size="sm" variant="quiet-danger" disabled={Boolean(busy)} onClick={() => onRemove(p)} aria-label="Remove photo">
                      <Icon name="trash" size={14} />
                    </Button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
