'use client'

import { appStores } from '@/lib/constants'
import { motion } from 'framer-motion'
import Image from 'next/image'

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

          {/* Download Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 w-full">
            {appStores.map((store) => (
              <a
                key={store.name}
                href={store.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors w-full sm:w-auto sm:flex-1"
              >
                <Image
                  src={store.iconSrc}
                  alt=""
                  width={22}
                  height={22}
                  className="h-[22px] w-[22px]"
                />
                <div className="text-left">
                  <p className="text-xs text-gray-400">Download on</p>
                  <p className="font-semibold text-white text-sm">{store.name}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Additional info */}
          <p className="text-xs sm:text-sm text-gray-500">
            Free to download. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
