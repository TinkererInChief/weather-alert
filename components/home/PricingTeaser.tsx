import Link from 'next/link'
import { Users, Building, Enterprise, ArrowRight } from 'lucide-react'

const plans = [
  {
    icon: Users,
    name: 'Starter',
    description: 'Perfect for small teams and organizations getting started with emergency alerts',
    contacts: 'Up to 50 contacts',
    features: ['Real-time monitoring', 'SMS & Email alerts', 'Basic reporting', 'Standard support'],
    cta: 'Start Free Trial'
  },
  {
    icon: Building,
    name: 'Professional',
    description: 'Advanced features for growing organizations with distributed teams',
    contacts: 'Up to 500 contacts',
    features: ['Multi-channel alerts', 'Advanced zones', 'Priority support', 'API integrations'],
    cta: 'Request Quote',
    popular: true
  },
  {
    icon: Enterprise,
    name: 'Enterprise',
    description: 'Full-scale solution for large organizations with complex requirements',
    contacts: 'Unlimited contacts',
    features: ['Custom integrations', 'Dedicated support', 'SLA guarantees', 'Advanced compliance'],
    cta: 'Contact Sales'
  }
]

export default function PricingTeaser() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Flexible Plans for Every Organization
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Choose the right level of protection for your team size and requirements
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative bg-white rounded-3xl p-8 shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? 'border-blue-500 shadow-blue-500/20 hover:shadow-blue-500/30' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                  plan.popular 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                    : 'bg-gradient-to-br from-slate-100 to-slate-200'
                }`}>
                  <plan.icon className={`h-8 w-8 ${plan.popular ? 'text-white' : 'text-slate-600'}`} />
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {plan.name}
                </h3>
                
                <p className="text-slate-600 mb-4">
                  {plan.description}
                </p>
                
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                  plan.popular 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {plan.contacts}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      plan.popular ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        plan.popular ? 'bg-blue-600' : 'bg-slate-600'
                      }`}></div>
                    </div>
                    <span className="text-slate-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link 
                href="/contact"
                className={`w-full inline-flex items-center justify-center px-6 py-3 rounded-2xl font-semibold transition-all duration-300 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {plan.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-slate-600 mb-4">
            Need a custom solution? We work with organizations of all sizes.
          </p>
          <Link 
            href="/contact" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold"
          >
            View detailed pricing and features
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
