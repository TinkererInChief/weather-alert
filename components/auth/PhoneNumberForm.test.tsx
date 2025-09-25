'use client'

import { useState } from 'react'
import PhoneNumberForm from './PhoneNumberForm'

// Simple test component to verify PhoneNumberForm functionality
export default function PhoneNumberFormTest() {
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleSuccess = (phone: string) => {
    setResult(`Success! Phone: ${phone}`)
    setError('')
  }

  const handleError = (errorMessage: string) => {
    setError(`Error: ${errorMessage}`)
    setResult('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-8 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Phone Number Form Test</h1>
            <p className="mt-2 text-sm text-slate-600">
              Test the phone number input component
            </p>
          </div>

          <PhoneNumberForm onSuccess={handleSuccess} onError={handleError} />

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
        </div>
      </div>
    </div>
  )
}