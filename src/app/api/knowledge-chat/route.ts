import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('📥 API Route: Received knowledge-chat request');
  
  try {
    // Get request body
    const requestText = await request.text();
    console.log('📄 API Route: Raw request body:', requestText);
    
    let body;
    try {
      body = JSON.parse(requestText);
      console.log('🔍 API Route: Parsed request body:', body);
    } catch (parseError) {
      console.error('❌ API Route: Failed to parse request body as JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // Validate required fields
    if (!body.merchantId || !body.question) {
      console.error('❌ API Route: Missing required fields:', { body });
      return NextResponse.json(
        { error: 'Both merchantId and question are required' },
        { status: 400 }
      );
    }
    
    console.log('🔄 API Route: Forwarding request to Firebase function');
    
    // Forward the request to Firebase function
    const firebaseUrl = 'https://us-central1-taployalty.cloudfunctions.net/knowledgeChat';
    console.log('🌐 API Route: Calling Firebase URL:', firebaseUrl);
    
    const response = await fetch(firebaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    console.log('📥 API Route: Firebase response status:', response.status);
    console.log('📥 API Route: Firebase response headers:', Object.fromEntries([...response.headers.entries()]));
    
    // Handle error responses from Firebase
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Route: Firebase error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      return NextResponse.json(
        { error: `Firebase function error: ${errorText || response.statusText}` },
        { status: response.status }
      );
    }
    
    // Get the response data
    const responseText = await response.text();
    console.log('📄 API Route: Firebase response body (truncated):', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('✅ API Route: Parsed Firebase response successfully');
    } catch (parseError) {
      console.error('❌ API Route: Failed to parse Firebase response as JSON:', parseError);
      console.error('❌ API Route: Raw response that failed to parse:', responseText);
      
      return NextResponse.json(
        { error: 'Invalid JSON response from Firebase function' },
        { status: 502 }
      );
    }
    
    console.log('✅ API Route: Returning successful response to client');
    
    // Return the response with proper CORS headers
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ API Route: Unhandled error in knowledge-chat proxy:', error);
    if (error instanceof Error) {
      console.error('❌ API Route: Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Support OPTIONS request for CORS preflight
export async function OPTIONS() {
  console.log('📥 API Route: Received OPTIONS request for CORS preflight');
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
} 