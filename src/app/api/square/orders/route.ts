import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

// Square API version
const API_VERSION = '2025-04-16'

// Define types for Square API responses
interface SquareLocation {
  id: string;
  name: string;
  status: string;
  [key: string]: any;
}

interface SquareOrder {
  id: string;
  location_id: string;
  created_at: string;
  updated_at: string;
  state: string;
  total_money?: {
    amount: number;
    currency: string;
  };
  customer?: {
    display_name?: string;
  };
  customer_id?: string;
  source?: {
    name?: string;
  };
  line_items?: Array<{
    name: string;
    quantity: string;
    base_price_money?: {
      amount: number;
    };
    total_money?: {
      amount: number;
    };
  }>;
  tenders?: Array<{
    note?: string;
    [key: string]: any;
  }>;
  [key: string]: any;
}

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
    const integrationRef = doc(db, 'merchants', merchantId, 'integrations', 'square')
    const integrationDoc = await getDoc(integrationRef)
    
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
    
    // Check if we have a stored locationId, if not, fetch locations first
    let locationId = integrationData.locationId
    
    if (!locationId) {
      // Fetch locations to get the location ID
      const locationsResponse = await fetch('https://connect.squareup.com/v2/locations', {
        method: 'GET',
        headers: {
          'Square-Version': API_VERSION,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      const locationsData = await locationsResponse.json()
      
      if (!locationsResponse.ok || !locationsData.locations || locationsData.locations.length === 0) {
        console.error('Failed to fetch Square locations:', locationsData)
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch location information from Square',
          details: locationsData
        }, { status: 500 })
      }
      
      // Use the first active location or just the first location
      const location = locationsData.locations.find((loc: SquareLocation) => loc.status === 'ACTIVE') || locationsData.locations[0]
      locationId = location.id
      
      // Store the location ID for future use
      await updateDoc(integrationRef, {
        locationId: locationId,
        locationName: location.name
      })
    }
    
    // Get date range from query params or use default (last 30 days)
    const startDate = searchParams.get('startDate') || 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const endDate = searchParams.get('endDate') || 
      new Date().toISOString().split('T')[0]
    
    // Step 1: Search for orders to get order IDs
    const searchOrdersResponse = await fetch('https://connect.squareup.com/v2/orders/search', {
      method: 'POST',
      headers: {
        'Square-Version': API_VERSION,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        location_ids: [locationId],
        query: {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: `${startDate}T00:00:00Z`,
                end_at: `${endDate}T23:59:59Z`
              }
            },
            state_filter: {
              states: ['COMPLETED']
            }
          },
          sort: {
            sort_field: 'CREATED_AT',
            sort_order: 'DESC'
          }
        },
        limit: 100 // Limit to 100 orders for performance
      })
    })
    
    const searchOrdersData = await searchOrdersResponse.json()
    
    if (!searchOrdersResponse.ok) {
      console.error('Square API search orders error:', searchOrdersData)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to search orders from Square',
        details: searchOrdersData
      }, { status: 500 })
    }
    
    // If no orders found, return empty array
    if (!searchOrdersData.orders || searchOrdersData.orders.length === 0) {
      return NextResponse.json({ 
        success: true, 
        orders: [],
        count: 0,
        timeframe: {
          startDate,
          endDate
        }
      })
    }
    
    // Extract order IDs for batch retrieval
    const orderIds = searchOrdersData.orders.map((order: SquareOrder) => order.id)
    
    // Step 2: Batch retrieve orders to get detailed information
    const batchRetrieveResponse = await fetch('https://connect.squareup.com/v2/orders/batch-retrieve', {
      method: 'POST',
      headers: {
        'Square-Version': API_VERSION,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        location_id: locationId,
        order_ids: orderIds
      })
    })
    
    const batchRetrieveData = await batchRetrieveResponse.json()
    
    if (!batchRetrieveResponse.ok) {
      console.error('Square API batch retrieve error:', batchRetrieveData)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to retrieve detailed order information from Square',
        details: batchRetrieveData
      }, { status: 500 })
    }
    
    // Process the orders to extract relevant sales data
    const orders = batchRetrieveData.orders?.map((order: SquareOrder) => {
      // Calculate total amount
      const totalMoney = order.total_money || { amount: 0, currency: 'USD' };
      const amount = totalMoney.amount ? totalMoney.amount / 100 : 0; // Convert cents to dollars
      const currency = totalMoney.currency || 'USD';
      
      // Get customer name from tenders if available
      let customerName = 'Unknown Customer';
      if (order.tenders && order.tenders.length > 0 && order.tenders[0].note) {
        customerName = order.tenders[0].note;
      } else if (order.customer?.display_name) {
        customerName = order.customer.display_name;
      }
      
      return {
        id: order.id,
        orderId: order.id,
        locationId: order.location_id,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        state: order.state,
        totalAmount: amount,
        currency: currency,
        customerName: customerName,
        customerId: order.customer_id || null,
        source: order.source?.name || 'Square POS',
        lineItems: order.line_items?.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.base_price_money ? item.base_price_money.amount / 100 : 0,
          totalPrice: item.total_money ? item.total_money.amount / 100 : 0
        })) || [],
        tenders: order.tenders || []
      };
    }) || [];
    
    return NextResponse.json({ 
      success: true, 
      orders,
      count: orders.length,
      timeframe: {
        startDate,
        endDate
      }
    })
    
  } catch (error) {
    console.error('Error fetching Square orders:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 