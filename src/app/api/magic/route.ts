import { NextRequest, NextResponse } from 'next/server'
import { mockCallOpenAI } from '@/lib/mock-openai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, payload } = body
    
    // Use mock implementation instead of Firebase function
    const result = await mockCallOpenAI({
      action,
      payload
    })
    
    return NextResponse.json(result.data)
  } catch (error: any) {
    console.error('Error calling mock OpenAI:', error)
    return NextResponse.json(
      { 
        error: 'Failed to call OpenAI', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
} 