'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

type VideoModalProps = {
  isOpen: boolean
  onClose: () => void
  videoSrc: string
}

export default function VideoModal({ isOpen, onClose, videoSrc }: VideoModalProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
      setTimeout(() => setIsAnimating(true), 10)
    } else {
      setIsAnimating(false)
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ${
        isAnimating ? 'bg-black/97' : 'bg-black/0'
      }`}
      style={{
        backdropFilter: isAnimating ? 'blur(20px)' : 'blur(0px)',
      }}
    >
      {/* Animated gradient orbs in background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-red-500/30 to-purple-500/30 rounded-full blur-3xl transition-all duration-1000 ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-full blur-3xl transition-all duration-1000 delay-100 ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl transition-all duration-1000 delay-200 ${isAnimating ? 'opacity-100 scale-100 rotate-45' : 'opacity-0 scale-50 rotate-0'}`}></div>
      </div>

      {/* Main content container with cinematic entrance */}
      <div className={`relative w-full h-full max-w-7xl max-h-[92vh] mx-4 md:mx-8 transition-all duration-700 ease-out ${
        isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'
      }`}>
        
        {/* Close button with hover effects */}
        <button
          onClick={onClose}
          className="absolute -top-14 right-0 md:-top-16 md:right-0 group z-50"
          aria-label="Close video"
        >
          <div className="relative">
            {/* Animated ring on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/30 to-purple-500/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-110"></div>
            
            <div className="relative bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-3.5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-90 border border-white/20 shadow-2xl">
              <X className="h-6 w-6 text-white" />
            </div>
          </div>
          <span className="absolute -bottom-8 right-0 text-white/60 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">ESC</span>
        </button>

        {/* Video container with cinematic frame */}
        <div className="relative w-full h-full group/video">
          {/* Multi-layer glow effect */}
          <div className="absolute -inset-2 bg-gradient-to-r from-red-500 via-purple-500 to-cyan-500 rounded-3xl opacity-30 blur-2xl group-hover/video:opacity-50 transition-all duration-700 animate-pulse"></div>
          <div className="absolute -inset-1 bg-gradient-to-br from-red-400/40 via-purple-400/40 to-cyan-400/40 rounded-3xl opacity-20 blur-xl"></div>
          
          {/* Main video frame */}
          <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            
            {/* Top gradient overlay for depth */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/40 via-black/20 to-transparent pointer-events-none z-10"></div>
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/40 via-black/20 to-transparent pointer-events-none z-10"></div>
            
            {/* Video player */}
            <div className="relative w-full h-full flex items-center justify-center bg-black/30">
              <video
                className="w-full h-full object-contain"
                autoPlay
                muted
                loop
                playsInline
                controls
                controlsList="nodownload nofullscreen"
                disablePictureInPicture
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              >
                <source src={videoSrc} type="video/mp4" />
              </video>

              {/* Enhanced Time Badge with glow */}
              {duration > 0 && (
                <div className="absolute top-5 right-5 z-20">
                  <div className="relative group/badge">
                    {/* Glow effect behind badge */}
                    <div className="absolute inset-0 bg-red-500/30 rounded-xl blur-lg group-hover/badge:bg-red-500/50 transition-all"></div>
                    
                    <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-xl px-4 py-2 border border-white/10 shadow-2xl">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                        <span className="text-white/90">{formatTime(currentTime)}</span>
                        <span className="text-white/40">/</span>
                        <span className="text-white/70">{formatTime(duration)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close */}
      <div 
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  )
}
