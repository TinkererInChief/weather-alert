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
          <div className="text-center mb-12 space-y-6">
            {/* Clean Logo and Title */}
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white flex items-center justify-center shadow-2xl mx-auto">
                <Shield className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-white tracking-tight">Emergency Alert</h1>
                <p className="text-xl text-slate-300 font-light">Command Center</p>
              </div>
            </div>
            
            {/* Simplified Description */}
            <div className="max-w-md mx-auto">
              <p className="text-slate-300 text-base leading-relaxed">
                Secure access portal for authorized emergency response personnel
              </p>
            </div>

            {/* Status Badge */}
            <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 text-sm font-medium">System Online</span>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 space-y-8 animate-fadeIn">
          {currentStep === 'phone' ? (
            <>
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-semibold text-slate-900">Phone Verification</h2>
                <p className="text-sm text-slate-600">
                  Enter your authorized phone number to receive a verification code
                </p>
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
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-semibold text-slate-900">Enter Verification Code</h2>
                <p className="text-sm text-slate-600">
                  We've sent a 6-digit code to your phone
                </p>
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
