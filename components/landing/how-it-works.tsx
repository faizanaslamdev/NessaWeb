'use client'

import { howItWorks } from '@/lib/constants'
import { motion } from 'framer-motion'

export default function HowItWorksSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
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
    <section id="how-it-works" className="relative bg-black py-20 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16 text-center px-2">
          <div className="mb-4 inline-block rounded-full bg-white/5 px-4 py-1.5 border border-white/10">
            <p className="text-xs font-medium text-purple-400">How it works</p>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 text-balance">
            Get started in 4 simple steps
          </h2>
          <p className="mx-auto max-w-2xl text-gray-400 text-sm sm:text-base">
            Join millions of users who have already discovered the joy of seamless communication.
          </p>
        </div>

        {/* Steps Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {howItWorks.map((item, index) => (
            <motion.div key={index} variants={itemVariants} className="relative">
              {/* Connecting line for desktop */}
              {index % 2 === 0 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-linear-to-r from-purple-600/50 to-transparent" />
              )}

              <div className="rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-white/0 p-6 sm:p-8">
                {/* Step Number */}
                <div className="mb-4 flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-linear-to-br from-purple-600 to-violet-600">
                  <span className="text-base sm:text-lg font-bold text-white">{item.step}</span>
                </div>

                {/* Content */}
                <h3 className="mb-2 text-lg sm:text-xl font-bold text-white">
                  {item.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-400">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
