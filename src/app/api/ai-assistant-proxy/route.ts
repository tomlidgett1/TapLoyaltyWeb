import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('ai-assistant-proxy: Received request');
  
  try {
    const body = await request.json();
    console.log('ai-assistant-proxy: Request body:', body);
    
    // Forward the request to the Firebase function
    console.log('ai-assistant-proxy: Forwarding to Firebase function');
    const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/aiAssistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    console.log('ai-assistant-proxy: Firebase function response status:', response.status);
    
    // Get the response data
    const data = await response.json();
    console.log('ai-assistant-proxy: Firebase function response data:', data);
    
    // Return the response with the same status
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error in proxy:', error);
    return NextResponse.json({ 
      content: "Error in proxy: " + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
} 