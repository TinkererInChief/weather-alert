import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const SYSTEM_PROMPT = `You are a tsunami simulation expert assistant powered by GPT-4. Convert natural language descriptions into precise earthquake parameters.

CRITICAL: Tsunami-generating earthquakes MUST occur in ocean/sea areas, NOT on land. When a city or coastal location is mentioned, place the epicenter OFFSHORE in the nearest ocean, sea, or subduction zone.

IMPORTANT: You must respond ONLY with valid JSON. Do not include any markdown, explanations, or text outside the JSON object.

You must output valid JSON with these fields:
{
  "name": "Brief descriptive name",
  "description": "Optional 1-2 sentence description",
  "epicenterLat": number between -90 and 90,
  "epicenterLon": number between -180 and 180,
  "magnitude": number between 6.0 and 9.5,
  "depth": number between 10 and 100 (km),
  "faultType": "thrust" | "strike-slip" | "normal",
  "confidence": number between 0 and 1
}

Guidelines:
- ALWAYS place epicenter in ocean/sea, never on land
- For coastal cities: place epicenter 50-200km offshore in the ocean
- Use realistic parameters based on real earthquake physics and plate tectonics
- Thrust faults are most tsunamigenic (use for subduction zones)
- Megathrust earthquakes (M8.5+) typically have depth 20-40km
- Moderate earthquakes (M7-8) typically have depth 25-50km
- If location is ambiguous, choose the nearest subduction zone or oceanic fault
- Extract historical earthquake details if mentioned
- Research actual tectonic settings for the region

Examples:
"Major earthquake near Tokyo" →
{
  "name": "Tokyo Bay Offshore Earthquake",
  "epicenterLat": 35.5,
  "epicenterLon": 141.0,
  "magnitude": 7.5,
  "depth": 30,
  "faultType": "thrust",
  "confidence": 0.9
}

"Earthquake off Southampton coast" or "near Southampton" →
{
  "name": "English Channel Earthquake",
  "description": "Offshore earthquake south of Southampton, UK",
  "epicenterLat": 50.5,
  "epicenterLon": -1.2,
  "magnitude": 7.0,
  "depth": 25,
  "faultType": "thrust",
  "confidence": 0.8
}

"Magnitude 8 off California coast" →
{
  "name": "California Offshore Earthquake",
  "description": "Major earthquake off the California coastline",
  "epicenterLat": 36.0,
  "epicenterLon": -122.5,
  "magnitude": 8.0,
  "depth": 35,
  "faultType": "strike-slip",
  "confidence": 0.85
}

"Similar to 2011 Tohoku" →
{
  "name": "2011 Tōhoku-style Earthquake",
  "description": "Megathrust earthquake similar to March 11, 2011 event",
  "epicenterLat": 38.3,
  "epicenterLon": 142.4,
  "magnitude": 9.1,
  "depth": 29,
  "faultType": "thrust",
  "confidence": 0.95
}`

export async function POST(req: NextRequest) {
  let prompt = ''
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    prompt = body.prompt

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log('🤖 Parsing scenario with OpenAI GPT-4:', prompt)

    // Use OpenAI GPT-4 to parse the natural language input
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY not configured')
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    console.log('🔑 API Key configured:', apiKey ? `Yes (length: ${apiKey.length})` : 'No')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',  // Using GPT-4o-mini which is more accessible
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      }),
    })

    console.log('📡 OpenAI response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ OpenAI API error:', response.status, errorText)
      
      // Provide more specific error messages
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.')
      } else if (response.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again in a moment.')
      } else if (response.status === 404) {
        throw new Error('Model not found. GPT-4 Turbo may not be available for your account.')
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('📦 OpenAI response:', JSON.stringify(data, null, 2))

    const content = data.choices[0]?.message?.content
    
    if (!content) {
      throw new Error('No content in response')
    }

    console.log('📝 Raw content:', content)

    // Parse JSON response
    const scenario = JSON.parse(content)
    console.log('✓ OpenAI parsed scenario:', scenario.name)

    // Validate the scenario
    if (!isValidScenario(scenario)) {
      throw new Error('Invalid scenario format')
    }

    return NextResponse.json(scenario)

  } catch (error: any) {
    console.error('Error parsing scenario:', error)
    
    // Try fallback parsing if we have a prompt
    if (prompt) {
      try {
        console.log('⚠️ Trying fallback parser...')
        const fallbackScenario = parseFallback(prompt)
        if (fallbackScenario) {
          console.log('✓ Fallback parser succeeded:', fallbackScenario.name)
          return NextResponse.json(fallbackScenario)
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError)
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to parse scenario',
        details: error.message,
        suggestion: 'Please use the manual form to enter precise parameters'
      },
      { status: 500 }
    )
  }
}

function isValidScenario(scenario: any): boolean {
  return (
    typeof scenario === 'object' &&
    typeof scenario.name === 'string' &&
    typeof scenario.epicenterLat === 'number' &&
    typeof scenario.epicenterLon === 'number' &&
    typeof scenario.magnitude === 'number' &&
    scenario.epicenterLat >= -90 &&
    scenario.epicenterLat <= 90 &&
    scenario.epicenterLon >= -180 &&
    scenario.epicenterLon <= 180 &&
    scenario.magnitude >= 6.0 &&
    scenario.magnitude <= 9.5
  )
}

/**
 * Fallback parser for when OpenAI is not available
 * Uses simple pattern matching for common inputs
 */
function parseFallback(prompt: string): any | null {
  const lowerPrompt = prompt.toLowerCase()
  
  // Pattern 1: Extract magnitude from various formats
  // "magnitude 8", "8.5 magnitude", "massive 8 scale", "M8.0", etc.
  const magPatterns = [
    /magnitude\s*(\d+\.?\d*)/i,
    /(\d+\.?\d*)\s*magnitude/i,
    /(\d+\.?\d*)\s*scale/i,
    /m\s*(\d+\.?\d*)/i,
    /massive\s*(\d+\.?\d*)/i,
    /\b(\d+\.?\d*)\s+earthquake/i
  ]
  
  let magnitude = 7.5 // default
  for (const pattern of magPatterns) {
    const match = prompt.match(pattern)
    if (match) {
      const parsedMag = parseFloat(match[1])
      if (parsedMag >= 6.0 && parsedMag <= 9.5) {
        magnitude = parsedMag
        break
      }
    }
  }
  
  // Known locations (OFFSHORE coordinates for tsunami generation)
  const locations: Record<string, [number, number]> = {
    // Japan/Pacific
    'tokyo': [35.5, 141.0],
    'japan': [38.0, 142.0],
    'sendai': [38.3, 142.4],
    'osaka': [34.0, 136.5],
    
    // Southeast Asia
    'indonesia': [-3.0, 120.0],
    'sumatra': [3.3, 96.0],
    'philippines': [14.0, 122.0],
    'manila': [14.0, 122.0],
    
    // Americas
    'chile': [-38.5, -73.5],
    'valdivia': [-38.24, -73.05],
    'california': [36.0, -122.5],
    'san francisco': [37.5, -123.0],
    'los angeles': [33.5, -119.0],
    'mexico': [16.0, -97.0],
    'alaska': [61.0, -148.0],
    'seattle': [47.5, -125.0],
    
    // Europe/Atlantic
    'southampton': [50.5, -1.5],
    'england': [50.5, -1.5],
    'uk': [50.5, -1.5],
    'portugal': [36.0, -11.0],
    'lisbon': [36.0, -11.0],
    
    // Other
    'new zealand': [-41.0, 174.5],
    'hawaii': [19.5, -156.0],
  }
  
  let location: [number, number] | null = null
  let locationName = ''
  
  for (const [name, coords] of Object.entries(locations)) {
    if (lowerPrompt.includes(name)) {
      location = coords
      locationName = name.charAt(0).toUpperCase() + name.slice(1)
      break
    }
  }
  
  // Pattern 2: Historical earthquakes
  if (lowerPrompt.includes('2011') || lowerPrompt.includes('tohoku') || lowerPrompt.includes('fukushima')) {
    return {
      name: '2011 Tōhoku-style Earthquake',
      description: 'Based on March 11, 2011 earthquake',
      epicenterLat: 38.3,
      epicenterLon: 142.4,
      magnitude: 9.1,
      depth: 29,
      faultType: 'thrust',
      confidence: 0.95
    }
  }
  
  if (lowerPrompt.includes('2004') || lowerPrompt.includes('indian ocean') || lowerPrompt.includes('sumatra')) {
    return {
      name: '2004 Indian Ocean-style Earthquake',
      description: 'Based on December 26, 2004 earthquake',
      epicenterLat: 3.3,
      epicenterLon: 96.0,
      magnitude: 9.3,
      depth: 30,
      faultType: 'thrust',
      confidence: 0.95
    }
  }
  
  // If we have location, return scenario
  if (location) {
    return {
      name: `M${magnitude.toFixed(1)} ${locationName} Offshore`,
      description: `Magnitude ${magnitude} earthquake off the coast of ${locationName}`,
      epicenterLat: location[0],
      epicenterLon: location[1],
      magnitude: magnitude,
      depth: magnitude > 8.5 ? 25 : magnitude > 8.0 ? 30 : 35,
      faultType: 'thrust' as const,
      confidence: 0.7
    }
  }
  
  // If no location match, try to extract coordinates directly
  const coordPattern = /(\-?\d+\.?\d*)\s*[°,]?\s*(\-?\d+\.?\d*)/
  const coordMatch = prompt.match(coordPattern)
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1])
    const lon = parseFloat(coordMatch[2])
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return {
        name: `M${magnitude.toFixed(1)} Custom Scenario`,
        epicenterLat: lat,
        epicenterLon: lon,
        magnitude: magnitude,
        depth: 30,
        faultType: 'thrust' as const,
        confidence: 0.6
      }
    }
  }
  
  return null
}
