import type { NextRequest } from 'next/server'
import { protectTestEndpoint } from '@/lib/test-protection'
import { POST as allChannelsPOST } from '../../test/all-channels/route'

export async function POST(request: NextRequest) {
  const protection = protectTestEndpoint()
  if (protection) return protection
  // Delegate to existing all-channels test handler
  return allChannelsPOST(request as any)
}
