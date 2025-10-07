'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Shield, Users, UserCog, Bell, Settings } from 'lucide-react'
import AuthGuard from '@/components/auth/AuthGuard'
import AppLayout from '@/components/layout/AppLayout'
import { Permission } from '@/lib/rbac/roles'
import UsersAdminPanel from '@/components/admin/UsersAdminPanel'
import ContactsAdminPanel from '@/components/admin/ContactsAdminPanel'
import AlertLogsPanel from '@/components/admin/AlertLogsPanel'
import SystemSettingsPanel from '@/components/admin/SystemSettingsPanel'

type Tab = 'users' | 'contacts' | 'alerts' | 'settings'

function AdminDashboardContent() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<Tab>('users')
  
  const currentUser = session?.user as any
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
  const isOrgAdmin = currentUser?.role === 'ORG_ADMIN'

  const tabs = [
    { id: 'users' as Tab, name: 'User Management', icon: Users },
    { id: 'contacts' as Tab, name: 'Contacts', icon: UserCog },
    { id: 'alerts' as Tab, name: 'Alert Logs', icon: Bell },
    { id: 'settings' as Tab, name: 'System Settings', icon: Settings },
  ]

  return (
    <AppLayout 
      title={isSuperAdmin ? 'Admin Dashboard' : 'Organization Dashboard'}
      breadcrumbs={[{ label: isSuperAdmin ? 'Admin Panel' : 'Organization Panel' }]}
    >
      <div className="space-y-6">
        <div className="mb-4">
          <p className="text-slate-600">
            {isSuperAdmin 
              ? 'System-wide administration and management' 
              : 'Manage your organization users and contacts'}
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="border-b border-slate-200">
            <nav className="flex gap-2 p-2" aria-label="Admin Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'users' && <UsersAdminPanel />}
            {activeTab === 'contacts' && <ContactsAdminPanel />}
            {activeTab === 'alerts' && <AlertLogsPanel />}
            {activeTab === 'settings' && <SystemSettingsPanel />}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function AdminDashboard() {
  return (
    <AuthGuard requiredPermissions={[Permission.MANAGE_USERS]}>
      <AdminDashboardContent />
    </AuthGuard>
  )
}
