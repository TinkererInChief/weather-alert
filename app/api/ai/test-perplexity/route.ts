import { NextResponse } from 'next/server'

/**
 * Debug endpoint to test Perplexity API connection
 * GET /api/ai/test-perplexity
 */
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.PERPLEXITY_API_KEY,
    apiKeyLength: process.env.PERPLEXITY_API_KEY?.length || 0,
    apiKeyPrefix: process.env.PERPLEXITY_API_KEY?.substring(0, 10) + '...',
    testResult: null as any
  }

  if (!process.env.PERPLEXITY_API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'PERPLEXITY_API_KEY not configured',
      diagnostics
    }, { status: 503 })
  }

  // Try a simple API call
  try {
    console.log('🧪 Testing Perplexity API connection...')
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { 
            role: 'user', 
            content: 'Reply with just "OK" and nothing else.' 
          }
        ],
        temperature: 0.1,
        max_tokens: 10
      })
    })

    const responseText = await response.text()
    
    diagnostics.testResult = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText.substring(0, 500) // First 500 chars
    }

    if (!response.ok) {
      console.error('❌ Perplexity API test failed:', responseText)
      return NextResponse.json({
        success: false,
        error: `API returned ${response.status}: ${response.statusText}`,
        diagnostics
      }, { status: 500 })
    }

    const data = JSON.parse(responseText)
    
    console.log('✅ Perplexity API test successful')
    
    return NextResponse.json({
      success: true,
      message: 'Perplexity API is working correctly',
      response: data.choices?.[0]?.message?.content,
      usage: data.usage,
      diagnostics
    })

  } catch (error: any) {
    console.error('❌ Perplexity API test error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      diagnostics
    }, { status: 500 })
  }
}
