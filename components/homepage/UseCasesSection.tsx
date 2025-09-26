import { Building2, Factory, Users2 } from 'lucide-react'

const useCases = [
  {
    icon: Building2,
    title: 'Corporate Offices',
    scenario: 'Evacuate 200+ employees across 3 floors in under 2 minutes',
    description: 'When a 6.2 magnitude earthquake struck downtown, TechCorp\'s emergency system instantly alerted all employees via SMS and voice calls. Floor wardens received additional coordination instructions, enabling a complete evacuation in 90 seconds.',
    metrics: [
      { label: 'Response Time', value: '90 seconds' },
      { label: 'Employees Reached', value: '247/247' },
      { label: 'Channels Used', value: 'SMS + Voice' }
    ],
    bgColor: 'from-blue-50 to-cyan-50',
    iconColor: 'from-blue-500 to-cyan-500'
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
              Ready to Protect Your Team?
            </h3>
            <p className="text-slate-600 mb-6">
              Join hundreds of organizations who trust our system to keep their workforce safe during emergencies.
            </p>
            <button className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
              Schedule a Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
