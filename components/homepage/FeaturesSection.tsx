import { 
  Activity, 
  Bell, 
  Users, 
  MapPin, 
  CheckCircle, 
  BarChart3,
  Sparkles,
  Ship,
  Globe,
  Brain,
  Beaker,
  TrendingUp,
  ShieldCheck
} from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Scenario Generation',
    description: 'Create realistic tsunami scenarios using natural language. Advanced AI converts "magnitude 8 off Tokyo" into fully validated simulations with offshore epicenters, fault types, and travel-time predictions.',
    color: 'from-purple-500 to-pink-600'
  },
  {
    icon: Ship,
    title: 'Maritime Intelligence & Vessel Tracking',
    description: 'Track vessels in tsunami-affected zones with real-time position data and AI-powered impact scoring. Automated crew alerts via satellite and cellular ensure maritime safety.',
    color: 'from-blue-500 to-cyan-600'
  },
  {
    icon: Globe,
    title: 'Multi-Source Global Intelligence',
    description: 'Comprehensive coverage from multiple authoritative global networks and advanced ocean sensors. Redundant feeds with automatic failover ensure you never miss a critical event.',
    color: 'from-green-500 to-emerald-600'
  },
  {
    icon: Beaker,
    title: 'Advanced Simulation & Testing',
    description: 'Three ways to test readiness: Quick form input, AI-generated scenarios from natural language prompts, or historical event replays. Validate your response plans against real-world conditions including 2011 Tōhoku and 2004 Indian Ocean.',
    color: 'from-violet-500 to-purple-600'
  },
  {
    icon: TrendingUp,
    title: 'Smart Alert Rules & Auto-Escalation',
    description: 'Define granular rules based on threat level, vessel proximity, and contact roles. Multi-tiered escalation ensures critical alerts are addressed—if no acknowledgment within timeframes, system automatically escalates to next tier.',
    color: 'from-amber-500 to-orange-600'
  },
  {
    icon: ShieldCheck,
    title: 'Enterprise Security & Compliance',
    description: 'Multi-factor authentication, role-based access control, device fingerprinting, and complete audit trails. Built for regulated industries where accountability and compliance are mandatory, not optional.',
    color: 'from-slate-600 to-slate-700'
  },
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    description: '24/7 multi-source seismic intelligence from authoritative global networks including advanced ocean sensors. Machine learning filters false positives and calculates maritime impact scores automatically.',
    color: 'from-red-500 to-red-600'
  },
  {
    icon: Bell,
    title: 'Instant Notifications',
    description: 'Multi-channel alert delivery via SMS, email, WhatsApp, and voice notifications with delivery confirmation and acknowledgment tracking.',
    color: 'from-orange-500 to-amber-600'
  },
  {
    icon: Users,
    title: 'Enterprise Contact Intelligence',
    description: 'Bulk import thousands of contacts, create smart groups by role/location/vessel assignment, and let AI determine who needs alerts based on threat proximity and job function.',
    color: 'from-indigo-500 to-purple-600'
  },
  {
    icon: MapPin,
    title: 'Precision Geofencing',
    description: 'AI-calculated travel-time predictions determine exact alert boundaries. Only notify personnel within impact zones using real-time wave propagation models and precision geographic targeting.',
    color: 'from-teal-500 to-cyan-600'
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
              When seconds count, our system delivers. Redundant infrastructure, automatic failover protection, and enterprise-grade reliability ensure your alerts always get through.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">Multi-Tier</div>
                <div className="text-slate-300">Redundant Systems</div>
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
