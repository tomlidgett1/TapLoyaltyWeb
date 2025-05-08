import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const merchantId = searchParams.get('merchantId')

  if (!merchantId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Merchant ID is required' 
    }, { status: 400 })
  }

  try {
    // Get stored Lightspeed integration credentials
    const integrationDocRef = doc(db, `merchants/${merchantId}/integrations/lightspeed_new`)
    const integrationDoc = await getDoc(integrationDocRef)

    if (!integrationDoc.exists()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Lightspeed integration not found for this merchant' 
      }, { status: 404 })
    }

    const integrationData = integrationDoc.data()
    
    // Check if we have a valid access token
    if (!integrationData.access_token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Lightspeed access token not found' 
      }, { status: 401 })
    }

    // Check if we already have an account ID stored
    const accountDocRef = doc(db, `merchants/${merchantId}/integrations/lightspeed_account`)
    const accountDoc = await getDoc(accountDocRef)
    
    // If we already have the account info, return it
    if (accountDoc.exists() && accountDoc.data().accountID) {
      return NextResponse.json({
        success: true,
        account: accountDoc.data()
      })
    }

    // Otherwise, fetch it from the Lightspeed API
    const response = await fetch('https://api.lightspeedapp.com/API/V3/Account.json', {
      headers: {
        'Authorization': `Bearer ${integrationData.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    // Read response as text first to handle different response formats
    const responseText = await response.text()
    let accountData

    try {
      accountData = JSON.parse(responseText)
    } catch (error) {
      console.error('Failed to parse Lightspeed API response:', responseText)
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid response from Lightspeed API',
        details: responseText.slice(0, 200)
      }, { status: 500 })
    }

    if (!response.ok) {
      // Handle token expiration by refreshing the token
      if (response.status === 401) {
        // Try to refresh the token
        const refreshedToken = await refreshLightspeedToken(merchantId, integrationData.refresh_token)
        
        if (refreshedToken) {
          // Retry with new token
          const retryResponse = await fetch('https://api.lightspeedapp.com/API/V3/Account.json', {
            headers: {
              'Authorization': `Bearer ${refreshedToken}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (!retryResponse.ok) {
            return NextResponse.json({ 
              success: false, 
              error: 'Failed to fetch account data after token refresh',
              status: retryResponse.status
            }, { status: retryResponse.status })
          }
          
          accountData = await retryResponse.json()
        } else {
          return NextResponse.json({ 
            success: false, 
            error: 'Token refresh failed',
            details: 'Unable to refresh expired access token'
          }, { status: 401 })
        }
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch Lightspeed account data',
          status: response.status,
          details: accountData
        }, { status: response.status })
      }
    }

    // Extract account info from response
    const account = {
      accountID: accountData.Account?.accountID || '',
      name: accountData.Account?.name || 'Lightspeed Account'
    }

    // Store account ID in Firestore for future use
    if (account.accountID) {
      try {
        const accountDocRef = doc(db, `merchants/${merchantId}/integrations/lightspeed_account`)
        await setDoc(accountDocRef, account)
      } catch (error) {
        console.error('Failed to store Lightspeed account ID:', error)
        // Continue anyway since we have the data
      }
    }

    return NextResponse.json({ 
      success: true, 
      account
    })
  } catch (error) {
    console.error('Error fetching Lightspeed account:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Helper function to refresh an expired token
async function refreshLightspeedToken(merchantId: string, refreshToken: string) {
  try {
    // Get the client credentials
    const clientId = process.env.NEXT_PUBLIC_LIGHTSPEED_NEW_CLIENT_ID || process.env.LIGHTSPEED_NEW_CLIENT_ID
    const clientSecret = process.env.LIGHTSPEED_NEW_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Missing Lightspeed client credentials')
      return null
    }

    // Exchange the refresh token for a new access token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })

    const response = await fetch('https://cloud.lightspeedapp.com/auth/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    })

    if (!response.ok) {
      console.error('Failed to refresh token:', response.status, response.statusText)
      return null
    }

    const tokenData = await response.json()

    if (!tokenData.access_token) {
      console.error('No access token in refresh response')
      return null
    }

    // Update the stored tokens
    const integrationDocRef = doc(db, `merchants/${merchantId}/integrations/lightspeed_new`)
    await updateDoc(integrationDocRef, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refreshToken, // Use new refresh token if provided
      expires_in: tokenData.expires_in,
      updated_at: new Date().toISOString()
    })

    return tokenData.access_token
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
} 