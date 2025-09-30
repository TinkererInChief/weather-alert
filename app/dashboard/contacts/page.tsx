'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import AuthGuard from '@/components/auth/AuthGuard'
import { Users, Plus, Search, Phone, Mail, MapPin, Edit, Trash2, MessageCircle } from 'lucide-react'
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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    // Fetch contacts
    const fetchContacts = async () => {
      try {
        const response = await fetch('/api/contacts')
        const data = await response.json()
        if (data.success) {
          setContacts(data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch contacts:', error)
      } finally {
        setLoading(false)
      }
    }

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

  const filteredContacts = contacts.filter((contact: Contact) =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone?.includes(searchTerm) ||
    (contact.email?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
  )

  return (
    <AuthGuard>
      <AppLayout 
        title="Contacts"
        breadcrumbs={[
          { label: 'Contacts' }
        ]}
      >
        <div className="space-y-6">
          {/* Header with Search and Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </button>
          </div>

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

          {/* Contact Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Contacts</p>
                  <p className="text-2xl font-bold text-slate-900">{contacts.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Contacts</p>
                  <p className="text-2xl font-bold text-slate-900">{contacts.filter((c: Contact) => c.active).length}</p>
                </div>
                <Phone className="h-8 w-8 text-green-500" />
              </div>
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

          {/* Contacts List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Contact Directory</h3>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-slate-600">Loading contacts...</p>
                </div>
              ) : filteredContacts.length === 0 ? (
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
                  {filteredContacts.map((contact: Contact) => (
                    <div key={contact.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">{contact.name || 'Unknown Contact'}</h4>
                          <p className="text-sm text-slate-600">{contact.role || 'Emergency Contact'}</p>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${contact.active ? 'bg-green-500' : 'bg-slate-300'}`} />
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
                      
                      {/* Group chips removed */}

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => startEdit(contact)}
                          className="inline-flex items-center px-2.5 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200"
                        >
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setPendingDelete(contact)}
                          disabled={deletingContact === contact.id}
                          className="inline-flex items-center px-2.5 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
