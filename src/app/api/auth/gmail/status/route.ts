import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get the merchant ID from query params
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    
    if (!merchantId) {
      return NextResponse.json(
        { error: 'Missing merchantId parameter' },
        { status: 400 }
      );
    }
    
    console.log('Checking Gmail integration status for merchant:', merchantId);
    
    // Get the integration document
    const integrationRef = doc(db, 'merchants', merchantId, 'integrations', 'gmail');
    const integrationDoc = await getDoc(integrationRef);
    
    if (!integrationDoc.exists()) {
      return NextResponse.json({
        connected: false,
        message: 'No Gmail integration found for this merchant',
        suggestion: 'Set up Gmail integration to get started'
      });
    }
    
    const integration = integrationDoc.data();
    const now = Math.floor(Date.now() / 1000);
    const tokenExpired = integration.expires_at ? integration.expires_at < now : true;
    const hasRefreshToken = !!integration.refresh_token;
    
    let status = 'disconnected';
    let message = 'Not connected to Gmail';
    let suggestion = null;
    
    if (integration.connected === true) {
      if (!tokenExpired) {
        status = 'connected';
        message = 'Successfully connected to Gmail';
        suggestion = null;
      } else if (hasRefreshToken) {
        status = 'expired';
        message = 'Access token expired but can be refreshed';
        suggestion = 'Refresh token using the refresh endpoint';
      } else {
        status = 'invalid';
        message = 'Access token expired and no refresh token available';
        suggestion = 'Re-authenticate with Gmail to get a new token';
      }
    }
    
    return NextResponse.json({
      merchantId,
      connected: status === 'connected',
      status,
      message,
      suggestion,
      details: {
        hasAccessToken: !!integration.access_token,
        hasRefreshToken,
        hasEmailAddress: !!integration.emailAddress,
        emailAddress: integration.emailAddress || null,
        tokenExpired,
        expiresIn: integration.expires_at ? integration.expires_at - now : null,
        connectedAt: integration.connectedAt ? 
          integration.connectedAt.toDate().toISOString() : null,
        lastUpdated: integration.lastUpdated ? 
          integration.lastUpdated.toDate().toISOString() : null,
      }
    });
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    return NextResponse.json(
      { error: `Status check failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 