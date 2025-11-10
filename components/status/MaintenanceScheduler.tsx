'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, AlertCircle, Wrench, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { formatDualTime } from '@/lib/time-display'

type MaintenanceWindow = {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  affectedServices: string[]
  createdAt: string
}

export default function MaintenanceScheduler() {
  const [windows, setWindows] = useState<MaintenanceWindow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    affectedServices: [] as string[],
  })

  const services = ['database', 'redis', 'sms', 'email', 'whatsapp', 'voice', 'usgs', 'noaa']

  useEffect(() => {
    loadWindows()
  }, [])

  const loadWindows = async () => {
    try {
      const res = await fetch('/api/maintenance', { cache: 'no-store' })
      const data = await res.json()
      setWindows(data.windows || [])
    } catch (e) {
      console.error('Failed to load maintenance windows', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (res.ok) {
        setShowForm(false)
        setFormData({ title: '', description: '', startTime: '', endTime: '', affectedServices: [] })
        loadWindows()
      } else {
        alert('Failed to schedule maintenance')
      }
    } catch (e) {
      console.error('Failed to create maintenance window', e)
      alert('Error scheduling maintenance')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Cancel this maintenance window?')) return
    
    try {
      const res = await fetch(`/api/maintenance?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        loadWindows()
      }
    } catch (e) {
      console.error('Failed to delete maintenance window', e)
    }
  }

  const toggleService = (service: string) => {
    setFormData(prev => ({
      ...prev,
      affectedServices: prev.affectedServices.includes(service)
        ? prev.affectedServices.filter(s => s !== service)
        : [...prev.affectedServices, service]
    }))
  }

  const isActive = (window: MaintenanceWindow) => {
    const now = new Date()
    const start = new Date(window.startTime)
    const end = new Date(window.endTime)
    return now >= start && now <= end
  }

  const isPast = (window: MaintenanceWindow) => {
    return new Date(window.endTime) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Maintenance Windows</h3>
          <p className="text-sm text-slate-500 mt-1">Schedule planned downtime to exclude from MTTR</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Schedule Maintenance
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Database Migration"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional details about the maintenance"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Affected Services (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {services.map(service => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={`px-3 py-1 text-sm rounded-lg border transition-colors ${
                      formData.affectedServices.includes(service)
                        ? 'bg-blue-100 border-blue-300 text-blue-900'
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {service.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button type="submit" className="btn btn-primary">
                Schedule Maintenance
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setFormData({ title: '', description: '', startTime: '', endTime: '', affectedServices: [] })
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : windows.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No maintenance windows scheduled</p>
            <p className="text-sm text-slate-500 mt-1">Schedule maintenance to prevent false incident alerts</p>
          </div>
        ) : (
          windows.map(window => {
            const active = isActive(window)
            const past = isPast(window)
            
            return (
              <div
                key={window.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  active ? 'border-blue-400 bg-blue-50' :
                  past ? 'border-slate-200 bg-slate-50 opacity-60' :
                  'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-slate-900">{window.title}</h4>
                      {active && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Active Now
                        </span>
                      )}
                      {past && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-600 rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                    
                    {window.description && (
                      <p className="text-sm text-slate-600 mb-3">{window.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(window.startTime).toLocaleString()} → {new Date(window.endTime).toLocaleString()}
                      </div>
                    </div>
                    
                    {window.affectedServices.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-500">Affected:</span>
                        <div className="flex gap-1 flex-wrap">
                          {window.affectedServices.map(s => (
                            <span key={s} className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded">
                              {s.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!past && (
                    <button
                      onClick={() => handleDelete(window.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cancel maintenance"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
