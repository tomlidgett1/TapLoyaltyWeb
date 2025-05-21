import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const merchantId = searchParams.get('merchantId')
  const accountId = searchParams.get('accountId')
  const limit = searchParams.get('limit') || '10' // Default to 10 items

  if (!merchantId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Merchant ID is required' 
    }, { status: 400 })
  }

  if (!accountId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Lightspeed Account ID is required' 
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

    // Fetch inventory items from the Lightspeed API
    let url = `https://api.lightspeedapp.com/API/V3/Account/${accountId}/Item.json?limit=${limit}`
    
    // Add load_relations parameter to include ItemShops for inventory data
    url += '&load_relations=%5B%22ItemShops%22%5D'
    
    // Check for pagination parameters
    const after = searchParams.get('after')
    const before = searchParams.get('before')
    
    // Add pagination parameters if provided
    if (after) {
      url += `&after=${after}`
    } else if (before) {
      url += `&before=${before}`
    }
    
    // Process and add any search parameters
    // Loop through all search params and add them to the URL if they're not already included
    searchParams.forEach((value, key) => {
      if (!['merchantId', 'accountId', 'limit', 'after', 'before', 'load_relations'].includes(key)) {
        // Special handling for search operators:
        // If the value contains a comma immediately after a search operator like ~, >, <, etc.,
        // we need to pass it through as-is since it follows Lightspeed's parameter format
        console.log(`Processing search parameter: ${key}=${value}`)
        
        // Directly pass any already formatted search parameter
        if (/^[~=><]|!=|!~|IN/.test(value) && value.includes(',')) {
          url += `&${key}=${value}`
          console.log(`Passing formatted search parameter: ${key}=${value}`)
        } else {
          // Default handling for regular parameters
          url += `&${key}=${value}`
          console.log(`Passing standard parameter: ${key}=${value}`)
        }
      }
    })
    
    console.log(`Lightspeed API URL: ${url}`)
    
    let response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${integrationData.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    // Handle token expiration by refreshing the token
    if (response.status === 401 && integrationData.refresh_token) {
      console.log('Access token expired, refreshing...')
      const refreshedToken = await refreshLightspeedToken(merchantId, integrationData.refresh_token)
      
      if (refreshedToken) {
        // Retry with new token
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${refreshedToken}`,
            'Content-Type': 'application/json'
          }
        })
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Token refresh failed',
          details: 'Unable to refresh expired access token'
        }, { status: 401 })
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Lightspeed API error:', response.status, errorText)
      
      return NextResponse.json({ 
        success: false, 
        error: `Lightspeed API request failed with status ${response.status}`,
        details: errorText
      }, { status: response.status })
    }

    // Parse response as JSON
    const responseText = await response.text()
    let data
    
    try {
      // Check if the response starts with a typical HTML doctype declaration
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('Received HTML response instead of JSON:', responseText.substring(0, 200))
        return NextResponse.json({ 
          success: false, 
          error: 'Received HTML response instead of JSON. The Lightspeed API endpoint may be down or returning an error page.',
          details: responseText.substring(0, 200)
        }, { status: 500 })
      }
      
      data = JSON.parse(responseText)
    } catch (error) {
      console.error('Failed to parse Lightspeed API response:', responseText.substring(0, 200))
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid response from Lightspeed API',
        details: responseText.substring(0, 200)
      }, { status: 500 })
    }

    // Extract items from the response
    let items = []
    let nextUrl = null
    let previousUrl = null
    
    // Extract pagination URLs from response
    if (data['@attributes']) {
      nextUrl = data['@attributes'].next || null
      previousUrl = data['@attributes'].previous || null
      console.log(`Pagination: Next URL: ${nextUrl ? 'Available' : 'None'}, Previous URL: ${previousUrl ? 'Available' : 'None'}`)
      
      // Extract pagination token from the URLs to create proxy URLs
      if (nextUrl) {
        try {
          const url = new URL(nextUrl);
          const afterParam = url.searchParams.get('after');
          // If we have the after param, create our own proxy URL
          if (afterParam) {
            nextUrl = `/api/lightspeed/inventory?merchantId=${merchantId}&accountId=${accountId}&limit=${limit}&after=${afterParam}`;
          }
        } catch (error) {
          console.error('Error parsing next URL:', error);
        }
      }
      
      if (previousUrl) {
        try {
          const url = new URL(previousUrl);
          const beforeParam = url.searchParams.get('before');
          // If we have the before param, create our own proxy URL
          if (beforeParam) {
            previousUrl = `/api/lightspeed/inventory?merchantId=${merchantId}&accountId=${accountId}&limit=${limit}&before=${beforeParam}`;
          }
        } catch (error) {
          console.error('Error parsing previous URL:', error);
        }
      }
    }
    
    if (data.Item) {
      // Handle both single item and array of items
      items = Array.isArray(data.Item) ? data.Item : [data.Item]
      console.log(`Retrieved ${items.length} inventory items from Lightspeed`)
    } else {
      console.log('No items found in Lightspeed response')
    }

    return NextResponse.json({ 
      success: true, 
      items,
      pagination: {
        limit: parseInt(limit),
        total: items.length,
        hasMore: !!nextUrl,
        nextUrl,
        previousUrl,
        currentPage: searchParams.get('after') || searchParams.get('before') ? 'paginated' : '1'
      }
    })
  } catch (error) {
    console.error('Error fetching Lightspeed inventory:', error)
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