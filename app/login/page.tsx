import NextDynamic from 'next/dynamic'

/**
 * This page **must** be rendered dynamically (never statically exported),
 * otherwise `next export` fails.  By keeping this file a _server component_
 * that only mounts a dynamic client component, the build succeeds and the
 * heavy client-side logic is kept in [LoginClient.tsx](cci:7://file:///Users/yash/weather-alert/app/login/LoginClient.tsx:0:0-0:0).
 */
export const dynamic = 'force-dynamic'

// Lazy-load the client-only implementation (no SSR).
const LoginClient = NextDynamic(() => import('./LoginClient'), { ssr: false })

export default function LoginPage() {
  return <LoginClient />
}