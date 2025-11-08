import { Shield, CheckCircle, FileText, Award } from 'lucide-react'
import Link from 'next/link'
import WorkInProgressBanner from '@/components/common/WorkInProgressBanner'
import PublicPageHeader from '@/components/public/PublicPageHeader'
import PublicPageContent, { ContentSection, SectionTitle, Card, GradientCard } from '@/components/public/PublicPageContent'

export default function CompliancePage() {
  const securityPractices = [
    {
      name: 'Industry-Standard Security',
      description: 'Comprehensive security measures following industry best practices',
      status: 'Active',
      icon: Shield,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      name: 'Data Protection',
      description: 'Robust data protection practices aligned with international standards',
      status: 'Active',
      icon: Award,
      color: 'bg-green-100 text-green-600'
    },
    {
      name: 'Privacy Controls',
      description: 'User privacy controls and transparent data handling',
      status: 'Active',
      icon: FileText,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      name: 'Security Monitoring',
      description: 'Continuous security monitoring and incident response',
      status: 'Active',
      icon: CheckCircle,
      color: 'bg-orange-100 text-orange-600'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <WorkInProgressBanner />
      <PublicPageHeader 
        title="Security & Data Protection"
        subtitle="We maintain industry-standard security practices to protect your data and continuously work toward comprehensive compliance."
      />
      
      <PublicPageContent maxWidth="6xl">

          <ContentSection>
            <SectionTitle>Security Practices</SectionTitle>
            <div className="grid md:grid-cols-2 gap-6">
              {securityPractices.map((cert, index) => (
                <Card key={index} className="p-6 hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cert.color} shadow-lg`}>
                      <cert.icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-slate-900 tracking-tight">{cert.name}</h3>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                          {cert.status}
                        </span>
                      </div>
                      <p className="text-slate-600 font-light leading-relaxed">{cert.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ContentSection>

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Security Framework</h2>
              <p className="text-slate-700 mb-4">
                Our security practices follow industry-standard frameworks and best practices to protect your data:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Security controls and role-based access management</li>
                <li>System availability and performance monitoring</li>
                <li>Data processing integrity and accuracy</li>
                <li>Confidentiality of customer information</li>
                <li>Privacy protection and transparent data handling</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Protection Compliance</h2>
              <p className="text-slate-700 mb-4">
                We comply with major data protection regulations worldwide:
              </p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Working Toward GDPR Alignment</h3>
                  <ul className="list-disc pl-6 space-y-1 text-slate-700">
                    <li>Transparent privacy policy and data collection disclosure</li>
                    <li>User privacy controls in settings</li>
                    <li>Secure data handling and encryption</li>
                    <li>Security monitoring and incident response</li>
                    <li>Continuous improvement toward full compliance</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Privacy Rights</h3>
                  <ul className="list-disc pl-6 space-y-1 text-slate-700">
                    <li>Transparent disclosure of data collection practices</li>
                    <li>User settings for notification preferences</li>
                    <li>Secure data handling and access controls</li>
                    <li>Privacy-focused product development</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Industry Standards</h2>
              <p className="text-slate-700 mb-4">
                Our security and operational practices align with industry-leading standards:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>NIST Cybersecurity Framework:</strong> Following cybersecurity risk management best practices</li>
                <li><strong>OWASP Top 10:</strong> Web application security best practices</li>
                <li><strong>CIS Controls:</strong> Implementing critical security controls</li>
                <li><strong>Industry Best Practices:</strong> Continuous improvement toward recognized standards</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Emergency Services Compliance</h2>
              <p className="text-slate-700 mb-4">
                As an emergency alert system, we maintain compliance with emergency services regulations:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>FCC Regulations:</strong> Compliance with emergency alert system requirements</li>
                <li><strong>FEMA Guidelines:</strong> Adherence to federal emergency management standards</li>
                <li><strong>State Regulations:</strong> Compliance with state-specific emergency notification laws</li>
                <li><strong>International Standards:</strong> Alignment with global emergency communication protocols</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Security Monitoring & Reviews</h2>
              <p className="text-slate-700 mb-4">
                We maintain transparency through regular security reviews and monitoring:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Regular Security Reviews:</strong> Ongoing security assessments and improvements</li>
                <li><strong>Security Monitoring:</strong> Continuous monitoring of system security</li>
                <li><strong>Compliance Tracking:</strong> Monitoring of regulatory requirements and industry standards</li>
                <li><strong>Transparent Communication:</strong> Clear disclosure of our security practices</li>
                <li><strong>Incident Response:</strong> Documented procedures for security incidents</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Residency and Sovereignty</h2>
              <p className="text-slate-700 mb-4">
                We offer flexible data residency options to meet regulatory requirements:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Geographic Data Centers:</strong> Multiple regions available for data storage</li>
                <li><strong>Data Localization:</strong> Options to keep data within specific jurisdictions</li>
                <li><strong>Cross-Border Transfers:</strong> Appropriate safeguards for international data transfers</li>
                <li><strong>Sovereignty Compliance:</strong> Adherence to local data sovereignty laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Security Documentation</h2>
              <p className="text-slate-700 mb-4">
                Enterprise customers can request security documentation:
              </p>
              <div className="bg-slate-50 rounded-lg p-6">
                <ul className="space-y-2 text-slate-700">
                  <li>• Security architecture overview</li>
                  <li>• Data handling procedures</li>
                  <li>• Privacy policy and terms of service</li>
                  <li>• Data processing agreements</li>
                  <li>• Security questionnaire responses</li>
                </ul>
                <p className="text-sm text-slate-600 mt-4">
                  Contact your account manager or email security@emergencyalert.com for documentation requests.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Security Team</h2>
              <p className="text-slate-700">
                For security-related questions or documentation requests:
              </p>
              <div className="bg-slate-50 rounded-lg p-4 mt-4">
                <p className="text-slate-700">
                  <strong>Email:</strong> security@emergencyalert.com<br />
                  <strong>Phone:</strong> +1 (555) 123-4567<br />
                  <strong>Response Time:</strong> Within 48 hours for security inquiries
                </p>
              </div>
            </section>
          </div>
      </PublicPageContent>
    </div>
  )
}
