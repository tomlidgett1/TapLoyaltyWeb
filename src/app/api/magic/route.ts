import { NextRequest, NextResponse } from 'next/server'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, payload } = body
    
    // Call the Firebase function
    const callOpenAI = httpsCallable(functions, 'callOpenAI')
    const result = await callOpenAI({
      action,
      payload
    })
    
    return NextResponse.json(result.data)
  } catch (error: any) {
    console.error('Error calling OpenAI via Firebase:', error)
    return NextResponse.json(
      { 
        error: 'Failed to call OpenAI', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
} 