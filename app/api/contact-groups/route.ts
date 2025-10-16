import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Permission, withPermission, logAudit } from '@/lib/rbac'
import { z } from 'zod'

const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
})

const UpdateGroupSchema = CreateGroupSchema.partial()

/**
 * GET /api/contact-groups
 * List all contact groups with member counts
 */
export const GET = withPermission(Permission.VIEW_GROUPS, async (req, session) => {
  try {
    const { searchParams } = new URL(req.url)
    const includeMembers = searchParams.get('includeMembers') === 'true'
    
    const groups = await prisma.contactGroup.findMany({
      include: {
        members: includeMembers ? {
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                active: true,
              }
            }
          }
        } : undefined,
        _count: {
          select: { members: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      data: groups
    })
  } catch (error) {
    console.error('Error fetching contact groups:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact groups' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/contact-groups
 * Create a new contact group
 */
export const POST = withPermission(Permission.MANAGE_GROUPS, async (req, session) => {
  try {
    const body = await req.json()
    const validated = CreateGroupSchema.parse(body)
    
    const group = await prisma.contactGroup.create({
      data: {
        name: validated.name,
        description: validated.description,
        metadata: validated.metadata || {},
      },
      include: {
        _count: {
          select: { members: true }
        }
      }
    })
    
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
    const ua = req.headers.get('user-agent') || undefined
    await logAudit({
      action: 'CREATE_GROUP',
      resource: 'ContactGroup',
      resourceId: group.id,
      metadata: { name: group.name },
      ipAddress: ip,
      userAgent: ua,
    })
    
    return NextResponse.json({
      success: true,
      data: group
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating contact group:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create contact group' },
      { status: 500 }
    )
  }
})
