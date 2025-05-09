import { NextRequest, NextResponse } from 'next/server';

// Google OAuth configuration
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL 
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/gmail/callback` 
  : 'http://localhost:3000/api/auth/gmail/callback';

// Use environment variables with fallbacks for credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;

// This is the scope required for Gmail API access
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
];

export async function GET(request: NextRequest) {
  console.log('Gmail OAuth connect request received');
  
  try {
    // Get the merchant ID from query params
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    
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
    authUrl.searchParams.append('state', merchantId); // Pass merchant ID in state
    
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