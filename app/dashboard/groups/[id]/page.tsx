'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Users, ArrowLeft, UserPlus, UserMinus, Search, Mail, Phone, MessageSquare } from 'lucide-react'
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
  
  useEffect(() => {
    fetchGroup()
    fetchAllContacts()
  }, [groupId])
  
  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/contact-groups/${groupId}`)
      const data = await response.json()
      
      if (data.success) {
        setGroup(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch group:', error)
    } finally {
      setLoading(false)
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
      } else {
        alert(data.error || 'Failed to add members')
      }
    } catch (error) {
      console.error('Failed to add members:', error)
      alert('Failed to add members')
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
      } else {
        alert(data.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert('Failed to remove member')
    }
  }
  
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
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard/groups')}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Groups
            </button>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  {group.name}
                </h1>
                {group.description && (
                  <p className="text-slate-600 mt-2">{group.description}</p>
                )}
                <p className="text-sm text-slate-500 mt-2">
                  {group._count.members} {group._count.members === 1 ? 'member' : 'members'}
                </p>
              </div>
              
              <Can permission={Permission.MANAGE_GROUPS}>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserPlus className="h-5 w-5" />
                  Add Members
                </button>
              </Can>
            </div>
          </div>
          
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Members List */}
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UserPlus className="h-5 w-5" />
                    Add Members
                  </button>
                )}
              </Can>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
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
                    <tr key={member.contact.id} className="hover:bg-slate-50">
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Add Members
          </h2>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-600 py-8">
              {search ? 'No contacts found' : 'No available contacts'}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((contact) => (
                <label
                  key={contact.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedContacts.has(contact.id)}
                    onChange={() => onToggle(contact.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{contact.name}</div>
                    <div className="text-sm text-slate-600">
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
            className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAdd}
            disabled={selectedContacts.size === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {selectedContacts.size} {selectedContacts.size === 1 ? 'Contact' : 'Contacts'}
          </button>
        </div>
      </div>
    </div>
  )
}
