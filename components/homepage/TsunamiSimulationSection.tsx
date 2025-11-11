'use client'

import { Play, Maximize2, Waves, Zap, Globe, Activity, Shield, Bell } from 'lucide-react'
import { useState } from 'react'

export default function TsunamiSimulationSection() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <section id="tsunami-simulation" className="relative bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 py-24 lg:py-32 overflow-hidden scroll-mt-0">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-3xl"></div>
        
        {/* Wave Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-6 py-2 mb-6">
            <Waves className="h-4 w-4 text-blue-400" />
            <span className="text-blue-300 text-sm font-semibold uppercase tracking-wide">Tsunami Simulation Engine</span>
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            See Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400">AI-Powered</span> Tsunami Simulation in Action
          </h2>
          
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Experience realistic tsunami wave propagation, vessel tracking, and emergency response coordination powered by advanced physics modeling and artificial intelligence.
          </p>
        </div>

        {/* Main Video Container */}
        <div className="relative max-w-6xl mx-auto">
          {/* Glow Effects */}
          <div className="absolute -inset-6 bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500 rounded-3xl opacity-20 blur-3xl"></div>
          <div className="absolute -inset-4 bg-gradient-to-br from-blue-400/30 via-cyan-400/30 to-purple-400/30 rounded-3xl opacity-30 blur-2xl animate-pulse"></div>

          {/* Video Card */}
          <div className="relative bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/10 p-4 sm:p-6 lg:p-8 shadow-2xl">
            {/* Video Player */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl group/video">
              {/* Maximize Button */}
              <button
                onClick={() => {
                  const video = document.getElementById('tsunami-sim-video') as HTMLVideoElement
                  if (video) video.requestFullscreen()
                }}
                className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 text-white hover:bg-slate-800 transition-all opacity-0 group-hover/video:opacity-100 z-20 shadow-lg"
                title="Enter fullscreen"
              >
                <Maximize2 className="h-5 w-5" />
              </button>

              <video
                id="tsunami-sim-video"
                className="w-full h-full object-contain"
                controls
                controlsList="nodownload"
                playsInline
                poster="/video-thumbnail.jpg"
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              >
                <source src="/TsunamiSimulation.mp4" type="video/mp4" />
                <div className="absolute inset-0 flex items-center justify-center text-white text-center p-8">
                  <p>Your browser does not support video playback.</p>
                </div>
              </video>

              {/* Custom Play Button Overlay */}
              {!isPlaying && (
                <div 
                  className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-blue-900/80 to-purple-900/90 backdrop-blur-sm flex items-center justify-center cursor-pointer group/play"
                  onClick={() => {
                    const video = document.getElementById('tsunami-sim-video') as HTMLVideoElement
                    if (video) video.play()
                  }}
                >
                  <div className="relative">
                    {/* Animated rings */}
                    <div className="absolute inset-0 -m-6">
                      <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping"></div>
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                    </div>
                    
                    <div className="relative w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-2xl group-hover/play:scale-110 group-hover/play:shadow-blue-500/50 transition-all duration-300">
                      <Play className="h-10 w-10 text-white ml-1" fill="currentColor" />
                    </div>
                  </div>
                </div>
              )}

              {/* Duration Badge */}
              {duration > 0 && (
                <div className="absolute top-4 left-4 z-20">
                  <div className="bg-slate-900/95 backdrop-blur-xl rounded-lg px-4 py-2 border border-white/10 shadow-xl">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                      </span>
                      <span className="text-white">{formatTime(currentTime)}</span>
                      <span className="text-white/40">/</span>
                      <span className="text-white/70">{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Feature Highlights Below Video */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 hover:bg-blue-500/15 transition-all">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Waves className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="text-white font-semibold">Wave Physics</h3>
                </div>
                <p className="text-slate-400 text-sm">Realistic propagation modeling with accurate depth and velocity calculations</p>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 hover:bg-cyan-500/15 transition-all">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <Globe className="h-5 w-5 text-cyan-400" />
                  </div>
                  <h3 className="text-white font-semibold">Vessel Tracking</h3>
                </div>
                <p className="text-slate-400 text-sm">Monitor fleet positions and predict impact times for each asset</p>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 hover:bg-purple-500/15 transition-all">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-purple-400" />
                  </div>
                  <h3 className="text-white font-semibold">AI Scenarios</h3>
                </div>
                <p className="text-slate-400 text-sm">Generate custom simulation scenarios based on historical data</p>
              </div>

              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 hover:bg-green-500/15 transition-all">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Bell className="h-5 w-5 text-green-400" />
                  </div>
                  <h3 className="text-white font-semibold">Smart Alerts</h3>
                </div>
                <p className="text-slate-400 text-sm">Automated notifications to at-risk vessels with evacuation routes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">
              &lt;2min
            </div>
            <p className="text-slate-400 text-sm">Simulation Setup</p>
          </div>
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
              Realistic
            </div>
            <p className="text-slate-400 text-sm">Wave Propagation</p>
          </div>
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
              100%
            </div>
            <p className="text-slate-400 text-sm">Physics Accurate</p>
          </div>
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-2">
              Unlimited
            </div>
            <p className="text-slate-400 text-sm">Vessel Tracking</p>
          </div>
        </div>
      </div>
    </section>
  )
}
