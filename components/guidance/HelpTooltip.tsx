'use client'

import { HelpCircle } from 'lucide-react'
import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'

type HelpTooltipProps = {
  content: string
  title?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

/**
 * Contextual help tooltip
 * Shows helpful information when hovering over the help icon
 */
export default function HelpTooltip({ 
  content, 
  title, 
  side = 'top',
  className = '' 
}: HelpTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={`inline-flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors ${className}`}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          type="button"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Help</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side={side}
          sideOffset={5}
          className="z-50 w-72 rounded-lg bg-slate-900 p-4 text-sm text-white shadow-xl border border-slate-700"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          {title && (
            <div className="font-semibold mb-2 text-white">{title}</div>
          )}
          <div className="text-slate-200 leading-relaxed">{content}</div>
          <Popover.Arrow className="fill-slate-900" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
