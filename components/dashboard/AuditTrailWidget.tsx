'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Shield, User, Users, Settings, AlertTriangle, Trash2, Edit, Plus, Eye, FileText } from 'lucide-react'

type AuditEvent = {
  id: string
  action: string
  entityType: string
  entityId?: string
  userId: string
  userName?: string
  userEmail?: string
  details?: string
  metadata?: any
  createdAt: string
}

export default function AuditTrailWidget() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const observerTarget = useRef<HTMLDivElement>(null)

  const fetchEvents = async (pageNum: number, append = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
      const response = await fetch(`/api/audit-logs?limit=20&page=${pageNum}`, { cache: 'no-store' })
      const data = await response.json()

      if (data.success && data.data) {
        const newEvents = data.data.logs || []
        
        if (append) {
          setEvents(prev => [...prev, ...newEvents])
        } else {
          setEvents(newEvents)
        }
        
        // Check if there are more events
        setHasMore(newEvents.length === 20)
      } else {
        setError(data.error || 'Failed to load audit trail')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit trail')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchEvents(1, false)
    // Refresh every 30 seconds
    const interval = setInterval(() => fetchEvents(1, false), 30 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Infinite scroll observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries
    if (target.isIntersecting && hasMore && !loadingMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchEvents(nextPage, true)
    }
  }, [hasMore, loadingMore, loading, page])

  useEffect(() => {
    const element = observerTarget.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '20px',
      threshold: 1.0
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [handleObserver])

  const lower = (v?: string | null) => (v ?? '').toLowerCase()

  const getActionIcon = (action: string) => {
    const actionLower = lower(action)
    if (actionLower.includes('create') || actionLower.includes('add')) return Plus
    if (actionLower.includes('update') || actionLower.includes('edit')) return Edit
    if (actionLower.includes('delete') || actionLower.includes('remove')) return Trash2
    if (actionLower.includes('view') || actionLower.includes('read')) return Eye
    if (actionLower.includes('approve') || actionLower.includes('reject')) return FileText
    return Shield
  }

  const getEntityIcon = (entityType: string) => {
    const typeLower = lower(entityType)
    if (typeLower.includes('user')) return User
    if (typeLower.includes('contact') || typeLower.includes('group')) return Users
    if (typeLower.includes('setting')) return Settings
    if (typeLower.includes('alert')) return AlertTriangle
    return FileText
  }

  const getActionColor = (action: string) => {
    const actionLower = lower(action)
    if (actionLower.includes('create') || actionLower.includes('add')) return 'text-green-600 bg-green-50'
    if (actionLower.includes('update') || actionLower.includes('edit')) return 'text-blue-600 bg-blue-50'
    if (actionLower.includes('delete') || actionLower.includes('remove')) return 'text-red-600 bg-red-50'
    if (actionLower.includes('approve')) return 'text-emerald-600 bg-emerald-50'
    if (actionLower.includes('reject')) return 'text-orange-600 bg-orange-50'
    return 'text-slate-600 bg-slate-50'
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatAction = (event: AuditEvent) => {
    const base = (event.action || '').replace(/_/g, ' ')
    return base ? base.charAt(0).toUpperCase() + base.slice(1).toLowerCase() : ''
  }

  if (loading && events.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-2 text-red-600 mb-2">
          <Shield className="h-5 w-5" />
          <h3 className="font-semibold">Audit Trail</h3>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Audit Trail</h3>
        </div>
        <div className="text-xs text-slate-500">
          Live • Last 100 events
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
        {events.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Shield className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No audit events recorded yet</p>
          </div>
        ) : (
          <>
            {events.map((event) => {
              const ActionIcon = getActionIcon(event.action)
              const EntityIcon = getEntityIcon(event.entityType)
              const colorClass = getActionColor(event.action)

              return (
                <div
                  key={event.id}
                  className="group p-3 hover:bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${colorClass} flex-shrink-0`}>
                      <ActionIcon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-900">
                            {formatAction(event)}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <EntityIcon className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-600">
                              {event.entityType}
                              {event.entityId && ` #${event.entityId.substring(0, 8)}`}
                            </span>
                          </div>
                          {event.details && (
                            <div className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {event.details}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex-shrink-0">
                          {formatTime(event.createdAt)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                        <User className="h-3 w-3" />
                        <span className="truncate">
                          {event.userName || event.userEmail || 'System'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="h-4">
              {loadingMore && (
                <div className="text-center py-2">
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
                  <span className="ml-2 text-xs text-slate-500">Loading more...</span>
                </div>
              )}
            </div>

            {!hasMore && events.length > 0 && (
              <div className="text-center py-3 text-xs text-slate-400">
                • End of audit trail •
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500 text-center">
          Showing {events.length} events • Auto-refreshes every 30s
        </div>
      </div>
    </div>
  )
}
