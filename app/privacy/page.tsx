'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'
import { getStaticDateString } from '@/lib/date-utils'
import WorkInProgressBanner from '@/components/common/WorkInProgressBanner'
import PublicPageHeader from '@/components/public/PublicPageHeader'
import PublicPageContent, { ContentSection, SectionTitle, Card, GradientCard } from '@/components/public/PublicPageContent'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <WorkInProgressBanner />
      <PublicPageHeader 
        title="Privacy Policy"
        subtitle={`How we collect, use, and protect your personal information. Last updated: ${getStaticDateString()}`}
      />
      
      <PublicPageContent maxWidth="4xl">

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Information We Collect</h2>
              <p className="text-slate-700 mb-4">
                We collect information you provide directly to us, such as when you create an account, 
                subscribe to our emergency alert service, or contact us for support.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Contact information (name, email address, phone number)</li>
                <li>Account credentials and authentication data</li>
                <li>Emergency contact preferences and notification settings</li>
                <li>Location data for targeted emergency alerts</li>
                <li>Usage data and system interaction logs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-slate-700 mb-4">
                We use the information we collect to provide, maintain, and improve our emergency alert services:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Deliver emergency notifications via SMS, email, WhatsApp, and voice calls</li>
                <li>Provide location-based alerts relevant to your area</li>
                <li>Maintain and improve system reliability and performance</li>
                <li>Provide customer support and respond to your inquiries</li>
                <li>Comply with legal obligations and emergency response requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Information Sharing</h2>
              <p className="text-slate-700 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties, except:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>With your explicit consent</li>
                <li>To emergency services during active emergency situations</li>
                <li>To comply with legal obligations or court orders</li>
                <li>With service providers who assist in delivering our services (under strict confidentiality agreements)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Data Security</h2>
              <p className="text-slate-700 mb-4">
                We implement industry-standard security measures to protect your personal information:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>End-to-end encryption for all data transmission</li>
                <li>Industry-standard security practices and regular security reviews</li>
                <li>Multi-factor authentication and access controls</li>
                <li>Regular security monitoring and incident response procedures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Data Retention</h2>
              <p className="text-slate-700">
                We retain your personal information only as long as necessary to provide our services 
                and comply with legal obligations. Emergency alert logs are retained for regulatory 
                compliance and system improvement purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Your Rights</h2>
              <p className="text-slate-700 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Opt-out of non-emergency communications</li>
                <li>Request data portability</li>
                <li>File complaints with relevant data protection authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Contact Us</h2>
              <p className="text-slate-700">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-slate-50 rounded-lg p-4 mt-4">
                <p className="text-slate-700">
                  <strong>Contact:</strong> Please use the contact form to reach our privacy team<br />
                  <strong>Address:</strong> Emergency Alert Command Center, Privacy Office
                </p>
              </div>
            </section>
          </div>
      </PublicPageContent>
    </div>
  )
}
