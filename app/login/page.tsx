'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Shield, AlertTriangle, Smartphone, Zap, Loader2 } from 'lucide-react'
import PhoneNumberForm from '@/components/auth/PhoneNumberForm'
import OTPVerificationForm from '@/components/auth/OTPVerificationForm'

type AuthStep = 'phone' | 'otp'

export default function LoginPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<AuthStep>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (sessionStatus === 'authenticated' && session) {
      router.push('/')
    }
  }, [session, sessionStatus, router])

  // Show loading while checking authentication
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg mx-auto">
            <Shield className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span className="text-white font-medium">Loading Emergency Alert System...</span>
            </div>
            <p className="text-slate-300 text-sm">Checking authentication status</p>
          </div>
        </div>
      </div>
    )
  }

  // Redirect if already authenticated
  if (sessionStatus === 'authenticated') {
    return null
  }

  const handlePhoneSuccess = async (phone: string) => {
    try {
      // Make the OTP request to get the masked phone number
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification code')
      }

      setPhoneNumber(phone)
      setMaskedPhone(data.maskedPhone || phone)
      setCurrentStep('otp')
    } catch (error) {
      console.error('Phone number submission failed:', error)
    }
  }

  const handlePhoneError = (error: string) => {
    console.error('Phone number submission failed:', error)
  }

  const handleOTPSuccess = async () => {
    try {
      // Redirect to dashboard on successful authentication
      window.location.href = '/'
    } catch (error) {
      console.error('Authentication redirect failed:', error)
    }
  }

  const handleOTPError = (error: string) => {
    console.error('OTP verification failed:', error)
  }

  const handleResendOTP = () => {
    // The OTPVerificationForm handles resend internally
    console.log('OTP resend requested')
  }

  const handleBackToPhone = () => {
    setCurrentStep('phone')
    setPhoneNumber('')
    setMaskedPhone('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Hero Section */}
          <div className="text-center mb-8 space-y-4">
            <div className="inline-flex items-center space-x-3 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg">
                <Shield className="h-8 w-8" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-white">Emergency Alert</h1>
                <p className="text-slate-300 text-lg">Command Center</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">Secure Access Required</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                This system provides critical emergency alerts for earthquakes and tsunamis. 
                Access is restricted to authorized personnel only.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-400">Real-time Alerts</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                  <Smartphone className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-400">SMS Notifications</p>
              </div>
              <div className="text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                  <Zap className="h-5 w-5" />
                </div>
                <p className="text-xs text-slate-400">Instant Response</p>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 space-y-8 animate-fadeIn">
          {currentStep === 'phone' ? (
            <>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg">
                  <Shield className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">Emergency Alert Command Center</h1>
                  <p className="mt-2 text-sm text-slate-600">
                    Enter your verified operator phone number to receive a secure verification code.
                  </p>
                </div>
              </div>

              <PhoneNumberForm
                onSuccess={handlePhoneSuccess}
                onError={handlePhoneError}
              />

              <div className="space-y-3">
                <p className="text-xs text-slate-500 text-center">
                  For access assistance contact your administrator at
                  <span className="font-medium text-slate-600"> security@yourdomain.com</span>.
                </p>

                <div className="text-center text-xs text-slate-400">
                  <p>By requesting a code you agree to system monitoring for compliance and safety.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-lg">
                  <Shield className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">Emergency Alert Command Center</h1>
                </div>
              </div>

              <OTPVerificationForm
                phone={phoneNumber}
                maskedPhone={maskedPhone}
                onSuccess={handleOTPSuccess}
                onError={handleOTPError}
                onResendOTP={handleResendOTP}
                onBack={handleBackToPhone}
              />

              <div className="space-y-3">
                <p className="text-xs text-slate-500 text-center">
                  For access assistance contact your administrator at
                  <span className="font-medium text-slate-600"> administrator@yourdomain.com</span>.
                </p>

                <div className="text-center text-xs text-slate-400">
                  <p>By verifying your code you agree to system monitoring for compliance and safety.</p>
                </div>
              </div>
            </>
          )}

          </div>

          {/* Footer */}
          <div className="text-center mt-8 space-y-4">
            <div className="text-xs text-slate-400 space-y-1">
              <p>© 2025 Emergency Alert Command Center</p>
              <p>Authorized personnel only • All access monitored</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
