/**
 * Equasis Vessel Data Enricher
 * 
 * Equasis.org is a free public database with information on commercial vessels.
 * This module provides enrichment capabilities for vessel metadata not available in AIS.
 * 
 * Note: Equasis requires registration and has usage limits.
 * For production use, consider their official API or CSV export feature.
 */

export type EquasisVesselData = {
  imo: string
  mmsi?: string
  name?: string
  grossTonnage?: number
  owner?: string
  operator?: string
  manager?: string
  flag?: string
  buildYear?: number
  buildCountry?: string
}

export class EquasisEnricher {
  private static instance: EquasisEnricher
  
  static getInstance() {
    if (!EquasisEnricher.instance) {
      EquasisEnricher.instance = new EquasisEnricher()
    }
    return EquasisEnricher.instance
  }
  
  /**
   * Enrich vessel data from Equasis
   * 
   * For POC: This is a placeholder that simulates the enrichment.
   * In production, you would:
   * 1. Use Equasis API (if available)
   * 2. Scrape their website (check ToS first)
   * 3. Import from their CSV export
   */
  async enrichVessel(imo: string): Promise<EquasisVesselData | null> {
    // TODO: Implement actual Equasis integration
    // For now, return null to indicate no data available
    
    console.log(`[Equasis] Would lookup IMO ${imo}`)
    
    // Simulated delay
    await this.sleep(100)
    
    return null
  }
  
  /**
   * Batch enrich multiple vessels
   */
  async enrichVessels(imos: string[]): Promise<Map<string, EquasisVesselData>> {
    const results = new Map<string, EquasisVesselData>()
    
    for (const imo of imos) {
      try {
        const data = await this.enrichVessel(imo)
        if (data) {
          results.set(imo, data)
        }
      } catch (error) {
        console.error(`[Equasis] Failed to enrich IMO ${imo}:`, error)
      }
      
      // Rate limit: 1 request per second
      await this.sleep(1000)
    }
    
    return results
  }
  
  /**
   * Validate enriched data before storing
   */
  validateData(data: Partial<EquasisVesselData>): boolean {
    // Gross tonnage should be reasonable
    if (data.grossTonnage && (data.grossTonnage < 10 || data.grossTonnage > 500000)) {
      console.warn(`[Equasis] Invalid gross tonnage: ${data.grossTonnage}`)
      return false
    }
    
    // Build year should be reasonable
    if (data.buildYear) {
      const currentYear = new Date().getFullYear()
      if (data.buildYear < 1900 || data.buildYear > currentYear) {
        console.warn(`[Equasis] Invalid build year: ${data.buildYear}`)
        return false
      }
    }
    
    // Owner/operator should not be empty strings
    if (data.owner === '' || data.owner === 'N/A' || data.owner === 'UNKNOWN') {
      data.owner = undefined
    }
    if (data.operator === '' || data.operator === 'N/A' || data.operator === 'UNKNOWN') {
      data.operator = undefined
    }
    if (data.manager === '' || data.manager === 'N/A' || data.manager === 'UNKNOWN') {
      data.manager = undefined
    }
    
    return true
  }
  
  /**
   * Import from Equasis CSV export
   * 
   * Equasis allows exporting data as CSV. This method parses that format.
   */
  async importFromCSV(csvPath: string): Promise<EquasisVesselData[]> {
    // TODO: Implement CSV parsing
    // Expected CSV format:
    // IMO,Name,GrossTonnage,Owner,Flag,YearBuilt
    
    console.log(`[Equasis] Would import from CSV: ${csvPath}`)
    return []
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Manual data enrichment helper
 * 
 * For vessels that can't be automatically enriched, this provides
 * a structure for manual data entry.
 */
export function createManualEnrichment(
  imo: string,
  data: Partial<Omit<EquasisVesselData, 'imo'>>
): EquasisVesselData {
  return {
    imo,
    ...data
  }
}
