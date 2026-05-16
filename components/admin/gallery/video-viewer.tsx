'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useRef } from 'react'

interface VideoViewerProps {
  src: string
  onClose: () => void
}

export default function VideoViewer({ src, onClose }: VideoViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[90vh] max-w-[min(90vw,56rem)]" onClick={(e) => e.stopPropagation()}>
        <video
          ref={videoRef}
          key={src}
          src={src}
          controls
          autoPlay
          className="h-auto w-full max-h-[90vh] object-contain"
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
    </motion.div>
  )
}
