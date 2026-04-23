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

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <InstantChatSection />
      <PreviewSection />
      <HowItWorksSection />
      <SocialProofSection />
      <TestimonialsSection />
      <FeedbackSection />
      <AppDownloadSection />
      <Footer />
    </>
  )
}
