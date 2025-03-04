import OpenAI from 'openai'

// Initialize OpenAI only if API key is available
let openai: OpenAI | null = null;

try {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_OPENAI_AVAILABLE === 'true') {
    openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

const ASSISTANT_ID = 'asst_Aymz6DWL61Twlz2XubPu49ur'

// Get the existing assistant
export async function getOrCreateAssistant() {
  try {
    if (!openai) {
      throw new Error('OpenAI client is not available');
    }
    return await openai.beta.assistants.retrieve(ASSISTANT_ID)
  } catch (error) {
    console.error('Error getting assistant:', error)
    throw error
  }
}

// Create a thread for a new conversation
export async function createThread() {
  try {
    if (!openai) {
      throw new Error('OpenAI client is not available');
    }
    return await openai.beta.threads.create()
  } catch (error) {
    console.error('Error creating thread:', error)
    throw error
  }
}

// Add this function to create a new thread when needed
async function shouldCreateNewThread(threadId: string): Promise<boolean> {
  if (!openai) {
    return false;
  }
  const messages = await openai.beta.threads.messages.list(threadId)
  return messages.data.length >= 10 // Create new thread after 10 messages
}

// Modify addMessage function
export async function addMessage(threadId: string, content: string, metadata?: { merchantName?: string }) {
  if (!openai) {
    throw new Error('OpenAI client is not available');
  }

  // Check if we need a new thread
  if (await shouldCreateNewThread(threadId)) {
    // Create new thread
    const newThread = await createThread()
    threadId = newThread.id
  }

  console.log('Sending message:', {
    content,
    contentLength: content.length,
    threadId,
    metadata
  })

  const message = {
    role: "user",
    content: content,
    metadata: metadata
  }
  
  const response = await openai.beta.threads.messages.create(threadId, message)
  return { response, threadId } // Return new threadId if it changed
}

// Add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Run the assistant on a thread
export async function runAssistant(assistantId: string, threadId: string) {
  try {
    if (!openai) {
      throw new Error('OpenAI client is not available');
    }

    // Add delay before making request
    await delay(2000) // 2 second delay

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    })

    // Poll for completion with detailed logging
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id)
    console.log('Initial run status:', runStatus.status)
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000))
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id)
      console.log('Current run status:', runStatus.status)
    }

    if (runStatus.status === 'failed') {
      console.error('Run failed with details:', {
        status: runStatus.status,
        lastError: runStatus.last_error,
        failedAt: runStatus.failed_at,
        threadId,
        runId: run.id
      })
      throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`)
    }

    if (runStatus.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId)
      return messages.data[0].content[0].text.value
    }

    // Handle other possible statuses
    if (runStatus.status === 'expired') {
      throw new Error('Assistant run expired - please try again')
    }

    if (runStatus.status === 'cancelled') {
      throw new Error('Assistant run was cancelled')
    }

    throw new Error(`Unexpected run status: ${runStatus.status}`)
  } catch (error) {
    // Log the full error details
    console.error('Full assistant run error:', {
      error,
      assistantId,
      threadId,
      message: error.message,
      response: error.response?.data
    })
    
    // Check for specific error types
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded - please try again in a moment')
    }
    
    if (error.response?.status === 401) {
      throw new Error('Authentication failed - please check your API key')
    }

    throw error
  }
}

// When suggesting rewards, format them like this:
// ```json
// {
//   "name": "Free Coffee",
//   "description": "Get a free coffee of your choice",
//   "points_required": 500,
//   "expiry_days": 30,
//   "terms": [
//     "Valid for any size coffee",
//     "Cannot be combined with other offers",
//     "Valid at participating locations only"
//   ]
// }
// ``` 