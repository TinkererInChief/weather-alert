import { 
  Activity, 
  Bell, 
  Users, 
  MapPin, 
  CheckCircle, 
  BarChart3 
} from 'lucide-react'

const features = [
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    description: '24/7 earthquake & tsunami detection from global seismic networks with automated threat assessment.',
    color: 'from-red-500 to-red-600'
  },
  {
    icon: Bell,
    title: 'Instant Notifications',
    description: 'Multi-channel alert delivery via SMS, email, WhatsApp, and voice calls with delivery confirmation.',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Users,
    title: 'Contact Management',
    description: 'Organize contacts by departments, locations, and roles with bulk import and custom fields.',
    color: 'from-green-500 to-green-600'
  },
  {
    icon: MapPin,
    title: 'Smart Zones',
    description: 'Geographic targeting ensures only relevant personnel receive alerts based on threat proximity.',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: CheckCircle,
    title: 'Delivery Tracking',
    description: 'Real-time confirmation of message receipt, read status, and emergency response acknowledgments.',
    color: 'from-cyan-500 to-cyan-600'
  },
  {
    icon: BarChart3,
    title: 'Admin Dashboard',
    description: 'Complete control panel with analytics, system health monitoring, and comprehensive reporting.',
    color: 'from-orange-500 to-orange-600'
  }
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Comprehensive Emergency Management
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Every feature designed with one goal: getting critical safety information to your team faster and more reliably than ever before.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group">
              <div className="bg-slate-50 rounded-2xl p-8 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-slate-200">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-7 w-7 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-slate-900 mb-4">
                  {feature.title}
                </h3>
                
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Highlight */}
        <div className="mt-20 bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-12 text-center">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Built for Mission-Critical Reliability
            </h3>
            <p className="text-xl text-slate-300 mb-8">
              When seconds count, our system delivers. Redundant infrastructure, failover protection, and 99.9% uptime guarantee ensure your alerts always get through.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">99.9%</div>
                <div className="text-slate-300">Uptime SLA</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">&lt; 30s</div>
                <div className="text-slate-300">Alert Delivery</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">24/7</div>
                <div className="text-slate-300">Monitoring</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
