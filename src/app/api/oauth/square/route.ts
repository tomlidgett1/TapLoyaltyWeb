import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { headers } from 'next/headers'

// Square API production constants from environment variables
// Use environment variables if available, otherwise use production values
const SQUARE_APP_ID = process.env.SQUARE_APP_ID || "sq0idp-4LAqjdrwhjauSthYdTRFtA"
const SQUARE_CLIENT_SECRET = process.env.SQUARE_CLIENT_SECRET || "sq0csp-Mtlvb4GHknGh25V8PfX5n5f9-s3TYNa7EPNiqAQRjx8"
const API_VERSION = '2025-04-16'

export async function POST(request: NextRequest) {
  console.log('Square OAuth token exchange endpoint called')
  
  try {
    const data = await request.json()
    console.log('Request data received:', { 
      hasCode: !!data.code, 
      hasMerchantId: !!data.merchantId, 
      hasState: !!data.state 
    })
    
    const { code, merchantId, state } = data
    
    // Validate required params
    if (!code || !merchantId || !state) {
      console.error('Missing required parameters:', { code: !!code, merchantId: !!merchantId, state: !!state })
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }
    
    console.log('Exchanging code for access token...')
    
    // Exchange code for access token using the client_secret
    const tokenResponse = await fetch('https://connect.squareup.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Square-Version': API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: SQUARE_APP_ID,
        client_secret: SQUARE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      })
    })
    
    const tokenData = await tokenResponse.json()
    console.log('Token response status:', tokenResponse.status)
    
    if (!tokenResponse.ok) {
      console.error('Square OAuth token error:', tokenData)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to exchange code for token: ${tokenData.error || tokenResponse.statusText}`,
        details: tokenData
      }, { status: 500 })
    }
    
    console.log('Successfully obtained access token, storing in Firestore...')
    console.log('Token data received:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      hasExpiresIn: !!tokenData.expires_in,
      hasMerchantId: !!tokenData.merchant_id
    })
    
    try {
      // Calculate expiration timestamp safely
      const now = new Date();
      const expiresInSeconds = tokenData.expires_in || 0;
      const expiresAt = new Date(now.getTime() + (expiresInSeconds * 1000));
      
      // Store the integration data in Firestore with proper date handling
      await setDoc(doc(db, 'merchants', merchantId, 'integrations', 'square'), {
        connected: true,
        accessToken: tokenData.access_token || '',
        refreshToken: tokenData.refresh_token || '',
        expiresAt: expiresAt,  // Store as Date object which Firestore can handle
        merchantId: tokenData.merchant_id || merchantId,
        connectedAt: new Date(),  // Store as Date object
        connectionState: state
      })
      
      console.log('Successfully stored Square integration data in Firestore')
      return NextResponse.json({ success: true })
    } catch (firestoreError) {
      console.error('Error storing data in Firestore:', firestoreError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to store integration data in Firestore',
        details: firestoreError instanceof Error ? firestoreError.message : String(firestoreError)
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error handling Square OAuth callback:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 