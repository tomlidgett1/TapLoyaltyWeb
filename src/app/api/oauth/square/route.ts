import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { headers } from 'next/headers'

// Square API production constants
const SQUARE_APP_ID = "sq0idp-4LAqjdrwhjauSthYdTRFtA"
const SQUARE_ACCESS_TOKEN = "EAAAl3k6ZbVDkzAh8C9Ko1rnqYuPFc0Tzn3yvnw2aETua1cGNGm27l3RZmwa7BHl"
const API_VERSION = '2025-04-16'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { code, merchantId, state } = data
    
    // Validate required params
    if (!code || !merchantId || !state) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 })
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://connect.squareup.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Square-Version': API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: SQUARE_APP_ID,
        client_secret: SQUARE_ACCESS_TOKEN,
        code,
        grant_type: 'authorization_code'
      })
    })
    
    const tokenData = await tokenResponse.json()
    
    if (!tokenResponse.ok) {
      console.error('Square OAuth token error:', tokenData)
      return NextResponse.json({ success: false, error: 'Failed to exchange code for token' }, { status: 500 })
    }
    
    // Store the integration data in Firestore
    await setDoc(doc(db, 'merchants', merchantId, 'integrations', 'square'), {
      connected: true,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
      merchantId: tokenData.merchant_id,
      connectedAt: new Date().toISOString(),
      connectionState: state
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling Square OAuth callback:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
} 