import { NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export async function GET(request: Request) {
  try {
    // Get the merchantId from query params
    const url = new URL(request.url)
    const merchantId = url.searchParams.get('merchantId')
    const catalogItemIds = url.searchParams.get('catalogItemIds')
    
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
    
    // Call Square API to get inventory counts
    let endpoint = 'https://connect.squareup.com/v2/inventory/counts/batch-retrieve'
    let body = {}
    
    // If catalog item IDs are provided, use them to filter the inventory counts
    if (catalogItemIds) {
      const itemIds = catalogItemIds.split(',')
      body = {
        catalog_object_ids: itemIds,
        states: ["IN_STOCK", "SOLD", "RETURNED", "RESERVED"]
      }
    } else {
      // Otherwise, just get the latest counts
      endpoint = 'https://connect.squareup.com/v2/inventory/counts/batch-retrieve'
      body = {
        states: ["IN_STOCK", "SOLD", "RETURNED", "RESERVED"],
        limit: 100
      }
    }
    
    const squareResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Square-Version': '2023-09-25',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    
    if (!squareResponse.ok) {
      const errorData = await squareResponse.json()
      console.error('Square API error:', errorData)
      return NextResponse.json({ error: 'Failed to fetch data from Square API', details: errorData }, { status: squareResponse.status })
    }
    
    const inventoryData = await squareResponse.json()
    
    // Return the inventory data
    return NextResponse.json(inventoryData)
  } catch (error) {
    console.error('Error fetching Square inventory data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 