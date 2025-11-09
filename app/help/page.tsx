'use client'

import { Shield, Search, Book, MessageCircle, Phone, Mail, ChevronRight, AlertTriangle, Settings, Users, Bell } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import WorkInProgressBanner from '@/components/common/WorkInProgressBanner'
import PublicPageHeader from '@/components/public/PublicPageHeader'
import PublicPageContent, { ContentSection, SectionTitle, Card, GradientCard } from '@/components/public/PublicPageContent'

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const categories = [
    {
      icon: Book,
      title: 'Getting Started',
      description: 'Learn the basics of setting up and using your emergency alert system',
      articles: [
        'Quick Start Guide',
        'Setting Up Your First Alert',
        'Adding Contacts and Groups',
        'Understanding Alert Levels'
      ]
    },
    {
      icon: Settings,
      title: 'System Configuration',
      description: 'Configure your system settings and notification preferences',
      articles: [
        'Notification Channel Setup',
        'Geographic Zone Configuration',
        'Alert Level Customization',
        'Integration Settings'
      ]
    },
    {
      icon: Users,
      title: 'Contact Management',
      description: 'Manage your contacts, groups, and notification preferences',
      articles: [
        'Adding and Organizing Contacts',
        'Creating Contact Groups',
        'Managing Notification Preferences',
        'Bulk Contact Import'
      ]
    },
    {
      icon: Bell,
      title: 'Alert Management',
      description: 'Create, send, and track emergency alerts and notifications',
      articles: [
        'Creating Custom Alerts',
        'Alert Templates and Scheduling',
        'Tracking Alert Delivery',
        'Emergency Broadcast Procedures'
      ]
    },
    {
      icon: AlertTriangle,
      title: 'Troubleshooting',
      description: 'Common issues and solutions for system problems',
      articles: [
        'Alert Delivery Issues',
        'Login and Authentication Problems',
        'Notification Channel Failures',
        'System Performance Issues'
      ]
    }
  ]

  const popularArticles = [
    'How to set up SMS notifications',
    'Understanding alert severity levels',
    'Configuring geographic alert zones',
    'Troubleshooting failed alert delivery',
    'Setting up WhatsApp notifications',
    'Managing contact groups effectively'
  ]

  return (
    <div className="min-h-screen bg-white">
      <WorkInProgressBanner />
      <PublicPageHeader 
        title="Help Center"
        subtitle="Find answers, get support, and learn how to make the most of your emergency alert system."
      />
      
      <PublicPageContent maxWidth="7xl">
        {/* Search Bar */}
        <ContentSection>
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search for help articles, guides, and FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg shadow-sm"
            />
          </div>
        </ContentSection>

        {/* Quick Support */}
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 mb-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Need Immediate Help?</h2>
            <p className="text-slate-600">Our support team is here to help you 24/7</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <Phone className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Emergency Support</h3>
              <p className="text-sm text-slate-600 mb-3">24/7 emergency hotline for critical issues</p>
              <button className="text-blue-600 font-semibold hover:text-blue-700">Contact Support</button>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <MessageCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Live Chat</h3>
              <p className="text-sm text-slate-600 mb-3">Chat with our support team in real-time</p>
              <button className="text-green-600 font-semibold hover:text-green-700">Start Chat</button>
            </div>
            <div className="bg-white rounded-xl p-6 text-center shadow-sm">
              <Mail className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">Email Support</h3>
              <p className="text-sm text-slate-600 mb-3">Get detailed help via email</p>
              <button className="text-purple-600 font-semibold hover:text-purple-700">Send Email</button>
            </div>
          </div>
        </div>

        {/* Help Categories */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Browse by Category</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <div key={index} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center mb-4">
                  <category.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{category.title}</h3>
                <p className="text-slate-600 mb-4">{category.description}</p>
                <ul className="space-y-2">
                  {category.articles.map((article, articleIndex) => (
                    <li key={articleIndex} className="flex items-center text-sm text-slate-600 hover:text-blue-600 cursor-pointer">
                      <ChevronRight className="h-4 w-4 mr-2 flex-shrink-0" />
                      {article}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Articles */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Popular Articles</h2>
          <div className="bg-slate-50 rounded-2xl p-8">
            <div className="grid md:grid-cols-2 gap-4">
              {popularArticles.map((article, index) => (
                <div key={index} className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <Book className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
                  <span className="text-slate-700 hover:text-blue-600">{article}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mb-12">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">System Status: All Systems Operational</h2>
            <p className="text-slate-600 mb-4">
              All emergency alert services are running normally with 99.9% uptime.
            </p>
            <Link 
              href="/status"
              className="inline-flex items-center text-green-600 hover:text-green-700 font-semibold"
            >
              View Detailed Status
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-2">How quickly are alerts delivered?</h3>
              <p className="text-slate-600">Our system delivers alerts within 30 seconds of detection, with most alerts arriving in under 15 seconds.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-2">What notification channels are supported?</h3>
              <p className="text-slate-600">We support SMS, email, WhatsApp, and voice calls. You can configure which channels to use for different alert levels.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-2">Can I customize alert messages?</h3>
              <p className="text-slate-600">Yes, you can create custom alert templates and modify messages for different types of emergencies and alert levels.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-2">How do I add new contacts to the system?</h3>
              <p className="text-slate-600">You can add contacts individually through the dashboard or import them in bulk using CSV files. Each contact can be assigned to specific groups and alert zones.</p>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Still Need Help?</h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Can't find what you're looking for? Our support team is ready to help.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
          >
            Contact Support
          </Link>
        </div>
      </PublicPageContent>
    </div>
  )
}
