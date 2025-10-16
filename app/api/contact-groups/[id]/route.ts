import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Permission, withPermission, logAudit } from '@/lib/rbac'
import { z } from 'zod'

const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  metadata: z.record(z.any()).optional(),
})

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * GET /api/contact-groups/[id]
 * Get a specific contact group with members
 */
export async function GET(req: NextRequest, context: RouteContext) {
  return withPermission(Permission.VIEW_GROUPS, async (req, session) => {
    try {
      const { id } = context.params
      
      const group = await prisma.contactGroup.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              contact: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  whatsapp: true,
                  active: true,
                  createdAt: true,
                }
              }
            }
          },
          _count: {
            select: { members: true }
          }
        }
      })
      
      if (!group) {
        return NextResponse.json(
          { success: false, error: 'Contact group not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        data: group
      })
    } catch (error) {
      console.error('Error fetching contact group:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch contact group' },
        { status: 500 }
      )
    }
  })(req)
}

/**
 * PATCH /api/contact-groups/[id]
 * Update a contact group
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  return withPermission(Permission.MANAGE_GROUPS, async (req, session) => {
    try {
      const { id } = context.params
      const body = await req.json()
      const validated = UpdateGroupSchema.parse(body)
      
      // Check if group exists
      const existing = await prisma.contactGroup.findUnique({
        where: { id }
      })
      
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Contact group not found' },
          { status: 404 }
        )
      }
      
      const group = await prisma.contactGroup.update({
        where: { id },
        data: {
          name: validated.name,
          description: validated.description,
          metadata: validated.metadata,
        },
        include: {
          _count: {
            select: { members: true }
          }
        }
      })
      
      const ip1 = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
      const ua1 = req.headers.get('user-agent') || undefined
      await logAudit({
        action: 'UPDATE_GROUP',
        resource: 'ContactGroup',
        resourceId: id,
        metadata: { 
          oldName: existing.name,
          newName: group.name 
        },
        ipAddress: ip1,
        userAgent: ua1,
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
      
      console.error('Error updating contact group:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update contact group' },
        { status: 500 }
      )
    }
  })(req)
}

/**
 * DELETE /api/contact-groups/[id]
 * Delete a contact group
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  return withPermission(Permission.MANAGE_GROUPS, async (req, session) => {
    try {
      const { id } = context.params
      
      // Check if group exists
      const existing = await prisma.contactGroup.findUnique({
        where: { id },
        include: {
          _count: {
            select: { members: true }
          }
        }
      })
      
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Contact group not found' },
          { status: 404 }
        )
      }
      
      // Delete the group (members will be cascade deleted)
      await prisma.contactGroup.delete({
        where: { id }
      })
      
      const ip2 = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
      const ua2 = req.headers.get('user-agent') || undefined
      await logAudit({
        action: 'DELETE_GROUP',
        resource: 'ContactGroup',
        resourceId: id,
        metadata: { 
          name: existing.name,
          memberCount: existing._count.members
        },
        ipAddress: ip2,
        userAgent: ua2,
      })
      
      return NextResponse.json({
        success: true,
        message: 'Contact group deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting contact group:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete contact group' },
        { status: 500 }
      )
    }
  })(req)
}
