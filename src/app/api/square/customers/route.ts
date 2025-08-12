import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')
    
    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId parameter' }, { status: 400 })
    }

    // Get Square integration data from Firestore
    const squareDoc = await getDoc(doc(db, 'merchants', merchantId, 'integrations', 'square'))
    
    if (!squareDoc.exists()) {
      return NextResponse.json({ error: 'Square integration not found' }, { status: 404 })
    }

    const squareData = squareDoc.data()
    const accessToken = squareData.accessToken

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 400 })
    }

    // Test Square Customers API
    const response = await fetch('https://connect.squareup.com/v2/customers', {
      method: 'GET',
      headers: {
        'Square-Version': '2025-04-16',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ 
        error: 'Failed to fetch customers from Square API', 
        details: errorData 
      }, { status: response.status })
    }

    const customersData = await response.json()
    
    return NextResponse.json({
      success: true,
      data: customersData,
      message: 'Successfully fetched customers from Square API'
    })
  } catch (error) {
    console.error('Error fetching Square customers:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')
    
    if (!merchantId) {
      return NextResponse.json({ error: 'Missing merchantId parameter' }, { status: 400 })
    }

    // Get request body
    const body = await request.json()
    
    if (!body) {
      return NextResponse.json({ error: 'Missing request body' }, { status: 400 })
    }

    // Get Square integration data from Firestore
    const squareDoc = await getDoc(doc(db, 'merchants', merchantId, 'integrations', 'square'))
    
    if (!squareDoc.exists()) {
      return NextResponse.json({ error: 'Square integration not found' }, { status: 404 })
    }

    const squareData = squareDoc.data()
    const accessToken = squareData.accessToken

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 400 })
    }

    // Create customer using Square API
    const response = await fetch('https://connect.squareup.com/v2/customers', {
      method: 'POST',
      headers: {
        'Square-Version': '2025-04-16',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ 
        error: 'Failed to create customer in Square API', 
        details: errorData 
      }, { status: response.status })
    }

    const customerData = await response.json()
    
    return NextResponse.json({
      success: true,
      data: customerData,
      message: 'Successfully created customer in Square API'
    })
  } catch (error) {
    console.error('Error creating Square customer:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
