'use client'

import { useState } from 'react'

interface TestResults {
  summary: {
    totalContacts: number
    totalAttempted: number
    totalSuccessful: number
    totalFailed: number
    successRate: number
  }
  channelResults: {
    sms: ChannelResult
    whatsapp: ChannelResult
    voice: ChannelResult
    email: ChannelResult
  }
}

interface ChannelResult {
  attempted: number
  successful: number
  failed: number
  enabled: boolean
  available: number
  results: any[]
}

export default function TestAllChannelsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<TestResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [channels, setChannels] = useState({
    includeSMS: true,
    includeWhatsApp: true,
    includeVoice: true,
    includeEmail: true
  })

  const runAllChannelTest = async () => {
    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch('/api/test/all-channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(channels)
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.data)
      } else {
        setError(data.message || 'Test failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const runHighSeverityTest = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/alerts/test-high-severity', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        alert('High severity test completed! Check the console logs for detailed results.')
      } else {
        setError(data.message || 'High severity test failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const runMultiChannelTest = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/alerts/test-multichannel', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        alert('Multi-channel test completed! Check the console logs for detailed results.')
      } else {
        setError(data.message || 'Multi-channel test failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🧪 Test All Notification Channels
          </h1>
          
          <p className="text-gray-600 mb-8">
            Test all notification channels (SMS, WhatsApp, Voice, Email) to ensure they're working correctly 
            and reaching all contacts.
          </p>

          {/* Channel Selection */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Select Channels to Test</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(channels).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setChannels(prev => ({
                      ...prev,
                      [key]: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">
                    {key.replace('include', '')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Test Buttons */}
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={runAllChannelTest}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? '🔄 Testing...' : '🧪 Test Selected Channels'}
              </button>

              <button
                onClick={runHighSeverityTest}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? '🔄 Testing...' : '🚨 Test High Severity Alert'}
              </button>

              <button
                onClick={runMultiChannelTest}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {isLoading ? '🔄 Testing...' : '📢 Test Multi-Channel Alert'}
              </button>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Test Selected Channels:</strong> Tests individual channels with custom settings</p>
              <p><strong>Test High Severity Alert:</strong> Simulates M7.8 earthquake (triggers ALL channels including voice)</p>
              <p><strong>Test Multi-Channel Alert:</strong> Simulates M6.2 earthquake (triggers SMS + WhatsApp + Email)</p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">❌</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Test Failed</h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Display */}
          {results && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Test Results</h2>
              
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium mb-3">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-600">Total Contacts</div>
                    <div className="text-xl font-bold">{results.summary.totalContacts}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600">Attempted</div>
                    <div className="text-xl font-bold">{results.summary.totalAttempted}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600">Successful</div>
                    <div className="text-xl font-bold text-green-600">{results.summary.totalSuccessful}</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-600">Success Rate</div>
                    <div className="text-xl font-bold">{results.summary.successRate}%</div>
                  </div>
                </div>
              </div>

              {/* Channel Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(results.channelResults).map(([channel, result]) => (
                  <div key={channel} className="border rounded-lg p-4">
                    <h4 className="font-medium text-lg mb-2 capitalize flex items-center">
                      {channel === 'sms' && '📱'}
                      {channel === 'whatsapp' && '💬'}
                      {channel === 'voice' && '📞'}
                      {channel === 'email' && '📧'}
                      <span className="ml-2">{channel.toUpperCase()}</span>
                      {!result.enabled && <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">Disabled</span>}
                    </h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Available Contacts:</span>
                        <span className="font-medium">{result.available}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Attempted:</span>
                        <span className="font-medium">{result.attempted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Successful:</span>
                        <span className="font-medium text-green-600">{result.successful}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed:</span>
                        <span className="font-medium text-red-600">{result.failed}</span>
                      </div>
                      {result.attempted > 0 && (
                        <div className="flex justify-between">
                          <span>Success Rate:</span>
                          <span className="font-medium">
                            {Math.round((result.successful / result.attempted) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Individual Results */}
                    {result.results.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                          View Individual Results ({result.results.length})
                        </summary>
                        <div className="mt-2 space-y-1 text-xs">
                          {result.results.map((res, idx) => (
                            <div key={idx} className={`p-2 rounded ${res.success ? 'bg-green-50' : 'bg-red-50'}`}>
                              <div className="font-medium">
                                {res.contact.name} {res.success ? '✅' : '❌'}
                              </div>
                              {res.error && (
                                <div className="text-red-600 mt-1">{res.error}</div>
                              )}
                              {res.messageId && (
                                <div className="text-gray-500 mt-1">ID: {res.messageId}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}