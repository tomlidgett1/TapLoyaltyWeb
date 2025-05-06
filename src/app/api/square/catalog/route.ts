import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export async function GET(request: Request) {
  try {
    // Get the merchantId from query params
    const url = new URL(request.url)
    const merchantId = url.searchParams.get('merchantId')
    
    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId parameter' }, { status: 400 })
    }
    
    // Get the merchant's Square integration details
    const squareIntegrationRef = doc(db, 'merchants', merchantId, 'integrations', 'square')
    const squareIntegrationDoc = await getDoc(squareIntegrationRef)
    
    if (!squareIntegrationDoc.exists() || !squareIntegrationDoc.data().connected) {
      return NextResponse.json({ error: 'Square integration not found or not connected' }, { status: 404 })
    }
    
    const squareData = squareIntegrationDoc.data()
    const accessToken = squareData.accessToken
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Square access token not found' }, { status: 404 })
    }
    
    // Call Square API to get catalog data
    const squareResponse = await fetch('https://connect.squareup.com/v2/catalog/list', {
      method: 'GET',
      headers: {
        'Square-Version': '2023-09-25',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!squareResponse.ok) {
      const errorData = await squareResponse.json()
      console.error('Square API error:', errorData)
      return NextResponse.json({ error: 'Failed to fetch data from Square API', details: errorData }, { status: squareResponse.status })
    }
    
    const catalogData = await squareResponse.json()
    
    // Return the catalog data
    return NextResponse.json(catalogData)
  } catch (error) {
    console.error('Error fetching Square catalog data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 