import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import type { RecordingEvent } from './types'

const execAsync = promisify(exec)

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

type TTSProvider = 'espeak' | 'say' | 'none'

class AudioTrackGenerator {
  private tempDir = path.join(process.cwd(), 'temp', 'recording-audio')
  private ttsProvider: TTSProvider = 'none'

  constructor() {
    this.detectTTSProvider()
  }

  private async detectTTSProvider() {
    // Check for macOS 'say' command
    try {
      await execAsync('which say')
      this.ttsProvider = 'say'
      console.log('✓ Using macOS say for TTS')
      return
    } catch {}

    // Check for espeak-ng
    try {
      await execAsync('which espeak-ng')
      this.ttsProvider = 'espeak'
      console.log('✓ Using espeak-ng for TTS')
      return
    } catch {}

    console.warn('⚠ No TTS provider found. Audio will use earcons only.')
  }

  async generateAudioTrack(
    events: RecordingEvent[],
    durationSeconds: number,
    outputPath: string
  ): Promise<string> {
    try {
      // Ensure temp directory exists
      await mkdir(this.tempDir, { recursive: true })

      console.log(`🎵 Generating audio track (${durationSeconds}s)...`)
      console.log(`   Events: ${events.length}`)
      console.log(`   TTS Provider: ${this.ttsProvider}`)

      // Create base silence track
      const basePath = path.join(this.tempDir, 'base.wav')
      await this.createSilence(durationSeconds, basePath)

      // Generate TTS files for speech events
      const ttsFiles: Array<{ path: string; timestamp: number }> = []
      for (const event of events) {
        if (event.type === 'tts' && event.text) {
          const ttsPath = await this.synthesizeSpeech(event.text, event.timestamp)
          if (ttsPath) {
            ttsFiles.push({ path: ttsPath, timestamp: event.timestamp / 1000 })
          }
        }
      }

      // Collect earcon files for audio events
      const earconFiles: Array<{ path: string; timestamp: number }> = []
      for (const event of events) {
        if (event.type === 'audio' && event.event) {
          const earconPath = this.getEarconPath(event.event)
          if (earconPath && existsSync(earconPath)) {
            earconFiles.push({ path: earconPath, timestamp: event.timestamp / 1000 })
          }
        }
      }

      console.log(`   TTS clips: ${ttsFiles.length}`)
      console.log(`   Earcons: ${earconFiles.length}`)

      // Mix all audio into the base track
      const mixedPath = await this.mixAudioFiles(
        basePath,
        [...ttsFiles, ...earconFiles],
        durationSeconds,
        outputPath
      )

      // Cleanup temp files
      await this.cleanup([basePath, ...ttsFiles.map(f => f.path)])

      console.log(`✓ Audio track generated: ${outputPath}`)
      return mixedPath
    } catch (error) {
      console.error('Failed to generate audio track:', error)
      throw error
    }
  }

  private async createSilence(durationSeconds: number, outputPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const ffmpeg = await getFfmpeg()
      ffmpeg()
        .input('anullsrc=channel_layout=stereo:sample_rate=44100')
        .inputFormat('lavfi')
        .duration(durationSeconds)
        .audioCodec('pcm_s16le')
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run()
    })
  }

  private async synthesizeSpeech(text: string, timestamp: number): Promise<string | null> {
    const outputPath = path.join(this.tempDir, `tts-${timestamp}.wav`)

    try {
      if (this.ttsProvider === 'say') {
        // macOS say command
        await execAsync(`say -o "${outputPath}" --data-format=LEF32@44100 "${text.replace(/"/g, '\\"')}"`)
        
        // Convert to standard WAV
        const convertedPath = path.join(this.tempDir, `tts-${timestamp}-converted.wav`)
        await new Promise<void>(async (resolve, reject) => {
          const ffmpeg = await getFfmpeg()
          ffmpeg(outputPath)
            .audioCodec('pcm_s16le')
            .audioFrequency(44100)
            .output(convertedPath)
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .run()
        })
        
        // Replace original with converted
        await unlink(outputPath)
        return convertedPath
      } else if (this.ttsProvider === 'espeak') {
        // espeak-ng
        await execAsync(`espeak-ng "${text.replace(/"/g, '\\"')}" --stdout > "${outputPath}"`)
        return outputPath
      }
    } catch (error) {
      console.warn(`Failed to synthesize speech: ${error}`)
    }

    return null
  }

  private getEarconPath(eventName: string): string | null {
    const earconMap: Record<string, string> = {
      'simulation:start': 'start.mp3',
      'simulation:complete': 'complete.mp3',
      'vessel:first_affected': 'alert.mp3',
      'severity:critical': 'critical.mp3',
      'severity:high': 'high.mp3',
      'escalation:step_started': 'step.mp3',
      'notification:sent:sms': 'notification.mp3',
      'notification:sent:whatsapp': 'notification.mp3',
      'notification:sent:voice': 'notification.mp3',
      'notification:sent:email': 'notification.mp3',
      'ui:click': 'click.mp3',
      'ui:error': 'error.mp3'
    }

    const filename = earconMap[eventName]
    if (!filename) return null

    const earconPath = path.join(process.cwd(), 'public', 'audio', 'earcons', filename)
    return existsSync(earconPath) ? earconPath : null
  }

  private async mixAudioFiles(
    basePath: string,
    clips: Array<{ path: string; timestamp: number }>,
    durationSeconds: number,
    outputPath: string
  ): Promise<string> {
    if (clips.length === 0) {
      // No clips to mix, just copy the base
      await new Promise<void>(async (resolve, reject) => {
        const ffmpeg = await getFfmpeg()
        ffmpeg(basePath)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .run()
      })
      return outputPath
    }

    // Build complex filter for mixing all clips
    const inputs = [basePath, ...clips.map(c => c.path)]
    const delays = clips.map((c, i) => `[${i + 1}]adelay=${Math.round(c.timestamp * 1000)}|${Math.round(c.timestamp * 1000)}[a${i}]`)
    const mixInputs = ['[0]', ...clips.map((_, i) => `[a${i}]`)]
    const filterComplex = [
      ...delays,
      `${mixInputs.join('')}amix=inputs=${inputs.length}:duration=first:dropout_transition=0[out]`
    ].join(';')

    return new Promise(async (resolve, reject) => {
      const ffmpeg = await getFfmpeg()
      const command = ffmpeg()

      // Add all inputs
      inputs.forEach(input => command.input(input))

      command
        .complexFilter(filterComplex, 'out')
        .audioCodec('pcm_s16le')
        .audioFrequency(44100)
        .audioChannels(2)
        .duration(durationSeconds)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err: Error) => reject(err))
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
}

// Singleton instance
export const audioTrackGenerator = new AudioTrackGenerator()
