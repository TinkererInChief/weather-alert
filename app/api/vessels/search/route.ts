import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { vesselImportService } from '@/lib/services/vessel-import.service'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q') || ''
    const vesselType = searchParams.get('type') || undefined
    const flag = searchParams.get('flag') || undefined
    const minLength = searchParams.get('minLength') 
      ? parseFloat(searchParams.get('minLength')!) 
      : undefined
    const maxLength = searchParams.get('maxLength')
      ? parseFloat(searchParams.get('maxLength')!)
      : undefined
    const buildYearFrom = searchParams.get('buildYearFrom')
      ? parseInt(searchParams.get('buildYearFrom')!)
      : undefined
    const buildYearTo = searchParams.get('buildYearTo')
      ? parseInt(searchParams.get('buildYearTo')!)
      : undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    
    const vessels = await vesselImportService.searchVessels(
      query,
      {
        vesselType,
        flag,
        minLength,
        maxLength,
        buildYearFrom,
        buildYearTo
      },
      Math.min(limit, 100) // Max 100 results
    )
    
    return NextResponse.json({
      success: true,
      vessels,
      count: vessels.length
    })
    
  } catch (error) {
    console.error('❌ Vessel search error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed' 
      },
      { status: 500 }
    )
  }
}
