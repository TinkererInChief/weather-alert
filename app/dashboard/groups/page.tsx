'use client'

import { useState } from 'react'
import { Users, Plus, Edit2, Trash2, UserPlus, UserMinus, Search, Filter } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { useContactGroups } from '@/hooks/useContactGroups'
import { Can } from '@/components/auth/Can'
import { Permission } from '@/lib/rbac/roles'

export default function ContactGroupsPage() {
  const { groups, loading, error, createGroup, updateGroup, deleteGroup, refetch } = useContactGroups(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<any>(null)
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  
  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const handleCreateGroup = async (data: { name: string; description?: string }) => {
    try {
      await createGroup(data)
      setShowCreateModal(false)
    } catch (error) {
      console.error('Failed to create group:', error)
      alert('Failed to create group')
    }
  }
  
  const handleUpdateGroup = async (id: string, data: { name?: string; description?: string }) => {
    try {
      await updateGroup(id, data)
      setEditingGroup(null)
    } catch (error) {
      console.error('Failed to update group:', error)
      alert('Failed to update group')
    }
  }
  
  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return
    }
    
    try {
      await deleteGroup(id)
    } catch (error) {
      console.error('Failed to delete group:', error)
      alert('Failed to delete group')
    }
  }
  
  const toggleGroupSelection = (groupId: string) => {
    const newSelection = new Set(selectedGroups)
    if (newSelection.has(groupId)) {
      newSelection.delete(groupId)
    } else {
      newSelection.add(groupId)
    }
    setSelectedGroups(newSelection)
  }
  
  return (
    <AuthGuard>
      <AppLayout>
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  Contact Groups
                </h1>
                <p className="text-slate-600 mt-2">
                  Organize contacts into groups for targeted alerts
                </p>
              </div>
              
              <Can permission={Permission.MANAGE_GROUPS}>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Create Group
                </button>
              </Can>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Groups Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-slate-600 mt-4">Loading groups...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchTerm ? 'No groups found' : 'No groups yet'}
              </h3>
              <p className="text-slate-600 mb-4">
                {searchTerm ? 'Try adjusting your search' : 'Create your first contact group to get started'}
              </p>
              <Can permission={Permission.MANAGE_GROUPS}>
                {!searchTerm && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    Create Group
                  </button>
                )}
              </Can>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>
                    
                    <Can permission={Permission.MANAGE_GROUPS}>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingGroup(group)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit group"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete group"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </Can>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="h-4 w-4" />
                      <span>{group._count?.members || 0} members</span>
                    </div>
                    
                    <a
                      href={`/dashboard/groups/${group.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View details →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Create/Edit Modal */}
          {(showCreateModal || editingGroup) && (
            <GroupModal
              group={editingGroup}
              onClose={() => {
                setShowCreateModal(false)
                setEditingGroup(null)
              }}
              onSave={editingGroup ? 
                (data) => handleUpdateGroup(editingGroup.id, data) :
                handleCreateGroup
              }
            />
          )}
        </div>
      </AppLayout>
    </AuthGuard>
  )
}

function GroupModal({
  group,
  onClose,
  onSave
}: {
  group?: any
  onClose: () => void
  onSave: (data: { name: string; description?: string }) => Promise<void>
}) {
  const [name, setName] = useState(group?.name || '')
  const [description, setDescription] = useState(group?.description || '')
  const [saving, setSaving] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert('Please enter a group name')
      return
    }
    
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined
      })
      onClose()
    } catch (error) {
      console.error('Failed to save group:', error)
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          {group ? 'Edit Group' : 'Create Group'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Emergency Responders"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : (group ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
