'use client'

import { Shield, ArrowRight, Users, Zap } from 'lucide-react'
import Link from 'next/link'

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 overflow-hidden">
      {/* Top Navigation */}
      <nav className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Emergency Alert</h3>
              <p className="text-xs text-slate-300">Command Center</p>
            </div>
          </div>
          
          {/* Login Buttons */}
          <div className="flex items-center space-x-3">
            <Link
              href="/login"
              className="inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
            >
              Employee Login
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            {/* Removed duplicate logo - now in top nav */}

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                Protect Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-500">Workforce</span> with Real-Time Emergency Alerts
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed max-w-2xl">
                Enterprise-grade earthquake and tsunami monitoring with instant multi-channel notifications to keep your employees safe when it matters most.
              </p>
            </div>

            {/* Trust Indicator */}
            <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-sm font-medium">Trusted by 500+ organizations</span>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="#contact"
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                Request Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-200"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-8 shadow-2xl">
              <div className="space-y-6">
                {/* Mock Dashboard Preview */}
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold">System Status</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-300 text-sm">Active</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-white text-sm">Contacts</span>
                    </div>
                    <p className="text-2xl font-bold text-white">1,247</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-white text-sm">Alerts Sent</span>
                    </div>
                    <p className="text-2xl font-bold text-white">99.9%</p>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-sm">Recent Activity</span>
                    <span className="text-green-300 text-xs">2 min ago</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-slate-300 text-sm">System health check completed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-slate-300 text-sm">Monitoring 3 seismic zones</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
