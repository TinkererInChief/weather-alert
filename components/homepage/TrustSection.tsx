import { Shield, Server, Globe, Headphones } from 'lucide-react'

const trustElements = [
  {
    icon: Shield,
    title: 'Industry-Standard Security',
    description: 'Comprehensive security measures with end-to-end encryption, secure data handling, and regular security reviews.',
    features: ['End-to-end encryption', 'Multi-factor authentication', 'Regular security reviews', 'Role-based access control']
  },
  {
    icon: Server,
    title: 'Enterprise Reliability',
    description: 'Robust infrastructure with redundant systems, automatic failover, and real-time monitoring for mission-critical operations.',
    features: ['Multi-tier redundancy', 'Redundant infrastructure', 'Automatic failover', 'Real-time monitoring']
  },
  {
    icon: Globe,
    title: 'Data Protection',
    description: 'Privacy-focused data handling with transparent practices and comprehensive audit logging.',
    features: ['Transparent data handling', 'Local data residency options', 'Privacy-first design', 'Complete audit trail']
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
        {/* Certifications and Stats */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Platform Capabilities
            </h3>
            <p className="text-xl text-slate-300">
              Comprehensive emergency alert system built for speed, reliability, and global coverage
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">Global</div>
              <div className="text-slate-300">Seismic Network Coverage</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">4 Channels</div>
              <div className="text-slate-300">Alert Delivery Methods</div>
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

          {/* Security Practices */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <div className="flex flex-wrap justify-center items-center gap-8">
              <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                <span className="text-white font-semibold text-sm">Industry-Standard Security</span>
              </div>
              <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                <span className="text-white font-semibold text-sm">24/7 Monitoring</span>
              </div>
              <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                <span className="text-white font-semibold text-sm">Complete Audit Logs</span>
              </div>
              <div className="bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                <span className="text-white font-semibold text-sm">High Availability</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
