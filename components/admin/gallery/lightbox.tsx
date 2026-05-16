'use client'

import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

import type { GalleryMediaItem } from './gallery-grid'
import ImageViewer from './image-viewer'
import VideoViewer from './video-viewer'

interface LightboxProps {
  isOpen: boolean
  media?: GalleryMediaItem
  allMedia: GalleryMediaItem[]
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
}

export default function Lightbox({ isOpen, media, allMedia, onClose, onPrevious, onNext }: LightboxProps) {
  const currentIndex = media ? allMedia.findIndex((m) => m.id === media.id) : -1
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < allMedia.length - 1

  useEffect(() => {
    if (!isOpen) {
      return
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          if (hasPrevious) {
            onPrevious?.()
          }
          break
        case 'ArrowRight':
          if (hasNext) {
            onNext?.()
          }
          break
        default:
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext])

  if (!media) {
    return null
  }

  return (
    <AnimatePresence>
      {isOpen && media && (
        <>
          {media.type === 'image' ? (
            <ImageViewer
              src={media.src}
              alt={media.id}
              onClose={onClose}
              onPrevious={onPrevious}
              onNext={onNext}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
            />
          ) : (
            <VideoViewer src={media.src} onClose={onClose} />
          )}
        </>
      )}
    </AnimatePresence>
  )
}
