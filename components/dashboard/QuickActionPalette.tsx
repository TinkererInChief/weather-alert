'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Command, Zap, Pause, Play, History, Users, Download, Activity, Settings } from 'lucide-react'

type Action = {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  shortcut?: string
  category: 'monitoring' | 'alerts' | 'contacts' | 'system' | 'reports'
  action: () => void
}

type QuickActionPaletteProps = {
  actions?: Action[]
  onActionExecute?: (actionId: string) => void
}

export default function QuickActionPalette({ actions = [], onActionExecute }: QuickActionPaletteProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const defaultActions: Action[] = [
    {
      id: 'send-test-alert',
      label: 'Send Test Alert',
      description: 'Test notification channels',
      icon: Zap,
      shortcut: 'T',
      category: 'alerts',
      action: () => console.log('Send test alert')
    },
    {
      id: 'pause-monitoring',
      label: 'Pause Monitoring',
      description: 'Temporarily stop earthquake monitoring',
      icon: Pause,
      shortcut: 'P',
      category: 'monitoring',
      action: () => console.log('Pause monitoring')
    },
    {
      id: 'resume-monitoring',
      label: 'Resume Monitoring',
      description: 'Restart earthquake monitoring',
      icon: Play,
      category: 'monitoring',
      action: () => console.log('Resume monitoring')
    },
    {
      id: 'view-history',
      label: 'View Earthquake History',
      description: 'See past seismic events',
      icon: History,
      shortcut: 'H',
      category: 'alerts',
      action: () => console.log('View history')
    },
    {
      id: 'manage-contacts',
      label: 'Manage Contacts',
      description: 'Add, edit, or remove contacts',
      icon: Users,
      shortcut: 'C',
      category: 'contacts',
      action: () => router.push('/dashboard/contacts')
    },
    {
      id: 'export-contacts',
      label: 'Export Contact List',
      description: 'Download contacts as CSV',
      icon: Download,
      category: 'reports',
      action: () => console.log('Export contacts')
    },
    {
      id: 'system-status',
      label: 'Check System Status',
      description: 'View health of all services',
      icon: Activity,
      shortcut: 'S',
      category: 'system',
      action: () => console.log('System status')
    },
    {
      id: 'settings',
      label: 'Open Settings',
      description: 'Configure system preferences',
      icon: Settings,
      category: 'system',
      action: () => console.log('Settings')
    }
  ]

  const allActions = [...defaultActions, ...actions]

  const lower = (v?: string | null) => (v ?? '').toLowerCase()

  const filteredActions = search.trim() === ''
    ? allActions
    : allActions.filter(action =>
        lower(action.label).includes(lower(search)) ||
        lower(action.description).includes(lower(search)) ||
        lower(action.category).includes(lower(search))
      )

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Cmd+K or Ctrl+K to open
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setIsOpen(prev => !prev)
      setSearch('')
      setSelectedIndex(0)
    }

    // Escape to close
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
      setSelectedIndex(0)
    }

    // Only handle these if palette is open
    if (!isOpen) return

    // Arrow navigation
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % filteredActions.length)
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length)
    }

    // Enter to execute
    if (e.key === 'Enter' && filteredActions[selectedIndex]) {
      e.preventDefault()
      executeAction(filteredActions[selectedIndex])
    }
  }, [isOpen, selectedIndex, filteredActions])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const executeAction = (action: Action) => {
    action.action()
    onActionExecute?.(action.id)
    setIsOpen(false)
    setSearch('')
    setSelectedIndex(0)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'monitoring': return 'text-blue-600 bg-blue-50'
      case 'alerts': return 'text-red-600 bg-red-50'
      case 'contacts': return 'text-purple-600 bg-purple-50'
      case 'system': return 'text-slate-600 bg-slate-50'
      case 'reports': return 'text-green-600 bg-green-50'
      default: return 'text-slate-600 bg-slate-50'
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
      >
        <Command className="h-4 w-4" />
        <span className="text-sm font-medium">Quick Actions</span>
        <kbd className="px-2 py-0.5 text-xs bg-slate-700 rounded">⌘K</kbd>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9999] backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[10000] w-full max-w-2xl">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Search actions..."
              className="flex-1 text-sm text-slate-900 placeholder-slate-400 outline-none"
              autoFocus
            />
            <kbd className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded">ESC</kbd>
          </div>

          {/* Actions List */}
          <div className="max-h-[400px] overflow-y-auto">
            {filteredActions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-slate-600">No actions found</p>
                <p className="text-xs text-slate-500 mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="py-2">
                {filteredActions.map((action, idx) => {
                  const Icon = action.icon
                  const isSelected = idx === selectedIndex

                  return (
                    <button
                      key={action.id}
                      onClick={() => executeAction(action)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-slate-600'}`} />
                      </div>
                      
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">{action.label}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getCategoryColor(action.category)}`}>
                            {action.category}
                          </span>
                        </div>
                        {action.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
                        )}
                      </div>

                      {action.shortcut && (
                        <kbd className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded">
                          {action.shortcut}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded">↵</kbd>
                Select
              </span>
            </div>
            <span>{filteredActions.length} actions</span>
          </div>
        </div>
      </div>
    </>
  )
}
