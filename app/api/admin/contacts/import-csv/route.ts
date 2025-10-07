import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, Role, Permission } from '@/lib/rbac/roles'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session.user as any
    
    // Check permission
    if (!hasPermission(currentUser.role as Role, Permission.IMPORT_CONTACTS)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 })
    }

    // Read CSV file
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 })
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Validate required columns
    const requiredColumns = ['name']
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
    if (missingColumns.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      }, { status: 400 })
    }

    // Parse rows
    const contacts = []
    const errors = []
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''))
        const row: any = {}
        
        headers.forEach((header, index) => {
          row[header] = values[index] || null
        })

        // Validate name
        if (!row.name) {
          errors.push(`Line ${i + 1}: Name is required`)
          continue
        }

        // Validate at least email or phone
        if (!row.email && !row.phone) {
          errors.push(`Line ${i + 1}: At least email or phone is required`)
          continue
        }

        contacts.push({
          name: row.name,
          email: row.email || null,
          phone: row.phone || null,
          whatsapp: row.whatsapp || null,
          language: row.language || 'en',
          timezone: row.timezone || 'UTC',
          active: row.active === 'false' ? false : true,
          organizationId: currentUser.organizationId || null,
          createdBy: currentUser.id
        })
      } catch (error) {
        errors.push(`Line ${i + 1}: Parse error`)
      }
    }

    if (contacts.length === 0) {
      return NextResponse.json({ 
        error: 'No valid contacts found in CSV',
        details: errors 
      }, { status: 400 })
    }

    // Bulk insert contacts
    const result = await prisma.contact.createMany({
      data: contacts,
      skipDuplicates: true
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'IMPORT_CONTACTS_CSV',
        resource: 'contacts',
        resourceId: 'bulk',
        metadata: {
          imported: result.count,
          total: contacts.length,
          errors: errors.length,
          fileName: file.name
        }
      }
    })

    return NextResponse.json({
      success: true,
      imported: result.count,
      total: contacts.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 })
  }
}
