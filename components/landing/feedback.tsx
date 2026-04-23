'use client'

import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { siteConfig } from '@/lib/constants'

export default function FeedbackSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    feedback: '',
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitted(true)
    setFormData({ name: '', email: '', feedback: '' })

    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
    successTimeoutRef.current = setTimeout(() => setIsSubmitted(false), 4000)
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' as const },
    },
  }

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut' as const,
        delay: 0.2,
      },
    },
  }

  return (
    <section id="feedback" className="relative isolate bg-black px-4 py-20 sm:px-6 sm:py-32 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -bottom-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-linear-to-t from-purple-600/15 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-2xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={containerVariants}
          className="mb-12 text-center sm:mb-16"
        >
          <div className="mb-4 inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
            <p className="text-xs font-medium text-purple-400">Feedback</p>
          </div>
          <h2 className="mb-4 text-balance text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Help us improve {siteConfig.name}
          </h2>
          <p className="text-sm text-gray-400 sm:text-base">
            Translation quality, bugs, or feature ideas—we read every message. You can also email us
            directly at{' '}
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="text-purple-300 underline-offset-2 hover:text-purple-200 hover:underline"
            >
              {siteConfig.supportEmail}
            </a>
            .
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={formVariants}
          className="rounded-2xl border border-white/10 bg-linear-to-br from-white/5 to-white/0 p-6 sm:p-8 lg:p-10"
        >
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-white">
                Name
              </label>
              <Input
                variant="landing"
                inputSize="lg"
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-white">
                Email
              </label>
              <Input
                variant="landing"
                inputSize="lg"
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="feedback" className="mb-2 block text-sm font-medium text-white">
                Message
              </label>
              <Textarea
                variant="landing"
                id="feedback"
                name="feedback"
                value={formData.feedback}
                onChange={handleChange}
                placeholder="What should we know? (device, app version, and steps help for bugs.)"
                required
                rows={5}
              />
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-lg bg-linear-to-r from-purple-600 to-violet-600 font-semibold text-white hover:from-purple-700 hover:to-violet-700"
              >
                Send message
              </Button>
            </motion.div>

            <p className="text-center text-xs text-gray-500">
              This form is for feedback only. For account issues, use in-app support when available.
            </p>

            {isSubmitted && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-green-500/30 bg-green-500/10 p-4"
              >
                <p className="text-center text-sm text-green-300">
                  Thanks—we got your note. We&apos;ll review it soon.
                </p>
              </motion.div>
            )}
          </div>
        </motion.form>
      </div>
    </section>
  )
}
