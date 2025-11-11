import Link from 'next/link'
import { Home, Search, AlertTriangle, Waves, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full text-center">
        {/* Animated Wave Icon */}
        <div className="mb-12 flex justify-center">
          <div className="relative">
            <Waves className="h-32 w-32 text-blue-400 animate-pulse" strokeWidth={1.5} />
            <div className="absolute inset-0 flex items-center justify-center">
              <AlertTriangle className="h-16 w-16 text-red-400 animate-bounce" />
            </div>
          </div>
        </div>

        {/* Error Code */}
        <div className="mb-10">
          <h1 className="text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-4">
            404
          </h1>
          <div className="text-2xl md:text-3xl font-semibold text-white mb-2">
            Lost at Sea 🌊
          </div>
        </div>

        {/* Humorous Message */}
        <div className="space-y-5 mb-12 max-w-xl mx-auto">
          <p className="text-xl text-slate-300">
            <span className="font-semibold text-cyan-300">No tsunami alerts detected for this location.</span>
          </p>
          <p className="text-lg text-slate-400 leading-relaxed">
            This page drifted off our radar faster than a rogue wave. Our AI-powered navigation couldn't find this coordinate in any seismic database.
          </p>
          <p className="text-base text-slate-500 italic leading-relaxed">
            Don't worry—unlike actual emergencies, this one has a happy ending. Let's get you back to safe harbor.
          </p>
        </div>

        {/* Alert Status Badge */}
        <div className="mb-12 inline-flex items-center space-x-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-6 py-3">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-yellow-300 text-sm font-medium">Alert Status: Page Not Found</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            <Home className="mr-2 h-5 w-5" />
            Return to Safety (Home)
          </Link>
          
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white font-semibold rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-200"
          >
            <Search className="mr-2 h-5 w-5" />
            Check Dashboard
          </Link>
        </div>

        {/* Fun Maritime Facts */}
        <div className="mt-16 p-8 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-slate-400 text-base leading-relaxed">
            <span className="text-blue-300 font-semibold">💡 Did you know?</span> The Pacific Ocean contains approximately 25,000 islands—more than all other oceans combined. Unlike this page, they're all exactly where they should be.
          </p>
        </div>
      </div>
    </div>
  )
}
