'use client'

import { Shield, Globe, Satellite, Radio, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import WorkInProgressBanner from '@/components/common/WorkInProgressBanner'
import PublicPageHeader from '@/components/public/PublicPageHeader'
import PublicPageContent, { ContentSection, SectionTitle, Card, GradientCard } from '@/components/public/PublicPageContent'

type DataSourceEntry = {
  provider: string
  type: string
  license: string
  icon: typeof Globe
  termsUrl: string
  docsUrl?: string
  endpoints?: { label: string; url: string }[]
  attribution: string
  note?: string
}

export default function DataSourcesPage() {
  const dataSources: DataSourceEntry[] = [
    {
      provider: 'USGS Earthquake Feeds',
      type: 'Public-domain U.S. Government work',
      license: '17 U.S.C. § 105',
      icon: Globe,
      termsUrl: 'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits',
      docsUrl: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
      endpoints: [
        { label: 'GeoJSON summary feeds', url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/' }
      ],
      attribution: 'Earthquake data source: U.S. Geological Survey (USGS). Data provided as-is; no endorsement implied.'
    },
    {
      provider: 'EMSC FDSN Event Service (SeismicPortal)',
      type: 'Open data; attribution required',
      license: 'SeismicPortal Terms & Conditions',
      icon: Globe,
      termsUrl: 'https://www.seismicportal.eu/terms.html',
      docsUrl: 'https://www.seismicportal.eu/webservices.html',
      endpoints: [
        { label: 'FDSNWS event API', url: 'https://www.seismicportal.eu/fdsnws/event/1/query' }
      ],
      attribution: 'Earthquake data source: EMSC/SeismicPortal. Please cite EMSC and follow their Terms & Conditions.'
    },
    {
      provider: 'IRIS FDSN Event Service',
      type: 'Open access; attribution requested',
      license: 'IRIS DMC Data Usage/Acknowledgement',
      icon: Globe,
      termsUrl: 'https://ds.iris.edu/ds/nodes/dmc/usage/',
      docsUrl: 'https://service.iris.edu/fdsnws/event/1/',
      endpoints: [
        { label: 'FDSNWS event API', url: 'https://service.iris.edu/fdsnws/event/1/query' }
      ],
      attribution: 'Data services provided by IRIS DMC. Please include an acknowledgement where practical.'
    },
    {
      provider: 'PTWC / NOAA Tsunami Feeds',
      type: 'Public-domain U.S. Government work',
      license: 'NOAA/NWS Disclaimer & Data Policies',
      icon: Satellite,
      termsUrl: 'https://www.weather.gov/disclaimer',
      docsUrl: 'https://www.tsunami.gov/',
      endpoints: [
        { label: 'Events JSON', url: 'https://www.tsunami.gov/events_json/events.json' }
      ],
      attribution: 'Tsunami alert data source: NOAA/NWS (PTWC). Data provided as-is; no endorsement implied.'
    },
    {
      provider: 'JMA (Japan Meteorological Agency)',
      type: 'Website content; commercial use permitted with conditions',
      license: 'JMA Website Terms of Use',
      icon: Shield,
      termsUrl: 'https://www.jma.go.jp/jma/en/copyright.html',
      docsUrl: 'https://www.data.jma.go.jp/multi/quake/index.html?lang=en',
      endpoints: [
        { label: 'Bosai quake list', url: 'https://www.jma.go.jp/bosai/quake/data/list.json' },
        { label: 'Earthquake information (HTML)', url: 'https://www.data.jma.go.jp/multi/quake/' }
      ],
      attribution: 'Earthquake information from the Japan Meteorological Agency (JMA).',
      note: 'Commercial use is permitted by JMA Website Terms with source citation and proper editing notices. Restrictions under the Meteorological Service Act (e.g., forecasting licenses and warning issuance) may apply in Japan; this service is not an official warning and is not endorsed by JMA.'
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
                    {source.endpoints && (
                      <div className="mb-4">
                        <p className="text-slate-700 font-medium mb-2">Endpoints</p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-700">
                          {source.endpoints.map((e, i) => (
                            <li key={i} className="break-all">
                              <span className="text-slate-600 mr-2">{e.label}:</span>
                              <Link href={e.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                                {e.url}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="space-x-4 flex flex-wrap items-center">
                      {source.docsUrl && (
                        <Link href={source.docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors">
                          Docs
                          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </Link>
                      )}
                      <Link href={source.termsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors">
                        Terms
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    </div>
                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <p className="text-slate-700 font-light leading-relaxed">{source.attribution}</p>
                      {source.note && (
                        <p className="text-slate-500 text-sm mt-2">{source.note}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ContentSection>


        <ContentSection>
          <GradientCard variant="red" className="p-8">
            <SectionTitle className="mb-6">JMA Legal Caveat</SectionTitle>
            <div className="space-y-4 text-slate-700">
              <div>
                <h4 className="font-semibold mb-2">Meteorological Service Act (Japan)</h4>
                <p>
                  Usage may be restricted by the Meteorological Service Act, including licensing for forecasting services and restrictions on issuing
                  warnings in Japan (see Article 17 and Article 23). This service does not issue official warnings and is not endorsed by JMA.
                </p>
                <div className="mt-2 space-x-4">
                  <Link href="https://www.jma.go.jp/jma/en/copyright.html" className="text-blue-600 hover:text-blue-700" target="_blank" rel="noopener noreferrer">JMA Website Terms</Link>
                  <Link href="https://www.japaneselawtranslation.go.jp/en/laws/view/1968" className="text-blue-600 hover:text-blue-700" target="_blank" rel="noopener noreferrer">Meteorological Service Act (Articles 17, 23)</Link>
                </div>
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
                please refer to each provider's official documentation linked above.
              </p>
            </Card>
          </div>
        </ContentSection>
      </PublicPageContent>
    </div>
  )
}
