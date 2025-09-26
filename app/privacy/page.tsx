import { Shield } from 'lucide-react'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
          
          <p className="text-lg text-slate-600 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="space-y-8">
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
                <li>SOC 2 Type II compliance and regular security audits</li>
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
                  <strong>Email:</strong> privacy@emergencyalert.com<br />
                  <strong>Phone:</strong> +1 (555) 123-4567<br />
                  <strong>Address:</strong> Emergency Alert Command Center, Privacy Office
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
