import { Shield, Clock, Globe, Headphones } from 'lucide-react'

const trustElements = [
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SOC 2 compliant with end-to-end encryption, zero-trust architecture, and comprehensive audit trails for regulatory compliance.',
    badge: 'SOC 2 Certified'
  },
  {
    icon: Clock,
    title: 'Proven Reliability',
    description: '99.9% uptime SLA with redundant infrastructure, automatic failover, and global content delivery for maximum availability.',
    badge: '99.9% Uptime'
  },
  {
    icon: Globe,
    title: 'Global Compliance',
    description: 'GDPR compliant data handling with privacy-by-design principles and flexible data residency options for international operations.',
    badge: 'GDPR Compliant'
  },
  {
    icon: Headphones,
    title: 'Expert Support',
    description: '24/7 enterprise support with dedicated success managers, priority response times, and comprehensive system monitoring.',
    badge: '24/7 Support'
  }
]

export default function TrustSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Built for Enterprise Security & Compliance
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Enterprise-grade infrastructure with the security, reliability, and support your organization requires
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {trustElements.map((element, index) => (
            <div key={index} className="bg-white rounded-3xl p-8 shadow-lg shadow-slate-200/50 border border-slate-200/60 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                  <element.icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-slate-900">
                      {element.title}
                    </h3>
                    <span className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {element.badge}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {element.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Certifications Row */}
        <div className="mt-16 bg-white rounded-3xl p-8 shadow-lg shadow-slate-200/50 border border-slate-200/60">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Security & Compliance Certifications
            </h3>
            <p className="text-slate-600">
              Independently verified security standards and industry compliance
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-70">
            <div className="bg-slate-100 rounded-xl px-6 py-4 text-slate-700 font-semibold">
              SOC 2 Type II
            </div>
            <div className="bg-slate-100 rounded-xl px-6 py-4 text-slate-700 font-semibold">
              ISO 27001
            </div>
            <div className="bg-slate-100 rounded-xl px-6 py-4 text-slate-700 font-semibold">
              GDPR Ready
            </div>
            <div className="bg-slate-100 rounded-xl px-6 py-4 text-slate-700 font-semibold">
              HIPAA Compliant
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
