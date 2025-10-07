'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Users, UserCheck, UserX, Mail, Phone, Shield, 
  Loader2, CheckCircle, XCircle, Edit2, Trash2, MoreVertical 
} from 'lucide-react'
import { Role, getRoleName } from '@/lib/rbac/roles'

type User = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: string
  approvalStatus: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

export default function UsersAdminPanel() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'inactive'>('all')
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [selectedRole, setSelectedRole] = useState<string>('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (userId: string, action: 'approve' | 'reject', rejectionReason?: string) => {
    setProcessingUserId(userId)
    
    try {
      const response = await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, rejectionReason })
      })

      if (response.ok) {
        await fetchUsers()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to process request')
      }
    } catch (error) {
      console.error('Approval error:', error)
      alert('Failed to process request')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleRoleChange = async () => {
    if (!editingUser || !selectedRole) return
    
    setProcessingUserId(editingUser.id)
    
    try {
      const response = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: editingUser.id, role: selectedRole })
      })

      if (response.ok) {
        await fetchUsers()
        setEditingUser(null)
        setSelectedRole('')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update role')
      }
    } catch (error) {
      console.error('Role update error:', error)
      alert('Failed to update role')
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setProcessingUserId(userId)
    
    try {
      const response = await fetch('/api/admin/users/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !currentActive })
      })

      if (response.ok) {
        await fetchUsers()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update user status')
      }
    } catch (error) {
      console.error('Toggle active error:', error)
      alert('Failed to update user status')
    } finally {
      setProcessingUserId(null)
    }
  }

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true
    if (filter === 'inactive') return !user.isActive
    return user.approvalStatus === filter
  })

  const stats = {
    total: users.length,
    pending: users.filter(u => u.approvalStatus === 'pending').length,
    approved: users.filter(u => u.approvalStatus === 'approved').length,
    rejected: users.filter(u => u.approvalStatus === 'rejected').length,
    inactive: users.filter(u => !u.isActive).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-600">Total Users</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <p className="text-sm text-orange-600">Pending</p>
          <p className="text-2xl font-bold text-orange-900">{stats.pending}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600">Approved</p>
          <p className="text-2xl font-bold text-green-900">{stats.approved}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-600">Rejected</p>
          <p className="text-2xl font-bold text-red-900">{stats.rejected}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-600">Inactive</p>
          <p className="text-2xl font-bold text-slate-900">{stats.inactive}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected', 'inactive'] as const).map((filterValue) => (
          <button
            key={filterValue}
            onClick={() => setFilter(filterValue)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === filterValue
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {filterValue.charAt(0).toUpperCase() + filterValue.slice(1)}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={`hover:bg-slate-50 ${!user.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-medium">
                            {user.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-slate-900">{user.name || 'Unknown'}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" />
                        {user.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-slate-400" />
                        <span className="text-xs font-medium text-slate-700">{user.role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.approvalStatus === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : user.approvalStatus === 'pending'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.approvalStatus}
                        </span>
                        {!user.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        {user.approvalStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproval(user.id, 'approve')}
                              disabled={processingUserId === user.id}
                              className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 disabled:opacity-50"
                              title="Approve"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Rejection reason (optional):')
                                handleApproval(user.id, 'reject', reason || undefined)
                              }}
                              disabled={processingUserId === user.id}
                              className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                              title="Reject"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setEditingUser(user)
                            setSelectedRole(user.role)
                          }}
                          disabled={processingUserId === user.id}
                          className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 disabled:opacity-50"
                          title="Edit Role"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          disabled={processingUserId === user.id}
                          className="p-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 disabled:opacity-50"
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit User Role</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  User: {editingUser.name}
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(Role).map((role) => (
                    <option key={role} value={role}>
                      {getRoleName(role as Role)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setEditingUser(null)
                    setSelectedRole('')
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRoleChange}
                  disabled={processingUserId === editingUser.id || !selectedRole}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {processingUserId === editingUser.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Update Role'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
