import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-64 h-64 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
            Ready to Protect Your Team & Assets?
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-4">
            Join hundreds of organizations protecting their workforce, vessels, and critical infrastructure with real-time emergency alerts
          </p>
          <p className="text-lg text-slate-400">
            Maritime fleets, offshore platforms, enterprise operations—all protected in minutes
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Demo Request */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4">Schedule a Demo</h3>
            <p className="text-slate-300 mb-6">
              See our emergency alert system in action with a demo tailored to your organization's needs.
            </p>
            <ul className="space-y-2 mb-6 text-slate-300">
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-3"></div>
                Live system walkthrough
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-3"></div>
                Custom use case scenarios
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-3"></div>
                Implementation planning
              </li>
            </ul>
            <Link
              href="/contact"
              className="w-full inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              Schedule Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>

          {/* Contact Sales */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4">Contact Sales</h3>
            <p className="text-slate-300 mb-6">
              Have questions about pricing, features, or implementation? Our sales team is here to help.
            </p>
            <ul className="space-y-2 mb-6 text-slate-300">
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></div>
                Custom pricing quotes
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></div>
                Enterprise feature discussion
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></div>
                Integration planning
              </li>
            </ul>
            <Link
              href="/contact"
              className="w-full inline-flex items-center justify-center px-8 py-4 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/30 hover:bg-white/30 transition-all duration-200"
            >
              Contact Sales
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Quick Access */}
        <div className="text-center">
          <p className="text-slate-400 mb-4">Already have an account?</p>
          <Link
            href="/login"
            className="inline-flex items-center text-white hover:text-slate-300 transition-colors duration-200"
          >
            Admin Login
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
