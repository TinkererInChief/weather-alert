import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { protectTestEndpoint } from '@/lib/test-protection'
import { POST as allChannelsPOST } from '../../test/all-channels/route'

export async function POST(request: NextRequest) {
  const protection = protectTestEndpoint()
  if (protection) return protection

  // Delegate to existing all-channels handler with all channels enabled
  const req = new Request('http://local/api/test/all-channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      includeVoice: true,
      includeWhatsApp: true,
      includeSMS: true,
      includeEmail: true,
    })
  }) as unknown as NextRequest

  try {
    return await allChannelsPOST(req)
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : 'Test failed' }, { status: 500 })
  }
}
