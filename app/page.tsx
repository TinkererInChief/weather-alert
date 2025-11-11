'use client'

import HeroSection from '@/components/homepage/HeroSection'
import BenefitsSection from '@/components/homepage/BenefitsSection'
import FeaturesSection from '@/components/homepage/FeaturesSection'
import TsunamiSimulationSection from '@/components/homepage/TsunamiSimulationSection'
import TimelineAnimation from '@/components/homepage/TimelineAnimation'
import DetailedFeaturesSection from '@/components/homepage/DetailedFeaturesSection'
import UseCasesSection from '@/components/homepage/UseCasesSection'
import TrustSection from '@/components/homepage/TrustSection'
import PricingTeaser from '@/components/homepage/PricingTeaser'
import CTASection from '@/components/homepage/CTASection'
import HomeFooter from '@/components/homepage/HomeFooter'
import WorkInProgressBanner from '@/components/common/WorkInProgressBanner'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <WorkInProgressBanner />
      <HeroSection />
      <BenefitsSection />
      <FeaturesSection />
      <TsunamiSimulationSection />
      <TimelineAnimation />
      <DetailedFeaturesSection />
      <UseCasesSection />
      <TrustSection />
      <PricingTeaser />
      <CTASection />
      <HomeFooter />
    </div>
  )
}
