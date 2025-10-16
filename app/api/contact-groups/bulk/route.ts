import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Permission, withPermission, logAudit } from '@/lib/rbac'
import { z } from 'zod'

const BulkDeleteSchema = z.object({
  groupIds: z.array(z.string()).min(1),
})

const BulkAddMembersSchema = z.object({
  groupId: z.string(),
  contactIds: z.array(z.string()).min(1),
})

/**
 * POST /api/contact-groups/bulk
 * Bulk operations on contact groups
 */
export const POST = withPermission(Permission.MANAGE_GROUPS, async (req, session) => {
  try {
    const body = await req.json()
    const { operation } = body
    
    switch (operation) {
      case 'delete':
        return await handleBulkDelete(req, body)
      case 'addMembers':
        return await handleBulkAddMembers(req, body)
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid operation' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in bulk operation:', error)
    return NextResponse.json(
      { success: false, error: 'Bulk operation failed' },
      { status: 500 }
    )
  }
})

async function handleBulkDelete(req: NextRequest, body: any) {
  const { groupIds } = BulkDeleteSchema.parse(body)
  
  // Get groups before deletion for audit
  const groups = await prisma.contactGroup.findMany({
    where: { id: { in: groupIds } },
    select: { id: true, name: true }
  })
  
  // Delete groups
  const result = await prisma.contactGroup.deleteMany({
    where: { id: { in: groupIds } }
  })
  
  const ip1 = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
  const ua1 = req.headers.get('user-agent') || undefined
  await logAudit({
    action: 'BULK_DELETE_GROUPS',
    resource: 'ContactGroup',
    metadata: { 
      count: result.count,
      groups: groups.map(g => ({ id: g.id, name: g.name }))
    },
    ipAddress: ip1,
    userAgent: ua1,
  })
  
  return NextResponse.json({
    success: true,
    data: {
      deleted: result.count
    }
  })
}

async function handleBulkAddMembers(req: NextRequest, body: any) {
  const { groupId, contactIds } = BulkAddMembersSchema.parse(body)
  
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
  
  // Add members
  const result = await prisma.contactGroupMember.createMany({
    data: contactIds.map(contactId => ({
      groupId,
      contactId
    })),
    skipDuplicates: true
  })
  
  const ip2 = (req.headers.get('x-forwarded-for') || '').split(',')[0] || undefined
  const ua2 = req.headers.get('user-agent') || undefined
  await logAudit({
    action: 'BULK_ADD_MEMBERS',
    resource: 'ContactGroup',
    resourceId: groupId,
    metadata: { 
      groupName: group.name,
      contactsAdded: result.count
    },
    ipAddress: ip2,
    userAgent: ua2,
  })
  
  return NextResponse.json({
    success: true,
    data: {
      added: result.count
    }
  })
}
