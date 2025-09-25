'use client'

import { FormEvent, useState, useEffect, useRef } from 'react'
import { Shield, Loader2, CheckCircle, RotateCcw } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'

interface OTPVerificationFormProps {
  phone: string
  maskedPhone?: string
  onSuccess: () => void
  onError?: (error: string) => void
  onResendOTP?: () => void
  onBack?: () => void
}

export default function OTPVerificationForm({ 
  phone, 
  maskedPhone, 
  onSuccess, 
  onError, 
  onResendOTP,
  onBack 
}: OTPVerificationFormProps) {
  const { update } = useSession()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds
  const [attemptsLeft, setAttemptsLeft] = useState(3)
  const [canResend, setCanResend] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Timer effect for OTP expiry
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true)
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [resendCooldown])

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleCodeChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1)
    
    const newCode = code.split('')
    newCode[index] = digit
    const updatedCode = newCode.join('')
    
    setCode(updatedCode)
    
    // Clear error state when user starts typing
    if (status === 'error') {
      setStatus('idle')
      setMessage('')
    }
    
    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Auto-submit when all 6 digits are entered
    if (updatedCode.length === 6 && updatedCode.replace(/\D/g, '').length === 6) {
      // Small delay to allow the last digit to be visually confirmed
      setTimeout(() => handleSubmit(null, updatedCode), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    setCode(pastedData)
    
    // Focus the next empty input or the last input
    const nextIndex = Math.min(pastedData.length, 5)
    inputRefs.current[nextIndex]?.focus()
    
    // Auto-submit if 6 digits pasted
    if (pastedData.length === 6) {
      setTimeout(() => handleSubmit(null, pastedData), 100)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement> | null, codeToSubmit?: string) => {
    if (event) {
      event.preventDefault()
    }

    const submitCode = codeToSubmit || code
    
    if (submitCode.length !== 6) {
      setStatus('error')
      setMessage('Enter the complete 6-digit code')
      onError?.('Enter the complete 6-digit code')
      return
    }

    if (timeLeft <= 0) {
      setStatus('error')
      setMessage('That code has expired. Request a new one to continue')
      onError?.('That code has expired. Request a new one to continue')
      return
    }

    try {
      setStatus('loading')
      setMessage('Verifying code…')

      // Use NextAuth signIn to verify OTP and create session
      const result = await signIn('otp', {
        phone,
        code: submitCode,
        redirect: false
      })

      if (result?.error) {
        // Handle specific error cases
        const errorMessage = result.error || 'Incorrect code. Check your SMS inbox and try again'
        
        // Decrement attempts for incorrect codes
        if (errorMessage.includes('Incorrect') || errorMessage.includes('Invalid')) {
          setAttemptsLeft(prev => {
            const newAttempts = prev - 1
            if (newAttempts <= 0) {
              setMessage('Too many incorrect attempts. Request a new code')
              setCanResend(true)
            } else {
              setMessage(`${errorMessage}. ${newAttempts} attempt${newAttempts === 1 ? '' : 's'} remaining`)
            }
            return newAttempts
          })
        } else {
          setMessage(errorMessage)
        }
        
        setStatus('error')
        onError?.(errorMessage)
        
        // Clear the code for retry
        setCode('')
        inputRefs.current[0]?.focus()
        return
      }

      setStatus('success')
      setMessage('Code verified successfully')
      
      // Force session refresh
      await update()
      
      // Small delay to ensure session is updated
      setTimeout(() => {
        onSuccess()
      }, 500)
    } catch (error) {
      console.error('OTP verification failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Verification failed. Try again in a moment.'
      setStatus('error')
      setMessage(errorMessage)
      onError?.(errorMessage)
      
      // Clear the code for retry
      setCode('')
      inputRefs.current[0]?.focus()
    }
  }

  const handleResendOTP = async () => {
    if (!canResend || resendCooldown > 0) return

    try {
      setResendCooldown(30) // 30 second cooldown
      
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend verification code')
      }

      // Reset state for new OTP
      setTimeLeft(600) // Reset to 10 minutes
      setAttemptsLeft(3) // Reset attempts
      setCanResend(false)
      setCode('')
      setStatus('idle')
      setMessage(`New verification code sent to ${data.maskedPhone || maskedPhone}`)
      
      // Focus first input
      inputRefs.current[0]?.focus()
      
      onResendOTP?.()
    } catch (error) {
      console.error('Resend OTP failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unable to resend code. Try again in a moment.'
      setStatus('error')
      setMessage(errorMessage)
      onError?.(errorMessage)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Enter verification code</h2>
        <p className="text-sm text-slate-600">
          We sent a 6-digit code to {maskedPhone || phone}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-center space-x-3">
            {Array.from({ length: 6 }, (_, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={code[index] || ''}
                onChange={(e) => handleCodeChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-12 text-center text-lg font-semibold rounded-xl border border-slate-200 bg-white/80 text-slate-900 shadow-inner focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                aria-label={`Digit ${index + 1}`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              {timeLeft > 0 ? (
                <span className="text-slate-600">
                  Expires in {formatTime(timeLeft)}
                </span>
              ) : (
                <span className="text-rose-600 font-medium">Code expired</span>
              )}
              {attemptsLeft < 3 && attemptsLeft > 0 && (
                <span className="text-amber-600">
                  {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200/50 transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === 'loading' || status === 'success' || code.length !== 6}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying code
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Verified
            </>
          ) : (
            'Verify code'
          )}
        </button>

        <div className="flex items-center justify-center space-x-4">
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={!canResend || resendCooldown > 0}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="mr-1 h-4 w-4" />
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
          
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-slate-600 hover:text-slate-700 transition-colors"
            >
              Use different number
            </button>
          )}
        </div>

        {status !== 'idle' && message && (
          <div
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
    </div>
  )
}