import { 
  Activity, 
  MessageSquare, 
  Users, 
  MapPin, 
  CheckCircle, 
  BarChart3 
} from 'lucide-react'

const features = [
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    description: '24/7 earthquake and tsunami detection using USGS and NOAA data feeds with intelligent filtering and severity assessment.'
  },
  {
    icon: MessageSquare,
    title: 'Instant Notifications',
    description: 'Multi-channel alert delivery via SMS, email, WhatsApp, and voice calls with customizable priority and escalation rules.'
  },
  {
    icon: Users,
    title: 'Contact Management',
    description: 'Organize contacts by departments, locations, and roles. Manage groups, permissions, and notification preferences centrally.'
  },
  {
    icon: MapPin,
    title: 'Smart Alert Zones',
    description: 'Geographic targeting ensures relevant alerts only. Define custom zones and proximity rules for precise notifications.'
  },
  {
    icon: CheckCircle,
    title: 'Delivery Tracking',
    description: 'Comprehensive delivery confirmation and response tracking. Know who received alerts and who needs follow-up attention.'
  },
  {
    icon: BarChart3,
    title: 'Admin Dashboard',
    description: 'Complete system control with real-time monitoring, detailed analytics, compliance reporting, and audit trails.'
  }
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Comprehensive Emergency Management
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Everything you need to protect your workforce during seismic events and natural disasters
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-3xl p-8 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 border border-slate-200/60">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6">
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
