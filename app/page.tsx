import HeroSection from '@/components/homepage/HeroSection'
import BenefitsSection from '@/components/homepage/BenefitsSection'
import FeaturesSection from '@/components/homepage/FeaturesSection'
import UseCasesSection from '@/components/homepage/UseCasesSection'
import TrustSection from '@/components/homepage/TrustSection'
import PricingTeaser from '@/components/homepage/PricingTeaser'
import CTASection from '@/components/homepage/CTASection'
import HomeFooter from '@/components/homepage/HomeFooter'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <BenefitsSection />
      <FeaturesSection />
      <UseCasesSection />
      <TrustSection />
      <PricingTeaser />
      <CTASection />
      <HomeFooter />
    </div>
  )
}
