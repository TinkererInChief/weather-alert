#!/bin/bash
# Add Mapbox token to Railway environment variables

echo "Adding NEXT_PUBLIC_MAPBOX_TOKEN to Railway..."

railway variables set NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1Ijoiam9rZXJpbnRoZWJveCIsImEiOiJjbWc2Z21ydmYwYnIwMmlzZHAzOHRyemRsIn0._f0_1Euc0NJkNyvoYmIvrg"

echo "✅ Variable added! Railway will automatically redeploy."
echo "⏳ Wait 2-3 minutes for deployment to complete."
echo "🔗 Then visit: https://appealing-playfulness-production.up.railway.app"
