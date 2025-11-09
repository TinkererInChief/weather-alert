 'use client'

 import { AlertTriangle, X } from 'lucide-react'
 import { useState } from 'react'

export default function WorkInProgressBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              <span className="font-semibold">Work in Progress:</span> This site is currently under active development, content and features are subject to change.
            </p>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white hover:text-amber-100 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
