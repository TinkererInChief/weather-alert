import { Building2, Factory, Users } from 'lucide-react'

const useCases = [
  {
    icon: Building2,
    title: 'Corporate Offices',
    subtitle: 'Multi-floor evacuations made simple',
    description: 'Coordinate evacuation of 200+ employees across multiple floors in under 2 minutes with precise floor-by-floor notifications and emergency protocols.',
    stats: '2 min average evacuation time',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Factory,
    title: 'Manufacturing Plants',
    subtitle: 'Industrial safety at scale',
    description: 'Alert shift workers across facilities and coordinate emergency response with supervisor escalation and equipment shutdown procedures.',
    stats: '99.8% alert delivery success',
    color: 'from-orange-500 to-red-500'
  },
  {
    icon: Users,
    title: 'Remote Teams',
    subtitle: 'Distributed workforce protection',
    description: 'Keep remote and hybrid teams informed during regional events with location-based targeting and family emergency notifications.',
    stats: '500+ remote workers protected',
    color: 'from-emerald-500 to-teal-500'
  }
]

export default function UseCasesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Protecting Teams Across Industries
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Real-world applications helping organizations keep their people safe during emergencies
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => (
            <div key={index} className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-8 text-white shadow-2xl hover:scale-105 transition-all duration-300">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${useCase.color} rounded-full blur-2xl`}></div>
                <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br ${useCase.color} rounded-full blur-xl`}></div>
              </div>

              <div className="relative z-10">
                <div className={`w-14 h-14 bg-gradient-to-br ${useCase.color} rounded-2xl flex items-center justify-center mb-6`}>
                  <useCase.icon className="h-7 w-7 text-white" />
                </div>

                <h3 className="text-2xl font-bold mb-2">
                  {useCase.title}
                </h3>
                
                <p className="text-slate-300 font-medium mb-4">
                  {useCase.subtitle}
                </p>
                
                <p className="text-slate-200 leading-relaxed mb-6">
                  {useCase.description}
                </p>

                <div className={`inline-block bg-gradient-to-r ${useCase.color} bg-opacity-20 border border-white/20 rounded-full px-4 py-2 text-sm font-semibold`}>
                  {useCase.stats}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
