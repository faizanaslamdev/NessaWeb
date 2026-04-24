'use client'

import { instantChatFeatures } from '@/lib/constants'
import { motion } from 'framer-motion'

export default function InstantChatSection() {
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
    <section className="relative bg-black py-20 sm:py-32">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 -left-64 h-96 w-96 rounded-full bg-linear-to-br from-violet-600/20 to-purple-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-12 sm:mb-16 text-center px-2">
          <div className="mb-4 inline-block rounded-full bg-white/5 px-4 py-1.5 border border-white/10">
            <p className="text-xs font-medium text-purple-400">Zero-friction communication</p>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 text-balance">
            Instant Chat, No Signup
          </h2>
          <p className="mx-auto max-w-2xl text-gray-400 text-sm sm:text-base">
            Start chatting immediately with anyone via a shareable link or QR code. Perfect for quick conversations, team discussions, or spontaneous connections without the friction of traditional signup.
          </p>
        </div>

        {/* Features Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
        >
          {instantChatFeatures.map((feature, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              className="rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-white/0 p-6 sm:p-8 hover:border-purple-500/30 transition-colors"
            >
              <div className="text-3xl sm:text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Visual Demo Section */}
        <div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/5 to-white/0 p-6 sm:p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
            {/* Left side - Demo visual */}
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-lg bg-linear-to-br from-purple-600/30 to-violet-600/20 flex items-center justify-center border border-white/10">
                  <div className="text-6xl opacity-60">📱</div>
                </div>
                <div className="absolute -top-2 -right-2 w-12 h-12 rounded-lg bg-linear-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold">
                  ✓
                </div>
              </div>
              <p className="text-center text-white font-semibold">Share QR Code</p>
            </div>

            {/* Right side - Steps */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Create a room</h4>
                  <p className="text-sm text-gray-400">Generate an instant chat session with a single tap</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Share instantly</h4>
                  <p className="text-sm text-gray-400">Copy the link or scan the QR code to invite anyone</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-white mb-1">Chat freely</h4>
                  <p className="text-sm text-gray-400">Message, call, and share in real-time—zero friction</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
