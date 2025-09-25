import { NextRequest, NextResponse } from 'next/server'
import { tsunamiMonitor } from '@/lib/tsunami-monitor'

export async function GET() {
  try {
    const status = tsunamiMonitor.getStatus()
    
    return NextResponse.json({
      success: true,
      data: {
        monitoring: status,
        endpoints: {
          start: '/api/tsunami/monitor (POST)',
          stop: '/api/tsunami/monitor (DELETE)',
          check: '/api/tsunami (GET)',
          status: '/api/tsunami/monitor (GET)'
        }
      }
    })

  } catch (error) {
    console.error('❌ Error getting tsunami monitor status:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get monitor status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST() {
  try {
    console.log('🌊 Starting tsunami monitoring via API...')
    
    await tsunamiMonitor.startMonitoring()
    
    return NextResponse.json({
      success: true,
      message: 'Tsunami monitoring started successfully',
      data: {
        status: 'active',
        startedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error starting tsunami monitoring:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start tsunami monitoring',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    console.log('🛑 Stopping tsunami monitoring via API...')
    
    tsunamiMonitor.stopMonitoring()
    
    return NextResponse.json({
      success: true,
      message: 'Tsunami monitoring stopped successfully',
      data: {
        status: 'inactive',
        stoppedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error stopping tsunami monitoring:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to stop tsunami monitoring',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('⚙️ Updating tsunami monitoring configuration...')
    
    tsunamiMonitor.updateConfig(body)
    
    return NextResponse.json({
      success: true,
      message: 'Tsunami monitoring configuration updated',
      data: {
        updatedAt: new Date().toISOString(),
        newConfig: body
      }
    })

  } catch (error) {
    console.error('❌ Error updating tsunami monitoring config:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
