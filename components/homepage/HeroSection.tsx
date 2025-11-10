'use client'

import { Shield, ArrowRight, Play, Star, Users, TrendingUp, Globe, Zap, Bell, Activity, Maximize2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import VideoModal from './VideoModal'

export default function HeroSection() {
  const [isPlaying, setIsPlaying] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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

      {/* Enhanced Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl"></div>
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-6">
            {/* Removed duplicate logo - now in top nav */}

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-500">AI-Powered</span> Emergency Intelligence for Maritime & Enterprise Safety
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed">
                Advanced <span className="text-cyan-300 font-semibold">tsunami simulation</span>, real-time <span className="text-blue-300 font-semibold">vessel tracking</span>, and intelligent alerts powered by <span className="text-purple-300 font-semibold">AI and global seismic networks</span>. Protect your assets and workforce with precision targeting and quick notifications.
              </p>
            </div>

            {/* Enhanced Trust Indicators - Key Features */}
            <div className="flex flex-wrap gap-3">
              <div className="group inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all duration-300">
                <div className="relative">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-blue-300 text-sm font-medium">Multi-Source Intelligence</span>
              </div>
              <div className="group inline-flex items-center space-x-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 hover:bg-purple-500/20 hover:border-purple-500/30 transition-all duration-300">
                <div className="relative">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-purple-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-purple-300 text-sm font-medium">AI Scenario Generation</span>
              </div>
              <div className="group inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2 hover:bg-cyan-500/20 hover:border-cyan-500/30 transition-all duration-300">
                <div className="relative">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-cyan-300 text-sm font-medium">Real-Time Vessel Tracking</span>
              </div>
              <div className="group inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 hover:bg-green-500/20 hover:border-green-500/30 transition-all duration-300">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-green-300 text-sm font-medium">Alert Delivery & Tracking</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/contact"
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

          {/* Right Column - Product Demo Video */}
          <div className="relative lg:pl-8">
            {/* Animated Pulse Rings */}
            <div className="absolute -inset-4 -z-10">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 opacity-20 blur-2xl animate-pulse"></div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-2xl group hover:border-white/30 transition-all duration-300">
              {/* Featured Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full px-4 py-1.5 shadow-lg">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="text-xs font-bold uppercase tracking-wide">Featured Demo</span>
                  <Star className="h-3.5 w-3.5 fill-current" />
                </div>
              </div>

              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-inner group/video">
                {/* Maximize Button */}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-sm rounded-lg p-2.5 text-white hover:bg-slate-800 transition-all opacity-0 group-hover/video:opacity-100 z-20 shadow-lg"
                  title="Open in theater mode"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>

                <video
                  className="w-full h-full object-contain"
                  style={{ imageRendering: 'crisp-edges' }}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  controlsList="nodownload nofullscreen"
                  disablePictureInPicture
                  poster="/video-thumbnail.jpg"
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                >
                  <source src="/earthquake-tsunami-alert-demo.mp4" type="video/mp4" />
                  <div className="absolute inset-0 flex items-center justify-center text-white text-center p-8">
                    <p>Your browser does not support video playback.</p>
                  </div>
                </video>

                {/* Custom Play Button Overlay (when paused) */}
                {!isPlaying && (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 to-blue-900/80 backdrop-blur-sm flex items-center justify-center group/play cursor-pointer">
                    <div className="relative">
                      {/* Animated rings behind play button */}
                      <div className="absolute inset-0 -m-4">
                        <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                      </div>
                      
                      <div className="relative w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover/play:scale-110 group-hover/play:shadow-red-500/50 transition-all duration-300">
                        <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Time Badge - Shows current time / total duration */}
                {duration > 0 && (
                  <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-sm font-medium shadow-lg">
                    <span className="text-red-400">●</span> {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                )}
              </div>
              
              {/* Enhanced Caption with Stats */}
              <div className="mt-5 space-y-3">
                <div className="text-center">
                  <p className="text-white font-semibold mb-1">
                    See Real-Time Alerts in Action
                  </p>
                  <p className="text-slate-300 text-sm">
                    Watch how teams respond in under 30 seconds
                  </p>
                </div>

                {/* Real Strengths - Verifiable Claims */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                      <span className="text-white font-bold text-sm">6</span>
                    </div>
                    <p className="text-slate-400 text-xs">Data Sources</p>
                  </div>
                  <div className="text-center border-x border-white/10">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Users className="h-3.5 w-3.5 text-blue-400" />
                      <span className="text-white font-bold text-sm">4</span>
                    </div>
                    <p className="text-slate-400 text-xs">Alert Channels</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <Star className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-white font-bold text-sm">&lt;30s</span>
                    </div>
                    <p className="text-slate-400 text-xs">Alert Time</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Bar - Strategic Trust Indicators (No Specific Sources) */}
        <div className="mt-16 pt-8 border-t border-white/10">
          <p className="text-center text-slate-400 text-sm mb-6">
            Enterprise-grade reliability trusted by organizations worldwide
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-70">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span className="text-slate-300 text-sm font-medium">Government-Verified Sources</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-blue-400" />
              <span className="text-slate-300 text-sm font-medium">Global Coverage</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <span className="text-slate-300 text-sm font-medium">24/7 Monitoring</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              <span className="text-slate-300 text-sm font-medium">Multi-Source Validation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      <VideoModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videoSrc="/earthquake-tsunami-alert-demo.mp4"
      />
    </section>
  )
}
