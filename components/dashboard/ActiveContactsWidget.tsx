'use client'

import { useEffect, useState } from 'react'
import { Users, Phone, Mail, MessageCircle, PhoneCall, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import WidgetCard from './WidgetCard'
import HelpTooltip from '../guidance/HelpTooltip'

type ContactStats = {
  total: number
  active: number
  withPhone: number
  withEmail: number
  withWhatsApp: number
  trend: 'up' | 'down' | 'stable'
  trendValue: number
}

export default function ActiveContactsWidget() {
  const [stats, setStats] = useState<ContactStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/contacts', { cache: 'no-store' })
        const data = await response.json()
        
        if (data.success && data.data) {
          const contacts = data.data
          const activeContacts = contacts.filter((c: any) => c.active)
          
          setStats({
            total: contacts.length,
            active: activeContacts.length,
            withPhone: activeContacts.filter((c: any) => c.phone).length,
            withEmail: activeContacts.filter((c: any) => c.email).length,
            withWhatsApp: activeContacts.filter((c: any) => c.whatsapp).length,
            trend: 'stable', // TODO: Calculate from historical data
            trendValue: 0
          })
        } else {
          setError(data.error || 'Failed to load contact stats')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load contact stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const TrendIcon = stats?.trend === 'up' ? TrendingUp : stats?.trend === 'down' ? TrendingDown : Minus

  if (loading) {
    return (
      <WidgetCard title="Active Contacts" icon={Users} iconColor="purple">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-20 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded"></div>
            <div className="h-4 bg-slate-200 rounded"></div>
          </div>
        </div>
      </WidgetCard>
    )
  }

  if (error) {
    return (
      <WidgetCard title="Active Contacts" icon={Users} iconColor="purple">
        <p className="text-sm text-red-600">{error}</p>
      </WidgetCard>
    )
  }

  if (!stats) return null

  const pct = (num: number, den: number) => {
    if (!den || !Number.isFinite(den)) return '0'
    const val = Math.round((num / den) * 100)
    return Number.isFinite(val) && val >= 0 ? String(val) : '0'
  }

  const channelCoverage = [
    { 
      icon: MessageCircle, 
      label: 'SMS', 
      count: stats.withPhone, 
      percentage: pct(stats.withPhone, stats.active),
      color: 'text-blue-600 bg-blue-50'
    },
    { 
      icon: Mail, 
      label: 'Email', 
      count: stats.withEmail, 
      percentage: pct(stats.withEmail, stats.active),
      color: 'text-green-600 bg-green-50'
    },
    { 
      icon: PhoneCall, 
      label: 'Voice', 
      count: stats.withPhone, 
      percentage: pct(stats.withPhone, stats.active),
      color: 'text-orange-600 bg-orange-50'
    },
    { 
      icon: Phone, 
      label: 'WhatsApp', 
      count: stats.withWhatsApp, 
      percentage: pct(stats.withWhatsApp, stats.active),
      color: 'text-emerald-600 bg-emerald-50'
    },
  ]

  return (
    <WidgetCard
      title="Active Contacts"
      icon={Users}
      iconColor="purple"
      subtitle={`${stats.active} / ${stats.total} total`}
      headerAction={
        stats.trendValue !== 0 ? (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            stats.trend === 'up' ? 'text-green-600' : stats.trend === 'down' ? 'text-red-600' : 'text-slate-600'
          }`}>
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(stats.trendValue)}%</span>
          </div>
        ) : undefined
      }
    >

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-slate-900">{stats.active}</span>
          <span className="text-sm text-slate-500">/ {stats.total} total</span>
          <HelpTooltip 
            title="Contacts Notified"
            content="Total number of unique contacts notified across all alerts in selected time period."
            side="right"
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">Ready to receive alerts</p>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-medium text-slate-600 mb-2">Channel Availability</div>
        {channelCoverage.map((channel) => {
          const Icon = channel.icon
          return (
            <div key={channel.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${channel.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm text-slate-700">{channel.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-slate-100 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${channel.color.replace('bg-', 'bg-').replace('-50', '-500')}`}
                    style={{ width: `${channel.percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-slate-900 w-12 text-right">
                  {channel.count}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          <span className="font-medium">{stats.active}</span> contacts can receive emergency notifications
        </div>
      </div>
    </WidgetCard>
  )
}
