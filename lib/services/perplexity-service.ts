/**
 * Perplexity AI Service for Maritime Intelligence
 * Provides real-time analysis of earthquake/tsunami impact on maritime operations
 */

export type MaritimeIntelligence = {
  summary: string
  portStatus: Array<{
    name: string
    status: 'open' | 'closed' | 'monitoring' | 'unknown'
    reason?: string
    estimatedReopening?: string
  }>
  vesselGuidance: Array<{
    situation: string
    recommendation: string
  }>
  emergencyContacts: Array<{
    agency: string
    phone: string
    vhf?: string
  }>
  historicalContext: string | null
  shippingRoutes: {
    affected: string[]
    alternatives: string[]
  }
  confidence: 'high' | 'medium' | 'low'
  sources: number
  generatedAt: Date
}

// Major port coordinates for proximity detection
const MAJOR_PORTS = [
  { name: 'Port of Singapore', lat: 1.29, lon: 103.85, country: 'Singapore' },
  { name: 'Port of Shanghai', lat: 31.23, lon: 121.47, country: 'China' },
  { name: 'Port of Tokyo', lat: 35.65, lon: 139.77, country: 'Japan' },
  { name: 'Port of Los Angeles', lat: 33.74, lon: -118.27, country: 'USA' },
  { name: 'Port of Rotterdam', lat: 51.92, lon: 4.48, country: 'Netherlands' },
  { name: 'Port of Jakarta', lat: -6.10, lon: 106.89, country: 'Indonesia' },
  { name: 'Port of Manila', lat: 14.58, lon: 120.98, country: 'Philippines' },
  { name: 'Port of Sydney', lat: -33.86, lon: 151.20, country: 'Australia' },
  { name: 'Port of Vancouver', lat: 49.28, lon: -123.12, country: 'Canada' },
  { name: 'Port of Hong Kong', lat: 22.30, lon: 114.17, country: 'Hong Kong' },
  { name: 'Port of Kaohsiung', lat: 22.62, lon: 120.29, country: 'Taiwan' },
  { name: 'Port of Busan', lat: 35.10, lon: 129.04, country: 'South Korea' },
  { name: 'Port of Qingdao', lat: 36.07, lon: 120.42, country: 'China' },
  { name: 'Port of Dalian', lat: 38.90, lon: 121.63, country: 'China' },
  { name: 'Port of Tianjin', lat: 39.12, lon: 117.18, country: 'China' },
  { name: 'Port of Xiamen', lat: 24.48, lon: 118.08, country: 'China' },
  { name: 'Port of Fuzhou', lat: 26.05, lon: 119.28, country: 'China' },
  { name: 'Port of Guangzhou', lat: 23.12, lon: 113.25, country: 'China' },
  { name: 'Port of Shenzhen', lat: 22.55, lon: 114.06, country: 'China' },
  { name: 'Port of Zhongshan', lat: 21.38, lon: 110.69, country: 'China' },
  { name: 'Port of Ho Chi Minh City', lat: 10.75, lon: 106.67, country: 'Vietnam' },
  { name: 'Port of Bangkok', lat: 13.73, lon: 100.49, country: 'Thailand' },
  { name: 'Port of Kuala Lumpur', lat: 3.14, lon: 101.69, country: 'Malaysia' },
  { name: 'Port of Mumbai', lat: 19.08, lon: 72.86, country: 'India' },
  { name: 'Port of Chennai', lat: 13.08, lon: 80.27, country: 'India' },
  { name: 'Port of Kolkata', lat: 22.57, lon: 88.37, country: 'India' },
  { name: 'Port of Cochin', lat: 9.94, lon: 76.27, country: 'India' },
  { name: 'Port of Tuticorin', lat: 8.79, lon: 78.14, country: 'India' },
  { name: 'Port of Visakhapatnam', lat: 17.73, lon: 83.30, country: 'India' },
  { name: 'Port of Colombo', lat: 6.93, lon: 79.85, country: 'Sri Lanka' },
  { name: 'Port of Chittagong', lat: 22.32, lon: 91.78, country: 'Bangladesh' },
  { name: 'Port of Dhaka', lat: 23.71, lon: 90.40, country: 'Bangladesh' },
  { name: 'Port of Dubai', lat: 25.20, lon: 55.27, country: 'United Arab Emirates' },
  { name: 'Port of Abu Dhabi', lat: 24.47, lon: 54.37, country: 'United Arab Emirates' },
  { name: 'Port of Sharjah', lat: 25.35, lon: 55.40, country: 'United Arab Emirates' },
  { name: 'Port of Ajman', lat: 25.40, lon: 55.53, country: 'United Arab Emirates' },
  { name: 'Port of Umm Al Quwain', lat: 25.57, lon: 55.88, country: 'United Arab Emirates' },
  { name: 'Port of Ras Al Khaimah', lat: 25.79, lon: 55.97, country: 'United Arab Emirates' },
  { name: 'Port of Fujairah', lat: 25.13, lon: 56.37, country: 'United Arab Emirates' },
  { name: 'Port of Khor Fakkan', lat: 25.37, lon: 56.35, country: 'United Arab Emirates' },
  { name: 'Port of Dibba', lat: 25.61, lon: 56.48, country: 'United Arab Emirates' },
  { name: 'Port of Al Hamriyah', lat: 25.44, lon: 55.55, country: 'United Arab Emirates' },
  { name: 'Port of Sohar', lat: 24.46, lon: 56.54, country: 'Oman' },
  { name: 'Port of Salalah', lat: 23.62, lon: 58.58, country: 'Oman' },
  { name: 'Port of Duqm', lat: 24.64, lon: 57.84, country: 'Oman' },
  { name: 'Port of Sur', lat: 23.53, lon: 58.16, country: 'Oman' },
  { name: 'Port of Khasab', lat: 23.67, lon: 58.53, country: 'Oman' },
  { name: 'Port of Al Batnah', lat: 23.71, lon: 58.43, country: 'Oman' },
  { name: 'Port of Muttrah', lat: 23.75, lon: 58.53, country: 'Oman' },
  { name: 'Port of Masirah', lat: 23.98, lon: 58.55, country: 'Oman' },
  { name: 'Port of Al Duqm', lat: 24.66, lon: 57.84, country: 'Oman' },
  { name: 'Port of Shinas', lat: 24.76, lon: 56.82, country: 'Oman' },
  { name: 'Port of Barka', lat: 24.74, lon: 56.89, country: 'Oman' },
  { name: 'Port of Al Suwaiq', lat: 24.82, lon: 56.94, country: 'Oman' },
  { name: 'Port of Al Khaburah', lat: 24.83, lon: 57.00, country: 'Oman' },
  { name: 'Port of Al Ashkharah', lat: 24.85, lon: 56.98, country: 'Oman' },
  { name: 'Port of Haima', lat: 24.91, lon: 57.03, country: 'Oman' },
  { name: 'Port of Al Jazir', lat: 25.00, lon: 57.00, country: 'Oman' },
  { name: 'Port of Dhank', lat: 24.95, lon: 57.00, country: 'Oman' },
  { name: 'Port of Khor Bajar', lat: 24.96, lon: 56.98, country: 'Oman' },
]

export class PerplexityService {
  private apiKey: string | undefined
  private baseUrl = 'https://api.perplexity.ai'

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY
  }

  private checkApiKey(): void {
    if (!this.apiKey) {
      throw new Error('PERPLEXITY_API_KEY is required in environment variables')
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  /**
   * Find nearby major ports
   */
  private findNearbyPorts(lat: number, lon: number, radiusKm: number = 1000) {
    return MAJOR_PORTS
      .map(port => ({
        ...port,
        distance: this.calculateDistance(lat, lon, port.lat, port.lon)
      }))
      .filter(port => port.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
  }

  /**
   * Get maritime intelligence for earthquake/tsunami event
   */
  async getMaritimeIntelligence(
    eventData: {
      type: 'earthquake' | 'tsunami'
      magnitude: number
      location: string
      latitude: number
      longitude: number
      depth?: number
      timestamp: Date
      tsunamiWarning?: boolean
    }
  ): Promise<MaritimeIntelligence> {
    this.checkApiKey()
    
    const query = this.buildMaritimeQuery(eventData)
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a maritime emergency analyst providing real-time intelligence for shipping companies. Focus on factual, actionable information about port status, vessel safety, and shipping routes. Always cite sources and provide specific contact information.'
            },
            {
              role: 'user',
              content: query
            }
          ],
          temperature: 0.2,  // Lower temperature for factual responses
          return_citations: true,
          search_recency_filter: 'day'  // Last 24 hours for better coverage
        })
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('Perplexity API error:', response.status, error)
        throw new Error(`Perplexity API failed: ${response.status}`)
      }

      const data = await response.json()
      
      return this.parseResponse(data, eventData)
    } catch (error) {
      console.error('Error fetching maritime intelligence:', error)
      throw error
    }
  }

  /**
   * Build optimized query for Perplexity
   */
  private buildMaritimeQuery(eventData: any): string {
    const timeAgo = Math.round((Date.now() - eventData.timestamp.getTime()) / 60000)
    const tsunamiStatus = eventData.tsunamiWarning ? 'TSUNAMI WARNING ACTIVE' : 'No tsunami warning'
    
    // Find nearby ports
    const nearbyPorts = this.findNearbyPorts(eventData.latitude, eventData.longitude, 1000)
    const portsList = nearbyPorts.slice(0, 5).map(p => 
      `${p.name} (${Math.round(p.distance)}km away)`
    ).join(', ')
    
    const specificPorts = nearbyPorts.length > 0 
      ? `\nNEARBY MAJOR PORTS: ${portsList}`
      : ''
    
    return `
MARITIME EMERGENCY: M${eventData.magnitude} ${eventData.type.toUpperCase()}

Location: ${eventData.location} (${eventData.latitude.toFixed(2)}°, ${eventData.longitude.toFixed(2)}°)
Time: ${timeAgo} minutes ago
Status: ${tsunamiStatus}${specificPorts}

Search for CURRENT REPORTS about:
1. Port closures or tsunami warnings at: ${nearbyPorts.slice(0, 3).map(p => p.name).join(', ')}
2. Vessel traffic advisories in ${eventData.location} region
3. Coast Guard or maritime safety bulletins for this earthquake
4. Recent similar earthquakes in this area and their maritime impact

Provide SPECIFIC, ACTIONABLE intelligence:

## PORT STATUS
${nearbyPorts.slice(0, 5).map(p => `- ${p.name}: [search for current status, closures, tsunami warnings]`).join('\n')}

## VESSEL SAFETY GUIDANCE
Specific actions for:
- Vessels in port: Should they evacuate? Stay moored?
- Vessels <50nm from coast: Safe depth to move to? Direction?
- Tsunami risk: If M${eventData.magnitude}+ near coast, what's the tsunami threat level?

## EMERGENCY CONTACTS
Find and list:
- ${nearbyPorts[0]?.country || 'Local'} Coast Guard emergency number and VHF channels
- Port authorities for major ports listed above (phone numbers)
- Regional maritime rescue coordination center

## SHIPPING IMPACT
- Major shipping routes through ${eventData.location} area
- Typical detour options if ports close
- Expected delays based on similar past events

## HISTORICAL REFERENCE
- Last major earthquake in this region and how long ports were closed
- Tsunami history for this area if coastal

BE SPECIFIC: Include actual phone numbers, VHF channels, port names, and current status.
If you can't find current information, state "No current reports found" and provide general guidance based on earthquake magnitude and location.
`
  }

  /**
   * Parse Perplexity response into structured data
   */
  private parseResponse(data: any, eventData: any): MaritimeIntelligence {
    const answer = data.choices[0].message.content
    const citations = data.citations || []

    return {
      summary: this.extractSummary(answer, eventData),
      portStatus: this.extractPortStatus(answer, eventData),
      vesselGuidance: this.extractVesselGuidance(answer, eventData),
      emergencyContacts: this.extractContacts(answer, eventData),
      historicalContext: this.extractHistoricalContext(answer),
      shippingRoutes: this.extractShippingRoutes(answer),
      confidence: this.assessConfidence(answer, citations.length),
      sources: citations.length,
      generatedAt: new Date()
    }
  }

  private extractSummary(text: string, eventData: any): string {
    // Extract first paragraph or create summary
    const lines = text.split('\n').filter(l => l.trim())
    const firstParagraph = lines.find(l => l.length > 50 && !l.includes(':'))
    
    if (firstParagraph) return firstParagraph

    return `Magnitude ${eventData.magnitude} ${eventData.type} occurred near ${eventData.location}. Maritime operations in the region may be affected.`
  }

  private extractPortStatus(text: string, eventData: any): MaritimeIntelligence['portStatus'] {
    const ports: MaritimeIntelligence['portStatus'] = []
    const nearbyPorts = this.findNearbyPorts(eventData.latitude, eventData.longitude, 500)
    
    // Look for port mentions
    const portSection = this.extractSection(text, 'PORT STATUS')
    
    if (portSection) {
      const lines = portSection.split('\n')
      for (const line of lines) {
        if (line.includes('closed') || line.includes('CLOSED')) {
          const portName = this.extractPortName(line)
          if (portName) {
            ports.push({
              name: portName,
              status: 'closed',
              reason: this.extractReason(line)
            })
          }
        } else if (line.includes('open') || line.includes('OPEN')) {
          const portName = this.extractPortName(line)
          if (portName) {
            ports.push({
              name: portName,
              status: 'open'
            })
          }
        } else if (line.includes('monitoring') || line.includes('warning')) {
          const portName = this.extractPortName(line)
          if (portName) {
            ports.push({
              name: portName,
              status: 'monitoring',
              reason: 'Under tsunami warning/monitoring'
            })
          }
        }
      }
    }

    return ports
  }

  private extractVesselGuidance(text: string, eventData: any): MaritimeIntelligence['vesselGuidance'] {
    const guidance: MaritimeIntelligence['vesselGuidance'] = []
    
    const vesselSection = this.extractSection(text, 'VESSEL SAFETY') || 
                          this.extractSection(text, 'VESSEL') ||
                          this.extractSection(text, 'GUIDANCE')
    
    if (vesselSection) {
      const lines = vesselSection.split('\n').filter(l => l.trim())
      
      for (const line of lines) {
        if (line.includes('port') && (line.includes('in port') || line.includes('moored'))) {
          guidance.push({
            situation: 'Vessels in port',
            recommendation: this.cleanText(line)
          })
        } else if (line.includes('approach') || line.includes('entering')) {
          guidance.push({
            situation: 'Vessels approaching port',
            recommendation: this.cleanText(line)
          })
        } else if (line.includes('coastal') || line.includes('shallow')) {
          guidance.push({
            situation: 'Vessels in coastal waters',
            recommendation: this.cleanText(line)
          })
        } else if (line.includes('ocean') || line.includes('deep')) {
          guidance.push({
            situation: 'Vessels in deep ocean',
            recommendation: this.cleanText(line)
          })
        }
      }
    }

    // Enhanced fallback based on earthquake magnitude and tsunami status
    if (guidance.length === 0) {
      const isTsunami = eventData.tsunamiWarning || eventData.magnitude >= 7.0
      const nearbyPorts = this.findNearbyPorts(eventData.latitude, eventData.longitude, 500)
      const portNames = nearbyPorts.slice(0, 2).map(p => p.name).join(' and ')
      
      if (isTsunami) {
        guidance.push(
          {
            situation: 'Vessels in port',
            recommendation: `Stay moored if in deep harbor (>10m depth). Evacuate to open water if in shallow port (<10m depth). Monitor port authority instructions on VHF 16.`
          },
          {
            situation: 'Vessels approaching port (<50nm)',
            recommendation: `Do NOT enter port. Proceed to deep water (>200m depth) at maximum safe speed. Maintain 50+ nautical miles from coast until tsunami warning is lifted.`
          },
          {
            situation: 'Vessels in coastal waters',
            recommendation: `URGENT: Proceed to deep water (>200m depth) immediately. Head perpendicular to coastline at full speed. Tsunami waves decrease significantly in deep ocean.`
          },
          {
            situation: 'Vessels in deep ocean (>200m depth)',
            recommendation: `Maintain current position. Tsunami waves are minimal in deep water (<1m). Monitor VHF 16 for updates. Do NOT approach coastal areas.`
          }
        )
      } else {
        // Provide specific guidance based on magnitude without generic "General guidance" label
        const magnitudeGuidance = eventData.magnitude >= 6.0 
          ? `M${eventData.magnitude} earthquake detected near ${eventData.location}. ${portNames ? `Ports ${portNames} may experience operational delays.` : 'Nearby ports may experience delays.'} Monitor VHF 16 for maritime safety bulletins. Avoid affected coastal areas within 50nm. No tsunami threat at this time.`
          : `M${eventData.magnitude} earthquake near ${eventData.location}. Minimal maritime impact expected. Continue normal operations while monitoring VHF 16 for updates.`
        
        guidance.push({
          situation: 'All vessels in region',
          recommendation: magnitudeGuidance
        })
      }
    }

    return guidance
  }

  private extractContacts(text: string, eventData: any): MaritimeIntelligence['emergencyContacts'] {
    const contacts: MaritimeIntelligence['emergencyContacts'] = []
    
    const contactSection = this.extractSection(text, 'EMERGENCY CONTACTS') ||
                           this.extractSection(text, 'CONTACTS')
    
    if (contactSection) {
      // Match phone numbers and VHF channels
      const phoneRegex = /(\+?[\d\s\-()]+)/g
      const vhfRegex = /VHF\s*(Ch\.?|Channel)?\s*(\d+)/gi
      
      const lines = contactSection.split('\n')
      for (const line of lines) {
        if (line.includes('Coast Guard') || line.includes('USCG')) {
          const phoneMatch = line.match(phoneRegex)
          const vhfMatch = line.match(vhfRegex)
          contacts.push({
            agency: 'US Coast Guard',
            phone: phoneMatch ? phoneMatch[0] : 'VHF Channel 16',
            vhf: vhfMatch ? vhfMatch[0] : 'Channel 16'
          })
        } else if (line.includes('Port Authority')) {
          const phoneMatch = line.match(phoneRegex)
          contacts.push({
            agency: 'Port Authority',
            phone: phoneMatch ? phoneMatch[0] : 'Contact local port authority'
          })
        }
      }
    }

    // Enhanced fallback with region-specific contacts
    if (contacts.length === 0) {
      const nearbyPorts = this.findNearbyPorts(eventData.latitude, eventData.longitude, 500)
      
      if (nearbyPorts.length > 0) {
        const nearestPort = nearbyPorts[0]
        const topPorts = nearbyPorts.slice(0, 2)
        
        // Primary maritime emergency contact
        contacts.push({
          agency: `${nearestPort.country} Coast Guard`,
          phone: 'VHF Channel 16 (156.8 MHz)',
          vhf: 'Channel 16'
        })
        
        // Add port authorities for nearest ports
        topPorts.forEach(port => {
          contacts.push({
            agency: `${port.name}`,
            phone: `VHF Channel 12/14 (Port Operations)`,
            vhf: 'Ch 12/14'
          })
        })
      } else {
        contacts.push({
          agency: 'International Maritime Emergency',
          phone: 'VHF Channel 16 (156.8 MHz)',
          vhf: 'Channel 16'
        })
      }
    }

    return contacts
  }

  private extractHistoricalContext(text: string): string | null {
    const historicalSection = this.extractSection(text, 'HISTORICAL') ||
                              this.extractSection(text, 'REFERENCE')
    
    if (historicalSection && historicalSection.trim().length > 20) {
      // Only return if there's meaningful content (not just placeholder text)
      const cleaned = this.cleanText(historicalSection.substring(0, 500))
      if (cleaned.toLowerCase().includes('reference') || 
          cleaned.toLowerCase().includes('no historical') ||
          cleaned.toLowerCase().includes('no data')) {
        return null
      }
      return cleaned
    }

    return null // Return null instead of placeholder text
  }

  private extractShippingRoutes(text: string): { affected: string[]; alternatives: string[] } {
    const routesSection = this.extractSection(text, 'SHIPPING ROUTES') ||
                          this.extractSection(text, 'ROUTES')
    
    const affected: string[] = []
    const alternatives: string[] = []

    if (routesSection) {
      const lines = routesSection.split('\n')
      for (const line of lines) {
        if (line.includes('affected') || line.includes('impacted') || line.includes('avoid')) {
          affected.push(this.cleanText(line))
        } else if (line.includes('alternative') || line.includes('detour') || line.includes('recommended')) {
          alternatives.push(this.cleanText(line))
        }
      }
    }

    return { affected, alternatives }
  }

  private assessConfidence(text: string, sourcesCount: number): 'high' | 'medium' | 'low' {
    if (sourcesCount >= 5 && text.length > 1000) return 'high'
    if (sourcesCount >= 3 && text.length > 500) return 'medium'
    return 'low'
  }

  // Helper methods
  private extractSection(text: string, sectionName: string): string | null {
    const regex = new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n\\n|\\d+\\.|$)`, 'i')
    const match = text.match(regex)
    return match ? match[1] : null
  }

  private extractPortName(line: string): string | null {
    // Common port names
    const portNames = [
      'San Francisco', 'Oakland', 'Los Angeles', 'Long Beach', 'Seattle', 
      'Tacoma', 'Portland', 'San Diego', 'Tokyo', 'Osaka', 'Yokohama',
      'Vancouver', 'Prince Rupert'
    ]
    
    for (const port of portNames) {
      if (line.includes(port)) return port
    }
    
    return null
  }

  private extractReason(line: string): string | undefined {
    if (line.includes('tsunami')) return 'Tsunami warning'
    if (line.includes('earthquake')) return 'Earthquake damage assessment'
    if (line.includes('closed')) return 'Port closure'
    return undefined
  }

  private cleanText(text: string): string {
    return text
      .replace(/^[\-\*•]\s*/, '')  // Remove bullet points
      .replace(/^\d+\.\s*/, '')     // Remove numbering
      .trim()
  }
}

// Export singleton instance
export const perplexityService = new PerplexityService()
