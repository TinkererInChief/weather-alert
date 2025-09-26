'use client'

/**
 * CAPTCHA Component for Bot Protection
 * Integrates hCaptcha with React components
 */

import { useCallback, useRef, useState, useEffect } from 'react'
import HCaptcha from '@hcaptcha/react-hcaptcha'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface CaptchaProps {
  siteKey: string
  onVerify: (token: string) => void
  onError?: (error: string) => void
  onExpire?: () => void
  onLoad?: () => void
  className?: string
  size?: 'normal' | 'compact' | 'invisible'
  theme?: 'light' | 'dark'
  riskLevel?: 'low' | 'medium' | 'high'
  disabled?: boolean
  resetTrigger?: number // Change this value to trigger reset
}

export function Captcha({
  siteKey,
  onVerify,
  onError,
  onExpire,
  onLoad,
  className,
  size = 'normal',
  theme = 'light',
  riskLevel = 'medium',
  disabled = false,
  resetTrigger
}: CaptchaProps) {
  const captchaRef = useRef<HCaptcha>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  // Reset captcha when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined && captchaRef.current) {
      captchaRef.current.resetCaptcha()
      setIsVerified(false)
      setHasError(false)
    }
  }, [resetTrigger])

  // Adjust size based on risk level if not explicitly set
  const adjustedSize = size === 'normal' && riskLevel === 'high' ? 'compact' : size

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
    onLoad?.()
  }, [onLoad])

  const handleVerify = useCallback((token: string) => {
    setIsVerified(true)
    setHasError(false)
    onVerify(token)
  }, [onVerify])

  const handleError = useCallback((error: string) => {
    setHasError(true)
    setIsVerified(false)
    onError?.(error)
  }, [onError])

  const handleExpire = useCallback(() => {
    setIsVerified(false)
    onExpire?.()
  }, [onExpire])

  const resetCaptcha = useCallback(() => {
    captchaRef.current?.resetCaptcha()
    setIsVerified(false)
    setHasError(false)
  }, [])

  // Don't render if no site key provided
  if (!siteKey) {
    return null
  }

  return (
    <div className={cn(
      'flex flex-col items-center space-y-2',
      className
    )}>
      <div className={cn(
        'relative transition-opacity duration-200',
        isLoading && 'opacity-50',
        disabled && 'opacity-30 pointer-events-none'
      )}>
        <HCaptcha
          ref={captchaRef}
          sitekey={siteKey}
          onLoad={handleLoad}
          onVerify={handleVerify}
          onError={handleError}
          onExpire={handleExpire}
          size={adjustedSize}
          theme={theme}
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div className="flex items-center space-x-2 text-sm">
        {isVerified && (
          <div className="flex items-center text-green-600">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Verified
          </div>
        )}
        
        {hasError && (
          <div className="flex items-center text-red-600">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Verification failed
          </div>
        )}

        {hasError && (
          <button
            onClick={resetCaptcha}
            className="text-blue-600 hover:text-blue-800 underline"
            disabled={disabled}
          >
            Try again
          </button>
        )}
      </div>

      {/* Risk level indicator for debugging/admin */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500">
          Risk Level: {riskLevel} | Size: {adjustedSize}
        </div>
      )}
    </div>
  )
}

// High-level wrapper for common use cases
export function SecurityCaptcha({
  onVerify,
  onError,
  riskLevel = 'high',
  className,
  disabled = false,
  resetTrigger
}: Omit<CaptchaProps, 'siteKey' | 'size' | 'theme'> & {
  riskLevel?: 'low' | 'medium' | 'high'
}) {
  // This would typically get the site key from your app configuration
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ''

  return (
    <Captcha
      siteKey={siteKey}
      onVerify={onVerify}
      onError={onError}
      size={riskLevel === 'high' ? 'compact' : 'normal'}
      theme="light"
      riskLevel={riskLevel}
      className={className}
      disabled={disabled}
      resetTrigger={resetTrigger}
    />
  )
}

// Hook for programmatic CAPTCHA management
export function useCaptcha() {
  const [token, setToken] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetCount, setResetCount] = useState(0)

  const handleVerify = useCallback((newToken: string) => {
    setToken(newToken)
    setIsVerified(true)
    setError(null)
  }, [])

  const handleError = useCallback((errorMessage: string) => {
    setToken(null)
    setIsVerified(false)
    setError(errorMessage)
  }, [])

  const reset = useCallback(() => {
    setToken(null)
    setIsVerified(false)
    setError(null)
    setResetCount(prev => prev + 1)
  }, [])

  return {
    token,
    isVerified,
    error,
    resetCount,
    handleVerify,
    handleError,
    reset
  }
}
