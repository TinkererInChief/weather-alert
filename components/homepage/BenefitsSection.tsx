import { Clock, MessageSquare, MapPin, Shield, CheckCircle, TrendingUp } from 'lucide-react'

const benefits = [
  {
    icon: Clock,
    title: 'Instant Response',
    description: 'Get alerts within seconds of seismic events detected by multiple global networks with advanced ocean sensors.',
    stat: '< 30 seconds',
    statLabel: 'Detection to alert delivery',
    color: 'from-red-500 to-orange-600'
  },
  {
    icon: MessageSquare,
    title: 'Multi-Channel Reach',
    description: 'SMS, email, WhatsApp and voice notifications - ensure no one misses critical safety alerts, anywhere in the world.',
    stat: '4 channels',
    statLabel: 'Communication methods',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    icon: MapPin,
    title: 'Smart Targeting',
    description: 'AI-powered precision geofencing with travel-time predictions. Only alert personnel in actual impact zones to avoid alert fatigue.',
    stat: '100%',
    statLabel: 'Offshore placement accuracy',
    color: 'from-green-500 to-emerald-600'
  },
  {
    icon: Shield,
    title: 'Enterprise Ready',
    description: 'Built on best practices, with multi-source redundancy and robust infrastructure for enterprise-grade reliability.',
    stat: 'Multi-Tier',
    statLabel: 'Redundant infrastructure',
    color: 'from-purple-500 to-indigo-600'
  }
]

export default function BenefitsSection() {
  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-100/30 to-blue-100/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full px-6 py-2 mb-6 shadow-lg">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-semibold">Trusted by Organizations Worldwide</span>
          </div>

          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            Why Organizations Choose <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
              Our Alert System
            </span>
          </h2>
          
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Built for the modern workplace, our emergency alert system combines speed, reliability, and intelligence to protect what matters most — your people.
          </p>

          {/* Social Proof Stats */}
          <div className="mt-10 flex flex-wrap justify-center items-center gap-8">
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold">99.9% Uptime</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold">Global Coverage</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold">24/7 Monitoring</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="group">
              <div className="relative bg-white rounded-2xl p-8 shadow-lg border border-slate-200 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 overflow-hidden">
                {/* Gradient accent on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
                
                <div className="relative z-10">
                  <div className={`w-14 h-14 bg-gradient-to-br ${benefit.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                    <benefit.icon className="h-7 w-7 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {benefit.title}
                  </h3>
                  
                  <p className="text-slate-600 mb-6 leading-relaxed text-sm">
                    {benefit.description}
                  </p>
                  
                  <div className="border-t border-slate-100 pt-4 mt-6">
                    <div className={`text-3xl font-bold bg-gradient-to-r ${benefit.color} bg-clip-text text-transparent mb-1`}>
                      {benefit.stat}
                    </div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {benefit.statLabel}
                    </div>
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
