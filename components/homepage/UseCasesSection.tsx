import { Ship, Factory, Flame } from 'lucide-react'
import Link from 'next/link'

const useCases = [
  {
    icon: Ship,
    title: 'Shipping & Maritime Operations',
    scenario: 'Our primary focus and proven use case',
    description: 'Monitor earthquake and tsunami threats for vessels in coastal and earthquake-prone areas. Physics-based simulation calculates wave height and arrival time for each vessel, with severity-based escalation and multi-channel notifications to crews and shore operations.',
    capabilities: [
      { label: 'Threat Assessment', value: 'Automated wave height, distance & ETA calculations' },
      { label: 'Alert Distribution', value: 'Multi-channel notifications (SMS, Email, WhatsApp, Voice)' },
      { label: 'Escalation Policies', value: 'Severity-based automated response protocols' }
    ],
    bgColor: 'from-sky-50 to-blue-50',
    iconColor: 'from-sky-500 to-blue-600'
  },
  {
    icon: Flame,
    title: 'Oil & Gas Operations',
    scenario: 'Highly adaptable for offshore operations',
    description: 'Easily adapted for offshore rigs, platforms, and OSVs. Monitor seismic and tsunami threats to offshore assets, coordinate evacuation procedures, and manage emergency response across distributed operations.',
    capabilities: [
      { label: 'Offshore Protection', value: 'Rigs, platforms, OSVs & support vessels' },
      { label: 'Threat Monitoring', value: 'Real-time earthquake & tsunami detection' },
      { label: 'Emergency Response', value: 'Coordinated multi-asset alerts & procedures' }
    ],
    bgColor: 'from-amber-50 to-orange-50',
    iconColor: 'from-amber-500 to-orange-500'
  },
  {
    icon: Factory,
    title: 'Manufacturing & Industrial',
    scenario: 'Coastal and earthquake-prone facilities',
    description: 'Adaptable for coastal or earthquake-prone manufacturing facilities. Coordinate workforce alerts, emergency response teams, and equipment protocols during seismic events.',
    capabilities: [
      { label: 'Target Facilities', value: 'Coastal/earthquake-prone plants' },
      { label: 'Workforce Coordination', value: 'Multi-shift emergency alerts' },
      { label: 'Custom Integration', value: 'Facility-specific escalation policies' }
    ],
    bgColor: 'from-red-50 to-rose-50',
    iconColor: 'from-red-500 to-rose-500'
  }
]

export default function UseCasesSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Built for Maritime, Adaptable for More
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Purpose-built for earthquake and tsunami alerts in maritime operations. Adaptable for oil & gas and coastal industries with custom development.
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
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Platform Capabilities</h4>
                  <div className="space-y-4">
                    {useCase.capabilities.map((capability, capIndex) => (
                      <div key={capIndex} className="flex justify-between items-start gap-3">
                        <span className="text-slate-600 text-sm">{capability.label}</span>
                        <span className="font-semibold text-slate-900 text-sm text-right">{capability.value}</span>
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
              Protect Your Maritime, Oil & Gas, or Coastal Operations
            </h3>
            <p className="text-slate-600 mb-6">
              Production-ready for maritime earthquake and tsunami alerts. Interested in adapting it for offshore operations or coastal facilities? Let's discuss your needs.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              aria-label="Contact us to discuss your needs"
            >
              Discuss Your Needs
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
