'use client'

import { FormEvent, useState } from 'react'
import { Smartphone, Loader2, CheckCircle } from 'lucide-react'
import { parsePhoneNumber, isValidPhoneNumber, AsYouType } from 'libphonenumber-js'

interface PhoneNumberFormProps {
  onSuccess: (phone: string) => void
  onError?: (error: string) => void
}

export default function PhoneNumberForm({ onSuccess, onError }: PhoneNumberFormProps) {
  const [phone, setPhone] = useState('')
  const [formattedPhone, setFormattedPhone] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters except +
    let cleaned = value.replace(/[^\d+]/g, '')
    
    // Ensure only one + at the beginning
    if (cleaned.includes('+')) {
      const plusIndex = cleaned.indexOf('+')
      if (plusIndex > 0) {
        // Remove + if it's not at the beginning
        cleaned = cleaned.replace(/\+/g, '')
      } else {
        // Keep only the first + and remove others
        cleaned = '+' + cleaned.substring(1).replace(/\+/g, '')
      }
    }
    
    // Use AsYouType formatter for real-time formatting
    const formatter = new AsYouType()
    const formatted = formatter.input(cleaned)
    
    return formatted
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value)
    
    // Store the clean version for validation and API calls
    let cleaned = value.replace(/[^\d+]/g, '')
    
    // Ensure only one + at the beginning for storage
    if (cleaned.includes('+')) {
      const plusIndex = cleaned.indexOf('+')
      if (plusIndex > 0) {
        cleaned = cleaned.replace(/\+/g, '')
      } else {
        cleaned = '+' + cleaned.substring(1).replace(/\+/g, '')
      }
    }
    
    setPhone(cleaned)
    setFormattedPhone(formatted)
    
    // Clear error state when user starts typing
    if (status === 'error') {
      setStatus('idle')
      setMessage('')
    }
  }

  const validatePhoneNumber = (phoneNumber: string): { isValid: boolean; error?: string } => {
    if (!phoneNumber) {
      return { isValid: false, error: 'Enter a phone number to receive a code' }
    }

    // Remove all whitespace and formatting characters except +
    const cleanPhone = phoneNumber.replace(/[\s\-\(\)\.]/g, '')
    
    // Ensure phone number starts with + for international format
    const normalizedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`

    try {
      // First check if it's a valid phone number format
      if (!isValidPhoneNumber(normalizedPhone)) {
        return { 
          isValid: false, 
          error: 'Enter a valid mobile number including country code (e.g. +14155552671)' 
        }
      }

      // Parse the phone number to get detailed information
      const parsed = parsePhoneNumber(normalizedPhone)
      if (!parsed) {
        return { 
          isValid: false, 
          error: 'Enter a valid mobile number including country code (e.g. +14155552671)' 
        }
      }

      // Check if it's a valid mobile number
      // Accept MOBILE, FIXED_LINE_OR_MOBILE, and undefined (when type cannot be determined)
      const phoneType = parsed.getType()
      const validTypes = ['MOBILE', 'FIXED_LINE_OR_MOBILE']
      
      // If phone type is undefined but the number is valid and possible, allow it
      // This handles cases where libphonenumber-js cannot determine the exact type
      if (phoneType && !validTypes.includes(phoneType)) {
        return { 
          isValid: false, 
          error: 'Enter a valid mobile number including country code (e.g. +14155552671)' 
        }
      }

      // Additional validation: ensure it's possible (not just valid format)
      if (!parsed.isPossible()) {
        return { 
          isValid: false, 
          error: 'Enter a valid mobile number including country code (e.g. +14155552671)' 
        }
      }

      return { isValid: true }
    } catch (error) {
      return { 
        isValid: false, 
        error: 'Enter a valid mobile number including country code (e.g. +14155552671)' 
      }
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    // Prevent double submission
    if (status === 'loading') {
      return
    }

    const validation = validatePhoneNumber(phone)
    if (!validation.isValid) {
      setStatus('error')
      setMessage(validation.error || 'Invalid phone number')
      onError?.(validation.error || 'Invalid phone number')
      return
    }

    // Normalize phone number for API call
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`
    const parsedPhone = parsePhoneNumber(normalizedPhone)
    const e164Phone = parsedPhone?.format('E.164')

    if (!e164Phone) {
      setStatus('error')
      setMessage('Unable to format phone number')
      onError?.('Unable to format phone number')
      return
    }

    try {
      setStatus('loading')
      setMessage('Sending verification code…')

      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: e164Phone }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send verification code')
      }

      setStatus('success')
      setMessage(`Verification code sent to ${data.maskedPhone || formattedPhone}`)
      onSuccess(e164Phone)
    } catch (error) {
      console.error('OTP request failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unable to send verification code. Try again in a moment.'
      setStatus('error')
      setMessage(errorMessage)
      onError?.(errorMessage)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
          Mobile phone number
        </label>
        <div className="relative">
          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="phone"
            type="tel"
            value={formattedPhone}
            onChange={(event) => handlePhoneChange(event.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full rounded-2xl border border-slate-200 bg-white/80 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            autoComplete="tel"
            inputMode="tel"
            aria-describedby={status !== 'idle' ? 'phone-status' : undefined}
            aria-invalid={status === 'error'}
            required
          />
        </div>
        <p className="text-xs text-slate-500">
          Include your country code (e.g. +1 for US, +44 for UK)
        </p>
      </div>

      <button
        type="submit"
        className="w-full inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200/50 transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={status === 'loading' || status === 'success'}
        aria-describedby={status !== 'idle' ? 'phone-status' : undefined}
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending code
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Code sent
          </>
        ) : (
          'Send verification code'
        )}
      </button>

      {status !== 'idle' && message && (
        <div
          id="phone-status"
          className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-200 ${
            status === 'success'
              ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700'
              : 'border-rose-200 bg-rose-50/80 text-rose-700'
          }`}
          role={status === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {message}
        </div>
      )}
    </form>
  )
}