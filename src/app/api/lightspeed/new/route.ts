import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

// Lightspeed API credentials
const LIGHTSPEED_CLIENT_ID = process.env.NEXT_PUBLIC_LIGHTSPEED_NEW_CLIENT_ID || process.env.LIGHTSPEED_NEW_CLIENT_ID || "0be25ce25b4988b26b5759aecca02248cfe561d7594edd46e7d6807c141ee72e"
const LIGHTSPEED_CLIENT_SECRET = process.env.LIGHTSPEED_NEW_CLIENT_SECRET || "0b9c2fb76f1504ce387939066958a68cc28ec9212f571108fcbdba7b3c378f3e"

// GET handler for the OAuth callback
export async function GET(request: NextRequest) {
  console.log('Lightspeed New OAuth token exchange GET endpoint called')
  
  try {
    // Get parameters from query string
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const merchantId = searchParams.get('merchantId')
    const codeVerifier = searchParams.get('codeVerifier')
    
    console.log('Query parameters received:', { 
      hasCode: !!code, 
      hasMerchantId: !!merchantId,
      hasCodeVerifier: !!codeVerifier 
    })
    
    // Validate required parameters
    if (!code || !merchantId || !codeVerifier) {
      console.error('Missing required parameters:', { 
        code: !!code, 
        merchantId: !!merchantId,
        codeVerifier: !!codeVerifier 
      })
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }
    
    console.log('Exchanging code for access token...')
    console.log('Parameters for token exchange:', {
      clientId: LIGHTSPEED_CLIENT_ID.substring(0, 10) + '...',
      hasClientSecret: !!LIGHTSPEED_CLIENT_SECRET,
      codeLength: code.length,
      codeVerifierLength: codeVerifier.length
    })
    
    // Exchange code for access token using the client_secret and code_verifier
    const tokenResponse = await fetch('https://cloud.lightspeedapp.com/oauth/token', {
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
    console.log('Token data received (keys only):', Object.keys(tokenData))
    
    if (!tokenResponse.ok) {
      console.error('Lightspeed OAuth token error:', tokenData)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to exchange code for token: ${tokenData.error || tokenResponse.statusText}`,
        details: tokenData
      }, { status: 500 })
    }
    
    // Check if we have all required token data
    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error('Incomplete token data received from Lightspeed API:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token
      })
      
      return NextResponse.json({
        success: false,
        error: 'Incomplete token data received from Lightspeed API',
        details: {
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          tokenDataKeys: Object.keys(tokenData)
        }
      }, { status: 500 })
    }
    
    console.log('Successfully obtained access token, storing in Firestore...')
    console.log('Firestore document path:', `merchants/${merchantId}/integrations/lightspeed_new`)
    
    try {
      // Store the token data in Firestore
      const integrationDocRef = doc(db, `merchants/${merchantId}/integrations/lightspeed_new`);
      
      const dataToStore = {
        connected: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        instance_url: tokenData.instance_url,
        connectedAt: serverTimestamp(),
      };
      
      console.log('Data to store in Firestore:', {
        ...dataToStore,
        access_token: dataToStore.access_token ? '***[REDACTED]***' : null,
        refresh_token: dataToStore.refresh_token ? '***[REDACTED]***' : null,
      });
      
      await setDoc(integrationDocRef, dataToStore);

      console.log('Lightspeed New integration connected successfully');
      return NextResponse.json({ 
        success: true,
        tokenInfo: {
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope,
          tokenType: tokenData.token_type,
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          instanceUrl: tokenData.instance_url
        }
      })
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

export async function POST(request: NextRequest) {
  console.log('Lightspeed New OAuth token exchange POST endpoint called')
  
  try {
    const data = await request.json()
    console.log('Request data received:', { 
      hasCode: !!data.code, 
      hasMerchantId: !!data.merchantId, 
      hasState: !!data.state,
      hasCodeVerifier: !!data.codeVerifier 
    })
    
    const { code, merchantId, state, codeVerifier } = data
    
    // Validate required parameters
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
    console.log('Parameters for token exchange:', {
      clientId: LIGHTSPEED_CLIENT_ID.substring(0, 10) + '...',
      hasClientSecret: !!LIGHTSPEED_CLIENT_SECRET,
      codeLength: code.length,
      codeVerifierLength: codeVerifier.length
    })
    
    // Exchange code for access token using the client_secret and code_verifier
    const tokenResponse = await fetch('https://cloud.lightspeedapp.com/oauth/token', {
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
    console.log('Token data received (keys only):', Object.keys(tokenData))
    
    if (!tokenResponse.ok) {
      console.error('Lightspeed OAuth token error:', tokenData)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to exchange code for token: ${tokenData.error || tokenResponse.statusText}`,
        details: tokenData
      }, { status: 500 })
    }
    
    // Check if we have all required token data
    if (!tokenData.access_token || !tokenData.refresh_token) {
      console.error('Incomplete token data received from Lightspeed API:', {
        hasAccessToken: !!tokenData.access_token,
        hasRefreshToken: !!tokenData.refresh_token
      })
      
      return NextResponse.json({
        success: false,
        error: 'Incomplete token data received from Lightspeed API',
        details: {
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          tokenDataKeys: Object.keys(tokenData)
        }
      }, { status: 500 })
    }
    
    console.log('Successfully obtained access token, storing in Firestore...')
    console.log('Firestore document path:', `merchants/${merchantId}/integrations/lightspeed_new`)
    
    try {
      // Store the token data in Firestore
      const integrationDocRef = doc(db, `merchants/${merchantId}/integrations/lightspeed_new`);
      
      const dataToStore = {
        connected: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        instance_url: tokenData.instance_url,
        connectedAt: serverTimestamp(),
      };
      
      console.log('Data to store in Firestore:', {
        ...dataToStore,
        access_token: dataToStore.access_token ? '***[REDACTED]***' : null,
        refresh_token: dataToStore.refresh_token ? '***[REDACTED]***' : null,
      });
      
      await setDoc(integrationDocRef, dataToStore);

      console.log('Lightspeed New integration connected successfully');
      return NextResponse.json({ 
        success: true,
        tokenInfo: {
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope,
          tokenType: tokenData.token_type,
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          instanceUrl: tokenData.instance_url
        }
      })
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