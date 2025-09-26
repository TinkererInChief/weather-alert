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
  Loader2
} from 'lucide-react'

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

export default function AppLayout({ 
  children, 
  title, 
  breadcrumbs = [],
  user = { name: 'Emergency Operator', role: 'admin', email: 'operator@emergency.gov' }
}: AppLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session, status } = useSession()

  const sessionUser = session?.user
  const effectiveUser = sessionUser ? {
    name: sessionUser.name ?? 'Emergency Operator',
    role: (sessionUser as any)?.role === 'viewer' ? 'viewer' : 'admin',
    email: sessionUser.email ?? (sessionUser as any)?.phone ?? user.email,
    phone: (sessionUser as any)?.phone ?? null
  } : user

  const isAuthenticated = status === 'authenticated'
  const isLoadingUser = status === 'loading'

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, current: pathname === '/' },
    { name: 'Earthquake Monitoring', href: '/alerts', icon: AlertTriangle, current: pathname === '/alerts' },
    { name: 'Tsunami Monitoring', href: '/tsunami', icon: Waves, current: pathname === '/tsunami' },
    { name: 'Contacts', href: '/contacts', icon: Users, current: pathname === '/contacts' },
    { name: 'System Status', href: '/status', icon: Activity, current: pathname === '/status' },
  ]

  const adminNavigation = effectiveUser.role === 'admin' ? [
    { name: 'Settings', href: '/settings', icon: Settings, current: pathname === '/settings' },
  ] : []

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
      <Link href="/status" className="flex items-center space-x-2 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors">
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
        fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-full flex-col bg-white/90 backdrop-blur-xl border-r border-slate-200/60 shadow-xl">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-200/60">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-red-200 transition-shadow">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Emergency Alert
                </div>
                <div className="text-xs text-slate-500 -mt-1">
                  Command Center
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {[...navigation, ...adminNavigation].map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
                    ${item.current
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-200'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`
                    mr-3 h-5 w-5 transition-transform duration-200 group-hover:scale-110
                    ${item.current ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'}
                  `} />
                  {item.name}
                  
                  {item.current && (
                    <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Profile */}
          <div className="border-t border-slate-200/60 p-4">
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
                    {effectiveUser.role === 'admin' ? 'Administrator' : 'Viewer'} • {effectiveUser.phone || effectiveUser.email}
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
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
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
              <Link href="/" className="text-slate-500 hover:text-slate-700 transition-colors">
                Home
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
