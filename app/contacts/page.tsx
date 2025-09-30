'use client'

import React, { useState, useEffect } from 'react'
import { Users, Plus, Edit, Trash2, Phone, Mail, MessageCircle, ArrowLeft } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'

type Contact = {
  id: string
  name: string
  phone: string
  email?: string
  whatsapp?: string
  active: boolean
  createdAt: string
}

export default function ContactsPage() {
  // Temporary redirect to the new dashboard Contacts page to avoid duplicate UIs
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.location.replace('/dashboard/contacts')
      }
    } catch {}
  }, [])

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', whatsapp: '' })
  const [submitting, setSubmitting] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', whatsapp: '' })
  const [deletingContact, setDeletingContact] = useState<string | null>(null)

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data.data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContact.name || !newContact.phone) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact)
      })

      if (response.ok) {
        await fetchContacts()
        setNewContact({ name: '', phone: '', email: '', whatsapp: '' })
        setShowAddForm(false)
        alert('Contact added successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Error adding contact')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (contact: Contact) => {
    setEditingContact(contact)
    setEditForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      whatsapp: contact.whatsapp || ''
    })
  }

  const cancelEdit = () => {
    setEditingContact(null)
    setEditForm({ name: '', phone: '', email: '', whatsapp: '' })
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingContact || !editForm.name || !editForm.phone) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        await fetchContacts()
        cancelEdit()
        alert('Contact updated successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Error updating contact')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteContact = async (contactId: string, contactName: string) => {
    if (!confirm(`Are you sure you want to delete ${contactName}? This action cannot be undone.`)) {
      return
    }

    setDeletingContact(contactId)
    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchContacts()
        alert('Contact deleted successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      alert('Error deleting contact')
    } finally {
      setDeletingContact(null)
    }
  }

  if (loading) {
    return (
      <AppLayout title="Contacts">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-slate-600">Loading contacts...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout 
      title="Emergency Contacts"
      breadcrumbs={[{ label: 'Contacts' }]}
    >
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-slate-600">
              Manage your emergency contact list for multi-channel alerts
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>

        {/* Add Contact Form */}
        {showAddForm && (
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Contact</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add contact details for multi-channel emergency alerts (SMS, WhatsApp, Email, Voice)
            </p>
            <form onSubmit={addContact} className="space-y-4">
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <Users className="h-4 w-4" />
                  Name *
                </label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter contact name"
                  required
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Required for SMS and Voice alerts. Include country code (e.g., +1 for US, +91 for India)
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <Mail className="h-4 w-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Optional. Required for Email alerts.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={newContact.whatsapp}
                  onChange={(e) => setNewContact({ ...newContact, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Optional. Will use phone number if not provided. Include country code.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Contact'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn bg-gray-500 text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Contact Form */}
        {editingContact && (
          <div className="card mb-6 border-2 border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Contact: {editingContact.name}
            </h2>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <Users className="h-4 w-4" />
                  Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter contact name"
                  required
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Required for SMS and Voice alerts. Include country code.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <Mail className="h-4 w-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Optional. Required for Email alerts.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={editForm.whatsapp}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Optional. Will use phone number if not provided.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Contact'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn bg-gray-500 text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Contacts List */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Contact List ({contacts.length} contacts)
          </h2>
          
          {contacts.length > 0 ? (
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`h-3 w-3 rounded-full mt-2 ${contact.active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{contact.name}</h3>
                        
                        {/* Contact Methods */}
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4" />
                            <span>{contact.phone}</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">SMS + Voice</span>
                          </div>
                          
                          {contact.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              <span>{contact.email}</span>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">Email</span>
                            </div>
                          )}
                          
                          {contact.whatsapp && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MessageCircle className="h-4 w-4" />
                              <span>{contact.whatsapp}</span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">WhatsApp</span>
                            </div>
                          )}
                          
                          {!contact.email && !contact.whatsapp && (
                            <div className="text-sm text-gray-500 italic">
                              SMS and Voice only • Consider adding email/WhatsApp for multi-channel alerts
                            </div>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-2">
                          Added: {new Date(contact.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        contact.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {contact.active ? 'Active' : 'Inactive'}
                      </span>
                      
                      <button
                        onClick={() => startEdit(contact)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="Edit contact"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => deleteContact(contact.id, contact.name)}
                        disabled={deletingContact === contact.id}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Delete contact"
                      >
                        {deletingContact === contact.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No contacts added yet.</p>
              <p className="text-sm">Add your first emergency contact to get started.</p>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  )
}