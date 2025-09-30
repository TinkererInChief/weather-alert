'use client'

import { Shield, Globe, Satellite, Radio, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import WorkInProgressBanner from '@/components/common/WorkInProgressBanner'
import PublicPageHeader from '@/components/public/PublicPageHeader'
import PublicPageContent, { ContentSection, SectionTitle, Card, GradientCard } from '@/components/public/PublicPageContent'

export default function DataSourcesPage() {
  const dataSources = [
    {
      provider: 'USGS Earthquake Feeds',
      type: 'Public-domain U.S. Government work',
      license: '17 U.S.C. § 105',
      icon: Globe,
      link: 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits'
    },
    {
      provider: 'NOAA Tsunami Alerts / CAP Feeds',
      type: 'Public-domain U.S. Government work',
      license: 'NOAA Data Policies & NWS Disclaimer',
      icon: Satellite,
      link: 'https://www.weather.gov/disclaimer'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <WorkInProgressBanner />
      <PublicPageHeader 
        title="Data Sources & Attribution"
        subtitle="Our emergency alert system relies on trusted government data sources. Below is our compliance summary for each provider."
      />
      
      <PublicPageContent maxWidth="6xl">

        <ContentSection>
          <GradientCard variant="red" className="p-8">
            <div className="flex items-start space-x-4">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <AlertTriangle className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-6 tracking-tight">Important Disclaimers</h2>
                <div className="space-y-4 text-slate-700">
                  <div className="bg-white/50 rounded-xl p-4">
                    <p className="font-light leading-relaxed">
                      <strong className="font-semibold">No Government Endorsement:</strong> This commercial service is not endorsed by, affiliated with, 
                      or sponsored by the U.S. Geological Survey (USGS), National Oceanic and Atmospheric Administration (NOAA), 
                      National Weather Service (NWS), or any other government agency.
                    </p>
                  </div>
                  <div className="bg-white/50 rounded-xl p-4">
                    <p className="font-light leading-relaxed">
                      <strong className="font-semibold">Data Accuracy:</strong> All earthquake and tsunami data are provided "as-is" with no warranty. 
                      While we strive for accuracy and speed, this service should supplement, not replace, official emergency 
                      communications from local authorities.
                    </p>
                  </div>
                  <div className="bg-white/50 rounded-xl p-4">
                    <p className="font-light leading-relaxed">
                      <strong className="font-semibold">Commercial Use:</strong> Yes, you can build and sell commercial products using the same government data feeds 
                      our system consumes, subject to the terms and requirements listed below.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GradientCard>
        </ContentSection>

        <ContentSection>
          <SectionTitle>Data Provider Compliance Summary</SectionTitle>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {dataSources.map((source, index) => (
              <Card key={index} className="p-8 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start space-x-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <source.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-slate-900 mb-3 tracking-tight">{source.provider}</h3>
                      <p className="text-slate-600 font-light mb-2">{source.type}</p>
                      <p className="text-sm text-slate-500 font-light">{source.license}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100">
                      <Link 
                        href={source.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        View Full Terms & Policies
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ContentSection>

        <ContentSection>
          <GradientCard variant="slate" className="p-8">
            <SectionTitle className="mb-8">Required Attributions</SectionTitle>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 tracking-tight">Earthquake Data</h3>
                <Card className="p-6">
                  <p className="text-slate-700 font-light leading-relaxed">
                    "Earthquake data source: U.S. Geological Survey. Data provided as-is with no warranty. 
                    This service is not endorsed by the USGS."
                  </p>
                </Card>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4 tracking-tight">Tsunami Data</h3>
                <Card className="p-6">
                  <p className="text-slate-700 font-light leading-relaxed">
                    "Tsunami alert data source: NOAA/National Weather Service. Data provided as-is with no warranty. 
                    This service is not endorsed by NOAA or NWS."
                  </p>
                </Card>
              </div>
            </div>
          </GradientCard>
        </ContentSection>

        <ContentSection>
          <div className="text-center">
            <SectionTitle>Legal Notice</SectionTitle>
            <Card className="p-8 max-w-4xl mx-auto">
              <p className="text-slate-600 font-light leading-relaxed text-lg">
                This page provides a concise legal orientation (not legal advice) for the data providers 
                and services our emergency alert system relies upon. For complete terms and conditions, 
                please refer to each provider's official documentation linked above. If you plan to build 
                a commercial product using similar data sources, we recommend consulting with legal counsel 
                to ensure full compliance.
              </p>
            </Card>
          </div>
        </ContentSection>
      </PublicPageContent>
    </div>
  )
}
