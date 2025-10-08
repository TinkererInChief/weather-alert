'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  Users, ArrowLeft, UserPlus, UserMinus, Search, Mail, Phone, MessageSquare,
  Download, RefreshCw, Clock, TrendingUp, UserCheck, LayoutGrid, List,
  CheckSquare, Square, MoreVertical, Trash2, X
} from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { Can } from '@/components/auth/Can'
import { Permission } from '@/lib/rbac/roles'

type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  active: boolean
}

type GroupMember = {
  contact: Contact
}

type Group = {
  id: string
  name: string
  description?: string | null
  members: GroupMember[]
  _count: {
    members: number
  }
}

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string
  
  const [group, setGroup] = useState<Group | null>(null)
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'info' | 'success' | 'error'; message: string }>>([])
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false)
  
  useEffect(() => {
    fetchGroup()
    fetchAllContacts()
  }, [groupId])
  
  // Toast helper
  const addToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.floor(Math.random() * 1_000_000_000)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/contact-groups/${groupId}`)
      const data = await response.json()
      
      if (data.success) {
        setGroup(data.data)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch group:', error)
      addToast('Failed to fetch group', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchGroup()
      await fetchAllContacts()
      addToast('Group refreshed successfully', 'success')
    } catch (error) {
      addToast('Failed to refresh', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  // CSV Export for members
  const exportMembersToCSV = () => {
    if (!group) return
    
    const headers = ['Name', 'Phone', 'Email', 'WhatsApp', 'Status']
    const rows = group.members.map(m => [
      m.contact.name,
      m.contact.phone || '',
      m.contact.email || '',
      m.contact.whatsapp || '',
      m.contact.active ? 'Active' : 'Inactive'
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${group.name}_members_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    addToast('Members exported successfully', 'success')
  }

  // Bulk member operations
  const toggleSelectAllMembers = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.contact.id)))
    }
  }

  const toggleSelectMember = (id: string) => {
    const newSet = new Set(selectedMembers)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedMembers(newSet)
  }

  const bulkRemoveMembers = async () => {
    if (selectedMembers.size === 0) return
    if (!confirm(`Remove ${selectedMembers.size} member(s) from this group?`)) return
    
    setBulkActionInProgress(true)
    try {
      const response = await fetch(`/api/contact-groups/${groupId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: Array.from(selectedMembers) })
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchGroup()
        setSelectedMembers(new Set())
        setShowBulkActions(false)
        addToast(`Successfully removed ${selectedMembers.size} member(s)`, 'success')
      } else {
        addToast(data.error || 'Failed to remove members', 'error')
      }
    } catch (error) {
      addToast('Failed to remove members', 'error')
    } finally {
      setBulkActionInProgress(false)
    }
  }
  
  const fetchAllContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      const data = await response.json()
      
      if (data.success) {
        setAllContacts(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    }
  }
  
  const handleAddMembers = async (contactIds: string[]) => {
    try {
      const response = await fetch(`/api/contact-groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds })
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchGroup()
        setShowAddModal(false)
        setSelectedContacts(new Set())
        addToast(`Successfully added ${contactIds.length} member(s)`, 'success')
      } else {
        addToast(data.error || 'Failed to add members', 'error')
      }
    } catch (error) {
      console.error('Failed to add members:', error)
      addToast('Failed to add members', 'error')
    }
  }
  
  const handleRemoveMember = async (contactId: string) => {
    if (!confirm('Remove this contact from the group?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/contact-groups/${groupId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: [contactId] })
      })
      
      const data = await response.json()
      
      if (data.success) {
        await fetchGroup()
        addToast('Member removed successfully', 'success')
      } else {
        addToast(data.error || 'Failed to remove member', 'error')
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
      addToast('Failed to remove member', 'error')
    }
  }

  // Calculate hero metrics
  const totalMembers = group?.members.length || 0
  const activeMembers = group?.members.filter(m => m.contact.active).length || 0
  const membersWithEmail = group?.members.filter(m => m.contact.email).length || 0
  const membersWithWhatsApp = group?.members.filter(m => m.contact.whatsapp).length || 0
  
  if (loading) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </AppLayout>
      </AuthGuard>
    )
  }
  
  if (!group) {
    return (
      <AuthGuard>
        <AppLayout>
          <div className="p-6 max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              Group not found
            </div>
          </div>
        </AppLayout>
      </AuthGuard>
    )
  }
  
  const members = group.members || []
  const memberIds = new Set(members.map(m => m.contact.id))
  const availableContacts = allContacts.filter(c => !memberIds.has(c.id) && c.active)
  
  const filteredMembers = members.filter(member =>
    member.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.contact.phone?.includes(searchTerm)
  )
  
  return (
    <AuthGuard>
      <AppLayout
        title={group.name}
        breadcrumbs={[
          { label: 'Groups', href: '/dashboard/groups' },
          { label: group.name }
        ]}
      >
        <div className="space-y-6">
          {/* Back Button */}
          <button
            onClick={() => router.push('/dashboard/groups')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Groups
          </button>

          {/* Header Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              {group.description && (
                <p className="text-slate-600 mb-4">{group.description}</p>
              )}
              {lastUpdated && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4" />
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Toggle */}
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Export CSV */}
              <button
                onClick={exportMembersToCSV}
                disabled={totalMembers === 0}
                className="inline-flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>

              {/* Bulk Actions */}
              {selectedMembers.size > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {selectedMembers.size} Selected
                    <MoreVertical className="h-4 w-4 ml-2" />
                  </button>
                  
                  {showBulkActions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                      <button
                        onClick={bulkRemoveMembers}
                        disabled={bulkActionInProgress}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="inline h-4 w-4 mr-2" />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Add Members */}
              <Can permission={Permission.MANAGE_GROUPS}>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-200"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Members
                </button>
              </Can>
            </div>
          </div>

          {/* Hero Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Members */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                  <TrendingUp className="h-3 w-3" />
                  100%
                </div>
              </div>
              <h3 className="text-sm font-medium text-blue-900/70 mb-1">Total Members</h3>
              <p className="text-3xl font-bold text-blue-900">{totalMembers}</p>
            </div>

            {/* Active Members */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Active
                </div>
              </div>
              <h3 className="text-sm font-medium text-green-900/70 mb-1">Active Members</h3>
              <p className="text-3xl font-bold text-green-900">{activeMembers}</p>
            </div>

            {/* With Email */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-purple-900/70 mb-1">With Email</h3>
              <p className="text-3xl font-bold text-purple-900">{membersWithEmail}</p>
            </div>

            {/* With WhatsApp */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <MessageSquare className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-emerald-900/70 mb-1">With WhatsApp</h3>
              <p className="text-3xl font-bold text-emerald-900">{membersWithWhatsApp}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
          
          {/* Members List */}
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchTerm ? 'No members found' : 'No members yet'}
              </h3>
              <p className="text-slate-600 mb-4">
                {searchTerm ? 'Try adjusting your search' : 'Add contacts to this group to get started'}
              </p>
              <Can permission={Permission.MANAGE_GROUPS}>
                {!searchTerm && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-200"
                  >
                    <UserPlus className="h-5 w-5" />
                    Add Members
                  </button>
                )}
              </Can>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Members</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Showing {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                  {filteredMembers.length > 0 && (
                    <button
                      onClick={toggleSelectAllMembers}
                      className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      {selectedMembers.size === filteredMembers.length ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      Select All
                    </button>
                  )}
                </div>
              </div>

              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.contact.id}
                      className={`relative border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                        selectedMembers.has(member.contact.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelectMember(member.contact.id)}
                        className="absolute top-4 right-4 z-10"
                      >
                        {selectedMembers.has(member.contact.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )}
                      </button>

                      <div className="pr-8 mb-4">
                        <h4 className="font-semibold text-slate-900 text-lg mb-2">{member.contact.name}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          member.contact.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {member.contact.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        {member.contact.phone && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{member.contact.phone}</span>
                          </div>
                        )}
                        {member.contact.email && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{member.contact.email}</span>
                          </div>
                        )}
                        {member.contact.whatsapp && (
                          <div className="flex items-center text-sm text-slate-600">
                            <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{member.contact.whatsapp}</span>
                          </div>
                        )}
                      </div>

                      <Can permission={Permission.MANAGE_GROUPS}>
                        <button
                          onClick={() => handleRemoveMember(member.contact.id)}
                          className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" />
                          Remove
                        </button>
                      </Can>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <button onClick={toggleSelectAllMembers}>
                            {selectedMembers.size === filteredMembers.length ? (
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Contact Info
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <Can permission={Permission.MANAGE_GROUPS}>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </Can>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredMembers.map((member) => (
                        <tr key={member.contact.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <button onClick={() => toggleSelectMember(member.contact.id)}>
                              {selectedMembers.has(member.contact.id) ? (
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-slate-900">
                              {member.contact.name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {member.contact.email && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Mail className="h-4 w-4" />
                                  {member.contact.email}
                                </div>
                              )}
                              {member.contact.phone && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Phone className="h-4 w-4" />
                                  {member.contact.phone}
                                </div>
                              )}
                              {member.contact.whatsapp && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <MessageSquare className="h-4 w-4" />
                                  {member.contact.whatsapp}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.contact.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {member.contact.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <Can permission={Permission.MANAGE_GROUPS}>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => handleRemoveMember(member.contact.id)}
                                className="text-red-600 hover:text-red-700 font-medium text-sm"
                              >
                                Remove
                              </button>
                            </td>
                          </Can>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
          
          {/* Add Members Modal */}
          {showAddModal && (
            <AddMembersModal
              availableContacts={availableContacts}
              selectedContacts={selectedContacts}
              onToggle={(id) => {
                const newSelection = new Set(selectedContacts)
                if (newSelection.has(id)) {
                  newSelection.delete(id)
                } else {
                  newSelection.add(id)
                }
                setSelectedContacts(newSelection)
              }}
              onClose={() => {
                setShowAddModal(false)
                setSelectedContacts(new Set())
              }}
              onAdd={() => handleAddMembers(Array.from(selectedContacts))}
            />
          )}

          {/* Toasts */}
          {toasts.length > 0 && (
            <div className="fixed top-4 right-4 z-50 space-y-2">
              {toasts.map(t => (
                <div
                  key={t.id}
                  role="status"
                  className={`min-w-[260px] max-w-sm px-4 py-3 rounded-xl shadow-lg border text-sm ${
                    t.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                    t.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                    'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {t.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  )
}

function AddMembersModal({
  availableContacts,
  selectedContacts,
  onToggle,
  onClose,
  onAdd
}: {
  availableContacts: Contact[]
  selectedContacts: Set<string>
  onToggle: (id: string) => void
  onClose: () => void
  onAdd: () => void
}) {
  const [search, setSearch] = useState('')
  
  const filtered = availableContacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )
  
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              Add Members
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="text-center text-slate-600 py-8">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="font-medium">{search ? 'No contacts found' : 'No available contacts'}</p>
              <p className="text-sm mt-1">
                {search ? 'Try adjusting your search' : 'All contacts are already members'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((contact) => (
                <label
                  key={contact.id}
                  className={`flex items-center gap-3 p-4 rounded-xl hover:bg-slate-50 cursor-pointer transition-all border ${
                    selectedContacts.has(contact.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {selectedContacts.has(contact.id) ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact.id)}
                    onChange={() => onToggle(contact.id)}
                    className="sr-only"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900">{contact.name}</div>
                    <div className="text-sm text-slate-600 truncate">
                      {contact.email || contact.phone}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onAdd}
            disabled={selectedContacts.size === 0}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Add {selectedContacts.size} {selectedContacts.size === 1 ? 'Contact' : 'Contacts'}
          </button>
        </div>
      </div>
    </div>
  )
}
