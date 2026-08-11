'use client'

import type { CSSProperties } from 'react'

/**
 * Web Story photo collage — mirrors NessaChat StoryPhotoCollage layouts.
 * 1 / 2 / 3 / 4 / 5 / 6+ (+N overlay) patterns from the mobile app.
 */

type StoryPhotoCollageProps = {
  uris: string[]
  onPressPhoto?: (index: number) => void
  className?: string
}

const GAP_PX = 2
const HEIGHT_PX = 260

function Tile({
  uri,
  className,
  style,
  onPress,
  overlayLabel,
}: {
  uri: string
  className?: string
  style?: CSSProperties
  onPress?: () => void
  overlayLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`relative block overflow-hidden bg-[#1a1525] p-0 ${className ?? ''}`}
      style={style}
      aria-label={
        overlayLabel ? `View photos, ${overlayLabel} more` : 'View photo'
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Firebase download URLs */}
      <img
        src={uri}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
        onError={event => {
          event.currentTarget.style.opacity = '0'
        }}
      />
      {overlayLabel ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xl font-extrabold text-white">
          {overlayLabel}
        </span>
      ) : null}
    </button>
  )
}

export function StoryPhotoCollage({
  uris,
  onPressPhoto,
  className = '',
}: StoryPhotoCollageProps) {
  const photos = uris.filter(uri => Boolean(uri?.trim()))
  if (photos.length === 0) {
    return null
  }

  const press = (index: number) => () => onPressPhoto?.(index)
  const wrap = `overflow-hidden rounded-xl bg-[#1a1525] ${className}`

  if (photos.length === 1) {
    return (
      <div className={wrap} style={{height: HEIGHT_PX}}>
        <Tile uri={photos[0]!} className="h-full w-full" onPress={press(0)} />
      </div>
    )
  }

  if (photos.length === 2) {
    return (
      <div
        className={`flex ${wrap}`}
        style={{height: HEIGHT_PX, gap: GAP_PX}}
      >
        <Tile
          uri={photos[0]!}
          className="h-full min-w-0 flex-1"
          onPress={press(0)}
        />
        <Tile
          uri={photos[1]!}
          className="h-full min-w-0 flex-1"
          onPress={press(1)}
        />
      </div>
    )
  }

  if (photos.length === 3) {
    return (
      <div
        className={`flex ${wrap}`}
        style={{height: HEIGHT_PX, gap: GAP_PX}}
      >
        <Tile
          uri={photos[0]!}
          className="h-full min-w-0"
          style={{flex: 1.15}}
          onPress={press(0)}
        />
        <div
          className="flex min-w-0 flex-1 flex-col"
          style={{gap: GAP_PX}}
        >
          <Tile
            uri={photos[1]!}
            className="min-h-0 w-full flex-1"
            onPress={press(1)}
          />
          <Tile
            uri={photos[2]!}
            className="min-h-0 w-full flex-1"
            onPress={press(2)}
          />
        </div>
      </div>
    )
  }

  if (photos.length === 4) {
    return (
      <div
        className={`flex flex-wrap content-start ${wrap}`}
        style={{height: HEIGHT_PX, gap: GAP_PX}}
      >
        {photos.map((uri, index) => (
          <Tile
            key={`${index}-${uri.slice(-24)}`}
            uri={uri}
            style={{width: '49.4%', height: '49.4%'}}
            onPress={press(index)}
          />
        ))}
      </div>
    )
  }

  if (photos.length === 5) {
    return (
      <div
        className={`flex flex-col ${wrap}`}
        style={{height: HEIGHT_PX, gap: GAP_PX}}
      >
        <div className="flex min-h-0 flex-1" style={{gap: GAP_PX}}>
          <Tile
            uri={photos[0]!}
            className="h-full min-w-0 flex-1"
            onPress={press(0)}
          />
          <Tile
            uri={photos[1]!}
            className="h-full min-w-0 flex-1"
            onPress={press(1)}
          />
        </div>
        <div className="flex min-h-0 flex-1" style={{gap: GAP_PX}}>
          <Tile
            uri={photos[2]!}
            className="h-full min-w-0 flex-1"
            onPress={press(2)}
          />
          <Tile
            uri={photos[3]!}
            className="h-full min-w-0 flex-1"
            onPress={press(3)}
          />
          <Tile
            uri={photos[4]!}
            className="h-full min-w-0 flex-1"
            onPress={press(4)}
          />
        </div>
      </div>
    )
  }

  // 6+: 3×2 grid; if >6, show 5 tiles with +N on the last (mobile parity)
  const hiddenCount = Math.max(0, photos.length - 6)
  const visible = hiddenCount > 0 ? photos.slice(0, 5) : photos.slice(0, 6)
  const overlayOnLast = hiddenCount > 0

  return (
    <div
      className={`flex flex-wrap content-start ${wrap}`}
      style={{height: HEIGHT_PX, gap: GAP_PX}}
    >
      {visible.map((uri, index) => (
        <Tile
          key={`${index}-${uri.slice(-24)}`}
          uri={uri}
          style={{width: '32.5%', height: '49.4%'}}
          onPress={press(index)}
          overlayLabel={
            overlayOnLast && index === visible.length - 1
              ? `+${hiddenCount + 1}`
              : undefined
          }
        />
      ))}
    </div>
  )
}
