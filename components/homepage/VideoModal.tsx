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
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full h-full max-w-7xl max-h-[90vh] m-8">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 md:top-4 md:right-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 text-white transition-all hover:scale-110 z-50"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-500 via-purple-500 to-cyan-500 opacity-20 blur-2xl animate-pulse"></div>
          
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              className="w-full h-full object-contain"
              autoPlay
              muted
              loop
              playsInline
              controls
              controlsList="nodownload"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>

            {/* Time Badge */}
            <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-sm font-medium shadow-lg">
              <span className="text-red-400">●</span> {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
