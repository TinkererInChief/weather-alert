#!/bin/bash

# Generate placeholder audio files using ffmpeg
# These are simple tones/beeps for testing. Replace with better sounds later.

EARCONS_DIR="public/audio/earcons"
FFMPEG="node_modules/.pnpm/ffmpeg-static@5.2.0/node_modules/ffmpeg-static/ffmpeg"

echo "🔊 Generating placeholder sound files..."
echo "📁 Output directory: $EARCONS_DIR"
echo ""

mkdir -p "$EARCONS_DIR"

# Start sound - Rising tone (power up)
echo "Generating start.mp3..."
$FFMPEG -f lavfi -i "sine=frequency=440:duration=0.5" \
  -af "afade=t=in:st=0:d=0.1,afade=t=out:st=0.4:d=0.1,asetrate=44100*1.2,atempo=1/1.2" \
  -y "$EARCONS_DIR/start.mp3" 2>/dev/null

# Complete sound - Success chime (three ascending notes)
echo "Generating complete.mp3..."
$FFMPEG -f lavfi -i "sine=frequency=523:duration=0.15" \
  -f lavfi -i "sine=frequency=659:duration=0.15" \
  -f lavfi -i "sine=frequency=784:duration=0.3" \
  -filter_complex "[0][1][2]concat=n=3:v=0:a=1,afade=t=out:st=0.5:d=0.1" \
  -y "$EARCONS_DIR/complete.mp3" 2>/dev/null

# Alert sound - Attention beep (two quick beeps)
echo "Generating alert.mp3..."
$FFMPEG -f lavfi -i "sine=frequency=800:duration=0.1" \
  -f lavfi -i "sine=frequency=800:duration=0.1" \
  -f lavfi -i "anullsrc=duration=0.1" \
  -filter_complex "[0][2][1]concat=n=3:v=0:a=1,afade=t=in:st=0:d=0.05,afade=t=out:st=0.25:d=0.05" \
  -y "$EARCONS_DIR/alert.mp3" 2>/dev/null

# Critical sound - Urgent alarm (rapid oscillating tone)
echo "Generating critical.mp3..."
$FFMPEG -f lavfi -i "sine=frequency=1000:duration=1.0" \
  -af "tremolo=f=8:d=0.7,afade=t=in:st=0:d=0.1,afade=t=out:st=0.9:d=0.1" \
  -y "$EARCONS_DIR/critical.mp3" 2>/dev/null

# High severity - Warning tone (medium urgency)
echo "Generating high.mp3..."
$FFMPEG -f lavfi -i "sine=frequency=700:duration=0.4" \
  -af "tremolo=f=5:d=0.5,afade=t=in:st=0:d=0.05,afade=t=out:st=0.35:d=0.05" \
  -y "$EARCONS_DIR/high.mp3" 2>/dev/null

# Step sound - Notification ping (soft single tone)
echo "Generating step.mp3..."
$FFMPEG -f lavfi -i "sine=frequency=600:duration=0.2" \
  -af "afade=t=in:st=0:d=0.05,afade=t=out:st=0.15:d=0.05" \
  -y "$EARCONS_DIR/step.mp3" 2>/dev/null

# Notification sound - Message sent (gentle blip)
echo "Generating notification.mp3..."
$FFMPEG -f lavfi -i "sine=frequency=880:duration=0.15" \
  -af "afade=t=in:st=0:d=0.03,afade=t=out:st=0.12:d=0.03" \
  -y "$EARCONS_DIR/notification.mp3" 2>/dev/null

# Click sound - UI click (short tick)
echo "Generating click.mp3..."
$FFMPEG -f lavfi -i "sine=frequency=1200:duration=0.05" \
  -af "afade=t=in:st=0:d=0.01,afade=t=out:st=0.04:d=0.01" \
  -y "$EARCONS_DIR/click.mp3" 2>/dev/null

# Error sound - Error beep (low descending tone)
echo "Generating error.mp3..."
$FFMPEG -f lavfi -i "sine=frequency=300:duration=0.5" \
  -af "asetrate=44100*0.8,atempo=1/0.8,afade=t=in:st=0:d=0.05,afade=t=out:st=0.45:d=0.05" \
  -y "$EARCONS_DIR/error.mp3" 2>/dev/null

echo ""
echo "✅ All sound files generated successfully!"
echo ""
echo "📋 Generated files:"
ls -lh "$EARCONS_DIR"/*.mp3 | awk '{print "  - " $9 " (" $5 ")"}'
echo ""
echo "🎧 Test a sound file:"
echo "   afplay $EARCONS_DIR/start.mp3"
echo ""
echo "💡 These are placeholder tones. You can replace them with better sounds from:"
echo "   - Zapsplat: https://www.zapsplat.com/"
echo "   - Freesound: https://freesound.org/"
echo "   - Mixkit: https://mixkit.co/free-sound-effects/"
echo ""
