import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Google OAuth configuration
const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL 
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/gmail/callback` 
  : 'http://localhost:3000/api/auth/gmail/callback';

// Use environment variables with fallbacks for credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;

export async function GET(request: NextRequest) {
  console.log('Gmail OAuth callback received');
  
  try {
    // Get the authorization code and state from query params
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This contains the merchantId
    const error = searchParams.get('error');
    
    console.log('OAuth callback params - code exists:', !!code, ', state exists:', !!state);
    
    // Handle OAuth errors
    if (error) {
      console.error('OAuth error from Google:', error);
      return NextResponse.redirect('/store/emails?error=auth_denied&details=' + encodeURIComponent(error));
    }
    
    if (!code || !state) {
      console.error('Missing code or state in callback');
      return NextResponse.redirect('/store/emails?error=missing_params');
    }
    
    // Get client credentials from environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google API credentials');
      return NextResponse.redirect('/store/emails?error=config_error');
    }
    
    console.log('Exchanging authorization code for tokens...');
    
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      let errorDetails;
      try {
        const errorData = await tokenResponse.json();
        console.error('Token exchange error:', errorData);
        errorDetails = encodeURIComponent(JSON.stringify(errorData));
      } catch (e) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange error (text):', errorText);
        errorDetails = encodeURIComponent(errorText);
      }
      return NextResponse.redirect(`/store/emails?error=token_error&details=${errorDetails}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');
    
    const { access_token, refresh_token, expires_in } = tokenData;
    
    if (!access_token || !refresh_token) {
      console.error('Missing tokens in response:', Object.keys(tokenData));
      return NextResponse.redirect('/store/emails?error=invalid_tokens');
    }
    
    // Calculate expiration time
    const expires_at = Math.floor(Date.now() / 1000) + expires_in;
    
    // Store the tokens in Firestore
    const merchantId = state; // Retrieve merchant ID from state
    console.log('Storing tokens in Firestore for merchant:', merchantId);
    
    try {
      await setDoc(doc(db, 'merchants', merchantId, 'integrations', 'gmail'), {
        connected: true,
        access_token,
        refresh_token,
        expires_at,
        connectedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      console.log('Gmail integration saved successfully');
    } catch (dbError) {
      console.error('Error saving to Firestore:', dbError);
      return NextResponse.redirect('/store/emails?error=database_error');
    }
    
    // Redirect back to the emails page with success message
    return NextResponse.redirect('/store/emails?success=true');
  } catch (error) {
    console.error('Error handling Gmail OAuth callback:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(`/store/emails?error=server_error&details=${encodeURIComponent(errorMessage)}`);
  }
} 