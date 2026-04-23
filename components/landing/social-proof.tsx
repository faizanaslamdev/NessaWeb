'use client'

import { stats } from '@/lib/constants'
import { motion } from 'framer-motion'

export default function SocialProofSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut' as const },
    },
  }

  return (
    <section className="relative bg-black py-20 sm:py-32">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 right-0 h-96 w-96 rounded-full bg-gradient-to-l from-purple-600/10 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16 text-center px-2">
          <div className="mb-4 inline-block rounded-full bg-white/5 px-4 py-1.5 border border-white/10">
            <p className="text-xs font-medium text-purple-400">Our impact</p>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 text-balance">
            Trusted by millions worldwide
          </h2>
          <p className="mx-auto max-w-2xl text-gray-400 text-sm sm:text-base">
            Join a global community of users who choose NessaChat every day.
          </p>
        </div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4 sm:p-6 lg:p-8 text-center transition-all hover:border-purple-500/50 hover:bg-gradient-to-br hover:from-purple-500/10 hover:to-white/5"
            >
              <div className="mb-2 sm:mb-3 text-2xl sm:text-3xl lg:text-4xl">{stat.icon}</div>
              <div className="mb-1 text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-300 to-white bg-clip-text text-transparent">
                {stat.number}
              </div>
              <p className="text-xs sm:text-sm text-gray-400">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
