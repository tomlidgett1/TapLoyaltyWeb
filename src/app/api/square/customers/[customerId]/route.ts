import { NextRequest, NextResponse } from 'next/server'

const API_VERSION = '2025-07-16'

export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')
    
    if (!merchantId) {
      return NextResponse.json(
        { error: 'Merchant ID is required' },
        { status: 400 }
      )
    }

    const customerId = params.customerId
    
    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    // Get Square access token from Firestore
    const { doc, getDoc } = await import('firebase/firestore')
    const { db } = await import('@/lib/firebase')
    
    const squareDoc = await getDoc(doc(db, 'merchants', merchantId, 'integrations', 'square'))
    
    if (!squareDoc.exists()) {
      return NextResponse.json(
        { error: 'Square integration not found' },
        { status: 404 }
      )
    }
    
    const squareData = squareDoc.data()
    const accessToken = squareData.accessToken
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Square access token not found' },
        { status: 404 }
      )
    }

    // Fetch customer details from Square API
    const response = await fetch(`https://connect.squareup.com/v2/customers/${customerId}`, {
      method: 'GET',
      headers: {
        'Square-Version': API_VERSION,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Square API error:', errorText)
      return NextResponse.json(
        { error: `Square API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching customer details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
