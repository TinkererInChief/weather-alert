import { Shield } from 'lucide-react'
import Link from 'next/link'

type PublicPageHeaderProps = {
  title: string
  subtitle?: string
}

export default function PublicPageHeader({ title, subtitle }: PublicPageHeaderProps) {
  return (
    <header className="relative bg-gradient-to-br from-slate-50 to-gray-100 border-b border-gray-200/50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.03),transparent_50%)]"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav className="flex items-center justify-between py-4">
          <Link href="/" className="group flex items-center space-x-3 transition-all duration-200">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">Emergency Alert</h3>
              <p className="text-xs text-slate-500">Command Center</p>
            </div>
          </Link>
          <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </nav>

        {/* Page Title */}
        <div className="py-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-light">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </header>
  )
}
