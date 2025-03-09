import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// Provide your own clientId, clientSecret from Lightspeed
const clientId = '808201776257e098...'
const clientSecret = 'abc123yourrealclientsecret...'

export async function POST(request: Request) {
  try {
    const { code, merchantId } = await request.json()
    
    if (!code || !merchantId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // The Lightspeed API docs say the token exchange happens at:
    //  POST https://cloud.lightspeedapp.com/auth/oauth/token
    // with body:
    //  {
    //   "client_id": "{client_id}",
    //   "client_secret": "{client_secret}",
    //   "grant_type": "authorization_code",
    //   "code": "{code}"
    //  }

    const headersList = headers()
    const origin = headersList.get('origin') || 'https://example.com'
    
    const tokenUrl = 'https://cloud.lightspeedapp.com/auth/oauth/token'
    const bodyParams = new URLSearchParams()
    bodyParams.append('client_id', clientId)
    bodyParams.append('client_secret', clientSecret)
    bodyParams.append('grant_type', 'authorization_code')
    bodyParams.append('code', code)

    console.log('Exchanging code for token with Lightspeed API:', code)

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString()
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Lightspeed API token exchange error:', errorText)
      return NextResponse.json(
        { error: 'Failed to exchange code for token', details: errorText },
        { status: tokenResponse.status }
      )
    }
    
    const tokenData = await tokenResponse.json()
    console.log('Lightspeed API tokenData:', tokenData)

    // Example: Store the integration data separately as "lightspeedApi" doc
    await setDoc(doc(db, 'merchants', merchantId, 'integrations', 'lightspeedApi'), {
      connected: true,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      tokenType: tokenData.token_type,
      createdAt: new Date()
    })

    return NextResponse.json(tokenData)
  } catch (error) {
    console.error('Error in Lightspeed API token exchange:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 