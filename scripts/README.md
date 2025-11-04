# DART Stations Auto-Update System

## Overview

The DART station list is **automatically generated** from NOAA's official API to ensure we always have the most current active stations without manual maintenance.

## How It Works

### 🤖 Automatic Updates

The system updates in **3 scenarios**:

1. **Every Build/Deployment** ⚡
   - `pnpm build` automatically runs `prebuild` hook
   - Fetches latest stations from NOAA
   - Generates fresh `lib/data/dart-stations.ts`
   - Zero manual work required!

2. **Weekly via GitHub Actions** 📅
   - Runs every Monday at 00:00 UTC
   - Creates PR if changes detected
   - Review & merge to deploy

3. **Manual Update** 🔧
   - Run: `pnpm update-dart-stations`
   - Useful for testing or urgent updates

### 📊 What Gets Updated

**Source:** https://www.ndbc.noaa.gov/activestations.xml

**Process:**
1. Fetch XML from NOAA
2. Filter stations with `dart="y"` (active DART buoys)
3. Map to our TypeScript format with regions
4. Generate `dart-stations.ts` with metadata
5. File includes update timestamp

**Result:** Always have 40-50 active stations (vs 71 with manual list)

### ✅ Benefits

- **No Forgetting:** Automatic on every build
- **Always Current:** Updates with NOAA's active list
- **Zero Runtime Cost:** Static TypeScript file
- **Reliable:** Fallback to existing if NOAA down
- **Auditable:** Git history shows changes
- **90%+ Success Rate:** Only active stations queried

## Usage

### Manual Update

```bash
# Update DART stations from NOAA
pnpm update-dart-stations
```

### Build (Auto-Update)

```bash
# Stations update automatically before build
pnpm build
```

### Development

```bash
# For testing, you can disable auto-update:
SKIP_DART_UPDATE=1 pnpm build
```

## File Structure

```
scripts/
  └── update-dart-stations.ts   # Generator script
lib/
  └── data/
      └── dart-stations.ts       # AUTO-GENERATED (do not edit!)
```

## Monitoring

Check the generated file header for metadata:

```typescript
/**
 * Last Updated: 2025-11-04
 * Total Stations: 50
 */
```

## Troubleshooting

### Build Fails Due to NOAA Being Down

The script has automatic fallback - it will:
1. Log error to console
2. Keep existing `dart-stations.ts`
3. Continue build successfully

### Stations Look Wrong

1. Check NOAA's XML: https://www.ndbc.noaa.gov/activestations.xml
2. Verify `dart="y"` attribute on stations
3. Run manual update: `pnpm update-dart-stations`
4. Check console for errors

### Want to Add Custom Stations

Don't edit `dart-stations.ts` directly (will be overwritten!).

Instead, modify `scripts/update-dart-stations.ts`:
- Add to `fetchActiveDartStations()` function
- Or create separate custom stations file

## Future Enhancements

- [ ] Email notifications on station changes
- [ ] Slack/Discord webhooks for updates
- [ ] Historical tracking of station list changes
- [ ] Diff reports in PR comments
