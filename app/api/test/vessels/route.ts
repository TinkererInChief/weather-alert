import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Get vessels for testing - includes ALL vessels in user's fleets
 * regardless of lastSeen timestamp
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Allow recording mode without session (for Puppeteer)
    const referer = req.headers.get('referer') || ''
    const isRecordingMode = referer.includes('record=1')
    
    if (!session?.user && !isRecordingMode) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = session?.user as any
    
    console.log('🔍 Session user:', currentUser ? { 
      id: currentUser.id, 
      email: currentUser.email, 
      phone: currentUser.phone 
    } : 'RECORDING MODE - No session')
    
    // Find the Contact record associated with this user
    // In recording mode, find any test contact
    const contact = currentUser ? await prisma.contact.findFirst({
      where: {
        OR: [
          { email: currentUser.email },
          { phone: currentUser.phone }
        ]
      }
    }) : await prisma.contact.findFirst({
      where: {
        email: {
          contains: 'test'
        }
      }
    })
    
    console.log('📇 Found contact:', contact ? { id: contact.id, name: contact.name } : 'NONE')
    
    if (!contact && !isRecordingMode) {
      return NextResponse.json({ 
        error: 'Contact not found for user',
        vessels: [],
        count: 0
      }, { status: 200 })
    }
    
    // Get all vessels from user's fleets
    // In recording mode, get ALL vessels regardless of fleet ownership
    const fleetVessels = isRecordingMode 
      ? await prisma.fleetVessel.findMany({
          include: {
            vessel: {
              include: {
                contacts: {
                  include: {
                    contact: true
                  },
                  orderBy: { priority: 'asc' }
                },
                positions: {
                  orderBy: { timestamp: 'desc' },
                  take: 1
                }
              }
            }
          },
          take: 100
        })
      : await prisma.fleetVessel.findMany({
          where: {
            fleet: {
              ownerId: contact!.id
            }
          },
      include: {
        vessel: {
          include: {
            contacts: {
              include: {
                contact: true
              },
              orderBy: { priority: 'asc' }
            },
            positions: {
              orderBy: { timestamp: 'desc' },
              take: 1
            }
          }
        }
      },
      take: 100
    })

    const vessels = fleetVessels.map(fv => {
      const latestPosition = fv.vessel.positions && fv.vessel.positions[0]
      return {
        id: fv.vessel.id,
        mmsi: fv.vessel.mmsi,
        name: fv.vessel.name,
        vesselType: fv.vessel.vesselType,
        contactCount: fv.vessel.contacts.length,
        position: latestPosition ? {
          latitude: latestPosition.latitude,
          longitude: latestPosition.longitude,
          timestamp: latestPosition.timestamp
        } : null
      }
    })

    const vesselsWithPositions = vessels.filter(v => v.position !== null)
    
    console.log(`📊 Found ${vessels.length} vessels, ${vesselsWithPositions.length} have positions${isRecordingMode ? ' (RECORDING MODE - all vessels)' : ''}`)
    
    return NextResponse.json({
      success: true,
      vessels,
      count: vessels.length
    })
  } catch (error: any) {
    console.error('Error fetching test vessels:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch vessels',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
