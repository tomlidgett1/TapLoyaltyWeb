import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string, runId: string } }
) {
  try {
    const { threadId, runId } = params
    
    const run = await openai.beta.threads.runs.retrieve(
      threadId,
      runId
    )
    
    return NextResponse.json({ 
      id: run.id,
      status: run.status,
      created_at: run.created_at
    })
  } catch (error) {
    console.error('Error retrieving run:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve run' },
      { status: 500 }
    )
  }
} 