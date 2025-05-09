import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';

// Use environment variables without fallbacks in production
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  console.log('Gmail token refresh request received');
  
  try {
    // Parse the request body
    const body = await request.json();
    const { merchantId, refresh_token } = body;
    
    console.log('Refresh token request for merchant:', merchantId);
    
    if (!merchantId || !refresh_token) {
      console.error('Missing required fields in refresh token request');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get client ID and secret from environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google API credentials in environment variables');
      return NextResponse.json(
        { error: 'Google API credentials not configured' },
        { status: 500 }
      );
    }
    
    console.log('Refreshing token with Google OAuth API...');
    
    // Refresh the token
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!tokenResponse.ok) {
      let errorMessage = `Token refresh failed with status ${tokenResponse.status}`;
      try {
        const errorData = await tokenResponse.json();
        console.error('Token refresh failed:', errorData);
        errorMessage = `${errorMessage}: ${JSON.stringify(errorData)}`;
      } catch (e) {
        const errorText = await tokenResponse.text();
        console.error('Token refresh failed with text response:', errorText);
        errorMessage = `${errorMessage}: ${errorText}`;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: tokenResponse.status }
      );
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Token refreshed successfully');
    
    if (!tokenData.access_token) {
      console.error('No access token in response:', tokenData);
      return NextResponse.json(
        { error: 'Invalid token response from Google' },
        { status: 500 }
      );
    }
    
    // Calculate expiration time
    const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;
    
    // Update the token in Firestore
    console.log('Updating token in Firestore...');
    await updateDoc(doc(db, 'merchants', merchantId, 'integrations', 'gmail'), {
      access_token: tokenData.access_token,
      expires_at: expiresAt,
    });
    
    console.log('Token updated successfully');
    
    // Return the new access token
    return NextResponse.json({
      access_token: tokenData.access_token,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error('Error in Gmail token refresh:', error);
    return NextResponse.json(
      { error: `Failed to refresh token: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// This function would be used by a scheduled job to refresh tokens
export async function GET() {
  // Check if required environment variables (or their fallbacks) are set
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("Missing required environment variables for Gmail OAuth");
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  try {
    // This should be secured with proper authentication
    // For example, only allow access from Cloud Functions
    
    // Find all integrations that need refreshing (expire in the next 5 minutes)
    const expiryThreshold = Date.now() + 5 * 60 * 1000;
    
    // Note: This is a simplified approach and would need to be implemented
    // as a server-side function with proper Firestore queries
    
    return NextResponse.json({
      message: 'Token refresh job would run here',
      // In a real implementation, this would refresh tokens and return results
    });
  } catch (error) {
    console.error('Error in token refresh job:', error);
    return NextResponse.json(
      { error: 'Failed to run token refresh job' },
      { status: 500 }
    );
  }
} 