import OpenAI from 'openai'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getApp } from 'firebase/app'

// Initialize OpenAI with a function to get the API key
let openai: OpenAI | null = null;
let apiKeyPromise: Promise<string> | null = null;

// Function to get the API key from Firebase Functions
async function getApiKey() {
  try {
    const functions = getFunctions(getApp());
    const getOpenAIKey = httpsCallable(functions, 'getOpenAIKey');
    
    console.log('Calling getOpenAIKey function...');
    const result = await getOpenAIKey();
    console.log('Function call successful');
    
    const data = result.data as { apiKey: string };
    if (!data || !data.apiKey) {
      console.error('API key not returned from function');
      throw new Error('API key not available');
    }
    
    return data.apiKey;
  } catch (error) {
    console.error('Error getting API key:', error);
    
    // Fall back to environment variable if function fails
    if (typeof window !== 'undefined' && 
        process.env.NEXT_PUBLIC_OPENAI_API_KEY && 
        process.env.NEXT_PUBLIC_OPENAI_AVAILABLE === 'true') {
      console.log('Falling back to environment variable');
      return process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    }
    
    throw error;
  }
}

// Initialize OpenAI with the API key from Firebase Functions
export async function initializeOpenAI() {
  if (openai) return openai;
  
  if (!apiKeyPromise) {
    apiKeyPromise = getApiKey();
  }
  
  try {
    const apiKey = await apiKeyPromise;
    openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
    return openai;
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error);
    throw error;
  }
}

const ASSISTANT_ID = 'asst_Aymz6DWL61Twlz2XubPu49ur'

// Get the existing assistant
export async function getOrCreateAssistant() {
  try {
    const client = await initializeOpenAI();
    return await client.beta.assistants.retrieve(ASSISTANT_ID);
  } catch (error) {
    console.error('Error getting assistant:', error);
    throw error;
  }
}

// Create a thread for a new conversation
export async function createThread() {
  try {
    const client = await initializeOpenAI();
    return await client.beta.threads.create();
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
}

// Add this function to create a new thread when needed
async function shouldCreateNewThread(threadId: string): Promise<boolean> {
  const client = await initializeOpenAI();
  const messages = await client.beta.threads.messages.list(threadId);
  return messages.data.length >= 10; // Create new thread after 10 messages
}

// Modify addMessage function
export async function addMessage(threadId: string, content: string, metadata?: { merchantName?: string }) {
  const client = await initializeOpenAI();

  // Check if we need a new thread
  if (await shouldCreateNewThread(threadId)) {
    // Create new thread
    const newThread = await createThread();
    threadId = newThread.id;
  }

  console.log('Sending message:', {
    content,
    contentLength: content.length,
    threadId,
    metadata
  });

  const message = {
    role: "user",
    content: content,
    metadata: metadata
  };
  
  const response = await client.beta.threads.messages.create(threadId, message);
  return { response, threadId }; // Return new threadId if it changed
}

// Add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Run the assistant on a thread
export async function runAssistant(assistantId: string, threadId: string) {
  try {
    const client = await initializeOpenAI();

    // Add delay before making request
    await delay(2000); // 2 second delay

    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });

    // Poll for completion with detailed logging
    let runStatus = await client.beta.threads.runs.retrieve(threadId, run.id);
    console.log('Initial run status:', runStatus.status);
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await client.beta.threads.runs.retrieve(threadId, run.id);
      console.log('Current run status:', runStatus.status);
    }

    if (runStatus.status === 'failed') {
      console.error('Run failed with details:', {
        status: runStatus.status,
        lastError: runStatus.last_error,
        failedAt: runStatus.failed_at,
        threadId,
        runId: run.id
      });
      throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }

    if (runStatus.status === 'completed') {
      const messages = await client.beta.threads.messages.list(threadId);
      return messages.data[0].content[0].text.value;
    }

    // Handle other possible statuses
    if (runStatus.status === 'expired') {
      throw new Error('Assistant run expired - please try again');
    }

    if (runStatus.status === 'cancelled') {
      throw new Error('Assistant run was cancelled');
    }

    throw new Error(`Unexpected run status: ${runStatus.status}`);
  } catch (error) {
    // Log the full error details
    console.error('Full assistant run error:', {
      error,
      assistantId,
      threadId,
      message: error.message,
      response: error.response?.data
    });
    
    // Check for specific error types
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded - please try again in a moment');
    }
    
    if (error.response?.status === 401) {
      throw new Error('Authentication failed - please check your API key');
    }

    throw error;
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