'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ImageViewerProps {
  src: string
  alt: string
  onClose: () => void
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
}

export default function ImageViewer({
  src,
  alt,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: ImageViewerProps) {
  const [zoom, setZoom] = useState(1)
  const maxZoom = 3
  const minZoom = 1

  useEffect(() => {
    setZoom(1)
  }, [src])

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, maxZoom))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, minZoom))
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY > 0) {
      handleZoomOut()
    } else {
      handleZoomIn()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
    >
      <div
        className="flex max-h-full max-w-full items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Firebase Storage URLs */}
        <motion.img
          key={src}
          src={src}
          alt={alt}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: zoom }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="h-auto w-auto max-h-[min(90vh,100%)] max-w-[min(90vw,100%)] object-contain"
          style={{ transformOrigin: 'center center' }}
          draggable={false}
        />
      </div>

      <motion.button
        type="button"
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClose}
        className="absolute top-6 right-6 rounded-full border border-white/20 bg-white/10 p-2 transition-colors hover:bg-white/20"
      >
        <X className="size-6 text-white" />
      </motion.button>

      {hasPrevious && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.1, x: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation()
            onPrevious?.()
          }}
          className="absolute top-1/2 left-6 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-2 transition-colors hover:bg-purple-500/50"
        >
          <ChevronLeft className="size-6 text-white" />
        </motion.button>
      )}

      {hasNext && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.1, x: 4 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation()
            onNext?.()
          }}
          className="absolute top-1/2 right-6 -translate-y-1/2 rounded-full border border-white/20 bg-white/10 p-2 transition-colors hover:bg-purple-500/50"
        >
          <ChevronRight className="size-6 text-white" />
        </motion.button>
      )}

      <motion.div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2 rounded-lg border border-white/10 bg-black/50 p-2 backdrop-blur-sm">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation()
            handleZoomOut()
          }}
          disabled={zoom === minZoom}
          className="rounded p-2 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ZoomOut className="size-4 text-white" />
        </motion.button>
        <span className="min-w-12 px-3 py-2 text-center text-sm text-white">{Math.round(zoom * 100)}%</span>
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation()
            handleZoomIn()
          }}
          disabled={zoom === maxZoom}
          className="rounded p-2 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ZoomIn className="size-4 text-white" />
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
