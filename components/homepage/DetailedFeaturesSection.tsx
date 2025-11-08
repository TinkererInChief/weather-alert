import { 
  Beaker, 
  TrendingUp, 
  ShieldCheck,
  FileText,
  Sparkles,
  History,
  AlertTriangle,
  CheckCircle,
  Bell,
  Lock,
  Users,
  Eye,
  FileSearch,
  Database
} from 'lucide-react'

export default function DetailedFeaturesSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
            Enterprise Features in Depth
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Sophisticated capabilities that set us apart from traditional alert systems
          </p>
        </div>

        {/* Feature 1: Simulation & Testing */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Beaker className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Flexible Tsunami Simulation</h3>
              <p className="text-slate-600">Three powerful ways to test your readiness</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Method 1 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-violet-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-3">1. Brief Form Input</h4>
              <p className="text-slate-600 mb-4">
                Quick parameter entry for custom scenarios. Define magnitude, location, depth, and fault type in seconds.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <span>Simple form interface</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <span>Custom parameters</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <span>Instant generation</span>
                </li>
              </ul>
            </div>

            {/* Method 2 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-3">2. AI Assistant</h4>
              <p className="text-slate-600 mb-4">
                Natural language prompts like "magnitude 8 off Tokyo" instantly generate realistic scenarios with AI validation.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Natural language input</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>100% offshore placement</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Travel-time predictions</span>
                </li>
              </ul>
            </div>

            {/* Method 3 */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
                <History className="h-6 w-6 text-violet-600" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-3">3. Historical Replays</h4>
              <p className="text-slate-600 mb-4">
                Recreate major tsunami events to validate and compare your response against actual outcomes.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <span>2011 Tōhoku, Japan</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <span>2004 Indian Ocean</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                  <span>1960 Valdivia, Chile</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature 2: Intelligent Escalation */}
        <div className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Smart Alert Rules & Auto-Escalation</h3>
              <p className="text-slate-600">Never miss a critical alert with intelligent escalation</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">1. Event Detected</h4>
                <p className="text-sm text-slate-600">
                  Incoming sensor data or report
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileSearch className="h-8 w-8 text-orange-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">2. Rule Evaluation</h4>
                <p className="text-sm text-slate-600">
                  Assess threat, vessel proximity, contact roles
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">3. Contacts Queried</h4>
                <p className="text-sm text-slate-600">
                  Identify relevant personnel
                </p>
              </div>

              {/* Step 4 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-8 w-8 text-purple-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">4. Initial Alert</h4>
                <p className="text-sm text-slate-600">
                  Notify relevant personnel
                </p>
              </div>

              {/* Step 5 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-cyan-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">5. Acknowledgment?</h4>
                <p className="text-sm text-slate-600">
                  Monitor response status
                </p>
              </div>

              {/* Step 6 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-red-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">6. Auto-Escalation</h4>
                <p className="text-sm text-slate-600">
                  Escalate to next tier if needed
                </p>
              </div>
            </div>

            <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-center text-slate-700">
                <strong className="text-amber-900">Automated, multi-tiered escalation guarantees every alert is addressed.</strong> 
                {' '}If no acknowledgment within predefined timeframes, the system intelligently escalates through successive tiers until someone responds.
              </p>
            </div>
          </div>
        </div>

        {/* Feature 3: Enterprise Security */}
        <div>
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Enterprise Security Suite</h3>
              <p className="text-slate-600">Built for organizations where security is non-negotiable</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Multi-Factor Authentication */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900">Multi-Factor Authentication</h4>
              </div>
              <p className="text-slate-600">
                Ensures only authorized personnel can access critical safety communications and vessel data. Industry-standard MFA protects against unauthorized access.
              </p>
            </div>

            {/* Role-Based Access Control */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900">Role-Based Access Control</h4>
              </div>
              <p className="text-slate-600">
                Three-tier permission structure ensures viewers can't accidentally send alerts to random people. Permissions match responsibilities at every level.
              </p>
            </div>

            {/* Device Fingerprinting */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Eye className="h-5 w-5 text-cyan-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900">Device Fingerprinting</h4>
              </div>
              <p className="text-slate-600">
                Suspicious access patterns flagged automatically when unusual locations or devices detected. Real-time threat detection prevents unauthorized access.
              </p>
            </div>

            {/* IP Geolocation Controls */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-red-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900">IP Geolocation Controls</h4>
              </div>
              <p className="text-slate-600">
                Geographic restrictions prevent unauthorized access from high-risk locations. Customizable country and region blocking policies.
              </p>
            </div>

            {/* Complete Audit Trail */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-emerald-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900">Complete Audit Trail</h4>
              </div>
              <p className="text-slate-600 mb-4">
                Every action meticulously logged for compliance and post-incident analysis. Built for regulated industries where comprehensive logging isn't optional—it's mandatory.
              </p>
              <div className="grid md:grid-cols-5 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-slate-700">User authentication events</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-slate-700">Alert creation & dispatch</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-slate-700">Contact modifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-slate-700">Data access & queries</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-slate-700">System configuration</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
