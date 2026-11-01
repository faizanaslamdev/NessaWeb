'use client'

import { useEffect, useRef, useState } from 'react'

import { cx, initials } from '@/components/dash/ui'

/**
 * Image URLs that failed to load this session (403 from a stale Storage token,
 * 404, offline…). Remembered so list re-renders don't retry them.
 */
const failedAvatarUrls = new Set<string>()

export function isAvatarUrlUsable(url: string | null | undefined): url is string {
  return Boolean(url) && /^https:\/\//i.test(url!) && !failedAvatarUrls.has(url!)
}

/**
 * Person avatar / business logo. The initials are painted UNDER the image, so
 * a slow load never shows an empty circle, and a failed image (e.g. an old
 * avatar link) falls back to the initials instead of a broken image.
 */
export function ThreadAvatar({
  name,
  url,
  size = 40,
  square = false,
}: {
  name: string
  url: string | null
  size?: number
  /** Business logos are rounded squares; people are circles. */
  square?: boolean
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const usable = isAvatarUrlUsable(url) && failedUrl !== url
  const imgRef = useRef<HTMLImageElement | null>(null)
  // A cached image can finish before React attaches onLoad / onError.
  useEffect(() => {
    const img = imgRef.current
    if (!img || !img.complete || !url) return
    if (img.naturalWidth > 0) setLoadedUrl(url)
    else {
      failedAvatarUrls.add(url)
      setFailedUrl(url)
    }
  }, [url])
  const shape = square ? 'rounded-[10px]' : 'rounded-full'
  return (
    <span
      className={cx('relative inline-flex shrink-0 overflow-hidden', shape)}
      style={{ width: size, height: size }}
    >
      {/* Not <Avatar>: its rounded-full would beat `shape` (cx doesn't merge classes), so logos' initials came out round. */}
      <span
        aria-hidden
        style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
        className={cx('inline-flex items-center justify-center bg-n-accent-soft font-semibold text-n-accent-strong', shape)}
      >
        {initials(name)}
      </span>
      {usable ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar / logo (Firebase Storage / provider URL)
        <img
          ref={imgRef}
          src={url!}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          style={{ width: size, height: size }}
          className={cx(
            'absolute inset-0 object-cover transition-opacity duration-150',
            shape,
            loadedUrl === url ? 'opacity-100' : 'opacity-0',
          )}
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedUrl(url)}
          onError={() => {
            failedAvatarUrls.add(url!)
            setFailedUrl(url)
          }}
        />
      ) : null}
    </span>
  )
}
