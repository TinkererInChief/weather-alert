'use client'

import { useState, useMemo } from 'react'
import { 
  Users, Plus, Edit2, Trash2, Search, Filter, SortAsc, RefreshCw, 
  Download, CheckSquare, Square, MoreVertical, Clock, TrendingUp,
  AlertCircle, UserCheck, X
} from 'lucide-react'
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
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'info' | 'success' | 'error'; message: string }>>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false)
  
  // Filtering and sorting
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'empty'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'members' | 'date'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)
  
  // Toast helper
  const addToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.floor(Math.random() * 1_000_000_000)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
      setLastUpdated(new Date())
      addToast('Groups refreshed successfully', 'success')
    } catch (error) {
      addToast('Failed to refresh groups', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Name', 'Description', 'Members', 'Created At']
    const rows = groups.map(g => [
      g.name,
      g.description || '',
      g._count?.members || 0,
      new Date(g.createdAt || Date.now()).toLocaleDateString()
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `groups_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    addToast('Groups exported successfully', 'success')
  }

  // Filtering and sorting
  const filteredAndSortedGroups = useMemo(() => {
    let filtered = groups.filter((group: any) => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const memberCount = group._count?.members || 0
      const matchesStatus = filterStatus === 'all' ? true :
        filterStatus === 'active' ? memberCount > 0 : memberCount === 0
      
      return matchesSearch && matchesStatus
    })

    filtered.sort((a: any, b: any) => {
      if (sortBy === 'name') {
        const comparison = a.name.localeCompare(b.name)
        return sortOrder === 'asc' ? comparison : -comparison
      } else if (sortBy === 'members') {
        const comparison = (a._count?.members || 0) - (b._count?.members || 0)
        return sortOrder === 'asc' ? comparison : -comparison
      } else {
        const comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        return sortOrder === 'asc' ? comparison : -comparison
      }
    })

    return filtered
  }, [groups, searchTerm, filterStatus, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedGroups.length / itemsPerPage)
  const paginatedGroups = filteredAndSortedGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedGroups.size === filteredAndSortedGroups.length) {
      setSelectedGroups(new Set())
    } else {
      setSelectedGroups(new Set(filteredAndSortedGroups.map((g: any) => g.id)))
    }
  }

  const toggleSelectGroup = (id: string) => {
    const newSet = new Set(selectedGroups)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedGroups(newSet)
  }

  const bulkDeleteGroups = async () => {
    if (selectedGroups.size === 0) return
    if (!confirm(`Delete ${selectedGroups.size} group(s)?`)) return
    
    setBulkActionInProgress(true)
    try {
      const promises = Array.from(selectedGroups).map(id => deleteGroup(id))
      await Promise.all(promises)
      await refetch()
      setSelectedGroups(new Set())
      setShowBulkActions(false)
      addToast(`Successfully deleted ${promises.length} group(s)`, 'success')
    } catch (error) {
      addToast('Failed to delete groups', 'error')
    } finally {
      setBulkActionInProgress(false)
    }
  }
  
  const handleCreateGroup = async (data: { name: string; description?: string }) => {
    try {
      await createGroup(data)
      setShowCreateModal(false)
      await refetch()
      setLastUpdated(new Date())
      addToast('Group created successfully', 'success')
    } catch (error) {
      console.error('Failed to create group:', error)
      addToast('Failed to create group', 'error')
    }
  }
  
  const handleUpdateGroup = async (id: string, data: { name?: string; description?: string }) => {
    try {
      await updateGroup(id, data)
      setEditingGroup(null)
      await refetch()
      setLastUpdated(new Date())
      addToast('Group updated successfully', 'success')
    } catch (error) {
      console.error('Failed to update group:', error)
      addToast('Failed to update group', 'error')
    }
  }
  
  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      return
    }
    
    try {
      await deleteGroup(id)
      await refetch()
      setLastUpdated(new Date())
      addToast('Group deleted successfully', 'success')
    } catch (error) {
      console.error('Failed to delete group:', error)
      addToast('Failed to delete group', 'error')
    }
  }

  // Calculate hero metrics
  const totalGroups = groups.length
  const totalMembers = groups.reduce((sum, g) => sum + (g._count?.members || 0), 0)
  const activeGroups = groups.filter(g => (g._count?.members || 0) > 0).length
  const largestGroup = groups.length > 0 
    ? Math.max(...groups.map(g => g._count?.members || 0))
    : 0
  
  return (
    <AuthGuard>
      <AppLayout 
        title="Contact Groups"
        breadcrumbs={[{ label: 'Groups' }]}
      >
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'empty')}
                    className="appearance-none pl-3 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-sm"
                  >
                    <option value="all">All Groups</option>
                    <option value="active">Active (Has Members)</option>
                    <option value="empty">Empty</option>
                  </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [newSortBy, newSortOrder] = e.target.value.split('-') as [('name' | 'members' | 'date'), ('asc' | 'desc')]
                      setSortBy(newSortBy)
                      setSortOrder(newSortOrder)
                    }}
                    className="appearance-none pl-3 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-sm"
                  >
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="members-desc">Most Members</option>
                    <option value="members-asc">Least Members</option>
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                  </select>
                  <SortAsc className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                title="Refresh groups"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Export CSV */}
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>

              {/* Bulk Actions */}
              {selectedGroups.size > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {selectedGroups.size} Selected
                    <MoreVertical className="h-4 w-4 ml-2" />
                  </button>
                  
                  {showBulkActions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                      <button
                        onClick={bulkDeleteGroups}
                        disabled={bulkActionInProgress}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="inline h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Create Group */}
              <Can permission={Permission.MANAGE_GROUPS}>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </button>
              </Can>
            </div>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {/* Hero Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Groups */}
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
              <h3 className="text-sm font-medium text-blue-900/70 mb-1">Total Groups</h3>
              <p className="text-3xl font-bold text-blue-900">{totalGroups}</p>
            </div>

            {/* Total Members */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-green-900/70 mb-1">Total Members</h3>
              <p className="text-3xl font-bold text-green-900">{totalMembers}</p>
            </div>

            {/* Active Groups */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  Active
                </div>
              </div>
              <h3 className="text-sm font-medium text-purple-900/70 mb-1">Active Groups</h3>
              <p className="text-3xl font-bold text-purple-900">{activeGroups}</p>
            </div>

            {/* Largest Group */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-orange-900/70 mb-1">Largest Group</h3>
              <p className="text-3xl font-bold text-orange-900">{largestGroup} members</p>
            </div>
          </div>
          
          {/* Groups Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-slate-600 mt-4">Loading groups...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              {error}
            </div>
          ) : filteredAndSortedGroups.length === 0 ? (
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
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Groups Directory</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Showing {paginatedGroups.length} of {filteredAndSortedGroups.length} groups
                    </p>
                  </div>
                  {filteredAndSortedGroups.length > 0 && (
                    <button
                      onClick={toggleSelectAll}
                      className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      {selectedGroups.size === filteredAndSortedGroups.length ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                      Select All
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedGroups.map((group: any) => {
                  const memberCount = group._count?.members || 0
                  const isActive = memberCount > 0
                  
                  return (
                    <div
                      key={group.id}
                      className={`relative border rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                        selectedGroups.has(group.id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelectGroup(group.id)}
                        className="absolute top-4 right-4 z-10"
                      >
                        {selectedGroups.has(group.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )}
                      </button>

                      <div className="pr-8 mb-4">
                        <div className="flex items-start gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${
                            isActive ? 'bg-green-100' : 'bg-slate-100'
                          }`}>
                            <Users className={`h-5 w-5 ${
                              isActive ? 'text-green-600' : 'text-slate-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">
                              {group.name}
                            </h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              isActive 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {isActive ? 'Active' : 'Empty'}
                            </span>
                          </div>
                        </div>
                        {group.description && (
                          <p className="text-sm text-slate-600 line-clamp-2 ml-14">
                            {group.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Users className="h-4 w-4" />
                            <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                          </div>
                          
                          <a
                            href={`/dashboard/groups/${group.id}`}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View →
                          </a>
                        </div>

                        <Can permission={Permission.MANAGE_GROUPS}>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingGroup(group)}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              <Edit2 className="h-4 w-4 mr-1.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-1.5" />
                              Delete
                            </button>
                          </div>
                        </Can>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
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
  const [error, setError] = useState('')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Please enter a group name')
      return
    }
    
    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined
      })
      onClose()
    } catch (error) {
      console.error('Failed to save group:', error)
      setError('Failed to save group. Please try again.')
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              {group ? 'Edit Group' : 'Create Group'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., Emergency Responders"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Describe the purpose of this group..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 font-medium"
              disabled={saving}
            >
              {saving ? 'Saving...' : (group ? 'Update Group' : 'Create Group')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
