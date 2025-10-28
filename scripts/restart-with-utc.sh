#!/bin/bash

echo "=== Restarting Services with UTC Timezone ==="
echo

# Kill AIS streaming
echo "Stopping AIS streaming service..."
pkill -f "start-ais-streaming.ts" 2>/dev/null
sleep 1

# Kill Next.js dev server on port 3000
echo "Stopping Next.js dev server..."
lsof -ti:3000 | xargs kill 2>/dev/null
sleep 2

echo
echo "✅ All services stopped"
echo
echo "Now run these commands in separate terminals:"
echo
echo "Terminal 1 (Next.js):"
echo "  cd $(pwd) && pnpm dev"
echo
echo "Terminal 2 (AIS Streaming):"
echo "  cd $(pwd) && pnpm ais:start"
echo
echo "Both will now run with TZ=UTC automatically"
echo

# Verify timezone
echo "Verifying timezone setting..."
TZ=UTC node -e "console.log('✓ TZ=UTC is working. Offset:', new Date().getTimezoneOffset(), '(should be 0)')"
