'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import HeroSection from '@/components/home/HeroSection'
import BenefitsSection from '@/components/home/BenefitsSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import UseCasesSection from '@/components/home/UseCasesSection'
import TrustSection from '@/components/home/TrustSection'
import PricingTeaser from '@/components/home/PricingTeaser'
import CTASection from '@/components/home/CTASection'
import HomeFooter from '@/components/home/HomeFooter'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/dashboard')
    }
  }, [session, status, router])

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-2 text-white">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render homepage if authenticated (will redirect)
  if (status === 'authenticated') {
    return null
  }

  return (
    <>
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
