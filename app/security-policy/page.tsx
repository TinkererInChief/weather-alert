import { Shield } from 'lucide-react'
import Link from 'next/link'
import { getStaticDateString } from '@/lib/date-utils'
import WorkInProgressBanner from '@/components/common/WorkInProgressBanner'
import PublicPageHeader from '@/components/public/PublicPageHeader'
import PublicPageContent, { ContentSection, SectionTitle, Card, GradientCard } from '@/components/public/PublicPageContent'

export default function SecurityPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <WorkInProgressBanner />
      <PublicPageHeader 
        title="Security Policy"
        subtitle={`Comprehensive security measures and practices to protect your data and ensure service reliability. Last updated: ${getStaticDateString()}`}
      />
      
      <PublicPageContent maxWidth="4xl">

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Security Framework</h2>
              <p className="text-slate-700 mb-4">
                Emergency Alert Command Center implements a comprehensive security framework based on industry best practices:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>SOC 2 Type II compliance with annual audits</li>
                <li>ISO 27001 information security management standards</li>
                <li>NIST Cybersecurity Framework implementation</li>
                <li>Zero-trust security architecture</li>
                <li>Defense-in-depth security strategy</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Data Protection</h2>
              <p className="text-slate-700 mb-4">
                We protect your data through multiple layers of security controls:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Encryption:</strong> AES-256 encryption at rest and TLS 1.3 in transit</li>
                <li><strong>Access Controls:</strong> Multi-factor authentication and role-based permissions</li>
                <li><strong>Data Segregation:</strong> Logical separation of customer data</li>
                <li><strong>Backup Security:</strong> Encrypted backups with secure key management</li>
                <li><strong>Data Masking:</strong> Sensitive data obfuscation in non-production environments</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Infrastructure Security</h2>
              <p className="text-slate-700 mb-4">
                Our infrastructure is designed with security as the foundation:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Cloud Security:</strong> AWS/Azure enterprise-grade security controls</li>
                <li><strong>Network Security:</strong> VPC isolation, firewalls, and intrusion detection</li>
                <li><strong>Server Hardening:</strong> Minimal attack surface with regular patching</li>
                <li><strong>Container Security:</strong> Secure container images and runtime protection</li>
                <li><strong>API Security:</strong> Rate limiting, authentication, and input validation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Application Security</h2>
              <p className="text-slate-700 mb-4">
                Our applications undergo rigorous security testing and validation:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Secure Development:</strong> OWASP Top 10 compliance and secure coding practices</li>
                <li><strong>Code Review:</strong> Automated and manual security code reviews</li>
                <li><strong>Vulnerability Testing:</strong> Regular penetration testing and vulnerability assessments</li>
                <li><strong>Dependency Management:</strong> Automated scanning for vulnerable dependencies</li>
                <li><strong>Security Headers:</strong> HSTS, CSP, and other protective headers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Access Management</h2>
              <p className="text-slate-700 mb-4">
                We implement strict access controls to protect your data:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Identity Verification:</strong> Multi-factor authentication for all users</li>
                <li><strong>Principle of Least Privilege:</strong> Minimal necessary access rights</li>
                <li><strong>Regular Access Reviews:</strong> Quarterly access audits and cleanup</li>
                <li><strong>Session Management:</strong> Secure session handling with automatic timeouts</li>
                <li><strong>Privileged Access:</strong> Enhanced controls for administrative access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Monitoring and Detection</h2>
              <p className="text-slate-700 mb-4">
                24/7 security monitoring and threat detection capabilities:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>SIEM Integration:</strong> Centralized security event monitoring</li>
                <li><strong>Anomaly Detection:</strong> AI-powered behavioral analysis</li>
                <li><strong>Threat Intelligence:</strong> Real-time threat feed integration</li>
                <li><strong>Incident Response:</strong> 24/7 security operations center</li>
                <li><strong>Audit Logging:</strong> Comprehensive activity logging and retention</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Incident Response</h2>
              <p className="text-slate-700 mb-4">
                Our incident response process ensures rapid containment and recovery:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Response Team:</strong> Dedicated security incident response team</li>
                <li><strong>Response Time:</strong> Initial response within 1 hour for critical incidents</li>
                <li><strong>Communication:</strong> Transparent customer communication during incidents</li>
                <li><strong>Forensics:</strong> Digital forensics capabilities for incident analysis</li>
                <li><strong>Recovery:</strong> Tested disaster recovery and business continuity plans</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Compliance and Auditing</h2>
              <p className="text-slate-700 mb-4">
                Regular audits and compliance assessments ensure ongoing security:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>External Audits:</strong> Annual SOC 2 Type II audits</li>
                <li><strong>Penetration Testing:</strong> Quarterly third-party security assessments</li>
                <li><strong>Compliance Monitoring:</strong> Continuous compliance validation</li>
                <li><strong>Risk Assessments:</strong> Regular security risk evaluations</li>
                <li><strong>Documentation:</strong> Comprehensive security policy documentation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Employee Security</h2>
              <p className="text-slate-700 mb-4">
                Our team undergoes comprehensive security training and background checks:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li><strong>Background Checks:</strong> Thorough screening for all employees</li>
                <li><strong>Security Training:</strong> Regular security awareness training</li>
                <li><strong>Access Controls:</strong> Role-based access with regular reviews</li>
                <li><strong>Confidentiality:</strong> Strict confidentiality agreements</li>
                <li><strong>Termination Procedures:</strong> Secure offboarding processes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Reporting Security Issues</h2>
              <p className="text-slate-700 mb-4">
                We encourage responsible disclosure of security vulnerabilities:
              </p>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-slate-700 mb-2">
                  <strong>Security Contact:</strong> Available via contact form
                </p>
                <p className="text-slate-700 mb-2">
                  <strong>PGP Key:</strong> Available upon request
                </p>
                <p className="text-slate-700">
                  <strong>Response Time:</strong> We acknowledge security reports within 24 hours
                </p>
              </div>
            </section>
          </div>
      </PublicPageContent>
    </div>
  )
}
