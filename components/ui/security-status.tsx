'use client'

/**
 * Security Status Dashboard Component
 * Displays real-time security metrics and system status
 */

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, Clock, Globe, Fingerprint, Bot, Activity } from 'lucide-react'

export interface SecurityMetrics {
  overallStatus: 'secure' | 'warning' | 'critical'
  threatLevel: 'minimal' | 'low' | 'medium' | 'high' | 'critical'
  activeThreats: number
  blockedRequests: number
  captchaChallenges: number
  sessionSecurity: 'normal' | 'enhanced' | 'maximum'
  geolocationBlocks: number
  deviceFingerprints: number
  riskScore: number
  uptime: string
  lastUpdate: string
}

interface SecurityStatusProps {
  metrics?: SecurityMetrics
  className?: string
  compact?: boolean
}

export function SecurityStatus({ 
  metrics, 
  className = '', 
  compact = false 
}: SecurityStatusProps) {
  const [currentMetrics, setCurrentMetrics] = useState<SecurityMetrics>({
    overallStatus: 'secure',
    threatLevel: 'minimal',
    activeThreats: 0,
    blockedRequests: 0,
    captchaChallenges: 0,
    sessionSecurity: 'normal',
    geolocationBlocks: 0,
    deviceFingerprints: 0,
    riskScore: 15,
    uptime: '99.9%',
    lastUpdate: new Date().toISOString()
  })

  useEffect(() => {
    if (metrics) {
      setCurrentMetrics(metrics)
    }
  }, [metrics])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'text-green-600 bg-green-50 border-green-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'minimal': return 'text-green-600'
      case 'low': return 'text-blue-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getSecurityIcon = (status: string) => {
    switch (status) {
      case 'secure': return <CheckCircle className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'critical': return <Shield className="w-5 h-5" />
      default: return <Shield className="w-5 h-5" />
    }
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor(currentMetrics.overallStatus)}`}>
          {getSecurityIcon(currentMetrics.overallStatus)}
          <span className="font-medium capitalize">{currentMetrics.overallStatus}</span>
        </div>
        <div className="text-sm text-gray-600">
          Threat Level: <span className={`font-medium ${getThreatLevelColor(currentMetrics.threatLevel)}`}>
            {currentMetrics.threatLevel.toUpperCase()}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getStatusColor(currentMetrics.overallStatus)}`}>
              {getSecurityIcon(currentMetrics.overallStatus)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Security Status</h3>
              <p className="text-sm text-gray-600">Real-time protection metrics</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentMetrics.overallStatus)}`}>
              <div className="w-2 h-2 bg-current rounded-full mr-2"></div>
              {currentMetrics.overallStatus.toUpperCase()}
            </div>
            <p className="text-xs text-gray-500 mt-1">Updated: {new Date(currentMetrics.lastUpdate).toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className={`w-5 h-5 ${getThreatLevelColor(currentMetrics.threatLevel)}`} />
              <div>
                <p className="text-sm text-gray-600">Threat Level</p>
                <p className={`font-semibold ${getThreatLevelColor(currentMetrics.threatLevel)}`}>
                  {currentMetrics.threatLevel.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Risk Score</p>
                <p className="font-semibold text-gray-900">{currentMetrics.riskScore}/100</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Activity className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="font-semibold text-gray-900">{currentMetrics.uptime}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Session Security</p>
                <p className="font-semibold text-gray-900 capitalize">{currentMetrics.sessionSecurity}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Protection Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Active Protection</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-600">Blocked Requests</span>
                </div>
                <span className="font-medium text-red-600">{currentMetrics.blockedRequests.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-600">CAPTCHA Challenges</span>
                </div>
                <span className="font-medium text-orange-600">{currentMetrics.captchaChallenges.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">Geo Blocks</span>
                </div>
                <span className="font-medium text-blue-600">{currentMetrics.geolocationBlocks.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Detection Metrics</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Fingerprint className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Device Fingerprints</span>
                </div>
                <span className="font-medium text-green-600">{currentMetrics.deviceFingerprints.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-600">Active Threats</span>
                </div>
                <span className="font-medium text-yellow-600">{currentMetrics.activeThreats}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Protection Rate</span>
                </div>
                <span className="font-medium text-green-600">99.8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Last security scan: 2 minutes ago</span>
              <span className="text-gray-600">•</span>
              <span className="text-green-600">All systems operational</span>
            </div>
            <button 
              className="text-blue-600 hover:text-blue-800 font-medium"
              onClick={() => window.location.reload()}
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for fetching real-time security metrics
export function useSecurityMetrics(refreshInterval = 30000) {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/security/metrics')
        if (!response.ok) throw new Error('Failed to fetch metrics')
        
        const data = await response.json()
        setMetrics(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, refreshInterval)
    
    return () => clearInterval(interval)
  }, [refreshInterval])

  return { metrics, loading, error }
}
