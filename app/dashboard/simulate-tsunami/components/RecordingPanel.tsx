'use client'

import { useState } from 'react'
import { Video, Download, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import type { SimulationResult } from '../types'

type RecordingStatus = 'idle' | 'creating' | 'processing' | 'completed' | 'failed'

type RecordingPanelProps = {
  simulationResult: SimulationResult
  scenarioId?: string
}

export function RecordingPanel({ simulationResult, scenarioId }: RecordingPanelProps) {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const handleGenerateRecording = async () => {
    try {
      if (!scenarioId) {
        setError('No scenario selected')
        setStatus('failed')
        return
      }

      setStatus('creating')
      setError(null)
      setProgress(0)

      // Create recording job
      console.log('Creating recording for scenario:', scenarioId)
      
      const response = await fetch('/api/record-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || 'Failed to create recording'
        console.error('API Error:', errorData)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('Recording job created:', data)
      setRecordingId(data.recordingId)
      setStatus('processing')

      // Poll for status
      pollRecordingStatus(data.recordingId)
    } catch (err) {
      console.error('Failed to generate recording:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('failed')
    }
  }

  const pollRecordingStatus = async (id: string) => {
    const poll = async () => {
      try {
        console.log(`Polling status for recording ${id}...`)
        const response = await fetch(`/api/record-simulation/${id}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Poll error response:', errorData)
          throw new Error(errorData.error || errorData.details || 'Failed to check status')
        }

        const data = await response.json()
        const job = data.job
        console.log('Job status:', job.status, 'Progress:', job.progress)

        setProgress(job.progress || 0)

        if (job.status === 'completed') {
          console.log('Recording completed!', job.downloadUrl)
          setStatus('completed')
          setDownloadUrl(job.downloadUrl)
        } else if (job.status === 'failed') {
          console.error('Recording failed:', job.error)
          setStatus('failed')
          setError(job.error || 'Recording failed')
        } else {
          // Continue polling
          setTimeout(poll, 2000)
        }
      } catch (err) {
        console.error('Failed to poll status:', err)
        setStatus('failed')
        setError(err instanceof Error ? err.message : 'Failed to check recording status')
      }
    }

    poll()
  }

  if (status === 'idle') {
    return (
      <div className="mb-4 p-4 bg-slate-800/60 border border-purple-500/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">
                MP4 Recording
              </h3>
              <p className="text-xs text-slate-400">
                {scenarioId ? 'Record this simulation with audio' : 'Select a scenario to enable recording'}
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateRecording}
            disabled={!scenarioId}
            className={`px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-purple-500/30 ${
              !scenarioId ? 'opacity-50 cursor-not-allowed' : 'hover:from-purple-600 hover:to-pink-600'
            }`}
          >
            <Video className="w-4 h-4" />
            Generate Recording
          </button>
        </div>
      </div>
    )
  }

  if (status === 'creating' || status === 'processing') {
    return (
      <div className="mt-6 p-6 bg-slate-800/40 border border-purple-500/50 rounded-xl">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              {status === 'creating' ? 'Creating recording job...' : 'Recording in progress...'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              This may take 60-90 seconds. You can leave this page.
            </p>
            {progress > 0 && (
              <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            {progress > 0 && (
              <p className="text-xs text-slate-500 mt-1">{progress}% complete</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (status === 'completed' && downloadUrl) {
    return (
      <div className="mt-6 p-6 bg-slate-800/40 border border-green-500/50 rounded-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">
                Recording Complete!
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Your MP4 recording is ready to download
              </p>
            </div>
          </div>
          <a
            href={downloadUrl}
            download
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-green-500/30"
          >
            <Download className="w-4 h-4" />
            Download MP4
          </a>
        </div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="mt-6 p-6 bg-slate-800/40 border border-red-500/50 rounded-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">
                Recording Failed
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {error || 'An error occurred during recording'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatus('idle')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return null
}
