'use client'

import { testimonials } from '@/lib/constants'
import { motion } from 'framer-motion'
import Image from 'next/image'

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

        {/* Infinite carousel (marquee) */}
        <motion.div
          className="relative overflow-hidden mask-[linear-gradient(to_right,transparent,black_3%,black_97%,transparent)]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          <div
            className="nessa-marquee flex w-max py-2"
            style={
              {
                '--nessa-marquee-duration': '55s',
              } as React.CSSProperties
            }
          >
            {[0, 1].map((dup) => (
              <div
                key={dup}
                className="flex shrink-0 gap-4 pr-4 sm:gap-6 sm:pr-6"
              >
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={`${dup}-${testimonial.author}-${index}`}
                    variants={itemVariants}
                    className="group flex h-full min-h-[260px] w-[280px] flex-col rounded-lg border border-white/10 bg-white/3 backdrop-blur-sm p-6 transition-all duration-300 hover:border-purple-500/50 hover:bg-white/8 hover:shadow-lg hover:shadow-purple-500/20 sm:min-h-[280px] sm:w-[360px] sm:p-8"
                  >
                    {/* Stars */}
                    <div className="mb-4 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className="text-amber-400 text-lg">
                          ★
                        </span>
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="flex-1 text-gray-200 text-sm leading-relaxed sm:text-base">
                      &quot;{testimonial.quote}&quot;
                    </p>

                    {/* Author Info */}
                    <div className="mt-auto flex items-center gap-3 pt-6">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                        <Image
                          src={testimonial.avatarSrc}
                          alt={testimonial.author}
                          fill
                          className="object-cover object-center scale-110"
                          sizes="48px"
                        />
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
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
