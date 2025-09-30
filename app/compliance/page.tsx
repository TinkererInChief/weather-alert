import { Shield, CheckCircle, FileText, Award } from 'lucide-react'
import Link from 'next/link'
import WorkInProgressBanner from '@/components/common/WorkInProgressBanner'
import PublicPageHeader from '@/components/public/PublicPageHeader'
import PublicPageContent, { ContentSection, SectionTitle, Card, GradientCard } from '@/components/public/PublicPageContent'

export default function CompliancePage() {
  const certifications = [
    {
      name: 'SOC 2 Type II',
      description: 'Annual audit of security, availability, and confidentiality controls',
      status: 'Current',
      icon: Shield,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      name: 'ISO 27001',
      description: 'Information security management system certification',
      status: 'Current',
      icon: Award,
      color: 'bg-green-100 text-green-600'
    },
    {
      name: 'GDPR Compliance',
      description: 'European Union data protection regulation compliance',
      status: 'Compliant',
      icon: FileText,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      name: 'CCPA Compliance',
      description: 'California Consumer Privacy Act compliance',
      status: 'Compliant',
      icon: CheckCircle,
      color: 'bg-orange-100 text-orange-600'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      <WorkInProgressBanner />
      <PublicPageHeader 
        title="Compliance & Certifications"
        subtitle="We maintain the highest standards of compliance and security to protect your data and ensure regulatory adherence."
      />
      
      <PublicPageContent maxWidth="6xl">

          <ContentSection>
            <SectionTitle>Current Certifications</SectionTitle>
            <div className="grid md:grid-cols-2 gap-6">
              {certifications.map((cert, index) => (
                <Card key={index} className="p-6 hover:scale-[1.02] transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cert.color} shadow-lg`}>
                      <cert.icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-slate-900 tracking-tight">{cert.name}</h3>
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
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
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">SOC 2 Type II Compliance</h2>
              <p className="text-slate-700 mb-4">
                Our SOC 2 Type II audit validates our commitment to security, availability, processing integrity, 
                confidentiality, and privacy. This comprehensive audit is conducted annually by independent third-party auditors.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Security controls and access management</li>
                <li>System availability and performance monitoring</li>
                <li>Data processing integrity and accuracy</li>
                <li>Confidentiality of customer information</li>
                <li>Privacy protection and data handling practices</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Data Protection Compliance</h2>
              <p className="text-slate-700 mb-4">
                We comply with major data protection regulations worldwide:
              </p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">GDPR (General Data Protection Regulation)</h3>
                  <ul className="list-disc pl-6 space-y-1 text-slate-700">
                    <li>Lawful basis for data processing</li>
                    <li>Data subject rights implementation</li>
                    <li>Privacy by design and default</li>
                    <li>Data breach notification procedures</li>
                    <li>Data Protection Impact Assessments (DPIA)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">CCPA (California Consumer Privacy Act)</h3>
                  <ul className="list-disc pl-6 space-y-1 text-slate-700">
                    <li>Consumer right to know about data collection</li>
                    <li>Right to delete personal information</li>
                    <li>Right to opt-out of data sale</li>
                    <li>Non-discrimination for privacy rights exercise</li>
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
                <li><strong>NIST Cybersecurity Framework:</strong> Comprehensive cybersecurity risk management</li>
                <li><strong>ISO 27001:</strong> Information security management system</li>
                <li><strong>OWASP Top 10:</strong> Web application security best practices</li>
                <li><strong>CIS Controls:</strong> Critical security controls implementation</li>
                <li><strong>ITIL:</strong> IT service management framework</li>
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
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Audit and Reporting</h2>
              <p className="text-slate-700 mb-4">
                We maintain transparency through regular audits and compliance reporting:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Annual SOC 2 Audits:</strong> Comprehensive security and compliance review</li>
                <li><strong>Quarterly Security Assessments:</strong> Internal and external security evaluations</li>
                <li><strong>Compliance Monitoring:</strong> Continuous monitoring of regulatory requirements</li>
                <li><strong>Customer Reports:</strong> Compliance status reports available to enterprise customers</li>
                <li><strong>Incident Reporting:</strong> Transparent reporting of security incidents</li>
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
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Compliance Documentation</h2>
              <p className="text-slate-700 mb-4">
                Enterprise customers can access compliance documentation through our customer portal:
              </p>
              <div className="bg-slate-50 rounded-lg p-6">
                <ul className="space-y-2 text-slate-700">
                  <li>• SOC 2 Type II reports</li>
                  <li>• Security assessment summaries</li>
                  <li>• Compliance certificates</li>
                  <li>• Data processing agreements</li>
                  <li>• Business associate agreements (HIPAA)</li>
                </ul>
                <p className="text-sm text-slate-600 mt-4">
                  Contact your account manager or email compliance@emergencyalert.com for access.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Compliance Team</h2>
              <p className="text-slate-700">
                For compliance-related questions or documentation requests:
              </p>
              <div className="bg-slate-50 rounded-lg p-4 mt-4">
                <p className="text-slate-700">
                  <strong>Email:</strong> compliance@emergencyalert.com<br />
                  <strong>Phone:</strong> +1 (555) 123-4567<br />
                  <strong>Response Time:</strong> Within 48 hours for compliance inquiries
                </p>
              </div>
            </section>
          </div>
      </PublicPageContent>
    </div>
  )
}
