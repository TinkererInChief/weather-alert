import { Shield, Server, Globe, Headphones } from 'lucide-react'

const trustElements = [
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 Type II compliant with end-to-end encryption, secure data handling, and regular security audits.',
    features: ['End-to-end encryption', 'SOC 2 Type II certified', 'Regular security audits', 'GDPR compliant']
  },
  {
    icon: Server,
    title: 'Guaranteed Reliability',
    description: '99.9% uptime SLA with redundant infrastructure, automatic failover, and real-time monitoring.',
    features: ['99.9% uptime SLA', 'Redundant infrastructure', 'Automatic failover', 'Real-time monitoring']
  },
  {
    icon: Globe,
    title: 'Global Compliance',
    description: 'GDPR compliant data handling with local data residency options and privacy-first architecture.',
    features: ['GDPR compliant', 'Local data residency', 'Privacy-first design', 'Audit trail logging']
  },
  {
    icon: Headphones,
    title: '24/7 Enterprise Support',
    description: 'Dedicated support team with guaranteed response times and proactive system monitoring.',
    features: ['24/7 support availability', '< 1 hour response time', 'Dedicated account manager', 'Proactive monitoring']
  }
]

export default function TrustSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Built for Enterprise Security & Compliance
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Your organization's safety and data security are our top priorities. We maintain the highest standards of security, reliability, and compliance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {trustElements.map((element, index) => (
            <div key={index} className="bg-slate-50 rounded-2xl p-8 hover:bg-white hover:shadow-lg transition-all duration-300 border border-transparent hover:border-slate-200">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <element.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    {element.title}
                  </h3>
                  <p className="text-slate-600 mb-4 leading-relaxed">
                    {element.description}
                  </p>
                  <ul className="space-y-2">
                    {element.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-slate-600">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-3"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Certifications and Stats */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Trusted by Organizations Worldwide
            </h3>
            <p className="text-xl text-slate-300">
              Join the growing number of companies that rely on our platform for emergency preparedness
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-slate-300">Organizations Protected</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">50K+</div>
              <div className="text-slate-300">Employees Safeguarded</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">99.9%</div>
              <div className="text-slate-300">Message Delivery Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">&lt; 30s</div>
              <div className="text-slate-300">Average Alert Time</div>
            </div>
          </div>

          {/* Compliance Badges */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="flex flex-wrap justify-center items-center gap-8">
              <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                <span className="text-white font-semibold text-sm">SOC 2 Type II</span>
              </div>
              <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                <span className="text-white font-semibold text-sm">GDPR Compliant</span>
              </div>
              <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                <span className="text-white font-semibold text-sm">ISO 27001</span>
              </div>
              <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                <span className="text-white font-semibold text-sm">99.9% Uptime SLA</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
