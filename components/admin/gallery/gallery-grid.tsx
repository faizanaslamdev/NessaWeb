'use client'

import { motion } from 'framer-motion'

import MediaItem from './media-item'

export type GalleryMediaItem = {
  id: string
  src: string
  type: 'image' | 'video'
  thumbnail: string
}

interface GalleryGridProps {
  media: GalleryMediaItem[]
  onMediaClick: (media: GalleryMediaItem) => void
}

export default function GalleryGrid({ media, onMediaClick }: GalleryGridProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  }

  return (
    <motion.div
      className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {media.map((item) => (
        <MediaItem
          key={item.id}
          id={item.id}
          type={item.type}
          thumbnail={item.thumbnail}
          onClick={() => onMediaClick(item)}
        />
      ))}
    </motion.div>
  )
}
