/**
 * Data Source Attribution Component
 * Displays required attributions for data sources used in the application
 * 
 * License Compliance:
 * - NOAA/USGS/PTWC/DART: US Public Domain (attribution optional but recommended)
 * - JMA: Commercial use permitted, attribution REQUIRED
 * - GeoNet: CC BY 3.0 NZ, attribution REQUIRED
 * - EMSC: Attribution required for non-commercial use
 */

import { Card } from '@/components/ui/card'

type DataSourceInfo = {
  name: string
  organization: string
  url: string
  license: string
  coverage: string
  attribution: string
  required: boolean
}

const dataSources: DataSourceInfo[] = [
  {
    name: 'USGS',
    organization: 'U.S. Geological Survey',
    url: 'https://earthquake.usgs.gov/',
    license: 'US Public Domain',
    coverage: 'Global earthquake monitoring',
    attribution: 'Data from U.S. Geological Survey, Earthquake Hazards Program',
    required: false
  },
  {
    name: 'PTWC',
    organization: 'NOAA Pacific Tsunami Warning Center',
    url: 'https://www.tsunami.noaa.gov/',
    license: 'US Public Domain',
    coverage: 'Pacific Ocean tsunami warnings',
    attribution: 'Tsunami data from NOAA Pacific Tsunami Warning Center',
    required: false
  },
  {
    name: 'DART',
    organization: 'NOAA Deep-ocean Assessment and Reporting of Tsunamis',
    url: 'https://www.ndbc.noaa.gov/dart/dart.shtml',
    license: 'US Public Domain',
    coverage: 'Real-time tsunami wave detection',
    attribution: 'Data from NOAA National Data Buoy Center',
    required: false
  },
  {
    name: 'JMA',
    organization: 'Japan Meteorological Agency',
    url: 'https://www.jma.go.jp/',
    license: 'JMA Terms of Use (Commercial permitted)',
    coverage: 'Japan and Western Pacific earthquakes & tsunamis',
    attribution: 'Source: Japan Meteorological Agency (https://www.jma.go.jp)',
    required: true
  },
  {
    name: 'GeoNet',
    organization: 'GNS Science New Zealand',
    url: 'https://www.geonet.org.nz/',
    license: 'Creative Commons Attribution 3.0 NZ',
    coverage: 'New Zealand and Southwest Pacific',
    attribution: 'Data from GeoNet, GNS Science, New Zealand',
    required: true
  },
  {
    name: 'EMSC',
    organization: 'European-Mediterranean Seismological Centre',
    url: 'https://www.emsc-csem.org/',
    license: 'Attribution required',
    coverage: 'Europe, Mediterranean, Middle East',
    attribution: 'Credit: EMSC/CSEM, https://www.emsc-csem.org',
    required: true
  },
  {
    name: 'NOAA Tides',
    organization: 'NOAA Center for Operational Oceanographic Products',
    url: 'https://tidesandcurrents.noaa.gov/',
    license: 'US Public Domain',
    coverage: 'US coastal tide and sea level data',
    attribution: 'Tide data from NOAA CO-OPS',
    required: false
  }
]

export function DataAttributions() {
  return (
    <div className="space-y-6">
      <div className="prose max-w-none">
        <h2 className="text-2xl font-bold mb-4">Data Sources & Attributions</h2>
        <p className="text-gray-600 mb-6">
          This application aggregates data from multiple authoritative sources to provide
          comprehensive earthquake and tsunami monitoring. We gratefully acknowledge the
          following organizations for making their data publicly available.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {dataSources.map((source) => (
          <Card key={source.name} className="p-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{source.name}</h3>
                  <p className="text-sm text-gray-600">{source.organization}</p>
                </div>
                {source.required && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Attribution Required
                  </span>
                )}
              </div>
              
              <div className="text-sm space-y-1">
                <p><strong>Coverage:</strong> {source.coverage}</p>
                <p><strong>License:</strong> {source.license}</p>
                <p className="pt-2 text-gray-700 italic">
                  &quot;{source.attribution}&quot;
                </p>
              </div>

              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center"
              >
                Visit source website →
              </a>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-gray-50">
        <h3 className="font-semibold mb-2">Usage & Compliance</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Public Domain Sources:</strong> Data from USGS, NOAA (PTWC, DART, Tides) 
            is in the US public domain and may be used freely. While attribution is not legally 
            required, we provide it as a community best practice.
          </p>
          <p>
            <strong>Licensed Sources:</strong> Data from JMA, GeoNet, and EMSC requires attribution 
            as specified above. These sources permit commercial use with proper credit.
          </p>
          <p>
            <strong>Disclaimer:</strong> All data is provided &quot;as is&quot; for informational purposes. 
            For emergency situations, always consult official local authorities and emergency services.
          </p>
        </div>
      </Card>
    </div>
  )
}

/**
 * Compact footer version for use at the bottom of pages
 */
export function DataAttributionFooter() {
  return (
    <div className="text-xs text-gray-600 space-y-1">
      <p>
        <strong>Data Sources:</strong> USGS, NOAA (PTWC, DART, Tides), 
        Japan Meteorological Agency, GeoNet (GNS Science NZ), EMSC
      </p>
      <p>
        Source: Japan Meteorological Agency (https://www.jma.go.jp) | 
        Data from GeoNet, GNS Science, New Zealand | 
        Credit: EMSC/CSEM
      </p>
    </div>
  )
}

/**
 * Inline attribution for individual earthquake/tsunami cards
 */
export function InlineAttribution({ source }: { source: string }) {
  const sourceInfo = dataSources.find(s => s.name === source.toUpperCase())
  
  if (!sourceInfo || !sourceInfo.required) return null

  return (
    <p className="text-xs text-gray-500 mt-1">
      {sourceInfo.attribution}
    </p>
  )
}
