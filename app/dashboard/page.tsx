import NextDynamic from 'next/dynamic'

/**
 * This page **must** be rendered dynamically (never statically exported),
 * otherwise `next export` fails. By keeping this file a _server component_
 * that only mounts a dynamic client component, the build succeeds and the
 * heavy client-side logic is kept in [DashboardClient.tsx].
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0

// Lazy-load the client-only implementation (no SSR).
const DashboardClient = NextDynamic(() => import('./DashboardClient'), { ssr: false })

export default function DashboardPage() {
  return <DashboardClient />
}
