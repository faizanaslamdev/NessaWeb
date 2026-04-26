'use client'

import { motion } from 'framer-motion'
import AppStoreButtons from '@/components/landing/app-store-buttons'

export default function AppDownloadSection() {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' as const },
    },
  }

  return (
    <section id="download" className="relative bg-black py-20 sm:py-32">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-linear-to-t from-purple-600/20 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/0 p-6 sm:p-8 lg:p-12 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {/* Content */}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 text-balance">
            Ready to connect?
          </h2>
          <p className="mx-auto max-w-2xl text-gray-400 mb-8 sm:mb-10 text-sm sm:text-base">
            Download NessaChat today and start messaging in seconds. Available on iOS and Android.
          </p>

          <AppStoreButtons className="mb-8" />

          {/* Additional info */}
          <p className="text-xs sm:text-sm text-gray-500">
            Free to download. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
