import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { portImportService } from '@/lib/services/port-import.service'

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
    const country = searchParams.get('country') || undefined
    const region = searchParams.get('region') || undefined
    const minHarborSize = searchParams.get('minHarborSize') || undefined
    const hasFacility = searchParams.get('hasFacility') || undefined
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!)
      : 50
    
    const ports = await portImportService.searchPorts(
      query,
      {
        country,
        region,
        minHarborSize,
        hasFacility
      },
      Math.min(limit, 100) // Max 100 results
    )
    
    return NextResponse.json({
      success: true,
      ports,
      count: ports.length
    })
    
  } catch (error) {
    console.error('❌ Port search error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Search failed' 
      },
      { status: 500 }
    )
  }
}
