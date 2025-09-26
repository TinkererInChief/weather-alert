import Link from 'next/link'
import { ArrowRight, Calendar, MessageCircle, LogIn } from 'lucide-react'

export default function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Ready to Protect Your Workforce?
        </h2>
        
        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          Join hundreds of organizations keeping their teams safe with real-time emergency alerts 
          and comprehensive disaster response coordination.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link 
            href="/contact" 
            className="inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-red-500/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300"
          >
            <Calendar className="mr-2 h-5 w-5" />
            Schedule Demo
          </Link>
          
          <Link 
            href="/contact" 
            className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all duration-300"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Contact Sales
          </Link>
        </div>

        {/* Secondary Access Links */}
        <div className="border-t border-white/20 pt-8">
          <p className="text-slate-400 mb-4">Existing customers and authorized personnel</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/login" 
              className="inline-flex items-center text-slate-300 hover:text-white font-medium transition-colors"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Admin Portal Login
            </Link>
            <div className="hidden sm:block w-px h-6 bg-white/20"></div>
            <Link 
              href="/contact" 
              className="inline-flex items-center text-slate-300 hover:text-white font-medium transition-colors"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Employee Access Request
            </Link>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 pt-8 border-t border-white/20">
          <p className="text-slate-400 text-sm mb-4">Trusted by organizations worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="text-white font-semibold">Fortune 500 Companies</div>
            <div className="text-white font-semibold">Government Agencies</div>
            <div className="text-white font-semibold">Educational Institutions</div>
            <div className="text-white font-semibold">Healthcare Systems</div>
          </div>
        </div>
      </div>
    </section>
  )
}
