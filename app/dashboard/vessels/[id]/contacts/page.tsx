'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  UserCircle, 
  ArrowLeft, 
  Plus, 
  X, 
  Search, 
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react'
import Link from 'next/link'

type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
}

type VesselContact = {
  id: string
  role: string
  priority: number
  notifyOn: string[]
  contact: Contact
}

type Vessel = {
  id: string
  mmsi: string
  name: string
  vesselType: string
}

export default function VesselContactsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [vessel, setVessel] = useState<Vessel | null>(null)
  const [vesselContacts, setVesselContacts] = useState<VesselContact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Contact search & assignment
  const [showAddContact, setShowAddContact] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [searching, setSearching] = useState(false)
  const [assigningContact, setAssigningContact] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState('CREW')

  useEffect(() => {
    fetchVessel()
    fetchVesselContacts()
  }, [params.id])

  useEffect(() => {
    if (contactSearch.length >= 2) {
      searchContacts()
    } else {
      setSearchResults([])
    }
  }, [contactSearch])

  const fetchVessel = async () => {
    try {
      const res = await fetch(`/api/vessels/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setVessel(data)
      }
    } catch (err) {
      console.error('Error fetching vessel:', err)
    }
  }

  const fetchVesselContacts = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/vessels/${params.id}/contacts`)
      const data = await res.json()

      if (res.ok) {
        setVesselContacts(data)
      } else {
        setError(data.error || 'Failed to load contacts')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server')
      console.error('Error fetching vessel contacts:', err)
    } finally {
      setLoading(false)
    }
  }

  const searchContacts = async () => {
    try {
      setSearching(true)
      const res = await fetch(`/api/contacts?search=${encodeURIComponent(contactSearch)}`)
      
      if (res.ok) {
        const data = await res.json()
        // Filter out already assigned contacts
        const assignedIds = new Set(vesselContacts.map(vc => vc.contact.id))
        setSearchResults(data.contacts.filter((c: Contact) => !assignedIds.has(c.id)))
      }
    } catch (err) {
      console.error('Error searching contacts:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleAssignContact = async (contactId: string) => {
    try {
      setAssigningContact(contactId)
      const res = await fetch(`/api/vessels/${params.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          role: selectedRole,
          priority: vesselContacts.length + 1,
          notifyOn: ['critical', 'high']
        })
      })

      if (res.ok) {
        fetchVesselContacts()
        setContactSearch('')
        setSearchResults([])
        setShowAddContact(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to assign contact')
      }
    } catch (err) {
      console.error('Error assigning contact:', err)
      alert('Failed to assign contact')
    } finally {
      setAssigningContact(null)
    }
  }

  const handleRemoveContact = async (contactId: string) => {
    if (!confirm('Remove this contact from the vessel?')) {
      return
    }

    try {
      const res = await fetch(`/api/vessels/${params.id}/contacts/${contactId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchVesselContacts()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to remove contact')
      }
    } catch (err) {
      console.error('Error removing contact:', err)
      alert('Failed to remove contact')
    }
  }

  const handleUpdatePriority = async (contactId: string, newPriority: number) => {
    try {
      const res = await fetch(`/api/vessels/${params.id}/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      })

      if (res.ok) {
        fetchVesselContacts()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update priority')
      }
    } catch (err) {
      console.error('Error updating priority:', err)
      alert('Failed to update priority')
    }
  }

  const handleToggleNotifyOn = async (contactId: string, currentNotifyOn: string[], level: string) => {
    const newNotifyOn = currentNotifyOn.includes(level)
      ? currentNotifyOn.filter(l => l !== level)
      : [...currentNotifyOn, level]

    try {
      const res = await fetch(`/api/vessels/${params.id}/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyOn: newNotifyOn })
      })

      if (res.ok) {
        fetchVesselContacts()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update notification settings')
      }
    } catch (err) {
      console.error('Error updating notification settings:', err)
      alert('Failed to update notification settings')
    }
  }

  if (loading) {
    return (
      <AppLayout 
        title="Vessel Contacts" 
        breadcrumbs={[
          { label: 'Vessels', href: '/dashboard/vessels' },
          { label: vessel?.name || 'Loading...' }
        ]}
      >
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <UserCircle className="h-12 w-12 mx-auto mb-4 animate-pulse text-blue-500" />
            <p className="text-gray-600">Loading contacts...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout 
        title="Vessel Contacts" 
        breadcrumbs={[
          { label: 'Vessels', href: '/dashboard/vessels' },
          { label: vessel?.name || 'Error' }
        ]}
      >
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchVesselContacts}>Retry</Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout 
      title={`${vessel?.name || 'Vessel'} Contacts`}
      breadcrumbs={[
        { label: 'Vessels', href: '/dashboard/vessels' },
        { label: vessel?.name || 'Vessel' }
      ]}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Link href="/dashboard/vessels">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Vessels
          </Button>
        </Link>

        {/* Vessel Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{vessel?.name}</CardTitle>
                <CardDescription>
                  MMSI: {vessel?.mmsi} • {vessel?.vesselType}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{vesselContacts.length}</p>
                <p className="text-sm text-gray-600">contacts</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Contacts Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assigned Contacts</CardTitle>
                <CardDescription>
                  Manage contacts who receive alerts for this vessel
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddContact(!showAddContact)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Add Contact Search */}
            {showAddContact && (
              <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label htmlFor="vessel-role" className="text-sm font-medium mb-2 block">
                      Assign as
                    </Label>
                    <select
                      id="vessel-role"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="OPERATOR">Operator</option>
                      <option value="MANAGER">Manager</option>
                      <option value="CAPTAIN">Captain</option>
                      <option value="CHIEF_OFFICER">Chief Officer</option>
                      <option value="CHIEF_ENGINEER">Chief Engineer</option>
                      <option value="CREW">Crew</option>
                      <option value="AGENT">Agent</option>
                      <option value="EMERGENCY_CONTACT">Emergency Contact</option>
                      <option value="TECHNICAL_SUPPORT">Technical Support</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="contact-search" className="text-sm font-medium mb-2 block">
                      Search for contacts
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="contact-search"
                        placeholder="Search by name, email, or phone..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {searching && (
                  <p className="text-sm text-gray-600 mt-2">Searching...</p>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 bg-white border rounded-lg hover:border-blue-300"
                      >
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </span>
                            )}
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleAssignContact(contact.id)}
                          disabled={assigningContact === contact.id}
                        >
                          {assigningContact === contact.id ? 'Adding...' : 'Add'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {contactSearch.length >= 2 && !searching && searchResults.length === 0 && (
                  <p className="text-sm text-gray-600 mt-2">No contacts found</p>
                )}
              </div>
            )}

            {/* Contacts List */}
            {vesselContacts.length === 0 ? (
              <div className="text-center py-12">
                <UserCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 mb-4">No contacts assigned yet</p>
                <Button onClick={() => setShowAddContact(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Contact
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {vesselContacts.map((vc, index) => (
                  <div
                    key={vc.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Priority Controls */}
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleUpdatePriority(vc.contact.id, vc.priority - 1)}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <div className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 rounded text-sm font-semibold">
                            {vc.priority}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleUpdatePriority(vc.contact.id, vc.priority + 1)}
                            disabled={index === vesselContacts.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Contact Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium text-gray-900">{vc.contact.name}</p>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                              {vc.role}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                            {vc.contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {vc.contact.email}
                              </span>
                            )}
                            {vc.contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {vc.contact.phone}
                              </span>
                            )}
                            {vc.contact.whatsapp && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                WhatsApp
                              </span>
                            )}
                          </div>

                          {/* Notification Levels */}
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Notify on:</p>
                            <div className="flex gap-2">
                              {['critical', 'high', 'moderate', 'low'].map((level) => (
                                <button
                                  key={level}
                                  onClick={() => handleToggleNotifyOn(vc.contact.id, vc.notifyOn, level)}
                                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                    vc.notifyOn.includes(level)
                                      ? level === 'critical'
                                        ? 'bg-red-100 border-red-300 text-red-700'
                                        : level === 'high'
                                        ? 'bg-orange-100 border-orange-300 text-orange-700'
                                        : level === 'moderate'
                                        ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                                        : 'bg-blue-100 border-blue-300 text-blue-700'
                                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveContact(vc.contact.id)}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Text */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Priority:</strong> Lower numbers = higher priority (1 is highest). Use ↑↓ to reorder.</p>
              <p><strong>Notification Levels:</strong> Click to toggle which alert severities this contact receives.</p>
              <p><strong>Role:</strong> Helps organize contacts by their function (captain, crew, manager, etc.)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
