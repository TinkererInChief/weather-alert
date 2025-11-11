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
      title: 'Technical Accuracy', 
      description: 'We use proven scientific models and real physics calculations. Okada model, Haversine distance, shallow water equations—no shortcuts.',
      color: 'blue'
    },
    {
      icon: Globe,
      title: 'Multi-Source Data',
      description: 'We aggregate earthquake and tsunami data from USGS, PTWC, JMA, GeoNet, and DART buoys for comprehensive global coverage.',
      color: 'green'
    },
    {
      icon: Heart,
      title: 'Transparent & Honest',
      description: 'We document our data sources, cite our physics models, and clearly state what our system can and cannot do.',
      color: 'purple'
    }
  ]

  

  return (
    <div className="min-h-screen bg-white">
      <WorkInProgressBanner />
      <PublicPageHeader 
        title="About Us"
        subtitle="Building intelligent emergency alert technology that combines physics-based tsunami simulation, multi-source seismic data, and automated escalation workflows."
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
                To build a reliable tsunami and earthquake alert platform using proven scientific 
                models (Okada, Haversine distance), multi-source data aggregation (USGS, PTWC, JMA, 
                GeoNet, DART buoys), and automated notification systems. We focus on accurate physics-based 
                simulation and reliable alert delivery for maritime and enterprise safety.
              </p>
            </GradientCard>

            <GradientCard variant="blue" className="p-8">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Award className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">Our Vision</h2>
              <p className="text-slate-700 leading-relaxed font-light">
                A platform where maritime organizations can simulate tsunami scenarios, assess vessel 
                threats using real physics calculations, and trigger multi-channel notifications (SMS, 
                Email, WhatsApp) through configurable escalation policies. We aim for transparency, 
                accuracy, and reliable emergency communication.
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
                  This platform was built to address a specific need: reliable tsunami threat assessment 
                  for maritime vessels. Rather than relying on vague warnings, we wanted to provide precise 
                  calculations based on established scientific models and real physics.
                </p>
                <p className="text-slate-700 leading-relaxed mb-6 text-lg font-light">
                  We implemented the Okada model for seafloor displacement, Haversine distance calculations, 
                  and shallow water wave equations to simulate realistic tsunami propagation. Our system 
                  aggregates data from multiple government sources (USGS, PTWC, JMA, GeoNet, DART buoys) 
                  and calculates threat levels based on actual wave height, distance, and ETA.
                </p>
                <p className="text-slate-700 leading-relaxed text-lg font-light">
                  The platform includes vessel tracking, configurable escalation policies, and multi-channel 
                  notification delivery through Twilio and SendGrid APIs. We focus on building features that 
                  work reliably rather than making inflated claims.
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
              <SectionTitle className="text-white mb-12">Platform Capabilities</SectionTitle>
              <div className="grid md:grid-cols-4 gap-8">
                <div className="group">
                  <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform duration-300">7</div>
                  <div className="text-slate-200 font-light">Data Sources (USGS, EMSC, IRIS, JMA, GeoNet, PTWC, DART)</div>
                </div>
                <div className="group">
                  <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform duration-300">800 km/h</div>
                  <div className="text-slate-200 font-light">Realistic Tsunami Speed Simulation</div>
                </div>
                <div className="group">
                  <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform duration-300">Unlimited</div>
                  <div className="text-slate-200 font-light">Vessel Threat Tracking</div>
                </div>
                <div className="group">
                  <div className="text-4xl font-bold mb-3 group-hover:scale-110 transition-transform duration-300">3</div>
                  <div className="text-slate-200 font-light">Notification Channels (SMS, Email, WhatsApp)</div>
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
                Our emergency alert system aggregates data from 7 trusted sources worldwide:
              </p>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 text-lg">Earthquake Data (5 sources)</h3>
                  <ul className="text-slate-600 font-light leading-relaxed space-y-1 text-sm">
                    <li>• USGS - Global coverage, Americas focus</li>
                    <li>• EMSC - Europe, Mediterranean, Middle East</li>
                    <li>• IRIS - Research-grade global seismic data</li>
                    <li>• JMA - Japan, Western Pacific</li>
                    <li>• GeoNet - New Zealand, Southwest Pacific</li>
                  </ul>
                  <p className="text-slate-500 text-xs mt-3">Data provided as-is with no warranty. Not endorsed by any government agency.</p>
                </Card>
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-3 text-lg">Tsunami Data (4 sources)</h3>
                  <ul className="text-slate-600 font-light leading-relaxed space-y-1 text-sm">
                    <li>• PTWC (NOAA) - Pacific Tsunami Warning Center</li>
                    <li>• JMA - Japan tsunami warnings & advisories</li>
                    <li>• GeoNet - New Zealand CAP alerts</li>
                    <li>• DART - 13 deep-ocean buoy stations (NOAA)</li>
                  </ul>
                  <p className="text-slate-500 text-xs mt-3">Data provided as-is with no warranty. Not endorsed by any government agency.</p>
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
              Ready to simulate tsunami scenarios and assess vessel threats using real physics?
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
