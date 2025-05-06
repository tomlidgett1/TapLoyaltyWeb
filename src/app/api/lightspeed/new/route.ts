import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore'

// Lightspeed API credentials
const LIGHTSPEED_CLIENT_ID = process.env.NEXT_PUBLIC_LIGHTSPEED_NEW_CLIENT_ID || process.env.LIGHTSPEED_NEW_CLIENT_ID || "0be25ce25b4988b26b5759aecca02248cfe561d7594edd46e7d6807c141ee72e"
const LIGHTSPEED_CLIENT_SECRET = process.env.LIGHTSPEED_NEW_CLIENT_SECRET || "0b9c2fb76f1504ce387939066958a68cc28ec9212f571108fcbdba7b3c378f3e"
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL || 'https://app.taployalty.com.au'

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
      hasCodeVerifier: !!codeVerifier,
      codeLength: code ? code.length : 0,
      merchantIdValue: merchantId
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
    
    // Test Firestore permissions before proceeding
    const hasFirestorePermissions = await testFirestorePermissions(merchantId);
    console.log('Firestore permission test result:', hasFirestorePermissions ? 'SUCCESS' : 'FAILED');
    
    if (!hasFirestorePermissions) {
      console.error('Insufficient Firestore permissions for merchant ID:', merchantId);
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions to write to Firestore',
        details: { merchantId }
      }, { status: 500 });
    }
    
    console.log('Exchanging code for access token...')
    console.log('Parameters for token exchange:', {
      clientId: LIGHTSPEED_CLIENT_ID.substring(0, 10) + '...',
      hasClientSecret: !!LIGHTSPEED_CLIENT_SECRET,
      clientSecretLength: LIGHTSPEED_CLIENT_SECRET ? LIGHTSPEED_CLIENT_SECRET.length : 0,
      codeLength: code.length,
      codeVerifierLength: codeVerifier.length
    })
    
    // Exchange code for access token using the client_secret and code_verifier
    const tokenResponse = await fetch('https://aus.merchantos.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: LIGHTSPEED_CLIENT_ID,
        client_secret: LIGHTSPEED_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
        redirect_uri: REDIRECT_URI
      })
    })
    
    console.log('Token response status:', tokenResponse.status)
    console.log('Token response headers:', Object.fromEntries([...tokenResponse.headers.entries()]))
    
    let tokenData: any
    try {
      tokenData = await tokenResponse.json()
    } catch (parseErr) {
      const raw = await tokenResponse.text()
      console.error('Token JSON parse failed, raw response:', raw.slice(0,200))
      throw new Error('Invalid JSON from Lightspeed token endpoint')
    }
    
    console.log('Token data received (keys only):', Object.keys(tokenData))
    
    // Log token data with sensitive information redacted
    console.log('Token response data (redacted):', {
      ...tokenData,
      access_token: tokenData.access_token ? `${tokenData.access_token.substring(0, 10)}...` : null,
      refresh_token: tokenData.refresh_token ? `${tokenData.refresh_token.substring(0, 10)}...` : null,
      error: tokenData.error,
      error_description: tokenData.error_description
    })
    
    if (!tokenResponse.ok) {
      console.error('Lightspeed OAuth token error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenData.error,
        error_description: tokenData.error_description
      })
      return NextResponse.json({ 
        success: false, 
        error: `Failed to exchange code for token: ${tokenData.error || tokenResponse.statusText}`,
        details: {
          error: tokenData.error,
          error_description: tokenData.error_description,
          status: tokenResponse.status
        }
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
      // Store the token data in Firestore using Web SDK (rules allow server routes)
      const integrationDocRef = doc(db, `merchants/${merchantId}/integrations/lightspeed_new`);
      console.log('Firestore document reference created for path:', `merchants/${merchantId}/integrations/lightspeed_new`);
      
      const dataToStore = {
        connected: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        instance_url: tokenData.instance_url,
        connectedAt: serverTimestamp(),
        // Store information about which API endpoint was used (Australian regional endpoint)
        apiEndpoint: 'https://aus.merchantos.com',
        region: 'aus',
      };
      
      console.log('Data structure to store in Firestore:', {
        ...dataToStore,
        access_token: dataToStore.access_token ? '***[REDACTED]***' : null,
        refresh_token: dataToStore.refresh_token ? '***[REDACTED]***' : null,
      });
      
      try {
        console.log('Attempting to write to Firestore...');
        await setDoc(integrationDocRef, dataToStore);
        console.log('Firestore setDoc operation completed successfully');
        console.log('Lightspeed New integration connected successfully and data stored in Firestore');
      } catch (firestoreWriteError) {
        console.error('Error writing to Firestore:', firestoreWriteError);
        console.error('Error details:', typeof firestoreWriteError, JSON.stringify(firestoreWriteError, Object.getOwnPropertyNames(firestoreWriteError)));
        
        // Attempt to write again with fewer fields in case there's an issue with one of the fields
        try {
          const essentialData = {
            connected: true,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            connectedAt: serverTimestamp(),
            apiEndpoint: 'https://aus.merchantos.com',
          };
          
          console.log('Attempting to write essential data only...');
          await setDoc(integrationDocRef, essentialData);
          console.log('Essential Lightspeed integration data stored successfully');
        } catch (retryError) {
          console.error('Second attempt to write to Firestore failed:', retryError);
          console.error('Retry error details:', typeof retryError, JSON.stringify(retryError, Object.getOwnPropertyNames(retryError)));
          throw retryError; // Re-throw to be caught by outer catch
        }
      }

      console.log('Lightspeed New integration connected successfully');
      return NextResponse.json({ 
        success: true,
        tokenInfo: {
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope,
          tokenType: tokenData.token_type,
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          instanceUrl: tokenData.instance_url,
          region: 'aus',
          apiEndpoint: 'https://aus.merchantos.com'
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

// Function to test Firestore write permissions
async function testFirestorePermissions(merchantId: string) {
  console.log('Testing Firestore write permissions...');
  try {
    // Test with a simple document in a test collection
    const testDoc = await addDoc(collection(db, 'merchants', merchantId, 'test_permissions'), {
      test: true,
      timestamp: serverTimestamp()
    });
    console.log('Test document written successfully with ID:', testDoc.id);
    return true;
  } catch (error) {
    console.error('Firestore permission test failed:', error);
    return false;
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
      hasCodeVerifier: !!data.codeVerifier,
      codeLength: data.code ? data.code.length : 0,
      stateValue: data.state
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
    
    // Test Firestore permissions before proceeding
    const hasFirestorePermissions = await testFirestorePermissions(merchantId);
    console.log('Firestore permission test result:', hasFirestorePermissions ? 'SUCCESS' : 'FAILED');
    
    if (!hasFirestorePermissions) {
      console.error('Insufficient Firestore permissions for merchant ID:', merchantId);
      return NextResponse.json({ 
        success: false, 
        error: 'Insufficient permissions to write to Firestore',
        details: { merchantId }
      }, { status: 500 });
    }
    
    console.log('Exchanging code for access token...')
    console.log('Parameters for token exchange:', {
      clientId: LIGHTSPEED_CLIENT_ID.substring(0, 10) + '...',
      hasClientSecret: !!LIGHTSPEED_CLIENT_SECRET,
      clientSecretLength: LIGHTSPEED_CLIENT_SECRET ? LIGHTSPEED_CLIENT_SECRET.length : 0,
      codeLength: code.length,
      codeVerifierLength: codeVerifier.length
    })
    
    // Exchange code for access token using the client_secret and code_verifier
    const tokenResponse = await fetch('https://aus.merchantos.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: LIGHTSPEED_CLIENT_ID,
        client_secret: LIGHTSPEED_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
        redirect_uri: REDIRECT_URI
      })
    })
    
    console.log('Token response status:', tokenResponse.status)
    console.log('Token response headers:', Object.fromEntries([...tokenResponse.headers.entries()]))
    
    let tokenData: any
    try {
      tokenData = await tokenResponse.json()
    } catch (parseErr) {
      const raw = await tokenResponse.text()
      console.error('Token JSON parse failed, raw response:', raw.slice(0,200))
      throw new Error('Invalid JSON from Lightspeed token endpoint')
    }
    
    console.log('Token data received (keys only):', Object.keys(tokenData))
    
    // Log token data with sensitive information redacted
    console.log('Token response data (redacted):', {
      ...tokenData,
      access_token: tokenData.access_token ? `${tokenData.access_token.substring(0, 10)}...` : null,
      refresh_token: tokenData.refresh_token ? `${tokenData.refresh_token.substring(0, 10)}...` : null,
      error: tokenData.error,
      error_description: tokenData.error_description
    })
    
    if (!tokenResponse.ok) {
      console.error('Lightspeed OAuth token error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenData.error,
        error_description: tokenData.error_description
      })
      return NextResponse.json({ 
        success: false, 
        error: `Failed to exchange code for token: ${tokenData.error || tokenResponse.statusText}`,
        details: {
          error: tokenData.error,
          error_description: tokenData.error_description,
          status: tokenResponse.status
        }
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
      // Store the token data in Firestore using Web SDK
      const integrationDocRef = doc(db, `merchants/${merchantId}/integrations/lightspeed_new`);
      console.log('Firestore document reference created for path:', `merchants/${merchantId}/integrations/lightspeed_new`);
      
      const dataToStore = {
        connected: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        instance_url: tokenData.instance_url,
        connectedAt: serverTimestamp(),
        // Store information about which API endpoint was used (Australian regional endpoint)
        apiEndpoint: 'https://aus.merchantos.com',
        region: 'aus',
      };
      
      console.log('Data structure to store in Firestore:', {
        ...dataToStore,
        access_token: dataToStore.access_token ? '***[REDACTED]***' : null,
        refresh_token: dataToStore.refresh_token ? '***[REDACTED]***' : null,
      });
      
      try {
        console.log('Attempting to write to Firestore...');
        await setDoc(integrationDocRef, dataToStore);
        console.log('Firestore setDoc operation completed successfully');
        console.log('Lightspeed New integration connected successfully and data stored in Firestore');
      } catch (firestoreWriteError) {
        console.error('Error writing to Firestore:', firestoreWriteError);
        console.error('Error details:', typeof firestoreWriteError, JSON.stringify(firestoreWriteError, Object.getOwnPropertyNames(firestoreWriteError)));
        
        // Attempt to write again with fewer fields in case there's an issue with one of the fields
        try {
          const essentialData = {
            connected: true,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            connectedAt: serverTimestamp(),
            apiEndpoint: 'https://aus.merchantos.com',
          };
          
          console.log('Attempting to write essential data only...');
          await setDoc(integrationDocRef, essentialData);
          console.log('Essential Lightspeed integration data stored successfully');
        } catch (retryError) {
          console.error('Second attempt to write to Firestore failed:', retryError);
          console.error('Retry error details:', typeof retryError, JSON.stringify(retryError, Object.getOwnPropertyNames(retryError)));
          throw retryError; // Re-throw to be caught by outer catch
        }
      }

      console.log('Lightspeed New integration connected successfully');
      return NextResponse.json({ 
        success: true,
        tokenInfo: {
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope,
          tokenType: tokenData.token_type,
          hasAccessToken: !!tokenData.access_token,
          hasRefreshToken: !!tokenData.refresh_token,
          instanceUrl: tokenData.instance_url,
          region: 'aus',
          apiEndpoint: 'https://aus.merchantos.com'
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