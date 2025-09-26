import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-10 text-center text-white shadow-2xl">
        <div className="text-6xl font-extrabold tracking-tight">404</div>
        <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-slate-300">The page you’re looking for doesn’t exist or has been moved.</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:-translate-y-0.5 transition-all"
          >
            Go to Homepage
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center bg-white/10 border border-white/20 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-white/20 transition-all"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
