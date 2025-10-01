import { NextResponse } from 'next/server'
import { alertManager } from '@/lib/alert-manager'
import { protectTestEndpoint } from '@/lib/test-protection'

export async function POST() {
  // Protect test endpoint in production
  const protection = protectTestEndpoint()
  if (protection) return protection
  
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
