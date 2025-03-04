import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const { assistantId } = await request.json()
    const threadId = params.threadId
    
    const run = await openai.beta.threads.runs.create(
      threadId,
      {
        assistant_id: assistantId
      }
    )
    
    return NextResponse.json({ runId: run.id })
  } catch (error) {
    console.error('Error creating run:', error)
    return NextResponse.json(
      { error: 'Failed to create run' },
      { status: 500 }
    )
  }
} 