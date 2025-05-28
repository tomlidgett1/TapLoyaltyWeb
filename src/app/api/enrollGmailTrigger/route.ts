import { NextRequest, NextResponse } from 'next/server'

// CORS headers helper
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
  return response
}

// Handle OPTIONS (preflight) requests
export async function OPTIONS() {
  const response = NextResponse.json({}, { status: 200 })
  return setCorsHeaders(response)
}

// Handle GET requests with helpful message
export async function GET() {
  console.log('🚀 GET request received on /api/enrollGmailTrigger')
  const response = NextResponse.json(
    { 
      message: 'enrollGmailTrigger API endpoint is working',
      timestamp: new Date().toISOString(),
      allowedMethods: ['POST']
    },
    { status: 200 }
  )
  return setCorsHeaders(response)
}

export async function POST(request: NextRequest) {
  console.log('🚀🚀🚀 API route called - enrollGmailTrigger')
  console.log('🚀 Request URL:', request.url)
  console.log('🚀 Request method:', request.method)
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json()
      console.log('📋 Request body parsed successfully:', body)
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      const parseErrorResponse = NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
      return setCorsHeaders(parseErrorResponse)
    }

    const { merchantId } = body
    console.log('📋 Extracted merchantId:', merchantId)

    if (!merchantId) {
      console.error('❌ Missing merchantId')
      const missingIdResponse = NextResponse.json(
        { error: 'Missing merchantId' },
        { status: 400 }
      )
      return setCorsHeaders(missingIdResponse)
    }

    // Call the Firebase function directly (same pattern as processMultiStepRequest)
    const fullUrl = 'https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/enrollGmailTrigger'
    
    console.log('🔗 Calling Firebase function:', fullUrl)
    console.log('📤 Sending payload:', { merchantId })
    
    let response;
    try {
      response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ merchantId })
      })
      console.log('📥 Firebase response received')
      console.log('📥 Firebase response status:', response.status)
      console.log('📥 Firebase response ok:', response.ok)
    } catch (fetchError) {
      console.error('❌ Fetch failed:', fetchError)
      throw new Error(`Network error calling Firebase function: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}`)
    }

    let responseText;
    try {
      responseText = await response.text()
      console.log('📥 Firebase response text:', responseText)
    } catch (textError) {
      console.error('❌ Failed to read response text:', textError)
      throw new Error('Failed to read Firebase function response')
    }

    if (!response.ok) {
      console.error('❌ Firebase function returned error status:', response.status)
      throw new Error(`Firebase function failed (${response.status}): ${responseText}`)
    }

    let result;
    try {
      result = JSON.parse(responseText)
      console.log('📥 Firebase response parsed:', result)
    } catch (jsonError) {
      console.error('❌ Failed to parse Firebase response as JSON:', jsonError)
      console.error('❌ Raw response text:', responseText)
      throw new Error('Firebase function returned invalid JSON')
    }

    console.log('✅ Success! Returning result')
    const successResponse = NextResponse.json({
      success: true,
      message: 'Gmail trigger enrolled successfully',
      data: result
    })
    return setCorsHeaders(successResponse)

  } catch (error) {
    console.error('❌ Error in API route:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    const errorResponse = NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to enroll Gmail trigger',
        success: false 
      },
      { status: 500 }
    )
    return setCorsHeaders(errorResponse)
  }
} 