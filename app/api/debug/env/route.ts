import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  return NextResponse.json({
    message: 'Server-side environment variable check (development only)',
    env: {
      NODE_ENV: process.env.NODE_ENV,
    },
  })
}
