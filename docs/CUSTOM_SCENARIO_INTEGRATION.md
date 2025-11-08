# Custom Scenario Integration Guide

## Overview

This guide explains how to integrate the custom scenario feature with AI assistance into your tsunami simulation application.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (map-page.tsx)                    │
│  ├── ScenarioPanel (predefined)             │
│  └── CustomScenarioPanel (NEW)              │
│      ├── Quick Form                         │
│      ├── AI Assistant                       │
│      └── Historical Templates               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  API Layer                                  │
│  ├── /api/ai/parse-scenario (NEW)          │
│  │   ├── Perplexity Llama (primary)        │
│  │   └── Fallback parser (no API key)      │
│  └── /api/test/simulate-tsunami            │
└─────────────────────────────────────────────┘
```

---

## Step 1: Environment Setup

Add Perplexity API key to `.env.local`:

```bash
# Optional - feature works without it using fallback
PERPLEXITY_API_KEY=pplx-...
```

**Without API key:** The system uses pattern matching fallback (free, limited)
**With API key:** Full AI parsing capabilities using Perplexity's Llama model

---

## Step 2: Install Dependencies

```bash
# No additional dependencies needed!
# Perplexity API is accessed via direct HTTP calls

# UI components (already installed)
# - @/components/ui/tabs
# - @/components/ui/slider
# - @/components/ui/textarea
```

---

## Step 3: Integrate into Map Page

Update `/app/dashboard/simulate-tsunami/map-page.tsx`:

```typescript
import CustomScenarioPanel from './components/CustomScenarioPanel'

export default function TsunamiSimulationMapPage() {
  // ... existing state ...
  
  const [showCustomPanel, setShowCustomPanel] = useState(false)

  // NEW: Handle custom scenario
  const handleRunCustomScenario = async (customScenario: CustomScenario) => {
    setLogs([])
    setIsSimulating(true)
    setShowWaves(false)
    setWaveRadius(0)
    setSimulationResult(null)

    audio.playSimulationStart()

    try {
      const response = await fetch('/api/test/simulate-tsunami', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epicenterLat: customScenario.epicenterLat,
          epicenterLon: customScenario.epicenterLon,
          magnitude: customScenario.magnitude,
          sendNotifications: !isDryRun,
          // Optional advanced params
          ...(customScenario.depth && { depth: customScenario.depth }),
          ...(customScenario.faultType && { faultType: customScenario.faultType }),
          ...(customScenario.faultStrike && { faultStrike: customScenario.faultStrike }),
          ...(customScenario.faultLength && { faultLength: customScenario.faultLength }),
          ...(customScenario.faultWidth && { faultWidth: customScenario.faultWidth }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Simulation failed')
      }

      // ... handle results same as existing simulation ...
      setLogs(data.simulationLog || [])
      setSimulationResult(data)
      
      // Create temporary scenario for display
      const tempScenario: Scenario = {
        id: 'custom',
        name: customScenario.name,
        emoji: '⚡',
        epicenter: {
          lat: customScenario.epicenterLat,
          lon: customScenario.epicenterLon
        },
        magnitude: customScenario.magnitude,
        depth: customScenario.depth || 30,
        faultLength: customScenario.faultLength || 200,
        faultWidth: customScenario.faultWidth || 100,
        faultStrike: customScenario.faultStrike || 0,
        faultDip: 45,
        faultRake: 90,
        faultType: customScenario.faultType || 'thrust'
      }
      setSelectedScenario(tempScenario)

    } catch (error: any) {
      console.error('Custom scenario failed:', error)
      audio.playError()
      alert(`Failed to run custom scenario: ${error.message}`)
    } finally {
      setIsSimulating(false)
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-96 flex flex-col border-r bg-background overflow-hidden">
        
        {/* Toggle between predefined and custom */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <Button
              variant={!showCustomPanel ? 'default' : 'outline'}
              onClick={() => setShowCustomPanel(false)}
              size="sm"
              className="flex-1"
            >
              Predefined
            </Button>
            <Button
              variant={showCustomPanel ? 'default' : 'outline'}
              onClick={() => setShowCustomPanel(true)}
              size="sm"
              className="flex-1"
            >
              Custom
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!showCustomPanel ? (
            <>
              {/* Existing ScenarioPanel */}
              <ScenarioPanel
                scenarios={SCENARIOS}
                selectedScenario={selectedScenario}
                onSelectScenario={setSelectedScenario}
              />
              
              {selectedScenario && (
                <ControlBar
                  onRun={handleRunSimulation}
                  onToggleWaves={handleToggleWaves}
                  // ... other props
                />
              )}
            </>
          ) : (
            <>
              {/* NEW: Custom Scenario Panel */}
              <CustomScenarioPanel
                onRunScenario={handleRunCustomScenario}
                disabled={isSimulating}
              />
            </>
          )}

          {/* Simulation Log */}
          {logs.length > 0 && (
            <SimulationLog logs={logs} />
          )}
        </div>
      </div>

      {/* Map - unchanged */}
      <div className="flex-1 relative">
        {/* ... existing map component ... */}
      </div>
    </div>
  )
}
```

---

## Step 4: Testing

### Test 1: Quick Form (No AI)
1. Click "Custom" tab
2. Enter coordinates: 35.0°N, 140.0°E
3. Set magnitude: 7.5
4. Click "Run Custom Scenario"
5. ✓ Should simulate immediately

### Test 2: AI Assistant (With API Key)
1. Click "AI Assistant" tab
2. Enter: "A major earthquake near Tokyo"
3. Click "Generate Scenario"
4. ✓ Should parse and show parameters
5. Click "Run This Scenario"
6. ✓ Should simulate with AI-generated params

### Test 3: Historical Template
1. Click "Historical" tab
2. Select "2011 Tōhoku Earthquake"
3. ✓ Should run with historical parameters

### Test 4: AI Fallback (No API Key)
1. Remove `PERPLEXITY_API_KEY` from env
2. Try: "magnitude 8 near Indonesia"
3. ✓ Should use pattern matching fallback

---

## Cost Analysis

### Option A: With Perplexity API
- **Model:** Llama 3.1 Sonar Small
- **Cost:** ~$0.0001-0.001 per scenario generation (much cheaper than GPT-4)
- **Monthly estimate:** 
  - 100 scenarios: $0.01-0.10
  - 1,000 scenarios: $0.10-1.00
  - 10,000 scenarios: $1-10

### Option B: Without API (Fallback Only)
- **Cost:** $0 (free)
- **Limitations:**
  - Only recognizes ~15 common locations
  - Only recognizes 2-3 historical earthquakes
  - No complex natural language understanding

### Recommendation
Start with **Perplexity AI** (very affordable), fallback to pattern matching if API unavailable.

---

## Feature Comparison

| Feature | Quick Form | AI Assistant | Historical |
|---------|-----------|--------------|------------|
| Speed | ⚡ Instant | 🐌 1-2s | ⚡ Instant |
| Accuracy | ✓ 100% | ✓ 85-95% | ✓ 100% |
| Ease of Use | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Cost | Free | ~$0.001 | Free |
| Learning Value | Low | High | Medium |

---

## Advanced Features (Future)

### 1. AI Suggestions While Typing
```typescript
// Real-time parameter suggestions
useEffect(() => {
  if (magnitude > 8.5) {
    // AI suggests: "For M8.5+, consider depth 20-30km for megathrust"
    fetchAISuggestion({ magnitude, location })
  }
}, [magnitude])
```

### 2. Multi-Scenario Comparison
```typescript
// Generate variations
const variations = await generateScenarioVariations({
  base: customScenario,
  vary: ['magnitude', 'depth'],
  count: 3
})
```

### 3. Scenario Validation
```typescript
// AI validates before running
const validation = await validateScenario(customScenario)
if (validation.warnings.length > 0) {
  // Show warnings to user
}
```

### 4. Voice Input
```typescript
// Speech-to-text + AI parsing
const transcript = await recognizeSpeech()
const scenario = await parseScenario(transcript)
```

---

## Security Considerations

1. **Rate Limiting**
   - Limit AI calls to 10/minute per user
   - Implement on API route

2. **Input Validation**
   - Always validate AI-generated parameters
   - Clamp values to safe ranges

3. **Cost Controls**
   - Set monthly spending limit on OpenAI
   - Fallback to free parser if budget exceeded

4. **Data Privacy**
   - User prompts sent to OpenAI
   - Consider local model for sensitive data

---

## Monitoring

Track in analytics:
```typescript
// Log AI usage
analytics.track('custom_scenario_generated', {
  method: 'ai' | 'form' | 'historical',
  magnitude: scenario.magnitude,
  location: [lat, lon],
  success: true,
  latency: elapsedMs
})
```

---

## Troubleshooting

### AI Not Working
1. Check `PERPLEXITY_API_KEY` in env
2. Check Perplexity account credits
3. Check API route logs: `/api/ai/parse-scenario`
4. Fallback should still work

### Inaccurate Parsing
1. Be more specific in prompt
2. Use form for precise control
3. Report examples to improve prompts

### Slow Response
1. Perplexity Llama typically <1s
2. If slow, check Perplexity status
3. Consider caching common patterns

---

## Example Prompts (Best Practices)

✅ **Good:**
- "A magnitude 8.5 earthquake 100km east of Tokyo at 30km depth"
- "Simulate the 1960 Chile earthquake"
- "Major thrust fault earthquake in the Cascadia subduction zone"

❌ **Vague:**
- "Big earthquake"
- "Tsunami"
- "Something scary"

---

## Summary

**Is LLM integration worth it?**

| Pro | Con |
|-----|-----|
| ✓ Better UX for non-experts | ✗ Adds ~$1-10/month cost |
| ✓ Educational value | ✗ <1s latency |
| ✓ Natural language input | ✗ Requires API key management |
| ✓ Fallback available for free | ✗ Occasional incorrect parsing |
| ✓ Very affordable with Perplexity | |

**Verdict:** Implement **AI-first with Perplexity**, with free fallback for edge cases. Very cost-effective!
