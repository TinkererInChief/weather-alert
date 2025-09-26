import HeroSection from '@/components/home/HeroSection'
import BenefitsSection from '@/components/home/BenefitsSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import UseCasesSection from '@/components/home/UseCasesSection'
import TrustSection from '@/components/home/TrustSection'
import PricingTeaser from '@/components/home/PricingTeaser'
import CTASection from '@/components/home/CTASection'
import HomeFooter from '@/components/home/HomeFooter'
import HomeRedirect from '@/components/home/HomeRedirect'

export default function HomePage() {
  return (
    <>
      <HomeRedirect />
      <HeroSection />
      <BenefitsSection />
      <FeaturesSection />
      <UseCasesSection />
      <TrustSection />
      <PricingTeaser />
      <CTASection />
      <HomeFooter />
    </>
  )
}
