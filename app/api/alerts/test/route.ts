import { NextResponse } from 'next/server'
import { alertManager } from '@/lib/alert-manager'

export async function POST() {
  try {
    const result = await alertManager.testSMSService()
    
    return NextResponse.json({
      success: result.success,
      message: result.message
    })
  } catch (error) {
    console.error('Error testing SMS service:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Test failed'
      },
      { status: 500 }
    )
  }
}
