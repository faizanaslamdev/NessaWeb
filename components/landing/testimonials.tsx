'use client'

import { testimonials } from '@/lib/constants'
import { motion } from 'framer-motion'

export default function TestimonialsSection() {
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
    <section className="relative bg-black py-20 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mb-16 text-center">
          <div className="mb-4 inline-block rounded-full bg-white/5 px-4 py-1.5 border border-white/10">
            <p className="text-xs font-medium text-purple-400">Reviews</p>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 text-balance">
            Loved by millions
          </h2>
          <p className="mx-auto max-w-2xl text-gray-400 text-sm sm:text-base">
            Join thousands of happy users enjoying seamless messaging.
          </p>
        </div>

        {/* Testimonials Grid - 3 columns on desktop, responsive on mobile */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 sm:p-8 transition-all duration-300 hover:border-purple-500/50 hover:bg-white/[0.08] hover:shadow-lg hover:shadow-purple-500/20"
            >
              {/* Stars */}
              <div className="mb-4 flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-amber-400 text-lg">★</span>
                ))}
              </div>

              {/* Quote */}
              <p className="mb-6 text-gray-200 text-sm sm:text-base leading-relaxed">
                &quot;{testimonial.quote}&quot;
              </p>

              {/* Author Info */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center text-xl font-semibold text-white">
                  {testimonial.avatar}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {testimonial.author}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 truncate">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
