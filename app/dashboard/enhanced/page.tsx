'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { 
  Activity, 
  TrendingUp, 
  Users, 
  Clock,
  Zap,
  AlertTriangle 
} from 'lucide-react'

// Import new dashboard components
import GlobalEventMap from '@/components/dashboard/GlobalEventMap'
import RealTimeActivityFeed from '@/components/dashboard/RealTimeActivityFeed'
import KeyMetricsWidget from '@/components/dashboard/KeyMetricsWidget'
import ContactEngagementAnalytics from '@/components/dashboard/ContactEngagementAnalytics'
import SmartAlertPrioritization from '@/components/dashboard/SmartAlertPrioritization'
import QuickActionPalette from '@/components/dashboard/QuickActionPalette'
import EventTimelinePlayback from '@/components/dashboard/EventTimelinePlayback'
import AuditTrailLogger from '@/components/dashboard/AuditTrailLogger'

export const dynamic = 'force-dynamic'

export default function EnhancedDashboard() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'compliance'>('overview')

  // Fetch data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch all dashboard data
        setLoading(false)
      } catch (error) {
        console.error('Dashboard data fetch error:', error)
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Sample data for demonstration
  const sampleMapEvents = [
    {
      id: '1',
      lat: 35.6762,
      lng: 139.6503,
      type: 'earthquake' as const,
      magnitude: 6.2,
      title: 'M6.2 Tokyo Region',
      timestamp: new Date().toISOString(),
      contactsAffected: 47
    },
    {
      id: '2',
      lat: -18.2871,
      lng: -70.3333,
      type: 'earthquake' as const,
      magnitude:
