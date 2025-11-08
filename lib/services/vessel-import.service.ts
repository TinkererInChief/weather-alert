/**
 * Vessel Import Service
 * Handles importing vessel data from CSV files and external sources
 */

import { prisma } from '@/lib/prisma'
import { parse } from 'csv-parse/sync'
import fs from 'fs/promises'

export type VesselImportSource = 'equasis' | 'manual' | 'ihs' | 'lloyds' | 'csv'

export type VesselImportData = {
  imo: string
  mmsi?: string
  name: string
  callsign?: string
  vesselType: string
  vesselTypeDetailed?: string
  flag?: string
  length?: number
  width?: number
  height?: number
  grossTonnage?: number
  deadweight?: number
  netTonnage?: number
  buildYear?: number
  builder?: string
  owner?: string
  operator?: string
  manager?: string
  technicalManager?: string
  classification?: string
  classNumber?: string
  portOfRegistry?: string
  hullNumber?: string
  status?: string
}

export type ImportResult = {
  imported: number
  updated: number
  skipped: number
  failed: number
  errors: string[]
  duration: number
}

export class VesselImportService {
  /**
   * Import vessels from CSV file
   * Expected CSV format: IMO,MMSI,Name,Callsign,Type,Flag,Length,Width,GT,DWT,BuildYear,Owner,Operator
   */
  async importFromCSV(
    filePath: string,
    source: VesselImportSource,
    userId: string
  ): Promise<ImportResult> {
    const startTime = Date.now()
    const results: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      duration: 0
    }

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8')
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true
      })

      console.log(`📦 Processing ${records.length} vessels from ${filePath}`)

      for (const record of records) {
        try {
          const vesselData = this.normalizeVesselData(record, source)

          // Validate IMO number
          if (!this.isValidIMO(vesselData.imo)) {
            results.errors.push(`Invalid IMO: ${vesselData.imo} for vessel ${vesselData.name}`)
            results.failed++
            continue
          }

          // Check if vessel exists
          const existing = await prisma.globalVessel.findUnique({
            where: { imo: vesselData.imo }
          })

          if (existing) {
            // Update if new data is better quality
            if (this.shouldUpdate(existing, vesselData, source)) {
              await prisma.globalVessel.update({
                where: { imo: vesselData.imo },
                data: {
                  ...vesselData,
                  dataSource: [...new Set([...existing.dataSource, source])],
                  dataQuality: this.calculateQuality(vesselData),
                  lastVerified: new Date(),
                  verifiedBy: userId,
                  searchText: this.buildSearchText(vesselData)
                }
              })
              results.updated++
            } else {
              results.skipped++
            }
          } else {
            // Create new vessel
            await prisma.globalVessel.create({
              data: {
                ...vesselData,
                dataSource: [source],
                dataQuality: this.calculateQuality(vesselData),
                lastVerified: new Date(),
                verifiedBy: userId,
                searchText: this.buildSearchText(vesselData)
              }
            })
            results.imported++
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          const rec = record as any
          results.errors.push(`Failed to import ${rec.IMO || rec.Name || 'unknown'}: ${errorMsg}`)
          results.failed++
        }
      }

      results.duration = Date.now() - startTime

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'vessel_import',
          resource: 'global_vessels',
          metadata: {
            source,
            results,
            filePath: filePath.split('/').pop() // Just filename for security
          }
        }
      })

      console.log(`✅ Import complete: ${results.imported} imported, ${results.updated} updated, ${results.failed} failed in ${results.duration}ms`)

      return results
    } catch (error) {
      console.error('❌ Import failed:', error)
      throw error
    }
  }

  /**
   * Import from buffer (for file uploads)
   */
  async importFromBuffer(
    buffer: Buffer,
    source: VesselImportSource,
    userId: string
  ): Promise<ImportResult> {
    const startTime = Date.now()
    const results: ImportResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      duration: 0
    }

    try {
      const content = buffer.toString('utf-8')
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true
      })

      console.log(`📦 Processing ${records.length} vessels from buffer`)

      for (const record of records) {
        try {
          const vesselData = this.normalizeVesselData(record, source)

          if (!this.isValidIMO(vesselData.imo)) {
            results.errors.push(`Invalid IMO: ${vesselData.imo}`)
            results.failed++
            continue
          }

          const existing = await prisma.globalVessel.findUnique({
            where: { imo: vesselData.imo }
          })

          if (existing) {
            if (this.shouldUpdate(existing, vesselData, source)) {
              await prisma.globalVessel.update({
                where: { imo: vesselData.imo },
                data: {
                  ...vesselData,
                  dataSource: [...new Set([...existing.dataSource, source])],
                  dataQuality: this.calculateQuality(vesselData),
                  lastVerified: new Date(),
                  verifiedBy: userId,
                  searchText: this.buildSearchText(vesselData)
                }
              })
              results.updated++
            } else {
              results.skipped++
            }
          } else {
            await prisma.globalVessel.create({
              data: {
                ...vesselData,
                dataSource: [source],
                dataQuality: this.calculateQuality(vesselData),
                lastVerified: new Date(),
                verifiedBy: userId,
                searchText: this.buildSearchText(vesselData)
              }
            })
            results.imported++
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          results.errors.push(`Import failed: ${errorMsg}`)
          results.failed++
        }
      }

      results.duration = Date.now() - startTime

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'vessel_import',
          resource: 'global_vessels',
          metadata: { source, results }
        }
      })

      return results
    } catch (error) {
      console.error('❌ Import failed:', error)
      throw error
    }
  }

  /**
   * Normalize vessel data from CSV record
   */
  private normalizeVesselData(record: any, source: VesselImportSource): VesselImportData {
    // Handle different CSV column formats
    const imo = (record.IMO || record.imo || record['IMO Number'] || '').toString().trim()
    const mmsi = (record.MMSI || record.mmsi || '').toString().trim() || undefined
    const name = (record.Name || record.name || record['Vessel Name'] || '').toString().trim()
    const vesselType = (record.Type || record.type || record.VesselType || record['Vessel Type'] || 'Unknown').toString().trim()

    return {
      imo,
      mmsi,
      name,
      callsign: record.Callsign || record.callsign || undefined,
      vesselType,
      vesselTypeDetailed: record.TypeDetailed || record['Type Detailed'] || undefined,
      flag: record.Flag || record.flag || undefined,
      length: this.parseFloat(record.Length || record.length),
      width: this.parseFloat(record.Width || record.width || record.Beam),
      height: this.parseFloat(record.Height || record.height),
      grossTonnage: this.parseFloat(record.GT || record.GrossTonnage || record['Gross Tonnage']),
      deadweight: this.parseFloat(record.DWT || record.Deadweight || record['Dead Weight']),
      netTonnage: this.parseFloat(record.NT || record.NetTonnage),
      buildYear: this.parseInt(record.BuildYear || record['Build Year'] || record.YearBuilt),
      builder: record.Builder || record.builder || undefined,
      owner: record.Owner || record.owner || undefined,
      operator: record.Operator || record.operator || undefined,
      manager: record.Manager || record.manager || undefined,
      technicalManager: record.TechnicalManager || record['Technical Manager'] || undefined,
      classification: record.Class || record.classification || undefined,
      classNumber: record.ClassNumber || record['Class Number'] || undefined,
      portOfRegistry: record.PortOfRegistry || record['Port of Registry'] || undefined,
      hullNumber: record.HullNumber || record['Hull Number'] || undefined,
      status: record.Status || record.status || 'active'
    }
  }

  /**
   * Validate IMO number using check digit algorithm
   * IMO format: IMO + 7 digits, last digit is check digit
   */
  private isValidIMO(imo: string): boolean {
    if (!imo) return false

    // Remove "IMO" prefix if present
    const digits = imo.replace(/^IMO\s*/i, '').trim()

    // Must be exactly 7 digits
    if (!/^\d{7}$/.test(digits)) return false

    // Calculate check digit
    const sum = digits
      .slice(0, 6)
      .split('')
      .reduce((acc, digit, i) => acc + parseInt(digit) * (7 - i), 0)

    const checkDigit = sum % 10
    return checkDigit === parseInt(digits[6])
  }

  /**
   * Calculate data quality score (0-100)
   */
  private calculateQuality(data: VesselImportData): number {
    let score = 0
    const weights: Record<string, number> = {
      imo: 20,
      name: 15,
      vesselType: 10,
      mmsi: 10,
      flag: 5,
      length: 5,
      width: 5,
      grossTonnage: 5,
      deadweight: 5,
      buildYear: 5,
      owner: 5,
      operator: 5,
      manager: 5
    }

    for (const [field, weight] of Object.entries(weights)) {
      if (data[field as keyof VesselImportData]) {
        score += weight
      }
    }

    return Math.min(100, score)
  }

  /**
   * Build search text for full-text search
   */
  private buildSearchText(data: VesselImportData): string {
    return [
      data.imo,
      data.mmsi,
      data.name,
      data.callsign,
      data.owner,
      data.operator,
      data.flag,
      data.vesselType
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  }

  /**
   * Determine if existing record should be updated
   */
  private shouldUpdate(
    existing: any,
    newData: VesselImportData,
    source: VesselImportSource
  ): boolean {
    // Source authority ranking
    const sourceRanking: Record<string, number> = {
      ihs: 4,
      lloyds: 3,
      equasis: 2,
      manual: 1,
      csv: 1
    }

    const existingSource = existing.dataSource[0] || 'csv'
    const existingRank = sourceRanking[existingSource] || 0
    const newRank = sourceRanking[source] || 0

    // Update if new source is more authoritative
    if (newRank > existingRank) {
      return true
    }

    // Update if data quality improves by more than 10%
    const newQuality = this.calculateQuality(newData)
    if (newQuality > existing.dataQuality + 10) {
      return true
    }

    // Update if data is stale (>6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    if (existing.lastVerified < sixMonthsAgo) {
      return true
    }

    return false
  }

  /**
   * Search vessels by name, IMO, or MMSI
   */
  async searchVessels(
    query: string,
    filters?: {
      vesselType?: string
      flag?: string
      minLength?: number
      maxLength?: number
      buildYearFrom?: number
      buildYearTo?: number
      status?: string
    },
    limit = 50
  ) {
    const where: any = {
      status: filters?.status || 'active'
    }

    // Search query
    if (query) {
      where.OR = [
        { imo: { contains: query, mode: 'insensitive' } },
        { mmsi: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
        { searchText: { contains: query.toLowerCase() } }
      ]
    }

    // Apply filters
    if (filters) {
      if (filters.vesselType) where.vesselType = filters.vesselType
      if (filters.flag) where.flag = filters.flag
      if (filters.minLength !== undefined) {
        where.length = { gte: filters.minLength }
      }
      if (filters.maxLength !== undefined) {
        where.length = { ...where.length, lte: filters.maxLength }
      }
      if (filters.buildYearFrom !== undefined) {
        where.buildYear = { gte: filters.buildYearFrom }
      }
      if (filters.buildYearTo !== undefined) {
        where.buildYear = { ...where.buildYear, lte: filters.buildYearTo }
      }
    }

    return prisma.globalVessel.findMany({
      where,
      take: limit,
      orderBy: [
        { dataQuality: 'desc' },
        { name: 'asc' }
      ],
      include: {
        trackedVessel: {
          select: {
            id: true,
            lastSeen: true,
            active: true
          }
        }
      }
    })
  }

  /**
   * Get vessel by IMO
   */
  async getVesselByIMO(imo: string) {
    return prisma.globalVessel.findUnique({
      where: { imo },
      include: {
        trackedVessel: {
          include: {
            positions: {
              take: 1,
              orderBy: { timestamp: 'desc' }
            }
          }
        },
        fleetAssignments: {
          include: {
            fleet: true
          }
        }
      }
    })
  }

  /**
   * Link global vessel to tracked (AIS) vessel
   */
  async linkToTrackedVessel(imo: string, trackedVesselId: string): Promise<void> {
    await prisma.globalVessel.update({
      where: { imo },
      data: { trackedVesselId }
    })
  }

  /**
   * Get statistics
   */
  async getStats() {
    const [total, active, withTracking, byType] = await Promise.all([
      prisma.globalVessel.count(),
      prisma.globalVessel.count({ where: { status: 'active' } }),
      prisma.globalVessel.count({ where: { trackedVesselId: { not: null } } }),
      prisma.globalVessel.groupBy({
        by: ['vesselType'],
        _count: true,
        orderBy: { _count: { vesselType: 'desc' } },
        take: 10
      })
    ])

    return {
      total,
      active,
      withTracking,
      trackingPercentage: total > 0 ? Math.round((withTracking / total) * 100) : 0,
      byType
    }
  }

  // Helper methods
  private parseFloat(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined
    const num = parseFloat(value)
    return isNaN(num) ? undefined : num
  }

  private parseInt(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined
    const num = parseInt(value)
    return isNaN(num) ? undefined : num
  }
}

export const vesselImportService = new VesselImportService()
