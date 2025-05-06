import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'

// Lightspeed API credentials
const LIGHTSPEED_CLIENT_ID = process.env.LIGHTSPEED_NEW_CLIENT_ID || "0be25ce25b4988b26b5759aecca02248cfe561d7594edd46e7d6807c141ee72e"
const LIGHTSPEED_CLIENT_SECRET = process.env.LIGHTSPEED_NEW_CLIENT_SECRET || "0b9c2fb76f1504ce387939066958a68cc28ec9212f571108fcbdba7b3c378f3e"

export async function POST(request: NextRequest) {
  console.log('Lightspeed New OAuth token exchange endpoint called')
  
  try {
    const data = await request.json()
    console.log('Request data received:', { 
      hasCode: !!data.code, 
      hasMerchantId: !!data.merchantId, 
      hasState: !!data.state,
      hasCodeVerifier: !!data.codeVerifier
    })
    
    const { code, merchantId, state, codeVerifier } = data
    
    // Validate required params
    if (!code || !merchantId || !state || !codeVerifier) {
      console.error('Missing required parameters:', { 
        code: !!code, 
        merchantId: !!merchantId, 
        state: !!state,
        codeVerifier: !!codeVerifier 
      })
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }
    
    console.log('Exchanging code for access token...')
    
    // Exchange code for access token using the client_secret and code_verifier
    const tokenResponse = await fetch('https://cloud.lightspeedapp.com/auth/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: LIGHTSPEED_CLIENT_ID,
        client_secret: LIGHTSPEED_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier
      })
    })
    
    const tokenData = await tokenResponse.json()
    console.log('Token response status:', tokenResponse.status)
    
    if (!tokenResponse.ok) {
      console.error('Lightspeed OAuth token error:', tokenData)
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
      hasExpiresIn: !!tokenData.expires_in
    })
    
    try {
      // Calculate expiration timestamp safely
      const now = new Date();
      const expiresInSeconds = tokenData.expires_in || 3600;
      const expiresAt = new Date(now.getTime() + (expiresInSeconds * 1000));
      
      // Store the integration data in Firestore with proper date handling
      await setDoc(doc(db, 'merchants', merchantId, 'integrations', 'lightspeed_new'), {
        connected: true,
        accessToken: tokenData.access_token || '',
        refreshToken: tokenData.refresh_token || '',
        expiresAt: expiresAt,  // Store as Date object which Firestore can handle
        connectedAt: new Date(),  // Store as Date object
        connectionState: state,
        tokenType: tokenData.token_type || 'Bearer',
        scope: tokenData.scope || ''
      })
      
      console.log('Successfully stored Lightspeed integration data in Firestore')
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
    console.error('Error handling Lightspeed OAuth callback:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 