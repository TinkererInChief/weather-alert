import { Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const pricingTiers = [
  {
    name: 'Starter',
    description: 'Perfect for small teams and offices',
    highlight: 'Up to 50 contacts',
    features: [
      'Real-time earthquake monitoring',
      'SMS & email notifications',
      'Basic contact management',
      'Standard support',
      'Mobile app access'
    ],
    cta: 'Get Started',
    popular: false
  },
  {
    name: 'Professional',
    description: 'Ideal for growing organizations',
    highlight: 'Up to 500 contacts + advanced features',
    features: [
      'Everything in Starter',
      'WhatsApp & voice notifications',
      'Advanced contact grouping',
      'Custom alert zones',
      'Delivery tracking & analytics',
      'Priority support'
    ],
    cta: 'Get Started',
    popular: true
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with complex needs',
    highlight: 'Unlimited contacts + custom integrations',
    features: [
      'Everything in Professional',
      'Custom integrations & API',
      'Advanced reporting & analytics',
      'Dedicated account manager',
      'Custom SLA agreements',
      '24/7 phone support'
    ],
    cta: 'Contact Sales',
    popular: false
  }
]

export default function PricingTeaser() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Flexible Plans for Every Organization
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Choose the plan that fits your team size and requirements. All plans include our core emergency monitoring and notification features.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {pricingTiers.map((tier, index) => (
            <div key={index} className={`relative bg-white rounded-2xl p-8 shadow-lg border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
              tier.popular 
                ? 'border-red-500 ring-4 ring-red-500/20' 
                : 'border-slate-200 hover:border-slate-300'
            }`}>
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    Get Started
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{tier.name}</h3>
                <p className="text-slate-600 mb-4">{tier.description}</p>
                <div className="text-lg font-semibold text-red-600 bg-red-50 rounded-lg px-4 py-2">
                  {tier.highlight}
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/contact"
                className={`w-full inline-flex items-center justify-center py-4 px-6 rounded-2xl font-semibold transition-all duration-200 ${
                  tier.popular
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                {tier.cta}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          ))}
        </div>

        {/* Enterprise Contact */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 text-center max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Need a Custom Solution?
          </h3>
          <p className="text-slate-600 mb-6">
            Large organizations with specific requirements can work with our team to create a tailored emergency alert solution that fits your unique needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              Contact Sales
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
