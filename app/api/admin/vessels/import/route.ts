import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { vesselImportService } from '@/lib/services/vessel-import.service'
import { hasPermission, Permission } from '@/lib/rbac/roles'

export const maxDuration = 300 // 5 minutes for large imports

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Check permission
    if (!hasPermission(session.user.role as any, Permission.MANAGE_SETTINGS)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }
    
    const formData = await req.formData()
    const file = formData.get('file') as File
    const source = (formData.get('source') as string) || 'manual'
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'Only CSV files are supported' },
        { status: 400 }
      )
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Import vessels
    const results = await vesselImportService.importFromBuffer(
      buffer,
      source as any,
      session.user.id
    )
    
    return NextResponse.json({
      success: true,
      results
    })
    
  } catch (error) {
    console.error('❌ Vessel import error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Import failed' 
      },
      { status: 500 }
    )
  }
}
