import { Zap, Users, Target, ShieldCheck } from 'lucide-react'

const benefits = [
  {
    icon: Zap,
    title: 'Instant Response',
    description: 'Get critical alerts within seconds of seismic events. Our real-time monitoring ensures your team receives immediate notifications when it matters most.'
  },
  {
    icon: Users,
    title: 'Multi-Channel Reach',
    description: 'SMS, email, WhatsApp, and voice calls ensure no one misses critical alerts. Redundant delivery channels maximize reach and reliability.'
  },
  {
    icon: Target,
    title: 'Smart Targeting',
    description: 'Location-based alerts for relevant threats only. Advanced geographic targeting ensures employees receive alerts for events that actually affect them.'
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise Ready',
    description: 'Scalable, secure, and compliant with safety regulations. Built for enterprise security requirements with comprehensive audit trails.'
  }
]

export default function BenefitsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Why Organizations Choose Our Alert System
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Comprehensive emergency management designed for modern workplaces and distributed teams
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center group hover:scale-105 transition-transform duration-300">
              <div className="w-16 h-16 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:from-red-100 group-hover:to-orange-100 transition-colors duration-300">
                <benefit.icon className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                {benefit.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
