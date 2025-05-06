import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  // Get query parameters
  const searchParams = request.nextUrl.searchParams
  const merchantId = searchParams.get('merchantId')
  const integration = searchParams.get('integration')
  
  console.log('Integration check requested:', { merchantId, integration })
  
  // Validate required parameters
  if (!merchantId || !integration) {
    return NextResponse.json({ 
      success: false, 
      error: 'Missing required parameters' 
    }, { status: 400 })
  }
  
  try {
    // Get the integration document from Firestore
    const integrationDoc = await getDoc(doc(db, 'merchants', merchantId, 'integrations', integration))
    
    if (!integrationDoc.exists()) {
      console.log(`Integration ${integration} not found for merchant ${merchantId}`)
      return NextResponse.json({ 
        success: true, 
        connected: false,
        exists: false
      })
    }
    
    const data = integrationDoc.data()
    console.log(`Integration ${integration} found:`, {
      connected: data.connected,
      hasAccessToken: !!data.accessToken,
      connectedAt: data.connectedAt?.toDate?.() || data.connectedAt
    })
    
    return NextResponse.json({
      success: true,
      connected: data.connected === true,
      exists: true,
      connectedAt: data.connectedAt?.toDate?.() || data.connectedAt
    })
  } catch (error) {
    console.error('Error checking integration status:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check integration status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 