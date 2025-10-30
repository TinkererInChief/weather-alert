'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { Bell, AlertTriangle, BarChart3 } from 'lucide-react'
import VesselAlertsTab from './tabs/VesselAlertsTab'
import DeliveryLogsTab from './tabs/DeliveryLogsTab'
import AnalyticsTab from './tabs/AnalyticsTab'
import { useCommunicationsTour } from '@/hooks/useTour'
import { TourId } from '@/lib/guidance/tours'
import HelpButton from '@/components/guidance/HelpButton'

type TabKey = 'vessel-alerts' | 'delivery-logs' | 'analytics'

export default function CommunicationsClient() {
  const [activeTab, setActiveTab] = useState<TabKey>('vessel-alerts')
  
  // Tour integration
  const communicationsTour = useCommunicationsTour(true)

  // URL hash navigation
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as TabKey
    if (hash && ['vessel-alerts', 'delivery-logs', 'analytics'].includes(hash)) {
      setActiveTab(hash)
    }
  }, [])

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    window.location.hash = tab
  }

  const tabs = [
    {
      key: 'vessel-alerts' as TabKey,
      label: 'Vessel Alerts',
      icon: AlertTriangle,
      description: 'Manage vessel proximity alerts'
    },
    {
      key: 'delivery-logs' as TabKey,
      label: 'Delivery Logs',
      icon: Bell,
      description: 'Track notification delivery'
    },
    {
      key: 'analytics' as TabKey,
      label: 'Analytics',
      icon: BarChart3,
      description: 'Channel performance metrics'
    }
  ]

  return (
    <AuthGuard>
      <AppLayout
        title="Communications"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Communications' }
        ]}
      >
        <div className="space-y-6">
          {/* Tab Navigation with Help Button */}
          <div id="communications-header" className="flex items-center justify-between border-b border-gray-200 bg-white rounded-t-xl">
            <nav id="communications-tabs" className="flex gap-8 px-6" role="tablist">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={`pb-4 pt-6 px-1 font-medium text-sm transition-colors relative group ${
                      activeTab === tab.key
                        ? 'text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    role="tab"
                    aria-selected={activeTab === tab.key}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${activeTab === tab.key ? 'text-blue-600' : 'text-gray-500'}`} />
                      <span>{tab.label}</span>
                    </div>
                    {activeTab === tab.key && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                    )}
                  </button>
                )
              })}
            </nav>
            <div className="px-6 flex items-center">
              <HelpButton 
                tours={[
                  {
                    id: TourId.COMMUNICATIONS,
                    label: 'Communications Tour',
                    onStart: () => communicationsTour.restartTour()
                  }
                ]}
              />
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {activeTab === 'vessel-alerts' && (
              <div id="vessel-alerts-section">
                <VesselAlertsTab />
              </div>
            )}
            {activeTab === 'delivery-logs' && (
              <div id="delivery-logs-section">
                <DeliveryLogsTab />
              </div>
            )}
            {activeTab === 'analytics' && (
              <div id="channel-stats">
                <AnalyticsTab />
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  )
}
