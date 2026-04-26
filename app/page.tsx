'use client'

import { useState } from 'react'
import Navbar from '@/components/landing/navbar'
import HeroSection from '@/components/landing/hero'
import PreviewSection from '@/components/landing/preview'
import FeaturesSection from '@/components/landing/features'
import InstantChatSection from '@/components/landing/instant-chat'
import HowItWorksSection from '@/components/landing/how-it-works'
import SocialProofSection from '@/components/landing/social-proof'
import TestimonialsSection from '@/components/landing/testimonials'
import FeedbackSection from '@/components/landing/feedback'
import AppDownloadSection from '@/components/landing/app-download'
import Footer from '@/components/landing/footer'
import DownloadAppFeaturesModal from '@/components/chat/download-app-features-modal'

export default function Home() {
  const [downloadOpen, setDownloadOpen] = useState(false)
  const openDownload = () => setDownloadOpen(true)

  return (
    <>
      <Navbar onOpenDownload={openDownload} />
      <HeroSection onOpenDownload={openDownload} />
      <FeaturesSection />
      <InstantChatSection />
      <PreviewSection />
      <HowItWorksSection />
      <SocialProofSection />
      <TestimonialsSection />
      <FeedbackSection />
      <AppDownloadSection />
      <Footer />
      <DownloadAppFeaturesModal
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
        placement="landing"
      />
    </>
  )
}
