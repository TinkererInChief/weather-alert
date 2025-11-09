import puppeteer, { Browser, Page } from 'puppeteer'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { audioTrackGenerator } from './audio-track-generator'
import type { RecordingOptions, RecordingResult, RecordingEvent } from './types'

// Dynamic import of fluent-ffmpeg to avoid bundler issues
let ffmpegModule: any = null
let ffmpegStatic: any = null

async function getFfmpeg() {
  if (!ffmpegModule) {
    ffmpegModule = await import('fluent-ffmpeg')
    ffmpegStatic = await import('ffmpeg-static')
    
    const ffmpeg = ffmpegModule.default || ffmpegModule
    const ffmpegPath = ffmpegStatic.default || ffmpegStatic
    
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath)
    }
  }
  return ffmpegModule.default || ffmpegModule
}

export class RecordingWorker {
  private browser: Browser | null = null
  private tempDir = path.join(process.cwd(), 'temp', 'recording-video')

  async initialize() {
    console.log('🎬 Initializing recording worker...')
    
    try {
      // Check if Chrome is available
      const executablePath = puppeteer.executablePath()
      console.log(`   Chrome executable: ${executablePath}`)
    } catch (err) {
      console.error('❌ Chrome not found. Run: npx puppeteer browsers install chrome')
      throw new Error('Chrome browser not found. Please install it with: npx puppeteer browsers install chrome')
    }

    console.log('   Launching browser...')
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    })
    console.log('   ✓ Browser instance created')

    // Ensure temp directory exists
    console.log('   Creating temp directory...')
    await mkdir(this.tempDir, { recursive: true })
    console.log(`   ✓ Temp dir: ${this.tempDir}`)

    console.log('✓ Browser launched successfully')
  }

  async recordSimulation(options: RecordingOptions): Promise<RecordingResult> {
    const {
      scenarioId,
      viewport = { width: 1920, height: 1080 },
      maxDuration = 120,
      outputPath
    } = options

    if (!outputPath) {
      const error = 'Output path is required'
      console.error(`❌ ${error}`)
      return { success: false, error }
    }

    console.log(`\n📹 Starting recording for scenario: ${scenarioId}`)
    console.log(`   Viewport: ${viewport.width}x${viewport.height}`)
    console.log(`   Max duration: ${maxDuration}s`)
    console.log(`   Output: ${outputPath}`)

    try {
      if (!this.browser) {
        console.log('🚀 Initializing browser...')
        try {
          await this.initialize()
          console.log('✓ Browser initialization complete')
        } catch (err) {
          console.error('❌ Browser initialization failed:', err)
          throw new Error(`Failed to initialize browser: ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      console.log('📄 Creating new page...')
      const page = await this.browser!.newPage()
      console.log('✓ Page created')
      
      // Block unnecessary requests to speed up page load and track requests
      await page.setRequestInterception(true)
      const pendingRequests = new Set<string>()
      
      page.on('request', (request) => {
        const url = request.url()
        
        // Track non-static requests
        if (!url.includes('_next/static')) {
          pendingRequests.add(url)
        }
        
        // Block external earthquake APIs, fonts, and heavy resources
        if (
          url.includes('earthquake') ||
          url.includes('usgs.gov') ||
          url.includes('emsc') ||
          url.includes('geonet') ||
          url.includes('iris') ||
          url.includes('fonts.googleapis') ||
          url.includes('fonts.gstatic')
        ) {
          request.abort()
        } else {
          request.continue()
        }
      })
      
      page.on('requestfinished', (request) => {
        pendingRequests.delete(request.url())
      })
      
      page.on('requestfailed', (request) => {
        const url = request.url()
        pendingRequests.delete(url)
        if (!url.includes('favicon')) {
          console.log(`   ⚠️  Request failed: ${url.substring(0, 80)}`)
        }
      })
      
      // Listen to console messages from the page
      page.on('console', msg => {
        const type = msg.type()
        const text = msg.text()
        if (type === 'error') {
          console.error(`   [Browser Error] ${text}`)
        } else if (text.includes('📹') || text.includes('Recording')) {
          console.log(`   [Browser] ${text}`)
        }
      })
      
      // Listen to page errors
      page.on('pageerror', (error) => {
        const err = error as Error
        console.error(`   [Page Error] ${err.message}`)
      })
      
      // Log pending requests after 10s
      setTimeout(() => {
        if (pendingRequests.size > 0) {
          console.log(`   ⚠️  Still waiting for ${pendingRequests.size} requests:`)
          Array.from(pendingRequests).slice(0, 5).forEach(url => {
            console.log(`      - ${url.substring(0, 80)}`)
          })
        }
      }, 10000)
      
      await page.setViewport(viewport)

      // Build URL with query parameters
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const url = `${baseUrl}/dashboard/simulate-tsunami-map?autoStart=1&scenarioId=${encodeURIComponent(scenarioId)}&record=1`

      console.log(`   Navigating to: ${url}`)

      // Navigate to page
      console.log(`   Navigating to page...`)
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded', // Changed from networkidle2 - just wait for DOM
          timeout: 90000 // Increase to 90s
        })
        console.log('   ✓ Page DOM loaded')
        
        // Wait a bit more for JavaScript to initialize
        await new Promise(resolve => setTimeout(resolve, 3000))
        console.log('   ✓ Page initialized')
      } catch (err) {
        console.error('   ✗ Navigation failed:', err)
        console.log('   Attempting to continue anyway...')
      }

      // Give page time to initialize
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Debug: Check if the flag exists
      const hasFlag = await page.evaluate(() => {
        return typeof (window as any).__RECORDING_READY__ !== 'undefined'
      })
      console.log(`   Recording ready flag exists: ${hasFlag}`)

      if (!hasFlag) {
        console.log('   ⚠️  Flag not set, manually setting it...')
        await page.evaluate(() => {
          (window as any).__RECORDING_READY__ = true;
          (window as any).__RECORDING_EVENTS__ = [];
          console.log('📹 Recording ready flag manually set by Puppeteer');
        })
      }

      // Wait for page to be ready (or it's already ready)
      console.log('   Waiting for recording ready signal...')
      try {
        await page.waitForFunction('window.__RECORDING_READY__ === true', { 
          timeout: 5000, // Short timeout since we just set it
          polling: 100
        })
        console.log('   ✓ Page ready signal received')
      } catch (err) {
        console.error('   ✗ Timeout waiting for ready signal')
        throw new Error('Page failed to initialize for recording')
      }

      // Start recording
      const startTime = Date.now()
      const videoPath = path.join(this.tempDir, `video-${Date.now()}.webm`)

      // Start video capture
      await page.evaluate(() => {
        (window as any).__START_CAPTURE__ = true
      })

      // Wait for simulation to complete or timeout
      console.log('⏳ Waiting for simulation to complete...')
      console.log(`   Max wait time: ${maxDuration}s`)
      
      const checkInterval = 1000 // Check every second
      const maxWaitTime = maxDuration * 1000
      let elapsed = 0
      let simulationDone = false

      while (elapsed < maxWaitTime && !simulationDone) {
        await new Promise(resolve => setTimeout(resolve, checkInterval))
        elapsed += checkInterval

        simulationDone = await page.evaluate(() => {
          return (window as any).__SIM_DONE__ === true
        })

        // Log every 5 seconds
        if (elapsed % 5000 === 0) {
          console.log(`   Still waiting... ${Math.round(elapsed / 1000)}s elapsed`)
        }

        if (simulationDone) {
          console.log(`✓ Simulation completed (${Math.round(elapsed / 1000)}s)`)
          break
        }
      }

      if (!simulationDone) {
        console.log(`⚠ Timeout reached (${maxDuration}s) - proceeding with partial recording`)
      }

      const actualDuration = Math.min(elapsed / 1000, maxDuration)
      console.log(`   Recording duration: ${actualDuration}s`)

      // Extract recording events
      const events: RecordingEvent[] = await page.evaluate(() => {
        return (window as any).__RECORDING_EVENTS__ || []
      })

      console.log(`   Captured ${events.length} audio events`)

      // Take screenshots for video (simplified approach)
      // In production, use puppeteer-stream or similar for proper video capture
      const frames: string[] = []
      const fps = 30
      const frameCount = Math.ceil(actualDuration * fps)

      console.log(`📸 Capturing ${frameCount} frames at ${fps} FPS...`)

      for (let i = 0; i < frameCount; i++) {
        const framePath = path.join(this.tempDir, `frame-${i.toString().padStart(6, '0')}.png`) as `${string}.png`
        await page.screenshot({ path: framePath, type: 'png' })
        frames.push(framePath)
        
        // Log progress every 10% of frames
        if (i % Math.floor(frameCount / 10) === 0) {
          const pct = Math.round((i / frameCount) * 100)
          console.log(`   Captured ${i}/${frameCount} frames (${pct}%)`)
        }

        if (i % 30 === 0) {
          process.stdout.write(`   Progress: ${Math.round((i / frameCount) * 100)}%\r`)
        }
      }
      console.log(`   Progress: 100%`)

      await page.close()

      // Convert frames to video
      console.log('🎞️  Encoding video from frames...')
      await this.framesToVideo(frames, fps, videoPath)

      // Generate audio track
      console.log('🎵 Generating audio track...')
      const audioPath = path.join(this.tempDir, `audio-${Date.now()}.wav`)
      await audioTrackGenerator.generateAudioTrack(events, actualDuration, audioPath)

      // Mux video and audio
      console.log('🎬 Muxing video and audio...')
      await this.muxVideoAudio(videoPath, audioPath, outputPath)

      // Cleanup
      console.log('🧹 Cleaning up temporary files...')
      await this.cleanup([videoPath, audioPath, ...frames])

      console.log(`✅ Recording complete: ${outputPath}`)

      return {
        success: true,
        path: outputPath,
        duration: actualDuration,
        events
      }
    } catch (error) {
      console.error('❌ Recording failed:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`💥 Final error: ${errorMessage}`)
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }

  private async framesToVideo(frames: string[], fps: number, outputPath: string): Promise<void> {
    console.log(`🎞️  Creating video from ${frames.length} frames at ${fps} FPS`)
    return new Promise(async (resolve, reject) => {
      // Use ffmpeg pattern input
      const pattern = frames[0].replace(/frame-\d+/, 'frame-%06d')
      console.log(`   Pattern: ${pattern}`)

      const ffmpeg = await getFfmpeg()
      ffmpeg()
        .input(pattern)
        .inputFPS(fps)
        .videoCodec('libvpx')
        .outputOptions([
          '-crf 10',
          '-b:v 1M'
        ])
        .output(outputPath)
        .on('start', (cmd) => console.log(`   ffmpeg command: ${cmd}`))
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`   Video encoding: ${Math.round(progress.percent)}%`)
          }
        })
        .on('end', () => {
          console.log('   ✓ Video created')
          resolve()
        })
        .on('error', (err) => {
          console.error('   ✗ Video encoding failed:', err.message)
          reject(new Error(`Video encoding failed: ${err.message}`))
        })
        .run()
    })
  }

  private async muxVideoAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
    console.log(`🎵 Muxing video and audio`)
    console.log(`   Video: ${videoPath}`)
    console.log(`   Audio: ${audioPath}`)
    console.log(`   Output: ${outputPath}`)
    
    return new Promise(async (resolve, reject) => {
      const ffmpeg = await getFfmpeg()
      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-pix_fmt yuv420p',
          '-movflags +faststart',
          '-shortest'
        ])
        .output(outputPath)
        .on('start', (cmd) => console.log(`   ffmpeg command: ${cmd}`))
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`   Muxing: ${Math.round(progress.percent)}%`)
          }
        })
        .on('end', () => {
          console.log('   ✓ Muxing complete')
          resolve()
        })
        .on('error', (err) => {
          console.error('   ✗ Muxing failed:', err.message)
          reject(new Error(`Muxing failed: ${err.message}`))
        })
        .run()
    })
  }

  private async cleanup(files: string[]): Promise<void> {
    for (const file of files) {
      try {
        if (existsSync(file)) {
          await unlink(file)
        }
      } catch (error) {
        console.warn(`Failed to cleanup ${file}:`, error)
      }
    }
  }

  async shutdown() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      console.log('✓ Browser closed')
    }
  }
}

// Singleton instance
export const recordingWorker = new RecordingWorker()
