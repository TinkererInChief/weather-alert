# Audio & Recording System Implementation

## ✅ Phase 1: Audio System (COMPLETED)

### Components Created

1. **Audio Manager** (`/lib/audio/audio-manager.ts`)
   - Singleton that manages Howler sound playback
   - TTS via Web Speech API
   - Settings persistence in localStorage
   - Rate limiting for TTS (5s minimum between announcements)

2. **Audio Hook** (`/lib/audio/use-audio.ts`)
   - React hook for audio interactions
   - Manages settings state
   - Voice selection

3. **Settings UI** (`/app/dashboard/simulate-tsunami/components/AudioSettingsPopover.tsx`)
   - Gear icon in control bar (top-right)
   - Master volume, mute toggle
   - Separate toggles for: Alerts, TTS, UI sounds
   - TTS config: Critical-only (default), voice selection, speech rate

4. **Event Integration** (`/app/dashboard/simulate-tsunami/map-page.tsx`)
   - `simulation:start` - When Run Simulation is clicked
   - `vessel:first_affected` - First vessel impacted
   - `severity:critical` - Critical severity detected
   - `simulation:complete` - Simulation finished
   - `ui:error` - Errors during simulation
   - **TTS**: Announces critical vessels with name and ETA

### Audio Files Required

Place MP3 files in `/public/audio/earcons/`:
- `start.mp3` - Simulation start
- `complete.mp3` - Simulation complete  
- `alert.mp3` - First vessel affected
- `critical.mp3` - Critical severity
- `high.mp3` - High severity
- `step.mp3` - Escalation step
- `notification.mp3` - Notification sent
- `click.mp3` - UI click
- `error.mp3` - Error

**Sources**: Zapsplat, Freesound, Mixkit, BBC Sound Effects (see `/public/audio/earcons/README.md`)

### Settings Behavior

- **Default**: Audio ON, TTS ON (Critical only), Master 70%
- **Storage**: LocalStorage (`audio_settings`, `tts_config`)
- **TTS Rate Limit**: 5 seconds between announcements
- **Critical TTS**: "Critical alert for {vessel}. Estimated arrival time: {X} minutes."

---

## 🚧 Phase 2: MP4 Recording System (IN PROGRESS)

### Architecture Overview

```
User Action (Results Panel)
  ↓
POST /api/record-simulation
  ↓
Recording Worker (Puppeteer + ffmpeg)
  ↓
MP4 with Audio Track
  ↓
/public/recordings/{id}.mp4
```

### Recording Flow

1. **User clicks "Generate MP4 Recording"** (in Results Summary after simulation)
2. **API creates job** → Returns `{recordingId, statusUrl}`
3. **Worker starts**:
   - Launch Puppeteer headless (1920x1080)
   - Navigate to `/dashboard/simulate-tsunami-map?autoStart=1&scenario={id}&record=1`
   - Page auto-runs simulation
   - Worker captures video frames
   - Page exposes event timeline via `window.__RECORDING_EVENTS__`
4. **Audio track generation**:
   - Collect earcons for each event timestamp
   - Generate TTS WAVs for Critical events using free TTS
   - Mix all audio into single track with ffmpeg
5. **Video + Audio muxing**:
   - Combine captured video (WebM) + audio track (WAV/MP3)
   - Encode to MP4 (H.264, yuv420p, +faststart)
6. **Save & return**: `/public/recordings/{id}.mp4`

### Components to Build

#### 1. Recording API (`/app/api/record-simulation/route.ts`)
```typescript
POST /api/record-simulation
Input:
  - scenarioId: string
  - viewport?: { width: number, height: number }
  - maxDuration?: number (seconds, default 120)
  
Output:
  - recordingId: string
  - statusUrl: string
  - message: string
```

#### 2. Recording Status API (`/app/api/record-simulation/[id]/route.ts`)
```typescript
GET /api/record-simulation/{id}
Output:
  - status: 'pending' | 'processing' | 'completed' | 'failed'
  - progress?: number (0-100)
  - downloadUrl?: string
  - error?: string
```

#### 3. Recording Worker (`/lib/recording/recording-worker.ts`)
```typescript
export async function recordSimulation(options: {
  scenarioId: string
  viewport: { width: number, height: number }
  maxDuration: number
  outputPath: string
}): Promise<{ success: boolean, path?: string, error?: string }>
```

**Steps**:
- Launch Puppeteer browser
- Navigate to simulation page with query params
- Start video capture
- Monitor `window.__SIM_DONE__` or timeout
- Extract `window.__RECORDING_EVENTS__`
- Generate audio track
- Mux video + audio → MP4
- Clean up temp files

#### 4. Audio Track Generator (`/lib/recording/audio-track-generator.ts`)
```typescript
export async function generateAudioTrack(
  events: RecordingEvent[],
  duration: number,
  outputPath: string
): Promise<string>
```

**TTS Options** (free, offline):
- **Piper** (preferred): High-quality, lightweight TTS
  - Install: Download model from https://github.com/rhasspy/piper
  - Command: `piper --model en_US-lessac-medium --output_file out.wav < text.txt`
- **eSpeak NG** (fallback): Fast, reliable
  - Install: `brew install espeak-ng` (Mac) or `apt-get install espeak-ng` (Linux)
  - Command: `espeak-ng "text" --stdout > out.wav`
- **Fallback**: Earcons only if no TTS available

**Mixing**:
```bash
# Create silence base
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t {duration} base.wav

# Overlay earcons at timestamps
ffmpeg -i base.wav -i earcon1.mp3 -filter_complex "[0][1]amerge,pan=stereo|c0<c0+c2|c1<c1+c3" -t {duration} mixed.wav

# Mux with video
ffmpeg -i video.webm -i mixed.wav -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart output.mp4
```

#### 5. Page Recording Mode (`/app/dashboard/simulate-tsunami/map-page.tsx`)
```typescript
// Detect recording mode from query params
const isRecording = searchParams.get('record') === '1'
const autoStart = searchParams.get('autoStart') === '1'

// Expose events for recorder
if (isRecording) {
  window.__RECORDING_EVENTS__ = []
  
  // Log all audio events
  const originalPlay = audio.play
  audio.play = (event, opts) => {
    window.__RECORDING_EVENTS__.push({
      timestamp: performance.now(),
      type: 'audio',
      event
    })
    originalPlay(event, opts)
  }
  
  // Log TTS
  const originalSpeak = audio.speak
  audio.speak = (text, opts) => {
    window.__RECORDING_EVENTS__.push({
      timestamp: performance.now(),
      type: 'tts',
      text,
      severity: opts?.severity
    })
    originalSpeak(text, opts)
  }
  
  // Signal completion
  useEffect(() => {
    if (simulationResult && !isSimulating) {
      window.__SIM_DONE__ = true
    }
  }, [simulationResult, isSimulating])
}

// Auto-start if requested
useEffect(() => {
  if (autoStart && selectedScenario && !isSimulating) {
    handleRunSimulation()
  }
}, [autoStart, selectedScenario])
```

#### 6. Recording UI Component (`/app/dashboard/simulate-tsunami/components/RecordingPanel.tsx`)
```typescript
export function RecordingPanel({ 
  simulationResult 
}: {
  simulationResult: SimulationResult | null
}) {
  // Shows "Generate MP4 Recording" button
  // Polls status API
  // Shows download link when ready
}
```

### File Storage

```
/public/recordings/
  ├── {recordingId}.mp4
  ├── {recordingId}-metadata.json
  └── README.md (instructions)
```

**Metadata**:
```json
{
  "recordingId": "uuid",
  "scenarioId": "tohoku-9.0",
  "createdAt": "2025-11-06T...",
  "duration": 45.2,
  "resolution": "1920x1080",
  "audioTracks": ["earcons", "tts"],
  "vesselsAffected": 14,
  "criticalVessels": 3
}
```

### Dependencies Status

✅ Installed:
- `puppeteer` (v24.29.0) - Browser automation
- `ffmpeg-static` (v5.2.0) - FFmpeg binary
- `fluent-ffmpeg` (v2.1.3) - FFmpeg Node.js wrapper
- `@types/fluent-ffmpeg` (v2.1.28) - TypeScript types

### Environment Requirements

- **Puppeteer**: Needs 500MB+ disk for Chromium
- **FFmpeg**: ~80MB
- **Recording**: Temp space ~200MB per recording (cleaned after)
- **Output**: ~10-50MB per MP4 (depends on duration)

### Performance Considerations

- **Recording time**: ~1.5x simulation duration (for a 30s sim, ~45s to record)
- **Encoding time**: ~10-30s depending on duration
- **Total**: ~60-90s for a full 30s simulation recording
- **Concurrent limit**: Max 2 recordings at once (CPU intensive)

### API Rate Limiting

- Max 3 recordings per user per hour
- Max 10 recordings per day per user
- Store in Redis or in-memory cache

### Error Handling

- **Puppeteer fails**: Return error, suggest retry
- **Timeout**: Cap at maxDuration, save what we have
- **Audio missing**: Still produce video-only MP4
- **TTS unavailable**: Use earcons only
- **ffmpeg error**: Log details, return helpful message

### Security Considerations

- **Authentication**: Require valid session
- **File access**: Serve via API, not direct public access
- **Cleanup**: Delete recordings older than 7 days (cron job)
- **Input validation**: Sanitize scenarioId, viewport values
- **Resource limits**: Prevent DoS via rate limiting

---

## 🔮 Phase 3: Enhancements (FUTURE)

### Optional Features

1. **S3 Storage**
   - Upload to S3 after generation
   - Presigned download URLs
   - Automatic expiration

2. **Quality Options**
   - 720p, 1080p, 4K
   - Frame rate: 30fps, 60fps
   - Bitrate selection

3. **Custom Branding**
   - Watermark overlay
   - Title card at start/end
   - Custom colors/logo

4. **Editing**
   - Trim start/end
   - Speed up/slow down sections
   - Add captions

5. **Sharing**
   - Direct share links
   - Email notification when ready
   - Social media export

6. **Analytics**
   - Track which recordings are downloaded
   - Popular scenarios
   - Usage statistics

---

## 📝 Implementation Checklist

### Phase 1 (Audio) ✅
- [x] Audio manager with Howler
- [x] TTS integration (Web Speech API)
- [x] Settings popover UI
- [x] Event wire-up in map-page
- [x] Critical-only TTS by default
- [x] Settings persistence

### Phase 2 (Recording) 🚧
- [ ] Recording API endpoint
- [ ] Recording status endpoint
- [ ] Recording worker with Puppeteer
- [ ] Audio track generator (earcons + TTS)
- [ ] Video + audio muxing with ffmpeg
- [ ] Page recording mode (event tracking)
- [ ] Recording UI panel in results
- [ ] File cleanup job
- [ ] Testing with real simulations

### Phase 3 (Polish) 📋
- [ ] S3 storage integration
- [ ] Rate limiting middleware
- [ ] Quality options
- [ ] Download history page
- [ ] Email notifications

---

## 🧪 Testing Plan

### Audio System
1. Run simulation, verify start/complete sounds
2. Trigger critical vessel, verify TTS announcement
3. Toggle settings, verify persistence
4. Test with audio disabled
5. Test TTS rate limiting

### Recording System
1. Create recording from UI
2. Poll status until complete
3. Download and verify MP4 plays
4. Verify audio track includes earcons
5. Verify TTS for critical events
6. Test error scenarios (timeout, crash)
7. Test concurrent recordings
8. Verify file cleanup

---

## 📖 User Documentation

### Using Audio Features

1. Click gear icon (top-right in simulation)
2. Toggle audio on/off
3. Adjust master volume
4. Enable/disable TTS (default: Critical only)
5. Select voice (optional)
6. Adjust speech rate

### Creating Recordings

1. Run a simulation
2. Wait for completion
3. Click "Generate MP4 Recording" in results
4. Wait for processing (~60-90s)
5. Click "Download MP4" when ready
6. Video includes audio (earcons + TTS)

---

**Status**: Phase 1 complete, Phase 2 in progress
**Next**: Implement recording API and worker
