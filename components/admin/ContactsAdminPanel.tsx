'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  UserCog, Plus, Edit2, Trash2, Search, Loader2,
  Mail, Phone, MessageCircle, Globe, MapPin, Check, X, Upload, Download, FileSpreadsheet
} from 'lucide-react'

type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  language: string
  timezone: string
  active: boolean
  createdAt: string
}

export default function ContactsAdminPanel() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    language: 'en',
    timezone: 'UTC',
    active: true
  })
  const [processing, setProcessing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [uploadingCSV, setUploadingCSV] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name || (!formData.email && !formData.phone)) {
      alert('Please provide at least a name and email or phone')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch('/api/admin/contacts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchContacts()
        setShowCreateModal(false)
        resetForm()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to create contact')
      }
    } catch (error) {
      console.error('Create error:', error)
      alert('Failed to create contact')
    } finally {
      setProcessing(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingContact) return

    setProcessing(true)
    try {
      const response = await fetch('/api/admin/contacts/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingContact.id, ...formData })
      })

      if (response.ok) {
        await fetchContacts()
        setEditingContact(null)
        resetForm()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update contact')
      }
    } catch (error) {
      console.error('Update error:', error)
      alert('Failed to update contact')
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return

    try {
      const response = await fetch('/api/admin/contacts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (response.ok) {
        await fetchContacts()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete contact')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete contact')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      language: 'en',
      timezone: 'UTC',
      active: true
    })
  }

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact)
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      language: contact.language,
      timezone: contact.timezone,
      active: contact.active
    })
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingCSV(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/contacts/import-csv', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Successfully imported ${data.imported} contacts`)
        await fetchContacts()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to import contacts')
      }
    } catch (error) {
      console.error('CSV upload error:', error)
      alert('Failed to upload CSV file')
    } finally {
      setUploadingCSV(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const downloadCSVTemplate = () => {
    const template = 'name,email,phone,whatsapp,language,timezone\n' +
                     'John Doe,john@example.com,+1234567890,+1234567890,en,America/New_York\n' +
                     'Jane Smith,jane@example.com,+0987654321,,en,UTC'
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const exportContactsCSV = () => {
    const headers = 'name,email,phone,whatsapp,language,timezone,active\n'
    const rows = contacts.map(c => 
      `"${c.name}","${c.email || ''}","${c.phone || ''}","${c.whatsapp || ''}","${c.language}","${c.timezone}","${c.active}"`
    ).join('\n')
    
    const csv = headers + rows
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contacts_export_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone?.includes(searchTerm)
  )

  const activeCount = contacts.filter(c => c.active).length
  const inactiveCount = contacts.filter(c => !c.active).length

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
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-600">Total Contacts</p>
          <p className="text-2xl font-bold text-slate-900">{contacts.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600">Active</p>
          <p className="text-2xl font-bold text-green-900">{activeCount}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-600">Inactive</p>
          <p className="text-2xl font-bold text-slate-900">{inactiveCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadCSVTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200"
            title="Download CSV Template"
          >
            <Download className="h-4 w-4" />
            Template
          </button>
          <button
            onClick={exportContactsCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200"
            title="Export Contacts as CSV"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Import Contacts from CSV"
          >
            {uploadingCSV ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import CSV
          </button>
          <button
            onClick={() => {
              resetForm()
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact Info</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Language</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No contacts found
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{contact.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {contact.email && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </div>
                        )}
                        {contact.whatsapp && (
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <MessageCircle className="h-3 w-3" />
                            {contact.whatsapp}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {contact.language.toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        contact.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {contact.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(contact)}
                          className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Create/Edit Modal */}
      {(showCreateModal || editingContact) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingContact ? 'Edit Contact' : 'Create Contact'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1234567890"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="UTC"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="active" className="text-sm text-slate-700">Active</label>
              </div>
              <div className="flex gap-2 justify-end pt-4">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingContact(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={editingContact ? handleUpdate : handleCreate}
                  disabled={processing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingContact ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
