import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

// Square API version
const API_VERSION = '2025-07-16'

export async function GET(request: NextRequest) {
  try {
    // Get merchantId from query params
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')
    
    if (!merchantId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing merchantId parameter' 
      }, { status: 400 })
    }
    
    // Get the Square integration details from Firestore
    const integrationDoc = await getDoc(doc(db, 'merchants', merchantId, 'integrations', 'square'))
    
    if (!integrationDoc.exists()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Square integration not found for this merchant' 
      }, { status: 404 })
    }
    
    const integrationData = integrationDoc.data()
    
    if (!integrationData.connected || !integrationData.accessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Square integration is not properly connected' 
      }, { status: 400 })
    }
    
    const accessToken = integrationData.accessToken
    
    // Call Square API to get orders using the new orders/search endpoint
    const ordersResponse = await fetch('https://connect.squareup.com/v2/orders/search', {
      method: 'POST',
      headers: {
        'Square-Version': API_VERSION,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        return_entries: true,
        location_ids: [
          "LMY8EHCZ3EACN"
        ],
        limit: 100
      })
    })
    
    const ordersData = await ordersResponse.json()
    
    if (!ordersResponse.ok) {
      console.error('Square API error:', ordersData)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch sales data from Square',
        details: ordersData
      }, { status: 500 })
    }
    
    // Process the order entries to extract relevant sales data
    const sales = ordersData.order_entries?.map((entry: any) => {
      return {
        id: entry.order_id,
        orderId: entry.order_id,
        locationId: entry.location_id,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
        closedAt: entry.closed_at,
        state: 'COMPLETED', // Orders in order_entries are typically completed
        totalAmount: 0, // Will need to fetch order details for total amount
        currency: 'USD',
        customerName: 'Unknown Customer', // Will need to fetch order details for customer info
        customerId: null,
        source: 'Square POS',
        lineItems: entry.line_items?.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: 0, // Will need to fetch order details for pricing
          totalPrice: 0
        })) || []
      }
    }) || []
    
    return NextResponse.json({ 
      success: true, 
      sales,
      count: sales.length,
      cursor: ordersData.cursor,
      hasMore: !!ordersData.cursor
    })
    
  } catch (error) {
    console.error('Error fetching Square sales:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 