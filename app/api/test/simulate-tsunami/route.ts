import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { escalationService } from '@/lib/services/escalation.service'
import { calculateTsunamiThreat, TsunamiParameters } from '@/lib/services/tsunami-physics.service'

/**
 * Enhanced Realistic End-to-End Tsunami Simulation
 * 
 * This endpoint simulates:
 * 1. A tsunami event with real earthquake physics (epicenter, magnitude, fault parameters)
 * 2. Calculates which vessels are in danger zones using scientific models
 * 3. Determines severity based on wave height, distance, and directivity
 * 4. Creates alerts for affected vessels
 * 5. Triggers escalation policies
 * 6. Returns the full sequence for visualization
 * 
 * Physics Models Used:
 * - Haversine distance calculation
 * - Shallow water wave equation (tsunami speed varies with depth)
 * - Okada model for co-seismic seafloor displacement
 * - Cylindrical spreading with directivity patterns
 * - Fault type effects (thrust vs strike-slip)
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Allow recording mode without session (for Puppeteer)
    // Check if request is from recording page via referer
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
    // In recording mode, try to find any test contact or skip contact lookup
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
      console.error('❌ No contact found for user:', currentUser)
      return NextResponse.json({ 
        error: 'Contact not found for user',
        debug: {
          userEmail: currentUser.email,
          userPhone: currentUser.phone,
          userId: currentUser.id
        }
      }, { status: 404 })
    }
    
    const body = await req.json()
    
    const {
      epicenterLat,
      epicenterLon,
      magnitude,
      sendNotifications = false,
      // Enhanced physics parameters (optional)
      depth = 30,
      faultType = 'thrust',
      faultStrike,
      faultLength,
      faultWidth
    } = body
    
    // Build tsunami parameters
    const tsunamiParams: TsunamiParameters = {
      magnitude,
      depth,
      faultType: faultType as 'thrust' | 'strike-slip' | 'normal',
      faultStrike,
      faultLength,
      faultWidth
    }

    // Validate inputs
    if (!epicenterLat || !epicenterLon || !magnitude) {
      return NextResponse.json(
        { error: 'Missing required fields: epicenterLat, epicenterLon, magnitude' },
        { status: 400 }
      )
    }

    const simulationLog: string[] = []
    simulationLog.push(`🌊 TSUNAMI SIMULATION STARTED (Enhanced Physics)`)
    simulationLog.push(`📍 Epicenter: ${epicenterLat.toFixed(2)}°N, ${Math.abs(epicenterLon).toFixed(2)}°${epicenterLon >= 0 ? 'E' : 'W'}`)
    simulationLog.push(`📊 Magnitude: ${magnitude}`)
    simulationLog.push(`🔬 Depth: ${depth} km | Fault: ${faultType}`)
    if (faultStrike !== undefined) {
      simulationLog.push(`📐 Strike: ${faultStrike}° | Length: ${faultLength || 'auto'} km`)
    }
    simulationLog.push(``)

    // Step 1: Get all vessels from user's fleets with their latest positions
    // In recording mode, get ALL vessels regardless of fleet ownership
    console.log('🔍 Looking for fleets' + (isRecordingMode ? ' (RECORDING MODE - all vessels)' : ` with ownerId: ${contact?.id}`))
    
    const fleetVessels = isRecordingMode
      ? await prisma.fleetVessel.findMany({
          include: {
            vessel: {
              include: {
                contacts: {
                  include: { contact: true },
                  orderBy: { priority: 'asc' }
                },
                positions: {
                  orderBy: { timestamp: 'desc' },
                  take: 1
                }
              }
            }
          }
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
                  include: { contact: true },
                  orderBy: { priority: 'asc' }
                },
                positions: {
                  orderBy: { timestamp: 'desc' },
                  take: 1
                }
              }
            }
          }
        })

    console.log(`📊 Found ${fleetVessels.length} vessels`)

    simulationLog.push(`🚢 Analyzing ${fleetVessels.length} vessels in your fleet...`)
    simulationLog.push(``)

    // Step 2: Calculate impact for each vessel using enhanced physics
    const affectedVessels: Array<{
      vessel: any
      distance: number
      waveHeight: number
      eta: number
      severity: string
      tsunamiSpeed?: number
      azimuth?: number
    }> = []

    for (const fv of fleetVessels) {
      const vessel = fv.vessel
      
      // Get latest position or skip if no position available
      const latestPosition = vessel.positions && vessel.positions[0]
      if (!latestPosition) {
        continue // Skip vessels without position data
      }
      
      const vesselLat = latestPosition.latitude
      const vesselLon = latestPosition.longitude
      
      // Use enhanced physics model
      const threat = calculateTsunamiThreat(
        epicenterLat,
        epicenterLon,
        vesselLat,
        vesselLon,
        tsunamiParams
      )
      
      const { distance, waveHeight, eta, severity, tsunamiSpeed, azimuth } = threat

      // Only alert vessels within 1000km
      if (distance < 1000) {
        affectedVessels.push({
          vessel,
          distance,
          waveHeight,
          eta,
          severity,
          tsunamiSpeed,
          azimuth
        })

        simulationLog.push(`⚠️  ${vessel.name || vessel.mmsi}`)
        simulationLog.push(`   Distance: ${distance} km | Bearing: ${azimuth}°`)
        simulationLog.push(`   Wave Height: ${waveHeight.toFixed(2)} m | Speed: ${tsunamiSpeed} km/h`)
        simulationLog.push(`   ETA: ${eta} minutes`)
        simulationLog.push(`   Severity: ${severity.toUpperCase()}`)
        simulationLog.push(``)
      }
    }

    if (affectedVessels.length === 0) {
      simulationLog.push(`✅ No vessels in danger zone (within 1000km)`)
      return NextResponse.json({
        success: true,
        simulation: {
          epicenter: { lat: epicenterLat, lon: epicenterLon },
          magnitude,
          affectedVessels: [],
          alerts: [],
          logs: simulationLog
        }
      })
    }

    simulationLog.push(`🚨 ${affectedVessels.length} vessel(s) in danger zone!`)
    simulationLog.push(``)

    // Step 3: Create alerts for affected vessels
    const createdAlerts: any[] = []
    
    for (const affected of affectedVessels) {
      // Find appropriate escalation policy
      const policy = await prisma.escalationPolicy.findFirst({
        where: {
          eventTypes: { has: 'tsunami' },
          severityLevels: { has: affected.severity },
          active: true
        }
      })

      if (!policy) {
        simulationLog.push(`⚠️  No escalation policy found for ${affected.vessel.name} (${affected.severity})`)
        continue
      }

      // Create vessel alert
      const alert = await prisma.vesselAlert.create({
        data: {
          vesselId: affected.vessel.id,
          type: 'tsunami',
          severity: affected.severity,
          riskLevel: affected.severity,
          eventType: 'tsunami',
          message: `Tsunami alert: Wave height ${affected.waveHeight}m expected in ${affected.eta} minutes`,
          recommendation: affected.severity === 'critical' 
            ? 'IMMEDIATE EVACUATION REQUIRED. Move to safe harbor or deep water.'
            : affected.severity === 'high'
            ? 'Prepare for evacuation. Monitor conditions closely.'
            : 'Monitor tsunami warnings and prepare safety procedures.',
          distance: affected.distance,
          waveHeight: affected.waveHeight,
          tsunamiETA: affected.eta,
          acknowledged: false,
          escalationPolicyId: policy.id,
          escalationStep: 0,
          escalationStarted: false,
          coordinates: {
            lat: epicenterLat,
            lon: epicenterLon
          }
        }
      })

      simulationLog.push(`📝 Alert created: ${alert.id}`)
      simulationLog.push(`   Policy: ${policy.name}`)
      
      // Step 4: Trigger escalation
      const escalationResult = await escalationService.initiateEscalation(
        alert.id,
        !sendNotifications // dryRun if not sending real notifications
      )

      simulationLog.push(`   Escalation: ${escalationResult.success ? '✅ Started' : '❌ Failed'}`)
      if (escalationResult.notificationsSent > 0) {
        simulationLog.push(`   Notifications: ${escalationResult.notificationsSent} sent`)
      }
      simulationLog.push(``)

      createdAlerts.push({
        alertId: alert.id,
        vessel: {
          id: affected.vessel.id,
          name: affected.vessel.name || affected.vessel.mmsi,
          mmsi: affected.vessel.mmsi
        },
        distance: affected.distance,
        waveHeight: affected.waveHeight,
        eta: affected.eta,
        severity: affected.severity,
        policy: {
          id: policy.id,
          name: policy.name,
          steps: policy.steps
        },
        escalation: escalationResult,
        contacts: affected.vessel.contacts.map((vc: any) => ({
          name: vc.contact.name,
          role: vc.role,
          priority: vc.priority,
          phone: vc.contact.phone
        }))
      })
    }

    simulationLog.push(`✅ Simulation complete!`)
    simulationLog.push(`📊 ${createdAlerts.length} alert(s) created`)
    simulationLog.push(`📤 ${createdAlerts.reduce((sum, a) => sum + a.escalation.notificationsSent, 0)} notification(s) ${sendNotifications ? 'sent' : 'simulated'}`)

    // Calculate average tsunami speed from affected vessels
    const avgTsunamiSpeed = affectedVessels.length > 0
      ? Math.round(affectedVessels.reduce((sum, av) => sum + (av.tsunamiSpeed || 800), 0) / affectedVessels.length)
      : 800

    return NextResponse.json({
      success: true,
      dryRun: !sendNotifications,
      simulation: {
        epicenter: { 
          lat: epicenterLat, 
          lon: epicenterLon 
        },
        magnitude,
        tsunamiSpeed: avgTsunamiSpeed,
        affectedVessels: affectedVessels.map(av => {
          const latestPosition = av.vessel.positions && av.vessel.positions[0]
          return {
            vessel: {
              id: av.vessel.id,
              name: av.vessel.name || av.vessel.mmsi,
              mmsi: av.vessel.mmsi,
              position: {
                lat: latestPosition?.latitude || epicenterLat,
                lon: latestPosition?.longitude || epicenterLon
              }
            },
            distance: av.distance,
            waveHeight: av.waveHeight,
            eta: av.eta,
            severity: av.severity
          }
        }),
        alerts: createdAlerts,
        summary: {
          totalVessels: fleetVessels.length,
          affectedVessels: affectedVessels.length,
          alertsCreated: createdAlerts.length,
          notificationsSent: createdAlerts.reduce((sum, a) => sum + a.escalation.notificationsSent, 0)
        },
        logs: simulationLog
      }
    })

  } catch (error: any) {
    console.error('Error in tsunami simulation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run tsunami simulation',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
