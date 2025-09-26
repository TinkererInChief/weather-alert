import { Shield } from 'lucide-react'
import Link from 'next/link'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold">Emergency Alert</h3>
                <p className="text-xs text-slate-300">Command Center</p>
              </div>
            </Link>
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="prose prose-slate max-w-none">
          <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>
          
          <p className="text-lg text-slate-600 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="space-y-8">
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
                  <strong>Email:</strong> legal@emergencyalert.com<br />
                  <strong>Phone:</strong> +1 (555) 123-4567<br />
                  <strong>Address:</strong> Emergency Alert Command Center, Legal Department
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
