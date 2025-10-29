'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Ship, ArrowLeft, Plus, X, Search, AlertCircle, UserCircle } from 'lucide-react'
import Link from 'next/link'

type Vessel = {
  id: string
  mmsi: string
  name: string
  vesselType: string
  flag: string | null
  active: boolean
}

type FleetVessel = {
  vessel: Vessel
  role: string
  priority: number
}

type Fleet = {
  id: string
  name: string
  description: string | null
  vessels: FleetVessel[]
}

export default function FleetDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [fleet, setFleet] = useState<Fleet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Vessel search
  const [showAddVessel, setShowAddVessel] = useState(false)
  const [vesselSearch, setVesselSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Vessel[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchFleet()
  }, [params.id])

  useEffect(() => {
    if (vesselSearch.length >= 3) {
      searchVessels()
    } else {
      setSearchResults([])
    }
  }, [vesselSearch])

  const fetchFleet = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/fleets/${params.id}`)
      const data = await res.json()

      if (res.ok) {
        setFleet(data)
      } else {
        setError(data.error || 'Failed to load fleet')
      }
    } catch (err) {
      console.error('Error fetching fleet:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const searchVessels = async () => {
    try {
      setSearching(true)
      const res = await fetch(`/api/vessels?search=${encodeURIComponent(vesselSearch)}&limit=10`)
      
      if (res.ok) {
        const data = await res.json()
        // Filter out vessels already in fleet
        const fleetVesselIds = new Set(fleet?.vessels.map(v => v.vessel.id) || [])
        setSearchResults(data.vessels.filter((v: Vessel) => !fleetVesselIds.has(v.id)))
      }
    } catch (err) {
      console.error('Error searching vessels:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleAddVessel = async (vesselId: string) => {
    try {
      const res = await fetch(`/api/fleets/${params.id}/vessels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vesselId })
      })

      if (res.ok) {
        fetchFleet()
        setVesselSearch('')
        setSearchResults([])
        setShowAddVessel(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to add vessel')
      }
    } catch (err) {
      console.error('Error adding vessel:', err)
      alert('Failed to add vessel')
    }
  }

  const handleRemoveVessel = async (vesselId: string) => {
    if (!confirm('Remove this vessel from the fleet?')) {
      return
    }

    try {
      const res = await fetch(`/api/fleets/${params.id}/vessels/${vesselId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchFleet()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to remove vessel')
      }
    } catch (err) {
      console.error('Error removing vessel:', err)
      alert('Failed to remove vessel')
    }
  }

  if (loading) {
    return (
      <AppLayout title="Fleet Details" breadcrumbs={[{ label: 'Fleets', href: '/dashboard/fleets' }, { label: 'Loading...' }]}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Ship className="h-12 w-12 mx-auto mb-4 animate-pulse text-blue-500" />
            <p className="text-gray-600">Loading fleet...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !fleet) {
    return (
      <AppLayout title="Fleet Details" breadcrumbs={[{ label: 'Fleets', href: '/dashboard/fleets' }, { label: 'Error' }]}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error || 'Fleet not found'}</p>
            <Link href="/dashboard/fleets">
              <Button>Back to Fleets</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout 
      title={fleet.name}
      breadcrumbs={[
        { label: 'Fleets', href: '/dashboard/fleets' },
        { label: fleet.name }
      ]}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Link href="/dashboard/fleets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fleets
          </Button>
        </Link>

        {/* Fleet Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{fleet.name}</CardTitle>
                {fleet.description && (
                  <CardDescription className="mt-2 text-base">
                    {fleet.description}
                  </CardDescription>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-blue-600">{fleet.vessels.length}</p>
                <p className="text-sm text-gray-600">vessels</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Vessels Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Fleet Vessels</CardTitle>
                <CardDescription>
                  Manage vessels in this fleet
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddVessel(!showAddVessel)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Vessel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Add Vessel Search */}
            {showAddVessel && (
              <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <Label htmlFor="vessel-search" className="text-sm font-medium mb-2 block">
                  Search for vessels to add
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="vessel-search"
                    placeholder="Search by MMSI, name, or vessel type..."
                    value={vesselSearch}
                    onChange={(e) => setVesselSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {searching && (
                  <p className="text-sm text-gray-600 mt-2">Searching...</p>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((vessel) => (
                      <div
                        key={vessel.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg hover:border-blue-300"
                      >
                        <div>
                          <p className="font-medium">{vessel.name}</p>
                          <p className="text-sm text-gray-600">
                            {vessel.mmsi} • {vessel.vesselType}
                            {vessel.flag && ` • ${vessel.flag}`}
                          </p>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleAddVessel(vessel.id)}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {vesselSearch.length >= 3 && !searching && searchResults.length === 0 && (
                  <p className="text-sm text-gray-600 mt-2">No vessels found</p>
                )}
              </div>
            )}

            {/* Vessels List */}
            {fleet.vessels.length === 0 ? (
              <div className="text-center py-12">
                <Ship className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 mb-4">No vessels in this fleet yet</p>
                <Button onClick={() => setShowAddVessel(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Vessel
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {fleet.vessels.map((fv) => (
                  <div
                    key={fv.vessel.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <Ship className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{fv.vessel.name}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>{fv.vessel.mmsi}</span>
                          <span>•</span>
                          <span>{fv.vessel.vesselType}</span>
                          {fv.vessel.flag && (
                            <>
                              <span>•</span>
                              <span>{fv.vessel.flag}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!fv.vessel.active && (
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                      <Link href={`/dashboard/vessels/${fv.vessel.id}/contacts`}>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Manage Contacts"
                        >
                          <UserCircle className="h-4 w-4 mr-1" />
                          Contacts
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveVessel(fv.vessel.id)}
                        title="Remove from fleet"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
