import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Permission, withPermission, logAudit } from '@/lib/rbac'
import { z } from 'zod'

const AddMembersSchema = z.object({
  contactIds: z.array(z.string()).min(1),
})

const RemoveMembersSchema = z.object({
  contactIds: z.array(z.string()).min(1),
})

type RouteContext = {
  params: {
    id: string
  }
}

/**
 * POST /api/contact-groups/[id]/members
 * Add contacts to a group
 */
export async function POST(req: NextRequest, context: RouteContext) {
  return withPermission(Permission.MANAGE_GROUPS, async (req, session) => {
    try {
      const { id: groupId } = context.params
      const body = await req.json()
      const { contactIds } = AddMembersSchema.parse(body)
      
      // Check if group exists
      const group = await prisma.contactGroup.findUnique({
        where: { id: groupId }
      })
      
      if (!group) {
        return NextResponse.json(
          { success: false, error: 'Contact group not found' },
          { status: 404 }
        )
      }
      
      // Verify all contacts exist
      const contacts = await prisma.contact.findMany({
        where: { id: { in: contactIds } }
      })
      
      if (contacts.length !== contactIds.length) {
        return NextResponse.json(
          { success: false, error: 'One or more contacts not found' },
          { status: 404 }
        )
      }
      
      // Add members (using createMany with skipDuplicates to handle existing memberships)
      const result = await prisma.contactGroupMember.createMany({
        data: contactIds.map(contactId => ({
          groupId,
          contactId
        })),
        skipDuplicates: true
      })
      
      // Get updated group with member count
      const updatedGroup = await prisma.contactGroup.findUnique({
        where: { id: groupId },
        include: {
          _count: {
            select: { members: true }
          }
        }
      })
      
      // Log audit event
      await logAudit({
        action: 'ADD_GROUP_MEMBERS',
        resource: 'ContactGroup',
        resourceId: groupId,
        metadata: { 
          groupName: group.name,
          contactsAdded: result.count,
          contactIds
        }
      })
      
      return NextResponse.json({
        success: true,
        data: {
          group: updatedGroup,
          added: result.count
        }
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: error.errors },
          { status: 400 }
        )
      }
      
      console.error('Error adding group members:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add group members' },
        { status: 500 }
      )
    }
  })(req)
}

/**
 * DELETE /api/contact-groups/[id]/members
 * Remove contacts from a group
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  return withPermission(Permission.MANAGE_GROUPS, async (req, session) => {
    try {
      const { id: groupId } = context.params
      const body = await req.json()
      const { contactIds } = RemoveMembersSchema.parse(body)
      
      // Check if group exists
      const group = await prisma.contactGroup.findUnique({
        where: { id: groupId }
      })
      
      if (!group) {
        return NextResponse.json(
          { success: false, error: 'Contact group not found' },
          { status: 404 }
        )
      }
      
      // Remove members
      const result = await prisma.contactGroupMember.deleteMany({
        where: {
          groupId,
          contactId: { in: contactIds }
        }
      })
      
      // Get updated group with member count
      const updatedGroup = await prisma.contactGroup.findUnique({
        where: { id: groupId },
        include: {
          _count: {
            select: { members: true }
          }
        }
      })
      
      // Log audit event
      await logAudit({
        action: 'REMOVE_GROUP_MEMBERS',
        resource: 'ContactGroup',
        resourceId: groupId,
        metadata: { 
          groupName: group.name,
          contactsRemoved: result.count,
          contactIds
        }
      })
      
      return NextResponse.json({
        success: true,
        data: {
          group: updatedGroup,
          removed: result.count
        }
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: error.errors },
          { status: 400 }
        )
      }
      
      console.error('Error removing group members:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to remove group members' },
        { status: 500 }
      )
    }
  })(req)
}
