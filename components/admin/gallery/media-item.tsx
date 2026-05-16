'use client'

import { motion } from 'framer-motion'
import { Play } from 'lucide-react'

interface MediaItemProps {
  id: string
  type: 'image' | 'video'
  thumbnail: string
  onClick: () => void
}

export default function MediaItem({ id, type, thumbnail, onClick }: MediaItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-white/5 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20"
    >
      {type === 'image' ? (
        /* eslint-disable-next-line @next/next/no-img-element -- Firebase Storage URLs */
        <img
          src={thumbnail}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <video
          src={thumbnail}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/40" />
      {type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="rounded-full bg-purple-600/80 p-3 backdrop-blur-sm group-hover:bg-purple-500"
          >
            <Play className="size-6 fill-white text-white" />
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
