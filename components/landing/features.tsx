'use client'

import { features } from '@/lib/constants'
import { motion } from 'framer-motion'

export default function FeaturesSection() {
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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' as const },
    },
  }

  return (
    <section id="features" className="relative bg-black py-20 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16 text-center px-2">
          <div className="mb-4 inline-block rounded-full bg-white/5 px-4 py-1.5 border border-white/10">
            <p className="text-xs font-medium text-purple-400">Features</p>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 text-balance">
            Everything you need
          </h2>
          <p className="mx-auto max-w-2xl text-gray-400 text-sm sm:text-base">
            Powerful features designed to keep you connected with the people and conversations that matter most.
          </p>
        </div>

        {/* Features Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.id}
              variants={itemVariants}
              className="group relative rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 transition-all hover:border-purple-500/50 hover:bg-gradient-to-br hover:from-purple-500/10 hover:to-white/5"
            >
              {/* Background glow on hover */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-600/0 to-violet-600/0 group-hover:from-purple-600/20 group-hover:to-violet-600/10 transition-all opacity-0 group-hover:opacity-100" />
              
              {/* Content */}
              <div className="relative z-10">
                <div className="mb-4 text-3xl sm:text-4xl">{feature.icon}</div>
                <h3 className="mb-2 text-lg sm:text-xl font-bold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-400">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
