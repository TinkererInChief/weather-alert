import { randomUUID } from 'crypto'
import path from 'path'
import type { RecordingJob, RecordingOptions } from './types'

// In-memory job storage (replace with Redis in production)
const jobs = new Map<string, RecordingJob>()

export class RecordingManager {
  async createJob(scenarioId: string, userId: string): Promise<RecordingJob> {
    const id = randomUUID()
    const job: RecordingJob = {
      id,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      metadata: {
        scenarioId
      }
    }

    jobs.set(id, job)

    // Start recording asynchronously
    this.processJob(id, scenarioId).catch(error => {
      console.error(`Job ${id} failed:`, error)
      this.updateJob(id, {
        status: 'failed',
        error: error.message,
        progress: 0
      })
    })

    return job
  }

  private async processJob(jobId: string, scenarioId: string): Promise<void> {
    const job = jobs.get(jobId)
    if (!job) {
      console.error(`❌ Job ${jobId} not found in jobs map`)
      return
    }

    console.log(`🎬 Processing job ${jobId} for scenario: ${scenarioId}`)

    try {
      // Update status to processing
      this.updateJob(jobId, {
        status: 'processing',
        startedAt: new Date(),
        progress: 10
      })
      console.log(`✓ Job ${jobId} status updated to processing`)

      // Import worker dynamically to avoid issues
      console.log('📦 Importing recording worker...')
      const { recordingWorker } = await import('./recording-worker')

      // Generate output path and ensure directory exists
      console.log('📁 Creating output directory...')
      const { mkdir } = await import('fs/promises')
      const outputDir = path.join(process.cwd(), 'public', 'recordings')
      await mkdir(outputDir, { recursive: true })
      const outputPath = path.join(outputDir, `${jobId}.mp4`)
      console.log(`✓ Output path: ${outputPath}`)

      this.updateJob(jobId, { progress: 20 })

      // Record simulation with timeout
      console.log(`⏱️  Starting recording with 5 minute timeout...`)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Recording timeout after 5 minutes')), 5 * 60 * 1000)
      })

      const recordingPromise = recordingWorker.recordSimulation({
        scenarioId,
        outputPath
      })

      const result = await Promise.race([recordingPromise, timeoutPromise])
      console.log(`✓ Recording worker completed`)

      if (result.success && result.path) {
        // Success
        this.updateJob(jobId, {
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          downloadUrl: `/recordings/${jobId}.mp4`,
          metadata: {
            scenarioId: job.metadata?.scenarioId || scenarioId,
            duration: result.duration,
            resolution: '1920x1080',
            vesselsAffected: job.metadata?.vesselsAffected,
            criticalVessels: job.metadata?.criticalVessels
          }
        })
      } else {
        // Failed
        this.updateJob(jobId, {
          status: 'failed',
          error: result.error || 'Unknown error',
          progress: 0
        })
      }
    } catch (error) {
      console.error(`Recording job ${jobId} failed:`, error)
      this.updateJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        progress: 0
      })
    }
  }

  private updateJob(jobId: string, updates: Partial<RecordingJob>): void {
    const job = jobs.get(jobId)
    if (job) {
      Object.assign(job, updates)
      jobs.set(jobId, job)
    }
  }

  getJob(jobId: string): RecordingJob | undefined {
    return jobs.get(jobId)
  }

  listJobs(userId: string): RecordingJob[] {
    // In production, filter by userId
    return Array.from(jobs.values())
  }

  deleteJob(jobId: string): boolean {
    return jobs.delete(jobId)
  }
}

export const recordingManager = new RecordingManager()
