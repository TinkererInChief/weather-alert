'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center px-4">
          <div className="max-w-xl w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-10 text-center text-white shadow-2xl">
            <div className="text-6xl font-extrabold tracking-tight">500</div>
            <h1 className="mt-4 text-2xl font-semibold">Something went wrong</h1>
            {error?.digest && (
              <p className="mt-1 text-xs text-slate-400">Ref: {error.digest}</p>
            )}
            <p className="mt-2 text-slate-300">An unexpected error occurred. You can try again or go back to safety.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => reset()}
                className="inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Try again
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center bg-white/10 border border-white/20 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-white/20 transition-all"
              >
                Go to Homepage
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
