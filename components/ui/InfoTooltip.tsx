"use client"

import { Info } from 'lucide-react'
import { useState } from 'react'

type InfoTooltipProps = {
  content: string | React.ReactNode
  title?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export default function InfoTooltip({ content, title, side = 'top' }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
        aria-label="More information"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg ${
            side === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' :
            side === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' :
            side === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' :
            'left-full ml-2 top-1/2 -translate-y-1/2'
          }`}
          role="tooltip"
        >
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-slate-900 transform rotate-45 ${
              side === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
              side === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
              side === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
              'left-[-4px] top-1/2 -translate-y-1/2'
            }`}
          />

          <div className="relative space-y-1.5">
            {title && (
              <h4 className="font-semibold text-white">{title}</h4>
            )}
            <div className="text-slate-200 leading-relaxed">
              {content}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
