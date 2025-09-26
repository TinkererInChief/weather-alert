import Link from 'next/link'
import { Shield, Mail, Phone, MapPin, ExternalLink } from 'lucide-react'

export default function HomeFooter() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Emergency Alert</h3>
                <p className="text-slate-400 text-sm">Command Center</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Enterprise-grade emergency alert system protecting workforces worldwide with real-time seismic monitoring and multi-channel notifications.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>contact@emergencyalert.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>24/7 Global Operations</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Security</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Integrations</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">API Documentation</Link></li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/contact" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Press Kit</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Partners</Link></li>
            </ul>
          </div>

          {/* Resources & Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/contact" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Documentation</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">System Status</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Best Practices</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Compliance</Link></li>
            </ul>
          </div>
        </div>

        {/* Access Links */}
        <div className="border-t border-slate-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
              <Link 
                href="/login" 
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Admin Portal
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
              <Link 
                href="/contact" 
                className="text-slate-400 hover:text-white transition-colors"
              >
                Employee Access Request
              </Link>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <Link href="/contact" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 mt-8 pt-8 text-center">
          <p className="text-slate-400 text-sm">
            © 2025 Emergency Alert Command Center. All rights reserved.
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Protecting workforces worldwide • Authorized personnel only • All access monitored
          </p>
        </div>
      </div>
    </footer>
  )
}
