'use client'

import { useState } from 'react'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

export default function OTPTestPage() {
  const [phone, setPhone] = useState('+919910490077')
  const [code, setCode] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testVerification = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">OTP Debug Test</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="+919910490077"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">OTP Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="123456"
            />
          </div>
          
          <button
            onClick={testVerification}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test OTP Verification'}
          </button>
        </div>
        
        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Result:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}