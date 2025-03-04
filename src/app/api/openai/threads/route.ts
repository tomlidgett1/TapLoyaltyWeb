import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Check if API key exists
if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY environment variable")
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured")
    }
    
    const thread = await openai.beta.threads.create()
    
    return NextResponse.json({ threadId: thread.id })
  } catch (error: any) {
    console.error('Error creating thread:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create thread', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
} 