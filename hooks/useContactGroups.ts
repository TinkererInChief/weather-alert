import { useState, useEffect, useCallback } from 'react'

type ContactGroup = {
  id: string
  name: string
  description?: string | null
  metadata: Record<string, any>
  createdAt: string
  _count?: {
    members: number
  }
  members?: Array<{
    contact: {
      id: string
      name: string
      email: string | null
      phone: string | null
      whatsapp: string | null
      active: boolean
    }
  }>
}

type UseContactGroupsReturn = {
  groups: ContactGroup[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createGroup: (data: { name: string; description?: string }) => Promise<ContactGroup>
  updateGroup: (id: string, data: { name?: string; description?: string }) => Promise<ContactGroup>
  deleteGroup: (id: string) => Promise<void>
  addMembers: (groupId: string, contactIds: string[]) => Promise<void>
  removeMembers: (groupId: string, contactIds: string[]) => Promise<void>
  bulkDelete: (groupIds: string[]) => Promise<void>
}

export function useContactGroups(includeMembers = false): UseContactGroupsReturn {
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (includeMembers) {
        params.append('includeMembers', 'true')
      }
      
      const response = await fetch(`/api/contact-groups?${params}`)
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch groups')
      }
      
      setGroups(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [includeMembers])
  
  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])
  
  const createGroup = useCallback(async (data: { name: string; description?: string }) => {
    const response = await fetch('/api/contact-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create group')
    }
    
    await fetchGroups()
    return result.data
  }, [fetchGroups])
  
  const updateGroup = useCallback(async (
    id: string,
    data: { name?: string; description?: string }
  ) => {
    const response = await fetch(`/api/contact-groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update group')
    }
    
    await fetchGroups()
    return result.data
  }, [fetchGroups])
  
  const deleteGroup = useCallback(async (id: string) => {
    const response = await fetch(`/api/contact-groups/${id}`, {
      method: 'DELETE'
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete group')
    }
    
    await fetchGroups()
  }, [fetchGroups])
  
  const addMembers = useCallback(async (groupId: string, contactIds: string[]) => {
    const response = await fetch(`/api/contact-groups/${groupId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactIds })
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to add members')
    }
    
    await fetchGroups()
  }, [fetchGroups])
  
  const removeMembers = useCallback(async (groupId: string, contactIds: string[]) => {
    const response = await fetch(`/api/contact-groups/${groupId}/members`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactIds })
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to remove members')
    }
    
    await fetchGroups()
  }, [fetchGroups])
  
  const bulkDelete = useCallback(async (groupIds: string[]) => {
    const response = await fetch('/api/contact-groups/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'delete',
        groupIds
      })
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete groups')
    }
    
    await fetchGroups()
  }, [fetchGroups])
  
  return {
    groups,
    loading,
    error,
    refetch: fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    addMembers,
    removeMembers,
    bulkDelete,
  }
}
