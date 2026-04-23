'use client'

import { heroSection } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export default function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' as const },
    },
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-black pt-32">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-purple-600/30 to-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-br from-purple-600/20 to-violet-600/30 blur-3xl" />
      </div>

      {/* Content */}
      <motion.div 
        className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="text-center">
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6 inline-block rounded-full bg-white/5 px-4 py-1.5 border border-white/10">
            <p className="text-xs font-medium text-purple-400">The messaging revolution</p>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={itemVariants} className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-5xl sm:text-6xl lg:text-7xl font-bold text-transparent leading-tight mb-6">
            {heroSection.title}
          </motion.h1>

          {/* Subheadline */}
          <motion.p variants={itemVariants} className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-400 mb-10">
            {heroSection.subtitle}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold px-8"
            >
              {heroSection.cta1}
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 font-semibold px-8"
            >
              {heroSection.cta2}
            </Button>
          </motion.div>

          {/* CTA Subtext */}
          <motion.p variants={itemVariants} className="mt-4 text-sm text-gray-500">
            {heroSection.ctaSubtext}
          </motion.p>

          {/* Hero Image Placeholder */}
          <motion.div variants={itemVariants} className="mt-20">
            <div className="mx-auto max-w-3xl rounded-2xl bg-gradient-to-b from-white/5 to-white/0 border border-white/10 aspect-video flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500 text-sm">Hero Image Placeholder</p>
                <p className="text-gray-600 text-xs mt-2">Replace with your NessaChat screenshots or demo video</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
