import { NextResponse } from 'next/server'
import { initializeApp, isInitialized } from '@/lib/init'

/**
 * GET /api/init
 * Initialize the application (settings system, observers, etc.)
 * Safe to call multiple times - will only initialize once
 */
export async function GET() {
  try {
    const wasInitialized = isInitialized()
    
    if (wasInitialized) {
      return NextResponse.json({
        success: true,
        message: 'Application already initialized',
        initialized: true
      })
    }
    
    await initializeApp()
    
    return NextResponse.json({
      success: true,
      message: 'Application initialized successfully',
      initialized: true
    })
  } catch (error) {
    console.error('Error initializing application:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
        initialized: false
      },
      { status: 500 }
    )
  }
}
