import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';

// Google OAuth client credentials from environment variables with fallbacks
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || "1035054543006-dq2fier1a540dbbfieevph8m6gu74j15.apps.googleusercontent.com";
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "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";

export async function POST(request: NextRequest) {
  // Check if required environment variables are set
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
    console.error("Missing required environment variables for Gmail OAuth");
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  try {
    // Check if this is an authorized request (should add proper authentication)
    // This would typically be a scheduled server function or admin-only endpoint
    
    // Get merchantId from request body
    const { merchantId } = await request.json();
    
    if (!merchantId) {
      return NextResponse.json(
        { error: 'Missing merchant ID' },
        { status: 400 }
      );
    }
    
    // Get the integration data from Firestore
    const integrationDoc = await getDoc(doc(db, 'merchants', merchantId, 'integrations', 'gmail'));
    
    if (!integrationDoc.exists() || !integrationDoc.data().connected) {
      return NextResponse.json(
        { error: 'Gmail integration not found' },
        { status: 404 }
      );
    }
    
    const integrationData = integrationDoc.data();
    const { refresh_token, expires_at } = integrationData;
    
    // Check if the token needs to be refreshed
    const currentTime = Date.now();
    const tokenExpiresIn = expires_at - currentTime;
    
    // Only refresh if token expires in less than 5 minutes
    if (tokenExpiresIn > 5 * 60 * 1000) {
      return NextResponse.json({
        message: 'Token still valid',
        expiresIn: Math.floor(tokenExpiresIn / 1000)
      });
    }
    
    // Refresh the access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token refresh error:', errorData);
      
      // If refresh token is invalid, mark the integration as disconnected
      if (errorData.error === 'invalid_grant') {
        await updateDoc(doc(db, 'merchants', merchantId, 'integrations', 'gmail'), {
          connected: false,
        });
        
        return NextResponse.json(
          { error: 'Invalid refresh token, integration disconnected' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 500 }
      );
    }
    
    const { access_token, expires_in } = await tokenResponse.json();
    
    // Update the integration data in Firestore
    await updateDoc(doc(db, 'merchants', merchantId, 'integrations', 'gmail'), {
      access_token,
      expires_at: Date.now() + expires_in * 1000,
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      expiresIn: expires_in
    });
  } catch (error) {
    console.error('Error refreshing Gmail token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}

// This function would be used by a scheduled job to refresh tokens
export async function GET() {
  // Check if required environment variables are set
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
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