import NextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

// Lazy-load the client component
const VesselAlertsClient = NextDynamic(() => import('./VesselAlertsClient'), { ssr: false })

export default function VesselAlertsPage() {
  return <VesselAlertsClient />
}
