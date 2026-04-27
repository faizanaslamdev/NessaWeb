'use client'

import { motion } from 'framer-motion'

import { siteConfig } from '@/lib/constants'

const values = [
  {
    title: 'Human-first messaging',
    body: 'We build tools that feel natural—translation when you need it, clarity when you don’t.',
  },
  {
    title: 'Privacy by design',
    body: 'Your conversations matter. We minimize data collection and are transparent about how we use it.',
  },
  {
    title: 'Quality over noise',
    body: 'Fast, reliable delivery and thoughtful notifications so you stay in control.',
  },
]

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' as const },
  },
}

export function AboutAnimatedSections() {
  return (
    <motion.div
      className="grid gap-5 pt-4 sm:grid-cols-2 lg:grid-cols-3"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      variants={container}
    >
      {values.map((v) => (
        <motion.div
          key={v.title}
          variants={item}
          className="rounded-2xl border border-white/10 bg-linear-to-br from-white/[0.07] to-white/[0.02] p-5 shadow-lg shadow-black/30"
        >
          <h3 className="mb-2 text-lg font-semibold text-white">{v.title}</h3>
          <p className="text-sm leading-relaxed text-gray-400">{v.body}</p>
        </motion.div>
      ))}
      <motion.div
        variants={item}
        className="rounded-2xl border border-purple-500/25 bg-linear-to-br from-purple-600/20 to-violet-600/10 p-5 sm:col-span-2 lg:col-span-1"
      >
        <h3 className="mb-2 text-lg font-semibold text-white">Built for {siteConfig.name}</h3>
        <p className="text-sm leading-relaxed text-gray-300">
          Instant Chat for quick sessions, full accounts for lasting connections—all in one app.
        </p>
      </motion.div>
    </motion.div>
  )
}
