'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { 
  Users, Plus, Search, Phone, Mail, MapPin, Edit, Trash2, MessageCircle,
  RefreshCw, Download, Upload, CheckSquare, Square, MoreVertical,
  Filter, SortAsc, Clock, TrendingUp, UserCheck, AlertCircle, X, Ship
} from 'lucide-react'
import { z } from 'zod'

type Contact = {
  id: string
  name: string
  phone: string
  email?: string | null
  whatsapp?: string | null
  active: boolean
  createdAt: string
  location?: string | null
  groups?: string[] | null
  role?: string | null
}

type CSVRow = {
  name: string
  phone: string
  email?: string
  whatsapp?: string
  location?: string
  role?: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', whatsapp: '' })
  const [submitting, setSubmitting] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', whatsapp: '' })
  const [deletingContact, setDeletingContact] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Contact | null>(null)
  const [addErrors, setAddErrors] = useState<{ name?: string; phone?: string; email?: string; whatsapp?: string }>({})
  const [editErrors, setEditErrors] = useState<{ name?: string; phone?: string; email?: string; whatsapp?: string }>({})
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'info' | 'success' | 'error'; message: string }>>([])
  
  // Bulk actions
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false)
  
  // CSV import
  const [showCSVImport, setShowCSVImport] = useState(false)
  const [csvFile, setCSVFile] = useState<File | null>(null)
  const [csvPreview, setCSVPreview] = useState<CSVRow[]>([])
  const [csvImporting, setCSVImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Filtering and sorting
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12)

  // Toast helpers
  const addToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.floor(Math.random() * 1_000_000_000)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  // Validation
  const phoneRegex = /^\+?[1-9]\d{7,14}$/
  const contactFormSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    phone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number with country code'),
    email: z.string().trim().email('Invalid email').optional(),
    whatsapp: z.string().trim().regex(phoneRegex, 'Enter a valid phone number with country code').optional()
  })

  const validateForm = (form: { name: string; phone: string; email: string; whatsapp: string }) => {
    const values = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() ? form.email.trim() : undefined,
      whatsapp: form.whatsapp.trim() ? form.whatsapp.trim() : undefined
    }
    const result = contactFormSchema.safeParse(values)
    if (!result.success) {
      const errs: { name?: string; phone?: string; email?: string; whatsapp?: string } = {}
      for (const issue of result.error.issues) {
        const key = (issue.path[0] as 'name' | 'phone' | 'email' | 'whatsapp')
        errs[key] = issue.message
      }
      return errs
    }
    return {}
  }

  // Fetch contacts
  const fetchContacts = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      const response = await fetch('/api/contacts', { cache: 'no-store' })
      const data = await response.json()
      if (data.success) {
        setContacts(data.data || [])
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
      addToast('Failed to fetch contacts', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Manual refresh
  const handleRefresh = () => {
    fetchContacts(false)
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  // CRUD helpers (UI wiring added below)
  const addContact = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validateForm(newContact)
    setAddErrors(errs)
    if (Object.keys(errs).length > 0) {
      addToast('Please fix the highlighted errors', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact)
      })
      if (res.ok) {
        const r = await fetch('/api/contacts')
        const j = await r.json()
        setContacts((j?.data ?? []) as Contact[])
        setNewContact({ name: '', phone: '', email: '', whatsapp: '' })
        setShowAddForm(false)
        setAddErrors({})
        addToast('Contact added successfully', 'success')
      } else {
        const err = await res.json()
        addToast(`Error: ${err.error}`, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (c: Contact) => {
    setEditingContact(c)
    setEditForm({ name: c.name, phone: c.phone, email: c.email ?? '', whatsapp: c.whatsapp ?? '' })
  }

  const cancelEdit = () => {
    setEditingContact(null)
    setEditForm({ name: '', phone: '', email: '', whatsapp: '' })
  }

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editingContact) return
    const errs = validateForm(editForm)
    setEditErrors(errs)
    if (Object.keys(errs).length > 0) {
      addToast('Please fix the highlighted errors', 'error')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        const r = await fetch('/api/contacts')
        const j = await r.json()
        setContacts((j?.data ?? []) as Contact[])
        cancelEdit()
        setEditErrors({})
        addToast('Contact updated successfully', 'success')
      } else {
        const err = await res.json()
        addToast(`Error: ${err.error}`, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const deleteContact = async (id: string) => {
    setDeletingContact(id)
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      if (res.ok) {
        const r = await fetch('/api/contacts')
        const j = await r.json()
        setContacts((j?.data ?? []) as Contact[])
        addToast('Contact deleted successfully', 'success')
      } else {
        const err = await res.json()
        addToast(`Error: ${err.error}`, 'error')
      }
    } finally {
      setDeletingContact(null)
    }
  }

  // CSV Template Download
  const downloadCSVTemplate = () => {
    const headers = ['name', 'phone', 'email', 'whatsapp', 'location', 'role']
    const exampleRows = [
      ['John Doe', '+14155551234', 'john.doe@example.com', '+14155551234', 'San Francisco, CA', 'Emergency Coordinator'],
      ['Jane Smith', '+442071234567', 'jane.smith@example.com', '+442071234567', 'London, UK', 'First Responder'],
      ['Carlos Rodriguez', '+34912345678', '', '+34912345678', 'Madrid, Spain', 'Field Officer']
    ]
    
    const csvContent = [
      headers.join(','),
      ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    addToast('Template downloaded successfully', 'success')
  }

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Email', 'WhatsApp', 'Location', 'Role', 'Status', 'Created At']
    const rows = contacts.map(c => [
      c.name,
      c.phone,
      c.email || '',
      c.whatsapp || '',
      c.location || '',
      c.role || '',
      c.active ? 'Active' : 'Inactive',
      new Date(c.createdAt).toLocaleDateString()
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    addToast('Contacts exported successfully', 'success')
  }

  // CSV Import - Parse file
  const handleCSVUpload = (file: File) => {
    setCSVFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())
      
      const parsed: CSVRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const row: CSVRow = {
          name: values[headers.indexOf('name')] || '',
          phone: values[headers.indexOf('phone')] || '',
          email: values[headers.indexOf('email')] || undefined,
          whatsapp: values[headers.indexOf('whatsapp')] || undefined,
          location: values[headers.indexOf('location')] || undefined,
          role: values[headers.indexOf('role')] || undefined,
        }
        if (row.name && row.phone) {
          parsed.push(row)
        }
      }
      setCSVPreview(parsed)
    }
    reader.readAsText(file)
  }

  // CSV Import - Confirm and import
  const confirmCSVImport = async () => {
    setCSVImporting(true)
    try {
      const promises = csvPreview.map(row =>
        fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row)
        })
      )
      await Promise.all(promises)
      await fetchContacts(false)
      setShowCSVImport(false)
      setCSVFile(null)
      setCSVPreview([])
      addToast(`Successfully imported ${csvPreview.length} contacts`, 'success')
    } catch (error) {
      addToast('Failed to import contacts', 'error')
    } finally {
      setCSVImporting(false)
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'text/csv') {
      handleCSVUpload(file)
    } else {
      addToast('Please upload a CSV file', 'error')
    }
  }

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedContacts.size === filteredAndSortedContacts.length) {
      setSelectedContacts(new Set())
    } else {
      setSelectedContacts(new Set(filteredAndSortedContacts.map(c => c.id)))
    }
  }

  const toggleSelectContact = (id: string) => {
    const newSet = new Set(selectedContacts)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedContacts(newSet)
  }

  const bulkDelete = async () => {
    if (selectedContacts.size === 0) return
    if (!confirm(`Delete ${selectedContacts.size} contact(s)?`)) return
    
    setBulkActionInProgress(true)
    try {
      const promises = Array.from(selectedContacts).map(id =>
        fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      )
      await Promise.all(promises)
      await fetchContacts(false)
      setSelectedContacts(new Set())
      setShowBulkActions(false)
      addToast(`Successfully deleted ${promises.length} contact(s)`, 'success')
    } catch (error) {
      addToast('Failed to delete contacts', 'error')
    } finally {
      setBulkActionInProgress(false)
    }
  }

  const bulkActivate = async () => {
    if (selectedContacts.size === 0) return
    setBulkActionInProgress(true)
    try {
      const promises = Array.from(selectedContacts).map(id => {
        const contact = contacts.find(c => c.id === id)
        return fetch(`/api/contacts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...contact, active: true })
        })
      })
      await Promise.all(promises)
      await fetchContacts(false)
      setSelectedContacts(new Set())
      setShowBulkActions(false)
      addToast(`Successfully activated ${promises.length} contact(s)`, 'success')
    } catch (error) {
      addToast('Failed to activate contacts', 'error')
    } finally {
      setBulkActionInProgress(false)
    }
  }

  const bulkDeactivate = async () => {
    if (selectedContacts.size === 0) return
    setBulkActionInProgress(true)
    try {
      const promises = Array.from(selectedContacts).map(id => {
        const contact = contacts.find(c => c.id === id)
        return fetch(`/api/contacts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...contact, active: false })
        })
      })
      await Promise.all(promises)
      await fetchContacts(false)
      setSelectedContacts(new Set())
      setShowBulkActions(false)
      addToast(`Successfully deactivated ${promises.length} contact(s)`, 'success')
    } catch (error) {
      addToast('Failed to deactivate contacts', 'error')
    } finally {
      setBulkActionInProgress(false)
    }
  }

  // Filtering and sorting
  const filteredAndSortedContacts = useMemo(() => {
    let filtered = contacts.filter((contact: Contact) => {
      const matchesSearch = contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone?.includes(searchTerm) ||
        (contact.email?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      
      const matchesStatus = filterStatus === 'all' ? true :
        filterStatus === 'active' ? contact.active : !contact.active
      
      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        const comparison = a.name.localeCompare(b.name)
        return sortOrder === 'asc' ? comparison : -comparison
      } else {
        const comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        return sortOrder === 'asc' ? comparison : -comparison
      }
    })

    return filtered
  }, [contacts, searchTerm, filterStatus, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedContacts.length / itemsPerPage)
  const paginatedContacts = filteredAndSortedContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus, sortBy, sortOrder])

  return (
    <AuthGuard>
      <AppLayout 
        title="Contacts"
        breadcrumbs={[
          { label: 'Contacts' }
        ]}
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
                  placeholder="Search contacts..."
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
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
                    className="appearance-none pl-3 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [newSortBy, newSortOrder] = e.target.value.split('-') as [('name' | 'date'), ('asc' | 'desc')]
                      setSortBy(newSortBy)
                      setSortOrder(newSortOrder)
                    }}
                    className="appearance-none pl-3 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-sm"
                  >
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
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
                title="Refresh contacts"
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

              {/* Import CSV */}
              <button
                onClick={() => setShowCSVImport(true)}
                className="inline-flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </button>

              {/* Bulk Actions */}
              {selectedContacts.size > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {selectedContacts.size} Selected
                    <MoreVertical className="h-4 w-4 ml-2" />
                  </button>
                  
                  {showBulkActions && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                      <button
                        onClick={() => {
                          const ids = Array.from(selectedContacts).join(',')
                          window.location.href = `/dashboard/contacts/bulk-assign?contacts=${ids}`
                        }}
                        disabled={bulkActionInProgress}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 disabled:opacity-50 text-blue-600 font-medium"
                      >
                        <Ship className="inline h-4 w-4 mr-2" />
                        Assign to Vessels
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={bulkActivate}
                        disabled={bulkActionInProgress}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                      >
                        <UserCheck className="inline h-4 w-4 mr-2" />
                        Activate
                      </button>
                      <button
                        onClick={bulkDeactivate}
                        disabled={bulkActionInProgress}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                      >
                        <AlertCircle className="inline h-4 w-4 mr-2" />
                        Deactivate
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={bulkDelete}
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

              {/* Add Contact */}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg shadow-blue-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </button>
            </div>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {showAddForm && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Add New Contact</h3>
              <p className="text-sm text-slate-600 mb-4">Add contact details for multi-channel alerts (SMS, WhatsApp, Email)</p>
              <form onSubmit={addContact} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className={`w-full px-3 py-2 border ${addErrors.name ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Enter contact name"
                    required
                  />
                  {addErrors.name && <p className="text-xs text-red-600 mt-1">{addErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className={`w-full px-3 py-2 border ${addErrors.phone ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="+1234567890"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Include country code (e.g., +1 for US, +91 for India)</p>
                  {addErrors.phone && <p className="text-xs text-red-600 mt-1">{addErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className={`w-full px-3 py-2 border ${addErrors.email ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="email@example.com"
                  />
                  {addErrors.email && <p className="text-xs text-red-600 mt-1">{addErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={newContact.whatsapp}
                    onChange={(e) => setNewContact({ ...newContact, whatsapp: e.target.value })}
                    className={`w-full px-3 py-2 border ${addErrors.whatsapp ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="+1234567890"
                  />
                  {addErrors.whatsapp && <p className="text-xs text-red-600 mt-1">{addErrors.whatsapp}</p>}
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60">
                    {submitting ? 'Adding...' : 'Add Contact'}
                  </button>
                  <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-600">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Hero Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Total Contacts */}
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
              <h3 className="text-sm font-medium text-blue-900/70 mb-1">Total Contacts</h3>
              <p className="text-3xl font-bold text-blue-900">{contacts.length}</p>
            </div>

            {/* Active Contacts */}
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
              <h3 className="text-sm font-medium text-green-900/70 mb-1">Active Contacts</h3>
              <p className="text-3xl font-bold text-green-900">{contacts.filter((c: Contact) => c.active).length}</p>
            </div>

            {/* Email Contacts */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-purple-900/70 mb-1">With Email</h3>
              <p className="text-3xl font-bold text-purple-900">{contacts.filter((c: Contact) => c.email).length}</p>
            </div>

            {/* WhatsApp Contacts */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <MessageCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <h3 className="text-sm font-medium text-emerald-900/70 mb-1">With WhatsApp</h3>
              <p className="text-3xl font-bold text-emerald-900">{contacts.filter((c: Contact) => c.whatsapp).length}</p>
            </div>
          </div>

          {editingContact && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Edit Contact: {editingContact.name}</h3>
              <form onSubmit={saveEdit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className={`w-full px-3 py-2 border ${editErrors.name ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                  {editErrors.name && <p className="text-xs text-red-600 mt-1">{editErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className={`w-full px-3 py-2 border ${editErrors.phone ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                  {editErrors.phone && <p className="text-xs text-red-600 mt-1">{editErrors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className={`w-full px-3 py-2 border ${editErrors.email ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {editErrors.email && <p className="text-xs text-red-600 mt-1">{editErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={editForm.whatsapp}
                    onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                    className={`w-full px-3 py-2 border ${editErrors.whatsapp ? 'border-red-500' : 'border-slate-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {editErrors.whatsapp && <p className="text-xs text-red-600 mt-1">{editErrors.whatsapp}</p>}
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60">
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-slate-500 text-white rounded-md hover:bg-slate-600">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CSV Import Modal */}
          {showCSVImport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowCSVImport(false)} />
              <div className="relative z-10 w-full max-w-3xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Import Contacts from CSV</h3>
                    <p className="text-sm text-slate-500 mt-1">Upload a CSV file with your contact information</p>
                  </div>
                  <button onClick={() => setShowCSVImport(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6">
                  {csvPreview.length === 0 ? (
                    <>
                      {/* Formatting Instructions */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          CSV Format Requirements
                        </h4>
                        <div className="text-sm text-blue-800 space-y-2">
                          <div>
                            <strong>Required Columns:</strong>
                            <ul className="list-disc list-inside ml-2 mt-1">
                              <li><code className="bg-white px-1 py-0.5 rounded">name</code> - Contact's full name (required)</li>
                              <li><code className="bg-white px-1 py-0.5 rounded">phone</code> - Phone number with country code (required, e.g., +14155551234)</li>
                            </ul>
                          </div>
                          <div>
                            <strong>Optional Columns:</strong>
                            <ul className="list-disc list-inside ml-2 mt-1">
                              <li><code className="bg-white px-1 py-0.5 rounded">email</code> - Email address</li>
                              <li><code className="bg-white px-1 py-0.5 rounded">whatsapp</code> - WhatsApp number with country code (e.g., +442071234567)</li>
                              <li><code className="bg-white px-1 py-0.5 rounded">location</code> - Location or address</li>
                              <li><code className="bg-white px-1 py-0.5 rounded">role</code> - Contact's role or title</li>
                            </ul>
                          </div>
                          <div className="bg-white rounded p-2 mt-2">
                            <strong className="text-blue-900">Phone Format:</strong> Must include country code starting with + (e.g., +1 for US, +44 for UK, +91 for India)
                          </div>
                        </div>
                      </div>

                      {/* Download Template Button */}
                      <div className="flex items-center justify-center mb-6">
                        <button
                          onClick={downloadCSVTemplate}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-200"
                        >
                          <Download className="h-5 w-5" />
                          Download CSV Template
                        </button>
                      </div>

                      <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-slate-500">or upload your own file</span>
                        </div>
                      </div>

                      {/* Upload Area */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                          dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'
                        }`}
                      >
                        <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-900 font-medium mb-2">Drag and drop your CSV file here</p>
                        <p className="text-sm text-slate-600 mb-4">or click to browse</p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          onChange={(e) => e.target.files?.[0] && handleCSVUpload(e.target.files[0])}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Select CSV File
                        </button>
                      </div>
                    </>
                ) : (
                  <div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-green-800">
                        <strong>{csvPreview.length} contacts</strong> ready to import
                      </p>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left">Name</th>
                            <th className="px-4 py-2 text-left">Phone</th>
                            <th className="px-4 py-2 text-left">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.slice(0, 10).map((row, idx) => (
                            <tr key={idx} className="border-t border-slate-100">
                              <td className="px-4 py-2">{row.name}</td>
                              <td className="px-4 py-2">{row.phone}</td>
                              <td className="px-4 py-2">{row.email || '-'}</td>
                            </tr>
                          ))}
                          {csvPreview.length > 10 && (
                            <tr className="border-t border-slate-100">
                              <td colSpan={3} className="px-4 py-2 text-center text-slate-500">
                                ... and {csvPreview.length - 10} more
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => {
                          setCSVPreview([])
                          setCSVFile(null)
                        }}
                        className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmCSVImport}
                        disabled={csvImporting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {csvImporting ? 'Importing...' : 'Confirm Import'}
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          )}

          {/* Contacts List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Contact Directory</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Showing {paginatedContacts.length} of {filteredAndSortedContacts.length} contacts
                  </p>
                </div>
                {filteredAndSortedContacts.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                  >
                    {selectedContacts.size === filteredAndSortedContacts.length ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    Select All
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-slate-600">Loading contacts...</p>
                </div>
              ) : filteredAndSortedContacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    {searchTerm ? 'No Matching Contacts' : 'No Contacts Found'}
                  </h3>
                  <p className="text-slate-600">
                    {searchTerm 
                      ? 'Try adjusting your search terms.' 
                      : 'Add contacts to start building your emergency notification list.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedContacts.map((contact: Contact) => (
                    <div 
                      key={contact.id} 
                      className={`relative border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                        selectedContacts.has(contact.id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelectContact(contact.id)}
                        className="absolute top-4 right-4 z-10"
                      >
                        {selectedContacts.has(contact.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )}
                      </button>

                      <div className="flex items-start justify-between mb-4 pr-8">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 text-lg">{contact.name || 'Unknown Contact'}</h4>
                          <p className="text-sm text-slate-600 mt-1">{contact.role || 'Emergency Contact'}</p>
                        </div>
                        <div className={`mt-1 w-3 h-3 rounded-full ${contact.active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                      </div>
                      
                      <div className="space-y-2">
                        {contact.phone && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Phone className="h-3 w-3 mr-2" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center text-sm text-slate-600">
                            <Mail className="h-3 w-3 mr-2" />
                            {contact.email}
                          </div>
                        )}
                        {contact.whatsapp && (
                          <div className="flex items-center text-sm text-slate-600">
                            <MessageCircle className="h-3 w-3 mr-2" />
                            {contact.whatsapp}
                          </div>
                        )}
                        {contact.location && (
                          <div className="flex items-center text-sm text-slate-600">
                            <MapPin className="h-3 w-3 mr-2" />
                            {contact.location}
                          </div>
                        )}
                      </div>
                      

                      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => startEdit(contact)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setPendingDelete(contact)}
                          disabled={deletingContact === contact.id}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-6 border-t border-slate-200">
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
          </div>

          {/* Confirm Delete Modal */}
          {pendingDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setPendingDelete(null)} />
              <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Delete Contact</h3>
                <p className="text-slate-600 mt-2">Are you sure you want to delete <span className="font-medium">{pendingDelete.name}</span>? This action cannot be undone.</p>
                <div className="mt-6 flex justify-end gap-2">
                  <button onClick={() => setPendingDelete(null)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300">Cancel</button>
                  <button
                    onClick={() => { const id = pendingDelete.id; setPendingDelete(null); deleteContact(id) }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Toasts */}
          {toasts.length > 0 && (
            <div className="fixed top-4 right-4 z-50 space-y-2">
              {toasts.map(t => (
                <div
                  key={t.id}
                  role="status"
                  className={`min-w-[260px] max-w-sm px-4 py-3 rounded-md shadow-lg border text-sm ${
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
