'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Ship, Plus, Users, AlertCircle, Settings, Trash2 } from 'lucide-react'
import Link from 'next/link'

type Fleet = {
  id: string
  name: string
  description: string | null
  active: boolean
  createdAt: string
  vessels: Array<{
    vessel: {
      id: string
      mmsi: string
      name: string
      vesselType: string
      flag: string | null
    }
  }>
}

export default function FleetsPage() {
  const [fleets, setFleets] = useState<Fleet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFleets()
  }, [])

  const fetchFleets = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/fleets')
      const data = await res.json()

      if (res.ok) {
        setFleets(data)
      } else {
        setError(data.error || 'Failed to load fleets')
      }
    } catch (err) {
      setError('Failed to connect to server')
      console.error('Error fetching fleets:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (fleetId: string) => {
    if (!confirm('Are you sure you want to delete this fleet? This will not delete the vessels.')) {
      return
    }

    try {
      const res = await fetch(`/api/fleets/${fleetId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setFleets(fleets.filter(f => f.id !== fleetId))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete fleet')
      }
    } catch (err) {
      console.error('Error deleting fleet:', err)
      alert('Failed to delete fleet')
    }
  }

  if (loading) {
    return (
      <AppLayout title="Fleet Management" breadcrumbs={[{ label: 'Fleets' }]}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Ship className="h-12 w-12 mx-auto mb-4 animate-pulse text-blue-500" />
            <p className="text-gray-600">Loading fleets...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout title="Fleet Management" breadcrumbs={[{ label: 'Fleets' }]}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchFleets}>Retry</Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Fleet Management" breadcrumbs={[{ label: 'Fleets' }]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fleet Management</h1>
            <p className="text-gray-600 mt-1">
              Group and manage your vessels for targeted monitoring
            </p>
          </div>
          <Link href="/dashboard/fleets/new">
            <Button size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Fleet
            </Button>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Fleets</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fleets.length}</div>
              <p className="text-xs text-muted-foreground">
                {fleets.filter(f => f.active).length} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vessels</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fleets.reduce((sum, f) => sum + f.vessels.length, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                across all fleets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Fleet Size</CardTitle>
              <Ship className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fleets.length > 0
                  ? Math.round(fleets.reduce((sum, f) => sum + f.vessels.length, 0) / fleets.length)
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                vessels per fleet
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Fleets List */}
        {fleets.length === 0 ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <Ship className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No fleets yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first fleet to start organizing vessels for targeted alert monitoring
                </p>
                <Link href="/dashboard/fleets/new">
                  <Button size="lg">
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Fleet
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fleets.map((fleet) => (
              <Card key={fleet.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{fleet.name}</CardTitle>
                      {fleet.description && (
                        <CardDescription className="mt-1">
                          {fleet.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/fleets/${fleet.id}`}>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(fleet.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Vessel Count */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Ship className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          {fleet.vessels.length} Vessels
                        </span>
                      </div>
                      {!fleet.active && (
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Vessel List Preview */}
                    {fleet.vessels.length > 0 ? (
                      <div className="space-y-2">
                        {fleet.vessels.slice(0, 3).map((fv) => (
                          <div
                            key={fv.vessel.id}
                            className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded"
                          >
                            <Ship className="h-4 w-4 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {fv.vessel.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {fv.vessel.mmsi} • {fv.vessel.vesselType}
                              </p>
                            </div>
                          </div>
                        ))}
                        {fleet.vessels.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            +{fleet.vessels.length - 3} more vessels
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No vessels added yet
                      </p>
                    )}

                    {/* Actions */}
                    <Link href={`/dashboard/fleets/${fleet.id}`} className="block">
                      <Button variant="outline" className="w-full">
                        Manage Fleet
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
