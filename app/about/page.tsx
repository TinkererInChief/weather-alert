'use client'

import { Shield, Target, Award, Clock, Globe, TrendingUp, Users, Heart } from 'lucide-react'
import Link from 'next/link'
import WorkInProgressBanner from '@/components/common/WorkInProgressBanner'
import PublicPageHeader from '@/components/public/PublicPageHeader'
import PublicPageContent, { ContentSection, SectionTitle, Card, GradientCard } from '@/components/public/PublicPageContent'

export default function AboutPage() {
  const values = [
    {
      icon: Shield,
      title: 'Safety First',
      description: 'Every decision we make is guided by our commitment to protecting lives and ensuring the safety of communities worldwide.',
      color: 'red'
    },
    {
      icon: Clock,
      title: 'Speed & Reliability', 
      description: 'In emergencies, seconds matter. We deliver alerts within 30 seconds with 99.9% uptime reliability.',
      color: 'blue'
    },
    {
      icon: Globe,
      title: 'Global Impact',
      description: 'Our mission extends beyond borders, protecting organizations and communities across the globe.',
      color: 'green'
    },
    {
      icon: Heart,
      title: 'People-Centered',
      description: 'We design our technology around human needs, ensuring accessibility and ease of use during critical moments.',
      color: 'purple'
    }
  ]

  

  return (
    <div className="min-h-screen bg-white">
      <WorkInProgressBanner />
      <PublicPageHeader 
        title="About Us"
        subtitle="We're on a mission to protect lives through cutting-edge emergency alert technology, bridging the gap between disaster detection and life-saving action."
      />
      
      <PublicPageContent>

        <ContentSection>
          <div className="grid lg:grid-cols-2 gap-8">
            <GradientCard variant="red" className="p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">Our Mission</h2>
              <p className="text-slate-700 leading-relaxed font-light">
                To save lives through AI-powered emergency intelligence that combines global seismic 
                networks, real-time maritime tracking, and predictive modeling to deliver actionable 
                insights before disaster strikes. We don't just send alerts—we provide the intelligence 
                organizations need to make life-saving decisions in seconds.
              </p>
            </GradientCard>

            <GradientCard variant="blue" className="p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Award className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">Our Vision</h2>
              <p className="text-slate-700 leading-relaxed font-light">
                A world where no one is caught off-guard by natural disasters. We envision communities 
                that are prepared, informed, and connected through intelligent emergency communication 
                systems that adapt to each unique situation.
              </p>
            </GradientCard>
          </div>
        </ContentSection>

        <ContentSection>
          <SectionTitle>Our Story</SectionTitle>
          <div className="max-w-4xl mx-auto">
            <Card className="p-10">
              <div className="prose prose-lg prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed mb-6 text-lg font-light">
                  Emergency Alert Command Center was founded on the belief that effective emergency 
                  communication requires more than just notifications—it requires intelligence. Traditional 
                  systems often fall short, unable to predict impact zones, assess maritime threats, or 
                  provide actionable scenario planning.
                </p>
                <p className="text-slate-700 leading-relaxed mb-6 text-lg font-light">
                  Our team of emergency management specialists, data scientists, and AI engineers developed 
                  a next-generation intelligence platform combining advanced natural language processing for 
                  scenario generation, real-time vessel tracking for maritime safety, and multi-source data 
                  aggregation for comprehensive global coverage. We pioneered AI-powered impact scoring that 
                  tells organizations exactly who needs alerts and why.
                </p>
                <p className="text-slate-700 leading-relaxed text-lg font-light">
                  Today, our technology protects both land-based workforces and maritime operations worldwide, 
                  delivering sub-30 second alerts with 99.9% reliability. We're the only platform combining 
                  AI scenario simulation, vessel tracking, and comprehensive multi-source intelligence in 
                  one solution.
                </p>
              </div>
            </Card>
          </div>
        </ContentSection>

        <ContentSection>
          <SectionTitle>Our Values</SectionTitle>
          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => {
              const colorClasses = {
                red: 'from-red-500 to-red-600',
                blue: 'from-blue-500 to-blue-600', 
                green: 'from-green-500 to-green-600',
                purple: 'from-purple-500 to-purple-600'
              }
              
              return (
                <Card key={index} className="p-8 text-center hover:scale-[1.02] transition-all duration-300">
                  <div className={`w-16 h-16 bg-gradient-to-br ${colorClasses[value.color as keyof typeof colorClasses]} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                    <value.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-4 tracking-tight">{value.title}</h3>
                  <p className="text-slate-600 leading-relaxed font-light">{value.description}</p>
                </Card>
              )
            })}
          </div>
        </ContentSection>

        

        <ContentSection>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 to-blue-900/95 rounded-3xl"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.15),transparent_70%)] rounded-3xl"></div>
            <div className="relative p-12 text-center text-white rounded-3xl">
              <SectionTitle className="text-white mb-12">Impact by the Numbers</SectionTitle>
              <div className="grid md:grid-cols-4 gap-8">
                <div className="group">
                  <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform duration-300">500+</div>
                  <div className="text-slate-200 font-light">Organizations Protected</div>
                </div>
                <div className="group">
                  <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform duration-300">50K+</div>
                  <div className="text-slate-200 font-light">Lives Safeguarded</div>
                </div>
                <div className="group">
                  <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform duration-300">99.9%</div>
                  <div className="text-slate-200 font-light">Alert Delivery Rate</div>
                </div>
                <div className="group">
                  <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform duration-300">&lt; 30s</div>
                  <div className="text-slate-200 font-light">Average Alert Time</div>
                </div>
              </div>
            </div>
          </div>
        </ContentSection>

        <ContentSection>
          <GradientCard variant="slate" className="p-8">
            <SectionTitle className="mb-8">Data Sources & Attribution</SectionTitle>
            <div className="max-w-4xl mx-auto">
              <p className="text-center mb-8 text-slate-700 text-lg font-light">
                Our emergency alert system relies on trusted government data sources:
              </p>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 text-lg">Earthquake Data</h3>
                  <p className="text-slate-600 font-light leading-relaxed">
                    Source: U.S. Geological Survey (USGS). Data provided as-is with no warranty. 
                    This service is not endorsed by the USGS.
                  </p>
                </Card>
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 text-lg">Tsunami Alerts</h3>
                  <p className="text-slate-600 font-light leading-relaxed">
                    Source: NOAA/National Weather Service. Data provided as-is with no warranty. 
                    This service is not endorsed by NOAA or NWS.
                  </p>
                </Card>
              </div>
              <div className="text-center">
                <Link 
                  href="/data-sources"
                  className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  View Complete Data Sources Information
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </GradientCard>
        </ContentSection>

        <ContentSection>
          <div className="text-center">
            <SectionTitle>Join Our Mission</SectionTitle>
            <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
              Ready to protect your organization with the world's most advanced emergency alert system?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/contact"
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                Get Started Today
                <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/contact"
                className="group inline-flex items-center px-8 py-4 bg-white border-2 border-slate-200 text-slate-900 font-medium rounded-2xl hover:border-slate-300 hover:shadow-md hover:scale-105 transition-all duration-200"
              >
                Schedule a Demo
                <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.75-6M3 12c0-4.418 3.582-8 8-8a8.001 8.001 0 017.75 6" />
                </svg>
              </Link>
            </div>
          </div>
        </ContentSection>
      </PublicPageContent>
    </div>
  )
}
