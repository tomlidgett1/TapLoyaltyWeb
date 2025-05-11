import { NextRequest, NextResponse } from 'next/server';

// Google OAuth configuration
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
// Hardcode the redirect URI to ensure it exactly matches what's configured in Google Cloud Console
const REDIRECT_URI = "https://app.taployalty.com.au/api/auth/gmail/callback";

// Use environment variables with fallbacks for credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;

// This is the scope required for Gmail API access
// Include the send scope so the app can compose / reply as well
// modify already implies the ability to change message state (e.g. mark as read),
// but it does NOT let us actually send mail – that requires gmail.send.
// Having both modify and send is fine as they are non-overlapping.
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.send',
];

// If the caller appends ?debug=1 the route will return a JSON payload with
// all intermediate values instead of issuing the 302 redirect. This makes it
// vastly easier to troubleshoot production 500s where the server logs are not
// immediately visible.
//
// Example:
//   /api/auth/gmail/connect?merchantId=abc123&debug=1
//
//   {
//     "status": "ok",
//     "merchantId": "abc123",
//     "hasClientId": true,
//     "clientIdSnippet": "10350...30106",
//     "redirectUri": "https://app.taployalty.com.au/api/auth/gmail/callback",
//     "generatedAuthUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
//   }

export async function GET(request: NextRequest) {
  console.log('Gmail OAuth connect request received');
  
  try {
    // Get the merchant ID from query params
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const debugMode = searchParams.get('debug') === '1' || searchParams.get('debug') === 'true';
    
    console.log('Connect request for merchant:', merchantId);
    
    if (!merchantId) {
      console.error('Missing merchant ID in connect request');
      return NextResponse.json(
        { error: 'Missing merchant ID' },
        { status: 400 }
      );
    }
    
    // Get client ID from environment variables
    if (!GOOGLE_CLIENT_ID) {
      console.error('Missing Google client ID in environment variables');
      return NextResponse.json(
        { error: 'Google API credentials not configured' },
        { status: 500 }
      );
    }
    
    console.log('Creating OAuth URL with client ID:', GOOGLE_CLIENT_ID.substring(0, 10) + '...');
    console.log('Redirect URI:', REDIRECT_URI);
    
    // Create the OAuth URL
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', GMAIL_SCOPES.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('include_granted_scopes', 'true');
    
    // Optional login_hint
    const loginHint = searchParams.get('loginHint');
    if (loginHint) {
      authUrl.searchParams.append('login_hint', loginHint);
    }
    
    authUrl.searchParams.append('state', merchantId); // Pass merchant ID in state
    
    if (debugMode) {
      console.log('Debug mode enabled – returning diagnostics instead of redirecting');
      return NextResponse.json({
        status: 'ok',
        merchantId,
        hasClientId: !!GOOGLE_CLIENT_ID,
        clientIdSnippet: `${GOOGLE_CLIENT_ID.substring(0, 5)}...${GOOGLE_CLIENT_ID.substring(GOOGLE_CLIENT_ID.length - 5)}`,
        redirectUri: REDIRECT_URI,
        generatedAuthUrl: authUrl.toString(),
        env: process.env.NODE_ENV,
      }, { status: 200 });
    }

    console.log('Redirecting to Google OAuth page');
    // Redirect to the Google OAuth page
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('Error initiating Gmail OAuth flow:', error);
    return NextResponse.json(
      { error: `Failed to initiate OAuth flow: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 