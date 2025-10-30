'use client'

import { HelpCircle, BookOpen, Play, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { TourId, resetAllTours } from '@/lib/guidance/tours'

type HelpButtonProps = {
  tours?: {
    id: TourId
    label: string
    onStart: () => void
  }[]
  showResetAll?: boolean
}

/**
 * Help button with dropdown menu
 * Provides access to tours, documentation, and help resources
 */
export default function HelpButton({ tours = [], showResetAll = true }: HelpButtonProps) {
  const [open, setOpen] = useState(false)

  const handleResetAll = () => {
    if (confirm('This will reset all tours and show them again. Continue?')) {
      resetAllTours()
      setOpen(false)
      window.location.reload()
    }
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
          title="Help & Tutorials"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-50 min-w-[220px] bg-white rounded-lg shadow-lg border border-slate-200 p-1"
          sideOffset={5}
          align="end"
        >
          {tours.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Interactive Tours
              </div>
              {tours.map((tour) => (
                <DropdownMenu.Item
                  key={tour.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded cursor-pointer outline-none"
                  onClick={() => {
                    tour.onStart()
                    setOpen(false)
                  }}
                >
                  <Play className="h-4 w-4" />
                  <span>{tour.label}</span>
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Separator className="h-px bg-slate-200 my-1" />
            </>
          )}

          <DropdownMenu.Item
            className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded cursor-pointer outline-none"
            onClick={() => {
              window.open('/docs', '_blank')
              setOpen(false)
            }}
          >
            <BookOpen className="h-4 w-4" />
            <span>Documentation</span>
          </DropdownMenu.Item>

          {showResetAll && (
            <>
              <DropdownMenu.Separator className="h-px bg-slate-200 my-1" />
              <DropdownMenu.Item
                className="flex items-center gap-3 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded cursor-pointer outline-none"
                onClick={handleResetAll}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset All Tours</span>
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
