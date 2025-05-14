import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get all query parameters
    const url = new URL(request.url);
    const allParams = Object.fromEntries(url.searchParams.entries());
    
    // Check if we have code and state parameters (which are required for OAuth callbacks)
    const hasOAuthParams = url.searchParams.has('code') && url.searchParams.has('state');
    
    // Construct what the actual callback URL would look like
    const callbackUrl = new URL('/api/auth/gmail/callback', url.origin);
    for (const [key, value] of url.searchParams.entries()) {
      callbackUrl.searchParams.append(key, value);
    }
    
    // Add debug=1 to the callback URL
    callbackUrl.searchParams.append('debug', '1');
    
    return NextResponse.json({
      status: 'ok',
      message: 'This is a test endpoint for debugging Gmail OAuth callback issues',
      request: {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers),
      },
      parameters: allParams,
      isValidCallback: hasOAuthParams,
      actualCallbackUrl: callbackUrl.toString(),
      suggestedActions: [
        {
          description: 'View callback debug data',
          url: callbackUrl.toString(),
        },
        {
          description: 'Redirect to regular emails page',
          url: '/store/emails',
        },
        {
          description: 'Start OAuth flow again',
          url: `/api/auth/gmail/connect?merchantId=${url.searchParams.get('state') || 'YOUR_MERCHANT_ID'}`,
        }
      ]
    });
  } catch (error) {
    console.error('Error in test callback endpoint:', error);
    return NextResponse.json(
      { 
        error: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 