import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { code, merchantId } = await request.json()
    
    if (!code || !merchantId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
    
    // Get the origin from the request headers
    const headersList = await headers()
    const origin = headersList.get('origin') || 'https://armstrong-registered-auto-holders.trycloudflare.com'
    
    // Updated Lightspeed OAuth parameters with new client credentials
    const clientId = "29779b997b21d643fab9e936cf815463813172b51c7da085b7b378864761953d"
    const clientSecret = "bae06b0ef62a801b078cc202710fb79b5d38824fc62c8aaba54b95edc3c5fb9c"
    const redirectUri = `${origin}/dashboard`
    
    console.log('Exchanging code for token with redirect URI:', redirectUri)
    
    // Create Basic Auth header
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    
    // Only include required parameters without client credentials
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', redirectUri);
    
    // Log the request parameters for debugging
    console.log('Request parameters:', {
      url: 'https://api.lightspeed.app/oidc/token',
      method: 'POST',
      authorization: 'Basic ********',
      code_length: code?.length
    });
    
    // Use the OIDC token endpoint with Basic Auth
    const tokenResponse = await fetch('https://api.lightspeed.app/oidc/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: params.toString()
    })
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Lightspeed token exchange error:', errorText)
      try {
        const errorData = JSON.parse(errorText)
        return NextResponse.json(
          { error: 'Failed to exchange code for token', details: errorData },
          { status: tokenResponse.status }
        )
      } catch (e) {
        return NextResponse.json(
          { error: 'Failed to exchange code for token', details: errorText },
          { status: tokenResponse.status }
        )
      }
    }
    
    const tokenData = await tokenResponse.json()
    
    return NextResponse.json(tokenData)
  } catch (error) {
    console.error('Error in Lightspeed token exchange:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 