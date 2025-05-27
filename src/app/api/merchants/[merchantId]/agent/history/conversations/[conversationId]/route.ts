import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'

export async function POST(
  request: NextRequest,
  { params }: { params: { merchantId: string; conversationId: string } }
) {
  try {
    const { merchantId, conversationId } = params
    const body = await request.json()
    
    // Validate required fields
    if (!merchantId || !conversationId) {
      return NextResponse.json(
        { error: 'Missing merchantId or conversationId' },
        { status: 400 }
      )
    }
    
    // Create conversation document in Firestore
    const conversationRef = doc(
      db,
      'merchants',
      merchantId,
      'agent',
      'history',
      'conversations',
      conversationId
    )
    
    const conversationData = {
      conversationId,
      merchantId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: body.status || 'active',
      messages: [],
      ...body
    }
    
    await setDoc(conversationRef, conversationData)
    
    return NextResponse.json({
      success: true,
      conversationId,
      data: conversationData
    })
  } catch (error) {
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { merchantId: string; conversationId: string } }
) {
  try {
    const { merchantId, conversationId } = params
    
    if (!merchantId || !conversationId) {
      return NextResponse.json(
        { error: 'Missing merchantId or conversationId' },
        { status: 400 }
      )
    }
    
    // Get conversation document from Firestore
    const conversationRef = doc(
      db,
      'merchants',
      merchantId,
      'agent',
      'history',
      'conversations',
      conversationId
    )
    
    const conversationDoc = await getDoc(conversationRef)
    
    if (!conversationDoc.exists()) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      conversationId,
      data: conversationDoc.data()
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
} 