import { Ship, Factory, Users2 } from 'lucide-react'
import Link from 'next/link'

const useCases = [
  {
    icon: Ship,
    title: 'Shipping & Maritime Operations',
    scenario: 'Coordinate alerts for distributed crews across vessels and shore offices',
    description: 'When a tsunami warning was issued, OceanFleet automatically alerted all active vessels, docked ships, and shore-based operations teams. The system used satellite messaging offshore and SMS/voice on land, delivering role-based instructions to captains, officers, and port coordinators to secure operations within minutes.',
    metrics: [
      { label: 'Response Time', value: '90 seconds' },
      { label: 'Vessels Reached', value: '12/12' },
      { label: 'Channels Used', value: 'SMS + Satcom + Voice' }
    ],
    bgColor: 'from-sky-50 to-blue-50',
    iconColor: 'from-sky-500 to-blue-600'
  },
  {
    icon: Factory,
    title: 'Manufacturing Plants',
    scenario: 'Alert shift workers and coordinate emergency response',
    description: 'During a tsunami warning, ManufacturingCo automatically notified all three shifts, including off-duty emergency response team members. The system coordinated evacuation routes and equipment shutdown procedures.',
    metrics: [
      { label: 'Shifts Notified', value: '3 shifts' },
      { label: 'Response Teams', value: '12 activated' },
      { label: 'Equipment Secured', value: '100%' }
    ],
    bgColor: 'from-orange-50 to-red-50',
    iconColor: 'from-orange-500 to-red-500'
  },
  {
    icon: Users2,
    title: 'Remote Teams',
    scenario: 'Keep distributed workforce informed during regional events',
    description: 'With employees across 5 cities, GlobalServices used location-based alerts to notify only affected team members about a regional earthquake, while keeping management informed of all personnel safety status.',
    metrics: [
      { label: 'Cities Monitored', value: '5 locations' },
      { label: 'Targeted Alerts', value: '89 employees' },
      { label: 'Safety Confirmed', value: '< 5 minutes' }
    ],
    bgColor: 'from-green-50 to-emerald-50',
    iconColor: 'from-green-500 to-emerald-500'
  }
]

export default function UseCasesSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Protecting Teams Across Industries
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            See how organizations like yours use our emergency alert system to keep their workforce safe and informed during critical situations.
          </p>
        </div>

        <div className="space-y-12">
          {useCases.map((useCase, index) => (
            <div key={index} className={`bg-gradient-to-r ${useCase.bgColor} rounded-3xl p-8 lg:p-12`}>
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${useCase.iconColor} rounded-2xl flex items-center justify-center shadow-lg`}>
                      <useCase.icon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{useCase.title}</h3>
                      <p className="text-lg text-slate-700 font-medium">{useCase.scenario}</p>
                    </div>
                  </div>
                  
                  <p className="text-slate-700 leading-relaxed text-lg">
                    {useCase.description}
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Key Results</h4>
                  <div className="space-y-4">
                    {useCase.metrics.map((metric, metricIndex) => (
                      <div key={metricIndex} className="flex justify-between items-center">
                        <span className="text-slate-600">{metric.label}</span>
                        <span className="font-bold text-slate-900">{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Ready to Protect Your Team & Assets?
            </h3>
            <p className="text-slate-600 mb-6">
              Join hundreds of organizations protecting their workforce, maritime vessels, offshore rigs, and critical infrastructure during emergencies.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              aria-label="Schedule a demo via contact page"
            >
              Schedule a Demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
