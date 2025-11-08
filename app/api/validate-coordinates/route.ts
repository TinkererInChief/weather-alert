import { NextRequest, NextResponse } from 'next/server'
import { validateTsunamiCoordinates } from '@/lib/utils/coordinate-validator'

export async function POST(req: NextRequest) {
  try {
    const { lat, lon } = await req.json()

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      return NextResponse.json(
        { error: 'Latitude and longitude must be numbers' },
        { status: 400 }
      )
    }

    const validation = await validateTsunamiCoordinates(lat, lon)

    return NextResponse.json(validation)
  } catch (error: any) {
    console.error('Coordinate validation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to validate coordinates',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const lat = parseFloat(searchParams.get('lat') || '')
  const lon = parseFloat(searchParams.get('lon') || '')

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: 'Invalid latitude or longitude' },
      { status: 400 }
    )
  }

  try {
    const validation = await validateTsunamiCoordinates(lat, lon)
    return NextResponse.json(validation)
  } catch (error: any) {
    console.error('Coordinate validation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to validate coordinates',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
