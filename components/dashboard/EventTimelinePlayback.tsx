'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Activity, CheckCircle2, AlertTriangle, Zap } from 'lucide-react'

type TimelineEvent = {
  id: string
  timestamp: Date
  type: 'detection' | 'analysis' | 'notification' | 'delivery' | 'confirmation'
  title: string
  description?: string
  severity: 'info' | 'warning' | 'success' | 'error'
  metadata?: Record<string, any>
}

type EventTimelinePlaybackProps = {
  events: TimelineEvent[]
  autoPlay?: boolean
}

export default function EventTimelinePlayback({ events, autoPlay = false }: EventTimelinePlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [speed, setSpeed] = useState(1) // 1x, 2x, 4x
  const [progress, setProgress] = useState(0)

  const speeds = [0.5, 1, 2, 4]

  useEffect(() => {
    if (!isPlaying || events.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= events.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 2000 / speed)

    return () => clearInterval(interval)
  }, [isPlaying, speed, events.length])

  useEffect(() => {
    if (events.length > 0) {
      setProgress((currentIndex / (events.length - 1)) * 100)
    }
  }, [currentIndex, events.length])

  const handlePlayPause = () => {
    if (currentIndex >= events.length - 1) {
      setCurrentIndex(0)
    }
    setIsPlaying(!isPlaying)
  }

  const handleSpeedChange = () => {
    const currentSpeedIndex = speeds.indexOf(speed)
    const nextSpeedIndex = (currentSpeedIndex + 1) % speeds.length
    setSpeed(speeds[nextSpeedIndex])
  }

  const handleSkipBack = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }

  const handleSkipForward = () => {
    setCurrentIndex(prev => Math.min(events.length - 1, prev + 1))
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = (x / rect.width) * 100
    const newIndex = Math.floor((percentage / 100) * (events.length - 1))
    setCurrentIndex(newIndex)
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'detection':
        return Activity
      case 'analysis':
        return AlertTriangle
      case 'notification':
        return Zap
      case 'delivery':
      case 'confirmation':
        return CheckCircle2
      default:
        return Activity
    }
  }

  const getEventColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Activity className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-600 font-medium">No timeline data</p>
        <p className="text-xs text-slate-500 mt-1">Event timeline will appear here</p>
      </div>
    )
  }

  const visibleEvents = events.slice(0, currentIndex + 1)

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Event Timeline Playback</h3>
        <p className="text-xs text-slate-500 mt-1">Review event progression step by step</p>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={handleSkipBack}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SkipBack className="h-4 w-4 text-slate-700" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={handleSkipForward}
            disabled={currentIndex >= events.length - 1}
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SkipForward className="h-4 w-4 text-slate-700" />
          </button>

          <button
            onClick={handleSpeedChange}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
          >
            {speed}x
          </button>

          <div className="flex-1" />

          <div className="text-xs text-slate-600">
            Step {currentIndex + 1} of {events.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div
          onClick={handleProgressClick}
          className="relative h-2 bg-slate-200 rounded-full cursor-pointer overflow-hidden"
        >
          <div
            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{new Date(events[0].timestamp).toLocaleTimeString()}</span>
          <span>{new Date(events[events.length - 1].timestamp).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-5 max-h-[400px] overflow-y-auto">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[17px] top-8 bottom-0 w-0.5 bg-slate-200" />

          <div className="space-y-6">
            {visibleEvents.map((event, idx) => {
              const Icon = getEventIcon(event.type)
              const colorClass = getEventColor(event.severity)
              const isLast = idx === visibleEvents.length - 1

              return (
                <div
                  key={event.id}
                  className={`relative pl-12 ${isLast && isPlaying ? 'animate-pulse' : ''}`}
                >
                  {/* Icon */}
                  <div className={`absolute left-0 p-2 rounded-lg border-2 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className={`border-2 rounded-lg p-3 ${isLast ? colorClass : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="text-sm font-semibold text-slate-900">{event.title}</h4>
                      <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs text-slate-600 mb-2">{event.description}</p>
                    )}
                    {event.metadata && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(event.metadata).map(([key, value]) => (
                          <span
                            key={key}
                            className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-700"
                          >
                            <span className="font-medium">{key}:</span> {String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <button className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center">
          Export Timeline Report →
        </button>
      </div>
    </div>
  )
}
