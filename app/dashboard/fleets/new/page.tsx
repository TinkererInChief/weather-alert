'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Ship, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewFleetPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/fleets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (res.ok) {
        router.push(`/dashboard/fleets/${data.id}`)
      } else {
        setError(data.error || 'Failed to create fleet')
      }
    } catch (err) {
      console.error('Error creating fleet:', err)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout 
      title="Create Fleet" 
      breadcrumbs={[
        { label: 'Fleets', href: '/dashboard/fleets' },
        { label: 'Create' }
      ]}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <Link href="/dashboard/fleets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fleets
          </Button>
        </Link>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Ship className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Create New Fleet</CardTitle>
                <CardDescription>
                  Group vessels together for targeted monitoring and alerts
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Fleet Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Fleet Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Pacific Fleet, Cargo Ships, Tankers"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength={100}
                />
                <p className="text-xs text-gray-500">
                  Choose a descriptive name for your fleet
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this fleet's purpose..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  Help your team understand what this fleet is for
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  ℹ️ After creating your fleet
                </p>
                <ul className="text-sm text-blue-800 space-y-1 ml-5 list-disc">
                  <li>Add vessels to this fleet</li>
                  <li>Configure alert policies specific to this fleet</li>
                  <li>Assign contacts for notifications</li>
                  <li>Monitor all fleet vessels in one place</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Link href="/dashboard/fleets" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={loading || !formData.name.trim()}
                >
                  {loading ? 'Creating...' : 'Create Fleet'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
