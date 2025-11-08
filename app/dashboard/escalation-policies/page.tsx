'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Plus, Zap, Clock } from 'lucide-react'
import Link from 'next/link'

type EscalationPolicy = {
  id: string
  name: string
  description: string | null
  eventTypes: string[]
  severityLevels: string[]
  active: boolean
  steps: any[]
  createdAt: string
}

export default function EscalationPoliciesPage() {
  const [policies, setPolicies] = useState<EscalationPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPolicies()
  }, [])

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/escalation-policies')
      
      if (res.ok) {
        const data = await res.json()
        setPolicies(data)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to load policies')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AppLayout title="Escalation Policies" breadcrumbs={[{ label: 'Escalation Policies' }]}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 animate-pulse text-blue-500" />
            <p className="text-gray-600">Loading escalation policies...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Escalation Policies" breadcrumbs={[{ label: 'Escalation Policies' }]}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchPolicies}>Retry</Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Escalation Policies" breadcrumbs={[{ label: 'Escalation Policies' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600">
              Define multi-step alert escalation rules for automated notification routing
            </p>
          </div>
          <Button size="lg" disabled>
            <Plus className="mr-2 h-5 w-5" />
            Create Policy (Coming Soon)
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{policies.length}</div>
              <p className="text-xs text-muted-foreground">
                {policies.filter(p => p.active).length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Event Types</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(policies.flatMap(p => p.eventTypes)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                earthquake, tsunami, etc.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Steps</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {policies.length > 0
                  ? Math.round(policies.reduce((sum, p) => sum + p.steps.length, 0) / policies.length)
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                per policy
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Policies List */}
        {policies.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Zap className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No policies yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Escalation policies automate multi-step alert routing. They'll be available soon.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {policies.map((policy) => (
              <Card key={policy.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{policy.name}</CardTitle>
                        {!policy.active && (
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      {policy.description && (
                        <CardDescription className="mt-1">
                          {policy.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Metadata */}
                    <div className="flex flex-wrap gap-2">
                      {policy.eventTypes.map((type) => (
                        <span
                          key={type}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                        >
                          {type}
                        </span>
                      ))}
                      {policy.severityLevels.map((level) => (
                        <span
                          key={level}
                          className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded"
                        >
                          {level}
                        </span>
                      ))}
                    </div>

                    {/* Steps */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">
                        Escalation Steps ({policy.steps.length})
                      </p>
                      {policy.steps.map((step: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex-shrink-0">
                            {step.stepNumber}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              <strong>Wait {step.waitMinutes} min</strong> → {step.channels.join(', ')}
                            </p>
                            <p className="text-xs text-gray-500">
                              To: {step.contactRoles.join(', ')}
                              {step.timeoutMinutes > 0 && ` • Timeout: ${step.timeoutMinutes}m`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Coming Soon Notice */}
        <Card className="border-dashed border-2 border-gray-300 bg-gray-50">
          <CardContent className="py-8">
            <div className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Full Policy Management Coming Soon
              </h3>
              <p className="text-gray-600 text-sm max-w-2xl mx-auto">
                Day 2-3: Create, edit, test, and assign escalation policies to fleets. 
                For now, you can view the test policies created by the seeder.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
