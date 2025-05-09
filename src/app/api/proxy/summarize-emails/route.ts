import { NextRequest, NextResponse } from 'next/server';

// Firebase Cloud Function URL
const FIREBASE_FUNCTION_URL = 'https://us-central1-taployalty-staging.cloudfunctions.net/summarizeEmails';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    
    console.log('Proxying request to Firebase function:', body);
    
    // Forward the request to the Firebase function
    const response = await fetch(FIREBASE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.error('Error from Firebase function:', response.status);
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Firebase function error: ${errorText}` },
        { status: response.status }
      );
    }
    
    // Get the response from the Firebase function
    const responseData = await response.json();
    console.log('Response from Firebase function:', responseData);
    
    // Return the response to the client
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error in proxy API route:', error);
    return NextResponse.json(
      { error: `Proxy error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 