import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

// Square API version
const API_VERSION = '2025-04-16'

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
    
    // Get date range from query params or use default (last 30 days)
    const startDate = searchParams.get('startDate') || 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const endDate = searchParams.get('endDate') || 
      new Date().toISOString().split('T')[0]
    
    // Call Square API to get orders
    const ordersResponse = await fetch('https://connect.squareup.com/v2/orders/search', {
      method: 'POST',
      headers: {
        'Square-Version': API_VERSION,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        location_ids: ['me'], // 'me' represents all locations the merchant has access to
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
        }
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
    
    // Process the orders to extract relevant sales data
    const sales = ordersData.orders?.map(order => {
      // Calculate total amount
      const totalMoney = order.total_money || {}
      const amount = totalMoney.amount ? totalMoney.amount / 100 : 0 // Convert cents to dollars
      const currency = totalMoney.currency || 'USD'
      
      return {
        id: order.id,
        orderId: order.id,
        locationId: order.location_id,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        state: order.state,
        totalAmount: amount,
        currency: currency,
        customerName: order.customer?.display_name || 'Unknown Customer',
        customerId: order.customer_id || null,
        source: order.source?.name || 'Square POS',
        lineItems: order.line_items?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.base_price_money ? item.base_price_money.amount / 100 : 0,
          totalPrice: item.total_money ? item.total_money.amount / 100 : 0
        })) || []
      }
    }) || []
    
    return NextResponse.json({ 
      success: true, 
      sales,
      count: sales.length,
      timeframe: {
        startDate,
        endDate
      }
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