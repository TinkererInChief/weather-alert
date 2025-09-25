'use client'

import { useState } from 'react'
import OTPVerificationForm from './OTPVerificationForm'

// Simple test component to verify OTPVerificationForm functionality
export default function OTPVerificationFormTest() {
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [resendCount, setResendCount] = useState(0)

  const handleSuccess = () => {
    setResult('Success! OTP verified and authentication complete')
    setError('')
  }

  const handleError = (errorMessage: string) => {
    setError(`Error: ${errorMessage}`)
  }

  const handleResendOTP = () => {
    setResendCount(prev => prev + 1)
    setResult(`OTP resent (${resendCount + 1} times)`)
    setError('')
  }

  const handleBack = () => {
    setResult('Back button clicked - would return to phone number entry')
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-slate-900">OTP Verification Test</h1>
            <p className="mt-2 text-sm text-slate-600">
              Test the OTP verification component
            </p>
          </div>

          <OTPVerificationForm 
            phone="+14155552671"
            maskedPhone="+1 (415) 555-****"
            onSuccess={handleSuccess}
            onError={handleError}
            onResendOTP={handleResendOTP}
            onBack={handleBack}
          />

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              {result}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="text-xs text-slate-500 space-y-1">
            <p><strong>Test Instructions:</strong></p>
            <p>• Enter any 6-digit code to test verification</p>
            <p>• Wait for timer to expire to test resend functionality</p>
            <p>• Try entering incorrect codes to test error handling</p>
            <p>• Use keyboard navigation (arrows, backspace)</p>
            <p>• Try pasting a 6-digit code in the first input</p>
          </div>
        </div>
      </div>
    </div>
  )
}