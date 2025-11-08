import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const policies = await prisma.escalationPolicy.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(policies)
  } catch (error: any) {
    console.error('Error fetching escalation policies:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch escalation policies',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    // TODO: Add validation with Zod schema
    
    const policy = await prisma.escalationPolicy.create({
      data: {
        name: body.name,
        description: body.description,
        fleetId: body.fleetId,
        eventTypes: body.eventTypes || [],
        severityLevels: body.severityLevels || [],
        steps: body.steps || [],
        metadata: body.metadata || {},
        active: body.active ?? true
      }
    })

    return NextResponse.json(policy, { status: 201 })
  } catch (error: any) {
    console.error('Error creating escalation policy:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create escalation policy',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
