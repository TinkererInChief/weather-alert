'use client'

import Link from 'next/link'
import { Shield, ArrowRight, CheckCircle } from 'lucide-react'

export default function HeroSection() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="text-center">
          {/* Logo and Brand */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-2xl">
              <Shield className="h-10 w-10" />
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            Protect Your Workforce with
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              Real-Time Emergency Alerts
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-slate-300 mb-8 max-w-4xl mx-auto leading-relaxed">
            Enterprise-grade earthquake and tsunami monitoring with instant multi-channel notifications 
            to keep your employees safe during critical events.
          </p>

          {/* Trust Indicator */}
          <div className="inline-flex items-center space-x-2 bg-white/10 border border-white/20 rounded-full px-6 py-3 mb-10">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-white font-medium">Trusted by 500+ organizations worldwide</span>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/contact" 
              className="inline-flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg shadow-red-500/25 hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300"
            >
              Request Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="#features" 
              className="inline-flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all duration-300"
            >
              Learn More
            </Link>
          </div>

          {/* Secondary Info */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">99.9%</div>
              <div className="text-sm text-slate-400">System Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">&lt;30s</div>
              <div className="text-sm text-slate-400">Alert Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">24/7</div>
              <div className="text-sm text-slate-400">Monitoring Coverage</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
