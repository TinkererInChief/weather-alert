import NextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

// Lazy-load the client component
const CommunicationsClient = NextDynamic(() => import('./CommunicationsClient'), { ssr: false })

export default function CommunicationsPage() {
  return <CommunicationsClient />
}
