'use client'

import { motion } from 'framer-motion'

interface GalleryFiltersProps {
  activeFilter: 'all' | 'images' | 'videos'
  onFilterChange: (filter: 'all' | 'images' | 'videos') => void
}

const filters = [
  { id: 'all' as const, label: 'All' },
  { id: 'images' as const, label: 'Images' },
  { id: 'videos' as const, label: 'Videos' },
]

export default function GalleryFilters({ activeFilter, onFilterChange }: GalleryFiltersProps) {
  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">Media Gallery</h1>
        <p className="text-sm text-gray-400">Admin access only</p>
      </div>
      <div className="flex gap-4">
        {filters.map((filter) => (
          <motion.button
            key={filter.id}
            type="button"
            onClick={() => onFilterChange(filter.id)}
            className="relative px-4 py-2 text-sm font-medium transition-colors duration-300"
            whileHover={{ color: '#fff' }}
          >
            <span className={activeFilter === filter.id ? 'text-white' : 'text-gray-400'}>{filter.label}</span>
            {activeFilter === filter.id && (
              <motion.div
                layoutId="activeFilter"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-purple-600 to-violet-600"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
