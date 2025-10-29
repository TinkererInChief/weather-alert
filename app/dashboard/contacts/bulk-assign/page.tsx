'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  UserCircle, 
  ArrowLeft, 
  Search, 
  Ship,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
}

type Vessel = {
  id: string
  mmsi: string
  name: string
  vesselType: string
}

export default function BulkAssignContactsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contactIds = searchParams.get('contacts')?.split(',') || []
  
  const [contacts, setContacts] = useState<Contact[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [selectedVessels, setSelectedVessels] = useState<Set<string>>(new Set())
  const [vesselSearch, setVesselSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  
  // Assignment settings
  const [role, setRole] = useState('crew')
  const [priority, setPriority] = useState(1)
  const [notifyOn, setNotifyOn] = useState<string[]>(['critical', 'high'])

  useEffect(() => {
    fetchContacts()
    fetchVessels()
  }, [])

  const fetchContacts = async () => {
    if (contactIds.length === 0) return
    
    try {
      const promises = contactIds.map(id => 
        fetch(`/api/contacts/${id}`).then(r => r.json())
      )
      const results = await Promise.all(promises)
      const validContacts = results
        .filter(r => r && r.success && r.contact)
        .map(r => r.contact)
      setContacts(validContacts)
      
      if (validContacts.length === 0) {
        console.warn('No valid contacts found')
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
    }
  }

  const fetchVessels = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/vessels?limit=1000')
      const data = await res.json()
      setVessels(data.vessels || [])
    } catch (err) {
      console.error('Failed to fetch vessels:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleVessel = (vesselId: string) => {
    const newSelected = new Set(selectedVessels)
    if (newSelected.has(vesselId)) {
      newSelected.delete(vesselId)
    } else {
      newSelected.add(vesselId)
    }
    setSelectedVessels(newSelected)
  }

  const toggleAllVessels = () => {
    if (selectedVessels.size === filteredVessels.length) {
      setSelectedVessels(new Set())
    } else {
      setSelectedVessels(new Set(filteredVessels.map(v => v.id)))
    }
  }

  const handleBulkAssign = async () => {
    if (selectedVessels.size === 0 || contacts.length === 0) {
      alert('Please select at least one vessel and contact')
      return
    }

    setAssigning(true)
    const total = selectedVessels.size * contacts.length
    setProgress({ current: 0, total })
    
    let completed = 0
    const errors: string[] = []

    for (const vesselId of Array.from(selectedVessels)) {
      for (const contact of contacts) {
        try {
          const res = await fetch(`/api/vessels/${vesselId}/contacts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contactId: contact.id,
              role,
              priority,
              notifyOn
            })
          })
          
          if (!res.ok) {
            const data = await res.json()
            // Ignore "already assigned" errors
            if (!data.error?.includes('already assigned')) {
              errors.push(`${contact.name} → Vessel ${vesselId}: ${data.error}`)
            }
          }
        } catch (err: any) {
          errors.push(`${contact.name} → Vessel ${vesselId}: ${err.message}`)
        }
        
        completed++
        setProgress({ current: completed, total })
      }
    }

    setAssigning(false)
    
    if (errors.length > 0) {
      alert(`Completed with ${errors.length} errors:\n${errors.slice(0, 5).join('\n')}`)
    } else {
      alert(`Successfully assigned ${contacts.length} contact(s) to ${selectedVessels.size} vessel(s)!`)
      router.push('/dashboard/contacts')
    }
  }

  const filteredVessels = vessels.filter(v =>
    vesselSearch.length === 0 ||
    v.name.toLowerCase().includes(vesselSearch.toLowerCase()) ||
    v.mmsi.includes(vesselSearch) ||
    v.vesselType.toLowerCase().includes(vesselSearch.toLowerCase())
  )

  return (
    <AppLayout 
      title="Bulk Assign Contacts to Vessels"
      breadcrumbs={[
        { label: 'Contacts', href: '/dashboard/contacts' },
        { label: 'Bulk Assign' }
      ]}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Link href="/dashboard/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contacts
          </Button>
        </Link>

        {/* Selected Contacts */}
        <Card>
          <CardHeader>
            <CardTitle>Selected Contacts ({contacts.length})</CardTitle>
            <CardDescription>
              These contacts will be assigned to the vessels you select below
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No contacts selected</p>
                <Link href="/dashboard/contacts">
                  <Button className="mt-4">Go to Contacts</Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {contacts.filter(c => c && c.id).map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <UserCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{contact.name || 'Unknown'}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Settings</CardTitle>
            <CardDescription>
              Configure how contacts will be assigned to vessels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g., crew, captain, officer"
                />
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min="1"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-gray-500 mt-1">1 = highest priority</p>
              </div>

              <div>
                <Label>Notify On</Label>
                <div className="flex gap-2 mt-2">
                  {['critical', 'high', 'moderate', 'low'].map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        if (notifyOn.includes(level)) {
                          setNotifyOn(notifyOn.filter(l => l !== level))
                        } else {
                          setNotifyOn([...notifyOn, level])
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded border ${
                        notifyOn.includes(level)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vessel Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Vessels ({selectedVessels.size} selected)</CardTitle>
                <CardDescription>
                  Search and select vessels to assign contacts to
                </CardDescription>
              </div>
              <Button onClick={toggleAllVessels} variant="outline" size="sm">
                {selectedVessels.size === filteredVessels.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, MMSI, or type..."
                  value={vesselSearch}
                  onChange={(e) => setVesselSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Vessels List */}
            {loading ? (
              <div className="text-center py-8 text-gray-600">Loading vessels...</div>
            ) : filteredVessels.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No vessels found</div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredVessels.map((vessel) => (
                  <div
                    key={vessel.id}
                    onClick={() => toggleVessel(vessel.id)}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedVessels.has(vessel.id)
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {selectedVessels.has(vessel.id) ? (
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                      ) : (
                        <div className="h-5 w-5 border-2 border-gray-300 rounded" />
                      )}
                    </div>
                    <Ship className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium">{vessel.name}</p>
                      <p className="text-sm text-gray-600">
                        MMSI: {vessel.mmsi} • {vessel.vesselType}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            {assigning ? (
              <div className="text-center py-4">
                <div className="text-lg font-semibold mb-2">
                  Assigning contacts...
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  {progress.current} of {progress.total} assignments completed
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-4">
                <Link href="/dashboard/contacts">
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button
                  onClick={handleBulkAssign}
                  disabled={selectedVessels.size === 0 || contacts.length === 0}
                >
                  Assign {contacts.length} Contact(s) to {selectedVessels.size} Vessel(s)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
