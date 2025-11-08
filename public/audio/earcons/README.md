# Audio Earcons

This directory contains short sound effects (earcons) for simulation events.

## Required Files

Place these MP3 files in this directory:

- `start.mp3` - Simulation start (e.g., power-up sound)
- `complete.mp3` - Simulation complete (e.g., success chime)
- `alert.mp3` - First vessel affected (e.g., alert beep)
- `critical.mp3` - Critical severity (e.g., urgent alarm)
- `high.mp3` - High severity (e.g., warning tone)
- `step.mp3` - Escalation step started (e.g., notification ping)
- `notification.mp3` - Notification sent (e.g., message sent)
- `click.mp3` - UI click (e.g., button tap)
- `error.mp3` - Error occurred (e.g., error beep)

## Free Sound Sources

### Recommended Libraries (Royalty-Free)
- **Zapsplat**: https://www.zapsplat.com/
- **Freesound**: https://freesound.org/
- **Mixkit**: https://mixkit.co/free-sound-effects/
- **BBC Sound Effects**: https://sound-effects.bbcrewind.co.uk/

### Suggested Search Terms
- start: "power up", "activate", "begin"
- complete: "success", "complete", "achievement"
- alert: "alert", "notification", "warning"
- critical: "alarm", "emergency", "critical"
- high: "warning", "caution", "attention"
- step: "ping", "notification", "message"
- notification: "send", "delivered", "sent"
- click: "click", "tap", "button"
- error: "error", "fail", "negative"

## Quick Setup

1. Download sounds from the sources above
2. Convert to MP3 if needed (use `ffmpeg -i input.wav output.mp3`)
3. Keep files short (< 2 seconds recommended)
4. Normalize volume levels

## Format Requirements

- **Format**: MP3 (recommended) or OGG
- **Duration**: 0.2 - 2.0 seconds
- **Sample Rate**: 44.1 kHz or 48 kHz
- **Bitrate**: 128-192 kbps
- **Channels**: Mono or Stereo

## License Consideration

Ensure all sound files are:
- Royalty-free or properly licensed
- Compatible with your project's license
- Attributed if required by the source

## Fallback

If audio files are missing, the system will:
- Continue to function without errors
- Log warnings in the console
- TTS announcements will still work
