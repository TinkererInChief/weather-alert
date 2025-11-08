import { Clock, MessageSquare, MapPin, Shield } from 'lucide-react'

const benefits = [
  {
    icon: Clock,
    title: 'Instant Response',
    description: 'Get alerts within seconds of seismic events detected by multiple global networks with advanced ocean sensors.',
    stat: '< 30 seconds',
    statLabel: 'Detection to alert delivery'
  },
  {
    icon: MessageSquare,
    title: 'Multi-Channel Reach',
    description: 'SMS, email, WhatsApp and voice notifications - ensure no one misses critical safety alerts, anywhere in the world.',
    stat: '4 channels',
    statLabel: 'Communication methods'
  },
  {
    icon: MapPin,
    title: 'Smart Targeting',
    description: 'AI-powered precision geofencing with travel-time predictions. Only alert personnel in actual impact zones to avoid alert fatigue.',
    stat: '100%',
    statLabel: 'Offshore placement accuracy'
  },
  {
    icon: Shield,
    title: 'Enterprise Ready',
    description: 'Built on best practices, with multi-source redundancy and robust infrastructure for enterprise-grade reliability.',
    stat: 'Multi-Tier',
    statLabel: 'Redundant infrastructure'
  }
]

export default function BenefitsSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Why Organizations Choose Our Alert System
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Built for the modern workplace, our emergency alert system combines speed, reliability, and intelligence to protect what matters most - your people.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="group">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="h-6 w-6 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {benefit.title}
                </h3>
                
                <p className="text-slate-600 mb-6 leading-relaxed">
                  {benefit.description}
                </p>
                
                <div className="border-t border-slate-100 pt-4">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {benefit.stat}
                  </div>
                  <div className="text-sm text-slate-500">
                    {benefit.statLabel}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
