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
    const { content } = await request.json()
    const threadId = params.threadId
    
    const message = await openai.beta.threads.messages.create(
      threadId,
      {
        role: 'user',
        content
      }
    )
    
    return NextResponse.json({ messageId: message.id })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const threadId = params.threadId
    
    const messagesList = await openai.beta.threads.messages.list(threadId)
    
    return NextResponse.json({ messages: messagesList.data })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
} 