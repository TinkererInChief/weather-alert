'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'
import { getStaticDateString } from '@/lib/date-utils'
import WorkInProgressBanner from '@/components/common/WorkInProgressBanner'
import PublicPageHeader from '@/components/public/PublicPageHeader'
import PublicPageContent, { ContentSection, SectionTitle, Card, GradientCard } from '@/components/public/PublicPageContent'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <WorkInProgressBanner />
      <PublicPageHeader 
        title="Terms of Service"
        subtitle={`Legal terms and conditions for using our emergency alert service. Last updated: ${getStaticDateString()}`}
      />
      
      <PublicPageContent maxWidth="4xl">

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-slate-700">
                By accessing and using the Emergency Alert Command Center service, you accept and agree 
                to be bound by the terms and provision of this agreement. If you do not agree to abide 
                by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Service Description</h2>
              <p className="text-slate-700 mb-4">
                Emergency Alert Command Center provides real-time earthquake and tsunami monitoring 
                with multi-channel emergency notifications including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>24/7 seismic event monitoring and detection</li>
                <li>Instant notifications via SMS, email, WhatsApp, and voice calls</li>
                <li>Location-based alert targeting</li>
                <li>Contact management and notification preferences</li>
                <li>Administrative dashboard and reporting tools</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. User Responsibilities</h2>
              <p className="text-slate-700 mb-4">As a user of our service, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Provide accurate and up-to-date contact information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the service only for legitimate emergency preparedness purposes</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not interfere with or disrupt the service or servers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Service Availability</h2>
              <p className="text-slate-700 mb-4">
                We strive to maintain 99.9% uptime, but cannot guarantee uninterrupted service. 
                The service may be temporarily unavailable due to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Scheduled maintenance and updates</li>
                <li>Technical difficulties or system failures</li>
                <li>Third-party service provider issues</li>
                <li>Force majeure events</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Limitation of Liability</h2>
              <p className="text-slate-700 mb-4">
                While we make every effort to provide accurate and timely emergency alerts, 
                our service is supplementary to official emergency services. We are not liable for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Delayed, failed, or inaccurate alert delivery</li>
                <li>Decisions made based on alert information</li>
                <li>Damages resulting from service interruptions</li>
                <li>Third-party data source inaccuracies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Privacy and Data Protection</h2>
              <p className="text-slate-700">
                Your privacy is important to us. Please review our Privacy Policy to understand 
                how we collect, use, and protect your personal information. By using our service, 
                you consent to our data practices as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Termination</h2>
              <p className="text-slate-700">
                Either party may terminate this agreement at any time. Upon termination, your 
                access to the service will be immediately revoked, and we will delete your 
                personal data in accordance with our Privacy Policy and applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Changes to Terms</h2>
              <p className="text-slate-700">
                We reserve the right to modify these terms at any time. Changes will be effective 
                immediately upon posting. Your continued use of the service constitutes acceptance 
                of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Contact Information</h2>
              <p className="text-slate-700">
                For questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-slate-50 rounded-lg p-4 mt-4">
                <p className="text-slate-700">
                  <strong>Contact:</strong> Please use the contact form to reach our legal team<br />
                  <strong>Address:</strong> Emergency Alert Command Center, Legal Department
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Data Sources, JMA Citation & Legal Caveat</h2>
              <div className="space-y-3 text-slate-700">
                <p>
                  We use government and consortium data sources including USGS, NOAA/NWS (PTWC), IRIS, EMSC, and the Japan Meteorological Agency (JMA).
                  Where required or requested, appropriate attribution is provided on the <a className="text-blue-600 hover:text-blue-700" href="/data-sources">Data Sources</a> page.
                </p>
                <p>
                  <strong>JMA Website Terms of Use.</strong> JMA website content may be used for commercial purposes provided that the source is cited and
                  edited content is clearly labeled as edited and not created by the Government of Japan. Example: “Source: Japan Meteorological Agency website
                  (URL of relevant page). Edited for display.” See JMA Terms: <a className="text-blue-600 hover:text-blue-700" href="https://www.jma.go.jp/jma/en/copyright.html" target="_blank" rel="noopener noreferrer">https://www.jma.go.jp/jma/en/copyright.html</a>.
                </p>
                <p>
                  <strong>Meteorological Service Act (Japan).</strong> Use of JMA content may be subject to the Meteorological Service Act, including licensing for
                  forecasting services and restrictions on issuing “warnings” in Japan (Articles 17 and 23). Our service does not issue official warnings and is not
                  endorsed by JMA. See: <a className="text-blue-600 hover:text-blue-700" href="https://www.japaneselawtranslation.go.jp/en/laws/view/1968" target="_blank" rel="noopener noreferrer">https://www.japaneselawtranslation.go.jp/en/laws/view/1968</a>.
                </p>
              </div>
            </section>
          </div>
      </PublicPageContent>
    </div>
  )
}
