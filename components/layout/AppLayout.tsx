'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  Home,
  AlertTriangle,
  Users,
  Activity,
  Waves,
  Settings,
  LogOut,
  Menu,
  Bell,
  User,
  Shield,
  X,
  Clock,
  CheckCircle,
  Loader2,
  UserCircle,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Star,
  Search,
  PanelLeftClose,
  PanelLeft,
  Ship,
  Database
} from 'lucide-react'
import { Role, Permission, hasPermission } from '@/lib/rbac/roles'
import { useAlertStats, useVesselAlertsActive, useHealthCheck } from '@/lib/hooks/useAPI'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  user?: {
    name: string
    role: 'admin' | 'viewer'
    email: string
    phone?: string | null
  }
}

type NavItem = {
  name: string
  href: string
  icon: any
  current: boolean
  shortcut?: string
  badge?: {
    count?: number
    icon?: string
    color?: string
    pulse?: boolean
  }
  highlight?: boolean
}

export default function AppLayout({ 
  children, 
  title, 
  breadcrumbs = [],
  user = { name: 'Emergency Operator', role: 'admin', email: 'operator@emergency.gov' }
}: AppLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [showSearchHistory, setShowSearchHistory] = useState(false)
  const [pinnedItems, setPinnedItems] = useState<string[]>(['Dashboard', 'Earthquake'])
  const [recentItems, setRecentItems] = useState<string[]>([])
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
  const { data: session, status } = useSession()
  
  // OPTIMIZED: Use SWR hooks - automatic caching & deduplication!
  const { data: alertStats } = useAlertStats(30, { refreshInterval: 30000 })
  const { data: vesselAlerts } = useVesselAlertsActive(true, { refreshInterval: 30000 })
  const { data: healthData } = useHealthCheck(false, { refreshInterval: 60000 })
  
  // Compute live counts from cached SWR data
  const liveCounts = {
    earthquakeAlerts: alertStats?.data?.activeAlerts || 0,
    tsunamiAlerts: alertStats?.data?.tsunamiAlerts || 0,
    vesselAlerts: (vesselAlerts?.stats?.bySeverity?.critical || 0) + (vesselAlerts?.stats?.bySeverity?.high || 0),
    notifications: 0, // Will be fetched by NotificationCenter component
    systemStatus: (healthData?.status as 'healthy' | 'warning' | 'critical') || 'healthy'
  }

  const sessionUser = session?.user
  const effectiveUser = sessionUser ? {
    name: sessionUser.name ?? 'Emergency Operator',
    role: (sessionUser as any)?.role === 'viewer' ? 'viewer' : 'admin',
    email: sessionUser.email ?? (sessionUser as any)?.phone ?? user.email,
    phone: (sessionUser as any)?.phone ?? null
  } : user

  const isAuthenticated = status === 'authenticated'
  const isLoadingUser = status === 'loading'

  // Track recent items
  useEffect(() => {
    const currentPage = pathname.split('/').pop() || 'dashboard'
    setRecentItems(prev => {
      const filtered = prev.filter(item => item !== currentPage)
      return [currentPage, ...filtered].slice(0, 3)
    })
  }, [pathname])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case '1': e.preventDefault(); window.location.href = '/dashboard'; break
          case '2': e.preventDefault(); window.location.href = '/dashboard/alerts'; break
          case '3': e.preventDefault(); window.location.href = '/dashboard/tsunami'; break
          case '4': e.preventDefault(); window.location.href = '/dashboard/vessels'; break
          case 'k': e.preventDefault(); document.getElementById('sidebar-search')?.focus(); break
          case 'b': e.preventDefault(); setIsCompact(!isCompact); break
        }
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isCompact])

  // Context-aware highlighting
  const isWorkingHours = () => {
    const hour = new Date().getHours()
    return hour >= 8 && hour <= 18
  }

  const shouldHighlight = (itemName: string) => {
    // Highlight active alerts during working hours
    if (isWorkingHours() && (itemName === 'Earthquake' || itemName === 'Tsunami' || itemName === 'Vessels')) {
      return liveCounts.earthquakeAlerts > 0 || liveCounts.tsunamiAlerts > 0 || liveCounts.vesselAlerts > 0
    }
    // Highlight system status when degraded
    if (itemName === 'System Status' && liveCounts.systemStatus !== 'healthy') {
      return true
    }
    return false
  }

  const navigationGroups: Array<{
    title: string
    icon: any
    items: NavItem[]
  }> = [
    {
      title: 'Monitoring',
      icon: Activity,
      items: [
        { 
          name: 'Dashboard', 
          href: '/dashboard', 
          icon: Home, 
          current: pathname === '/dashboard',
          shortcut: '⌘1'
        },
        { 
          name: 'Earthquake', 
          href: '/dashboard/alerts', 
          icon: AlertTriangle, 
          current: pathname === '/dashboard/alerts',
          shortcut: '⌘2',
          badge: liveCounts.earthquakeAlerts > 0 ? { count: liveCounts.earthquakeAlerts, color: 'red', pulse: false } : undefined,
          highlight: shouldHighlight('Earthquake')
        },
        { 
          name: 'Tsunami', 
          href: '/dashboard/tsunami', 
          icon: Waves, 
          current: pathname === '/dashboard/tsunami',
          shortcut: '⌘3',
          badge: liveCounts.tsunamiAlerts > 0 ? { count: liveCounts.tsunamiAlerts, color: 'orange', pulse: false } : undefined,
          highlight: shouldHighlight('Tsunami')
        },
        { 
          name: 'Vessels', 
          href: '/dashboard/vessels', 
          icon: Ship, 
          current: pathname === '/dashboard/vessels',
          shortcut: '⌘4',
          badge: liveCounts.vesselAlerts > 0 ? { count: liveCounts.vesselAlerts, color: 'blue', pulse: false } : undefined,
          highlight: shouldHighlight('Vessels')
        },
        { 
          name: 'Fleets', 
          href: '/dashboard/fleets', 
          icon: Ship, 
          current: pathname?.startsWith('/dashboard/fleets')
        },
      ]
    },
    {
      title: 'Communications',
      icon: Bell,
      items: [
        { 
          name: 'Communications', 
          href: '/dashboard/communications', 
          icon: Bell, 
          current: pathname === '/dashboard/communications',
          badge: liveCounts.vesselAlerts > 0 ? { count: liveCounts.vesselAlerts, color: 'red', pulse: false } : undefined
        },
        { 
          name: 'Contacts', 
          href: '/dashboard/contacts', 
          icon: UserCircle, 
          current: pathname === '/dashboard/contacts'
        },
        { 
          name: 'Groups', 
          href: '/dashboard/groups', 
          icon: Users, 
          current: pathname?.startsWith('/dashboard/groups')
        },
      ]
    },
    {
      title: 'System',
      icon: Shield,
      items: [
        { 
          name: 'Audit Trail', 
          href: '/dashboard/audit', 
          icon: Shield, 
          current: pathname === '/dashboard/audit'
        },
        { 
          name: 'System Status', 
          href: '/dashboard/status', 
          icon: Activity, 
          current: pathname === '/dashboard/status',
          badge: liveCounts.systemStatus !== 'healthy' ? { 
            icon: liveCounts.systemStatus === 'warning' ? '⚠️' : '🔴', 
            color: liveCounts.systemStatus === 'warning' ? 'yellow' : 'red',
            pulse: liveCounts.systemStatus === 'critical'
          } : { icon: '✓', color: 'green', pulse: false },
          highlight: shouldHighlight('System Status')
        },
        { 
          name: 'Database Stats', 
          href: '/dashboard/database', 
          icon: Database, 
          current: pathname === '/dashboard/database'
        },
      ]
    }
  ]

  // Get actual user role from session
  const userRole = (sessionUser as any)?.role as Role | undefined
  const isSuperAdmin = userRole === Role.SUPER_ADMIN
  const isOrgAdmin = userRole === Role.ORG_ADMIN
  const canManageUsers = userRole && hasPermission(userRole, Permission.MANAGE_USERS)
  const canManageSettings = userRole && hasPermission(userRole, Permission.MANAGE_SETTINGS)
  
  const adminNavigation = [
    // Super Admin and Org Admin - Admin Panel (User Management, Contacts, etc.)
    ...(canManageUsers ? [{ 
      name: isSuperAdmin ? 'Admin Panel' : 'Organization Panel', 
      href: '/dashboard/admin', 
      icon: Shield, 
      current: pathname === '/dashboard/admin' 
    }] : []),
    // Admin roles - Settings
    ...(canManageSettings ? [{ name: 'Settings', href: '/dashboard/settings', icon: Settings, current: pathname === '/dashboard/settings' }] : []),
  ]


  // Helper: Toggle section collapse
  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }))
  }

  // Helper: Toggle pin item
  const togglePin = (itemName: string) => {
    setPinnedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    )
  }

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-search-history')
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load search history', e)
      }
    }
  }, [])

  // Save search to history
  const addToSearchHistory = (query: string) => {
    if (!query.trim() || query.length < 2) return
    
    const updated = [query, ...searchHistory.filter(q => q !== query)].slice(0, 5)
    setSearchHistory(updated)
    localStorage.setItem('sidebar-search-history', JSON.stringify(updated))
  }

  // Fuzzy match function - calculates similarity score
  const fuzzyMatch = (text: string, query: string): number => {
    text = text.toLowerCase()
    query = query.toLowerCase()
    
    // Exact match
    if (text.includes(query)) return 100
    
    // Calculate character match score
    let score = 0
    let queryIndex = 0
    
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        score += 10
        queryIndex++
      }
    }
    
    // Check if all query characters were found
    if (queryIndex === query.length) {
      return score
    }
    
    return 0
  }

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)
    
    if (index === -1) return text
    
    return (
      <>
        {text.slice(0, index)}
        <span className="bg-yellow-200 text-slate-900 font-semibold rounded px-0.5">
          {text.slice(index, index + query.length)}
        </span>
        {text.slice(index + query.length)}
      </>
    )
  }

  // Helper: Get all items for search
  const getAllItems = (): NavItem[] => {
    return navigationGroups.flatMap(group => group.items) as NavItem[]
  }

  // Enhanced filter with section name search and fuzzy matching
  const filteredGroups = searchQuery
    ? navigationGroups.map(group => {
        const sectionMatch = fuzzyMatch(group.title, searchQuery) > 0
        
        // If section name matches, include all items from that section
        if (sectionMatch) {
          return {
            ...group,
            matchedBySection: true,
            items: group.items
          }
        }
        
        // Otherwise, filter items by fuzzy matching
        const matchedItems = group.items.filter(item => {
          const score = fuzzyMatch(item.name, searchQuery)
          return score > 0
        })
        
        return {
          ...group,
          matchedBySection: false,
          items: matchedItems
        }
      }).filter(group => group.items.length > 0)
    : navigationGroups

  // Get pinned items data
  const getPinnedItemsData = (): NavItem[] => {
    return getAllItems().filter(item => pinnedItems.includes(item.name))
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  // Notification Center Component
  const NotificationCenter = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    type NotificationItem = {
      id: string | number
      type: 'alert' | 'system' | 'success'
      message: string
      time: string
      unread: boolean
    }
    const [notifications, setNotifications] = useState<NotificationItem[]>([])

    const loadNotifications = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/notifications', { cache: 'no-store' })
        const data = await res.json()
        if (data.success) {
          setNotifications(data.data.notifications)
        } else {
          setError(data.error || 'Failed to load notifications')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }

    const markAllAsRead = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ all: true })
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Failed to mark as read')
        // Optimistically update
        setNotifications((prev) => prev.map(n => ({ ...n, unread: false })))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to mark as read')
      } finally {
        setLoading(false)
      }
    }

    const markOneAsRead = async (id: string | number) => {
      try {
        const strId = String(id)
        if (!strId.startsWith('delivery-')) return
        const res = await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [strId] })
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Failed to mark as read')
        setNotifications((prev) => prev.map(n => n.id === id ? { ...n, unread: false } : n))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to mark as read')
      }
    }

    useEffect(() => {
      loadNotifications()
      const interval = setInterval(loadNotifications, 60000)
      return () => clearInterval(interval)
    }, [])

    // Close on route change to prevent invisible overlay blocking clicks
    useEffect(() => {
      setIsOpen(false)
    }, [pathname])

    const unreadCount = notifications.filter(n => n.unread).length

    return (
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200/60 z-40 animate-scaleIn">
              <div className="p-4 border-b border-slate-200/60 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadNotifications}
                    title="Refresh"
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <Clock className="h-4 w-4" />
                  </button>
                  <button
                    onClick={markAllAsRead}
                    title="Mark all as read"
                    className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 border border-slate-200 rounded"
                  >
                    Mark all
                  </button>
                  <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {loading && (
                  <div className="p-4 text-sm text-slate-500">Loading...</div>
                )}
                {error && (
                  <div className="p-4 text-sm text-red-600">{error}</div>
                )}
                {!loading && !error && notifications.length === 0 && (
                  <div className="p-4 text-sm text-slate-500">No notifications</div>
                )}
                {!loading && !error && notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      notification.unread ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-1 rounded-full ${
                        notification.type === 'alert' ? 'bg-red-500' :
                        notification.type === 'system' ? 'bg-blue-500' : 'bg-green-500'
                      }`}>
                        {notification.type === 'alert' ? <AlertTriangle className="h-3 w-3 text-white" /> :
                         notification.type === 'system' ? <Activity className="h-3 w-3 text-white" /> :
                         <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900">{notification.message}</p>
                        <p className="text-xs text-slate-500 mt-1">{notification.time}</p>
                      </div>
                      {notification.unread && typeof notification.id === 'string' && (notification.id as string).startsWith('delivery-') && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => markOneAsRead(notification.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 px-2 py-0.5 border border-blue-100 rounded"
                            title="Mark as read"
                          >
                            Mark
                          </button>
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-200/60">
                <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View All Notifications
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // System Status Indicator Component
  const SystemStatusIndicator = () => {
    const [status, setStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy')
    
    useEffect(() => {
      const normalize = (s: unknown): 'healthy' | 'warning' | 'critical' => {
        switch (s) {
          case 'healthy':
            return 'healthy'
          case 'degraded':
          case 'warning':
            return 'warning'
          case 'critical':
          case 'error':
          case 'unhealthy':
            return 'critical'
          default:
            return 'warning'
        }
      }

      const checkStatus = async () => {
        try {
          const response = await fetch('/api/health', { cache: 'no-store' })
          const data = await response.json()
          setStatus(normalize((data as any)?.status))
        } catch {
          setStatus('warning')
        }
      }

      checkStatus()
      const interval = setInterval(checkStatus, 60000) // Check every minute
      return () => clearInterval(interval)
    }, [])

    const getStatusColor = () => {
      switch (status) {
        case 'healthy': return 'bg-green-500'
        case 'warning': return 'bg-yellow-500'
        case 'critical': return 'bg-red-500'
        default: return 'bg-gray-500'
      }
    }

    const getStatusText = () => {
      switch (status) {
        case 'healthy': return 'System Active'
        case 'warning': return 'System Warning'
        case 'critical': return 'System Critical'
      }
    }

    return (
      <Link href="/dashboard/status" className="flex items-center space-x-2 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${status === 'healthy' ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-slate-600 font-medium">{getStatusText()}</span>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-[100] transform transition-all duration-300 ease-in-out lg:translate-x-0 pointer-events-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCompact ? 'w-20' : 'w-72'}
      `}>
        <div className="flex h-full flex-col bg-white/90 backdrop-blur-xl border-r border-slate-200/60 shadow-xl">
          {/* Logo */}
          <div className="flex min-h-16 h-16 shrink-0 items-center border-b border-slate-200/60 relative bg-white">
            {!isCompact ? (
              <>
                <Link href="/dashboard" className="flex items-center space-x-3 group px-6 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-red-200 transition-shadow">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent truncate">
                      Emergency Alert
                    </div>
                    <div className="text-xs text-slate-500 -mt-1 truncate">
                      Command Center
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => setIsCompact(true)}
                  className="flex-shrink-0 p-2 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all hover:shadow-sm mr-3"
                  title="Collapse sidebar (⌘B)"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="w-full flex flex-col items-center py-3 gap-3">
                <Link href="/dashboard">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg hover:shadow-red-200 transition-shadow">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </Link>
                <button
                  onClick={() => setIsCompact(false)}
                  className="p-2 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all hover:shadow-sm"
                  title="Expand sidebar (⌘B)"
                >
                  <PanelLeft className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Search Bar */}
          {!isCompact && (
            <div className="px-4 py-3 border-b border-slate-200/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="sidebar-search"
                  type="text"
                  placeholder="Search... (⌘K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchHistory(true)}
                  onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      addToSearchHistory(searchQuery)
                      setShowSearchHistory(false)
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                
                {/* Search History Dropdown */}
                {showSearchHistory && searchHistory.length > 0 && !searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Recent Searches</span>
                      <button
                        onClick={() => {
                          setSearchHistory([])
                          localStorage.removeItem('sidebar-search-history')
                        }}
                        className="text-slate-400 hover:text-red-500 text-xs normal-case"
                      >
                        Clear
                      </button>
                    </div>
                    {searchHistory.map((query, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSearchQuery(query)
                          setShowSearchHistory(false)
                        }}
                        className="w-full px-3 py-2 text-sm text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                      >
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {query}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Search Tips */}
              {searchQuery && (
                <div className="mt-2 text-xs text-slate-500">
                  {filteredGroups.length > 0 ? (
                    <span>✓ Found {filteredGroups.reduce((acc, g) => acc + g.items.length, 0)} result(s)</span>
                  ) : (
                    <span>No results - try different keywords</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {/* Pinned Items */}
            {!isCompact && getPinnedItemsData().length > 0 && (
              <div className="mb-4">
                <div className="px-4 py-3 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2.5 bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200/60 rounded-lg mb-2 shadow-sm">
                  <div className="p-1 bg-white rounded-md shadow-sm">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                  </div>
                  <span className="flex-1">Pinned</span>
                </div>
                <div className="space-y-1">
                  {getPinnedItemsData().map((item: NavItem) => {
                    const Icon = item.icon
                    return (
                      <div key={`pinned-${item.name}`} className="relative group/pinned">
                        <Link
                          href={item.href}
                          className={`
                            group flex items-center ${isCompact ? 'justify-center px-2 py-3' : 'px-3 py-2'} text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02]
                            ${(item as any).current
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                              : 'text-slate-700 hover:bg-slate-100/80'
                            }
                          `}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Icon className={`${isCompact ? 'h-5 w-5' : 'h-4 w-4 mr-3'} transition-transform group-hover:scale-110 ${(item as any).current ? 'text-white' : 'text-slate-500'}`} />
                          <span className="flex-1">{searchQuery ? highlightMatch(item.name, searchQuery) : item.name}</span>
                          {(item as any).badge && (
                            <span className={`
                              px-2 py-0.5 text-xs font-bold rounded-full
                              ${(item as any).badge.color === 'red' ? 'bg-red-500 text-white' :
                                (item as any).badge.color === 'orange' ? 'bg-orange-500 text-white' :
                                (item as any).badge.color === 'blue' ? 'bg-blue-500 text-white' : 'bg-slate-400 text-white'}
                              ${(item as any).badge.pulse ? 'animate-pulse' : ''}
                            `}>
                              {(item as any).badge.count || (item as any).badge.icon}
                            </span>
                          )}
                        </Link>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            togglePin(item.name)
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/pinned:opacity-100 transition-all p-1.5 hover:bg-white rounded-md border border-transparent hover:border-slate-200 hover:shadow-sm z-10"
                          title="Click to unpin"
                        >
                          <X className="h-3 w-3 text-slate-400 hover:text-red-500" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="my-3 border-t border-slate-200/60" />
              </div>
            )}

            {/* Grouped Navigation */}
            {filteredGroups.map((group) => {
              const GroupIcon = group.icon
              const isCollapsed = collapsedSections[group.title]

              return (
                <div key={group.title} className="mb-3">
                  {!isCompact && (
                    <button
                      onClick={() => toggleSection(group.title)}
                      className="w-full px-4 py-3 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2.5 hover:text-slate-900 transition-all bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200/60 rounded-lg mb-2 shadow-sm hover:shadow"
                    >
                      <div className="p-1 bg-white rounded-md shadow-sm">
                        <GroupIcon className="h-3.5 w-3.5 text-slate-600" />
                      </div>
                      <span className="flex-1 text-left">
                        {searchQuery ? highlightMatch(group.title, searchQuery) : group.title}
                        {(group as any).matchedBySection && searchQuery && (
                          <span className="ml-2 text-[10px] font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded normal-case">
                            Section match
                          </span>
                        )}
                      </span>
                      {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 text-slate-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
                    </button>
                  )}
                  {(!isCollapsed || isCompact) && (
                    <div className="space-y-1 mt-1">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        const isPinned = pinnedItems.includes(item.name)

                        return (
                          <div key={item.name} className="relative group/item">
                            <Link
                              href={item.href}
                              className={`
                                group flex items-center ${isCompact ? 'justify-center px-2 py-3' : 'px-3 py-2'} text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02]
                                ${(item as any).current
                                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                                  : 'text-slate-700 hover:bg-slate-100/80'
                                }
                              `}
                              onClick={(e) => {
                                if (!isCompact) {
                                  setSidebarOpen(false)
                                }
                              }}
                              title={isCompact ? item.name : undefined}
                            >
                              <Icon className={`
                                ${isCompact ? 'h-5 w-5' : 'h-4 w-4 mr-3'} 
                                transition-transform group-hover:scale-110
                                ${(item as any).current ? 'text-white' : 'text-slate-500'}
                              `} />
                              {!isCompact && (
                                <>
                                  <span className="flex-1">{searchQuery ? highlightMatch(item.name, searchQuery) : item.name}</span>
                                  {(item as any).shortcut && (
                                    <span className="text-xs text-slate-400 font-mono ml-2">
                                      {(item as any).shortcut}
                                    </span>
                                  )}
                                  {(item as any).badge && (
                                    <span className={`
                                      px-2 py-0.5 text-xs font-bold rounded-full ml-2
                                      ${(item as any).badge.color === 'red' ? 'bg-red-500 text-white' :
                                        (item as any).badge.color === 'orange' ? 'bg-orange-500 text-white' :
                                        (item as any).badge.color === 'yellow' ? 'bg-yellow-500 text-white' :
                                        (item as any).badge.color === 'blue' ? 'bg-blue-500 text-white' :
                                        (item as any).badge.color === 'green' ? 'bg-green-500 text-white' : 'bg-slate-400 text-white'}
                                      ${(item as any).badge.pulse ? 'animate-pulse' : ''}
                                    `}>
                                      {(item as any).badge.count || (item as any).badge.icon}
                                    </span>
                                  )}
                                </>
                              )}
                            </Link>
                            {!isCompact && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  togglePin(item.name)
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-all p-1.5 hover:bg-white rounded-md border border-transparent hover:border-slate-200 hover:shadow-sm"
                                title={isPinned ? 'Click to unpin' : 'Click to pin'}
                              >
                                <Star className={`h-3.5 w-3.5 transition-all ${isPinned ? 'fill-yellow-500 text-yellow-500' : 'text-slate-400 hover:text-yellow-500'}`} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Admin Navigation */}
            {adminNavigation.length > 0 && (
              <>
                {!isCompact && <div className="my-3 border-t border-slate-200/60" />}
                {!isCompact && (
                  <div className="px-4 py-3 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2.5 bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200/60 rounded-lg mb-2 shadow-sm">
                    <div className="p-1 bg-white rounded-md shadow-sm">
                      <ShieldCheck className="h-3.5 w-3.5 text-slate-600" />
                    </div>
                    <span className="flex-1">Admin</span>
                  </div>
                )}
                <div className="space-y-1">
                  {adminNavigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`
                          group flex items-center ${isCompact ? 'justify-center px-2 py-3' : 'px-3 py-2'} text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02]
                          ${(item as any).current
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                            : 'text-slate-700 hover:bg-slate-100/80'
                          }
                        `}
                        onClick={() => setSidebarOpen(false)}
                        title={isCompact ? item.name : undefined}
                      >
                        <Icon className={`
                          ${isCompact ? 'h-5 w-5' : 'h-4 w-4 mr-3'}
                          transition-transform group-hover:scale-110
                          ${(item as any).current ? 'text-white' : 'text-slate-500'}
                        `} />
                        {!isCompact && item.name}
                      </Link>
                    )
                  })}
                </div>
              </>
            )}

          </nav>

          {/* User Profile */}
          <div className="border-t border-slate-200/60 p-4">
            {!isCompact ? (
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                {isLoadingUser ? (
                  <div className="flex-1 min-w-0">
                    <div className="h-4 w-32 rounded-full bg-slate-200 animate-pulse mb-2" />
                    <div className="h-3 w-40 rounded-full bg-slate-100 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {effectiveUser.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {effectiveUser.role === 'admin' ? 'Administrator' : 'Viewer'}
                    </p>
                  </div>
                )}
                {isAuthenticated ? (
                  <button
                    onClick={handleSignOut}
                    className="flex-shrink-0 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                ) : status === 'loading' ? (
                  <div className="flex-shrink-0 p-1.5 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-100 rounded-lg bg-blue-50/60 hover:bg-blue-100 transition-colors"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                {isAuthenticated && (
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${isCompact ? 'lg:pl-20' : 'lg:pl-72'}`}>
        {/* Top header */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              type="button"
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2 text-sm">
              <Link href="/dashboard" className="text-slate-500 hover:text-slate-700 transition-colors">
                Dashboard
              </Link>
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-slate-300">/</span>
                  {crumb.href ? (
                    <Link href={crumb.href} className="text-slate-500 hover:text-slate-700 transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-slate-900 font-medium">{crumb.label}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-3">
              <NotificationCenter />
              
              <div className="h-6 w-px bg-slate-200" />
              
              {/* System status indicator */}
              <SystemStatusIndicator />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {title && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                {title}
              </h1>
            </div>
          )}
          
          <div className="animate-fadeIn">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
