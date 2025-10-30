'use client'

import { X, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Feature = {
  id: string
  title: string
  description: string
  icon?: React.ReactNode
  link?: {
    text: string
    href: string
  }
}

type FeatureAnnouncementProps = {
  features: Feature[]
  version?: string
}

/**
 * Feature announcement modal
 * Shows new features to users when they first visit after an update
 */
export default function FeatureAnnouncement({ features, version = '1.0.0' }: FeatureAnnouncementProps) {
  const [isOpen, setIsOpen] = useState(false)
  const storageKey = `feature-announcement-${version}`

  useEffect(() => {
    // Check if user has seen this announcement
    const hasSeenAnnouncement = localStorage.getItem(storageKey)
    if (!hasSeenAnnouncement && features.length > 0) {
      // Delay showing the modal slightly
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [storageKey, features.length])

  const handleClose = () => {
    localStorage.setItem(storageKey, 'true')
    setIsOpen(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white relative">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">What's New</h2>
                    <p className="text-blue-100 text-sm">Version {version}</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4"
                  >
                    {feature.icon && (
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        {feature.icon}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {feature.description}
                      </p>
                      {feature.link && (
                        <a
                          href={feature.link.href}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
                          onClick={handleClose}
                        >
                          {feature.link.text} →
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-4 border-t border-slate-200">
                <button
                  onClick={handleClose}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Got it, thanks!
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
