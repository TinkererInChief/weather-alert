import { PrismaClient } from '@prisma/client'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

type PortDataSource = 'nga' | 'upply' | 'manual'

type PortImportData = {
  portName: string
  alternateNames?: string
  unLocode?: string
  worldPortIndex?: string
  country: string
  countryCode?: string
  region?: string
  latitude: number
  longitude: number
  harborSize?: string
  harborType?: string
  shelter?: string
  entryRestrictions?: string
  overhead?: string
  channel?: string
  anchorage?: string
  cargoPier?: boolean
  cargoBeach?: boolean
  cargoIce?: boolean
  medMoor?: boolean
  hasFuel?: boolean
  hasRepair?: boolean
  hasDrydock?: boolean
  hasRailway?: boolean
  hasSupplies?: boolean
  hasMedical?: boolean
  hasGarbage?: boolean
  hasTugAssist?: boolean
  hasPilotage?: boolean
  maxVesselSize?: string
  maxVesselDraft?: number
  maxVesselBeam?: number
  meanTideRange?: number
  maxTideRange?: number
  portAuthority?: string
  telephone?: string
  email?: string
  website?: string
}

type ImportResult = {
  imported: number
  updated: number
  skipped: number
  failed: number
  errors: string[]
  duration: number
}

export class PortImportService {
  /**
   * Import ports from CSV file
   */
  async importFromCSV(
    filePath: string,
    source: PortDataSource = 'manual',
    userId?: string
  ): Promise<ImportResult> {
    const fs = await import('fs')
    const buffer = fs.readFileSync(filePath)
    return this.importFromBuffer(buffer, source, userId)
  }

  /**
   * Import ports from buffer (for file uploads)
   */
  async importFromBuffer(
    buffer: Buffer,
    source: PortDataSource = 'manual',
    userId?: string
  ): Promise<ImportResult> {
    const startTime = Date.now()
    const result: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      duration: 0
    }

    try {
      const csvContent = buffer.toString('utf-8')
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })

      console.log(`📊 Processing ${records.length} port records from ${source}...`)

      for (const record of records) {
        try {
          const portData = this.normalizePortData(record, source)
          
          if (!portData) {
            result.skipped++
            continue
          }

          // Check if port exists by UN/LOCODE or name+country
          const existing = portData.unLocode
            ? await prisma.port.findUnique({
                where: { unLocode: portData.unLocode }
              })
            : await prisma.port.findFirst({
                where: {
                  portName: portData.portName,
                  country: portData.country
                }
              })

          if (existing) {
            // Update if new data is better quality
            if (this.shouldUpdate(existing, portData, source)) {
              await prisma.port.update({
                where: { id: existing.id },
                data: {
                  ...portData,
                  dataSource: source,
                  dataQuality: this.calculateQuality(portData),
                  searchText: this.buildSearchText(portData)
                }
              })
              result.updated++
            } else {
              result.skipped++
            }
          } else {
            // Create new port
            await prisma.port.create({
              data: {
                ...portData,
                dataSource: source,
                dataQuality: this.calculateQuality(portData),
                searchText: this.buildSearchText(portData)
              }
            })
            result.imported++
          }
        } catch (error) {
          result.failed++
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          result.errors.push(`Row ${result.imported + result.updated + result.failed}: ${errorMsg}`)
          console.error('❌ Port import error:', errorMsg)
        }
      }

      result.duration = Date.now() - startTime

      // Create audit log
      if (userId) {
        await prisma.auditLog.create({
          data: {
            userId,
            action: 'PORT_IMPORT',
            entityType: 'Port',
            entityId: source,
            changes: result,
            ipAddress: 'system',
            userAgent: 'port-import-service'
          }
        })
      }

      console.log(`✅ Port import complete: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped, ${result.failed} failed`)

      return result
    } catch (error) {
      console.error('❌ Port import failed:', error)
      throw error
    }
  }

  /**
   * Normalize port data from different sources
   */
  private normalizePortData(
    record: any,
    source: PortDataSource
  ): PortImportData | null {
    try {
      if (source === 'nga') {
        return this.normalizeNGAData(record)
      } else if (source === 'upply') {
        return this.normalizeUpplyData(record)
      } else {
        return this.normalizeManualData(record)
      }
    } catch (error) {
      console.error('❌ Failed to normalize port data:', error)
      return null
    }
  }

  /**
   * Normalize NGA World Port Index data
   */
  private normalizeNGAData(record: any): PortImportData | null {
    const portName = record['Main Port Name'] || record['Port Name']
    const latitude = parseFloat(record['Latitude'] || record['Latitude Degrees'])
    const longitude = parseFloat(record['Longitude'] || record['Longitude Degrees'])
    const country = record['Country']

    if (!portName || isNaN(latitude) || isNaN(longitude) || !country) {
      return null
    }

    return {
      portName,
      alternateNames: record['Alternate Port Name'],
      unLocode: record['UN/LOCODE'] || record['LOCODE'],
      worldPortIndex: record['World Port Index Number'] || record['Index No.'],
      country,
      countryCode: record['Country Code'],
      region: record['World Water Body'],
      latitude,
      longitude,
      harborSize: record['Harbor Size'],
      harborType: record['Harbor Type'],
      shelter: record['Shelter Afforded'],
      entryRestrictions: record['Entry Restrictions'],
      overhead: record['Overhead Limits'],
      channel: record['Channel Depth'],
      anchorage: record['Anchorage'],
      cargoPier: this.parseYesNo(record['Cargo Pier']),
      cargoBeach: this.parseYesNo(record['Beach']),
      cargoIce: this.parseYesNo(record['Ice']),
      medMoor: this.parseYesNo(record['Med Moor']),
      hasFuel: this.parseYesNo(record['Supplies - Fuel Oil']),
      hasRepair: this.parseYesNo(record['Repairs']),
      hasDrydock: this.parseYesNo(record['Dry Dock']),
      hasRailway: this.parseYesNo(record['Railway']),
      hasSupplies: this.parseYesNo(record['Provisions']),
      hasMedical: this.parseYesNo(record['Medical Facilities']),
      hasGarbage: this.parseYesNo(record['Garbage Disposal']),
      hasTugAssist: this.parseYesNo(record['Tug Assistance']),
      hasPilotage: this.parseYesNo(record['Pilotage']),
      maxVesselSize: record['Maximum Vessel Size'],
      maxVesselDraft: this.parseFloat(record['Maximum Vessel Draft']),
      maxVesselBeam: this.parseFloat(record['Maximum Vessel Beam']),
      meanTideRange: this.parseFloat(record['Mean Tide Range']),
      maxTideRange: this.parseFloat(record['Max Tide Range'])
    }
  }

  /**
   * Normalize Upply seaports data
   */
  private normalizeUpplyData(record: any): PortImportData | null {
    const portName = record['name'] || record['port_name']
    const latitude = parseFloat(record['latitude'] || record['lat'])
    const longitude = parseFloat(record['longitude'] || record['lon'] || record['lng'])
    const country = record['country']

    if (!portName || isNaN(latitude) || isNaN(longitude) || !country) {
      return null
    }

    return {
      portName,
      unLocode: record['locode'] || record['un_locode'],
      country,
      countryCode: record['country_code'] || record['iso2'],
      region: record['zone'] || record['region'],
      latitude,
      longitude
    }
  }

  /**
   * Normalize manual/generic CSV data
   */
  private normalizeManualData(record: any): PortImportData | null {
    const portName = record['portName'] || record['name'] || record['port_name']
    const latitude = parseFloat(record['latitude'] || record['lat'])
    const longitude = parseFloat(record['longitude'] || record['lon'] || record['lng'])
    const country = record['country']

    if (!portName || isNaN(latitude) || isNaN(longitude) || !country) {
      return null
    }

    return {
      portName,
      alternateNames: record['alternateNames'],
      unLocode: record['unLocode'] || record['locode'],
      country,
      countryCode: record['countryCode'],
      region: record['region'],
      latitude,
      longitude,
      harborSize: record['harborSize'],
      harborType: record['harborType']
    }
  }

  /**
   * Parse Yes/No values to boolean
   */
  private parseYesNo(value: any): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim()
      return lower === 'y' || lower === 'yes' || lower === 'true' || lower === '1'
    }
    return false
  }

  /**
   * Parse float with fallback
   */
  private parseFloat(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined
    const parsed = parseFloat(value)
    return isNaN(parsed) ? undefined : parsed
  }

  /**
   * Calculate data quality score (0-100)
   */
  private calculateQuality(port: PortImportData): number {
    let score = 0
    const weights = {
      required: 40, // portName, country, lat, lon
      identification: 20, // unLocode, countryCode, region
      characteristics: 15, // harborSize, harborType, shelter
      facilities: 15, // services and facilities
      contact: 10 // contact information
    }

    // Required fields (always present if we got here)
    score += weights.required

    // Identification
    if (port.unLocode) score += 7
    if (port.countryCode) score += 7
    if (port.region) score += 6

    // Characteristics
    if (port.harborSize) score += 5
    if (port.harborType) score += 5
    if (port.shelter) score += 5

    // Facilities (at least 3)
    const facilities = [
      port.hasFuel, port.hasRepair, port.hasDrydock,
      port.hasSupplies, port.hasMedical, port.hasTugAssist
    ].filter(Boolean).length
    score += Math.min(facilities * 2.5, weights.facilities)

    // Contact
    if (port.portAuthority) score += 3
    if (port.telephone || port.email) score += 4
    if (port.website) score += 3

    return Math.min(Math.round(score), 100)
  }

  /**
   * Build search text for full-text search
   */
  private buildSearchText(port: PortImportData): string {
    const parts = [
      port.portName,
      port.alternateNames,
      port.unLocode,
      port.country,
      port.countryCode,
      port.region,
      port.portAuthority
    ].filter(Boolean)

    return parts.join(' ').toLowerCase()
  }

  /**
   * Determine if existing port should be updated
   */
  private shouldUpdate(
    existing: any,
    newData: PortImportData,
    source: PortDataSource
  ): boolean {
    // Source authority ranking
    const sourceRank: Record<PortDataSource, number> = {
      nga: 3,      // Official government source
      upply: 2,    // Curated commercial source
      manual: 1    // User input
    }

    const existingRank = sourceRank[existing.dataSource as PortDataSource] || 0
    const newRank = sourceRank[source] || 0

    // Update if new source has higher authority
    if (newRank > existingRank) return true

    // Update if same authority but better quality
    if (newRank === existingRank) {
      const newQuality = this.calculateQuality(newData)
      return newQuality > existing.dataQuality
    }

    // Update if data is stale (>1 year old)
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    if (existing.updatedAt < oneYearAgo && newRank >= existingRank) {
      return true
    }

    return false
  }

  /**
   * Search ports
   */
  async searchPorts(
    query: string,
    filters?: {
      country?: string
      region?: string
      minHarborSize?: string
      hasFacility?: string
    },
    limit: number = 50
  ) {
    const where: any = {}

    if (query) {
      where.OR = [
        { portName: { contains: query, mode: 'insensitive' } },
        { unLocode: { contains: query, mode: 'insensitive' } },
        { country: { contains: query, mode: 'insensitive' } },
        { searchText: { contains: query.toLowerCase() } }
      ]
    }

    if (filters?.country) {
      where.country = filters.country
    }

    if (filters?.region) {
      where.region = filters.region
    }

    if (filters?.minHarborSize) {
      where.harborSize = filters.minHarborSize
    }

    if (filters?.hasFacility) {
      const facilityMap: Record<string, string> = {
        fuel: 'hasFuel',
        repair: 'hasRepair',
        drydock: 'hasDrydock',
        medical: 'hasMedical',
        supplies: 'hasSupplies'
      }
      const field = facilityMap[filters.hasFacility]
      if (field) {
        where[field] = true
      }
    }

    return prisma.port.findMany({
      where,
      take: limit,
      orderBy: [
        { dataQuality: 'desc' },
        { portName: 'asc' }
      ]
    })
  }

  /**
   * Get port by UN/LOCODE
   */
  async getPortByLocode(locode: string) {
    return prisma.port.findUnique({
      where: { unLocode: locode }
    })
  }

  /**
   * Get ports near coordinates
   */
  async getPortsNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 100,
    limit: number = 10
  ) {
    // Simple bounding box search (for more accurate, use PostGIS)
    const latDelta = radiusKm / 111 // 1 degree latitude ≈ 111 km
    const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180))

    return prisma.port.findMany({
      where: {
        latitude: {
          gte: latitude - latDelta,
          lte: latitude + latDelta
        },
        longitude: {
          gte: longitude - lonDelta,
          lte: longitude + lonDelta
        }
      },
      take: limit,
      orderBy: { dataQuality: 'desc' }
    })
  }

  /**
   * Get port statistics
   */
  async getStats() {
    const [total, byCountry, bySource, avgQuality] = await Promise.all([
      prisma.port.count(),
      prisma.port.groupBy({
        by: ['country'],
        _count: true,
        orderBy: { _count: { country: 'desc' } },
        take: 10
      }),
      prisma.port.groupBy({
        by: ['dataSource'],
        _count: true
      }),
      prisma.port.aggregate({
        _avg: { dataQuality: true }
      })
    ])

    return {
      total,
      byCountry,
      bySource,
      averageQuality: Math.round(avgQuality._avg.dataQuality || 0)
    }
  }
}

export const portImportService = new PortImportService()
