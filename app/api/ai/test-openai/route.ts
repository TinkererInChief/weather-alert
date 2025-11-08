import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY not configured',
        details: 'Please add OPENAI_API_KEY to your .env.local file'
      }, { status: 500 })
    }

    console.log('🔑 Testing OpenAI API key...')
    console.log('Key length:', apiKey.length)
    console.log('Key prefix:', apiKey.substring(0, 10) + '...')

    // Test with a simple request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello" in JSON format with a "message" field.'
          }
        ],
        max_tokens: 50,
        response_format: { type: 'json_object' }
      }),
    })

    console.log('📡 Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error:', errorText)
      
      return NextResponse.json({
        success: false,
        status: response.status,
        error: errorText,
        details: response.status === 401 
          ? 'Invalid API key' 
          : response.status === 404
          ? 'Model not available (GPT-4 Turbo may require access)'
          : response.status === 429
          ? 'Rate limit exceeded'
          : 'Unknown error'
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('✅ Success:', data)

    return NextResponse.json({
      success: true,
      message: 'OpenAI API is working correctly',
      model: 'gpt-4-turbo-preview',
      response: data.choices[0]?.message?.content,
      usage: data.usage
    })

  } catch (error: any) {
    console.error('❌ Test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
