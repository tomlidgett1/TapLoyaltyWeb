import OpenAI from 'openai'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getApp } from 'firebase/app'

// Initialize OpenAI with a function to get the API key
let openai: OpenAI | null = null;

// Function to validate an OpenAI API key
async function validateApiKey(apiKey: string): Promise<boolean> {
  console.log('validateApiKey: Validating API key');
  
  try {
    // Create a temporary OpenAI client
    const tempClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
    
    // Try to make a simple API call
    await tempClient.models.list();
    
    console.log('validateApiKey: API key is valid');
    return true;
  } catch (error) {
    console.error('validateApiKey: API key validation failed:', error);
    return false;
  }
}

// Initialize OpenAI with environment variables
export async function initializeOpenAI() {
  console.log('initializeOpenAI: Starting initialization');
  
  if (openai) {
    console.log('initializeOpenAI: OpenAI client already initialized');
    return openai;
  }
  
  try {
    // Try to use environment variables directly
    const envApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const envAvailable = process.env.NEXT_PUBLIC_OPENAI_AVAILABLE === 'true';
    
    console.log('initializeOpenAI: Environment variables check:', { 
      hasApiKey: !!envApiKey, 
      apiKeyLength: envApiKey?.length || 0,
      isAvailable: envAvailable 
    });
    
    if (envApiKey && envApiKey.length > 0 && envAvailable) {
      console.log('initializeOpenAI: Validating environment API key');
      if (await validateApiKey(envApiKey)) {
        console.log('initializeOpenAI: Using OpenAI API key from environment variables');
        openai = new OpenAI({
          apiKey: envApiKey,
          dangerouslyAllowBrowser: true
        });
        console.log('initializeOpenAI: OpenAI client initialized successfully');
        return openai;
      } else {
        console.error('initializeOpenAI: Environment API key is invalid');
      }
    }
    
    // Try to get API key from Firebase function
    console.log('initializeOpenAI: Trying to get API key from getApiKey function');
    const apiKey = await getApiKey();
    
    if (apiKey && apiKey.length > 0) {
      console.log('initializeOpenAI: Using OpenAI API key from getApiKey function');
      openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
      console.log('initializeOpenAI: OpenAI client initialized successfully');
      return openai;
    }
    
    // If we get here, we couldn't get an API key
    console.error('initializeOpenAI: No API key available from any source');
    throw new Error('OpenAI API key not available');
  } catch (error) {
    console.error('initializeOpenAI: Failed to initialize OpenAI client:', error);
    
    // For development only - hardcoded fallback
    if (process.env.NODE_ENV === 'development') {
      console.log('initializeOpenAI: Using hardcoded API key for development');
      openai = new OpenAI({
        apiKey: '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',
        dangerouslyAllowBrowser: true
      });
      return openai;
    }
    
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

// Function to get the API key from Firebase Functions
async function getApiKey() {
  console.log('getApiKey: Starting to fetch API key');
  
  try {
    console.log('getApiKey: Checking environment variables first');
    // Try environment variables first
    if (typeof window !== 'undefined' && 
        process.env.NEXT_PUBLIC_OPENAI_API_KEY && 
        process.env.NEXT_PUBLIC_OPENAI_AVAILABLE === 'true') {
      console.log('getApiKey: Found API key in environment variables');
      return process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    }
    
    // Try the rewritten URL first (avoids CORS issues)
    try {
      console.log('getApiKey: Trying rewritten URL');
      const apiKey = await getApiKeyFromRewrite();
      return apiKey;
    } catch (error) {
      console.error('getApiKey: Rewritten URL failed, trying other methods:', error);
    }
    
    // Try callable function first
    try {
      console.log('getApiKey: Trying callable function');
      const { getFunctions } = await import('firebase/functions');
      const { httpsCallable } = await import('firebase/functions');
      const { getApp } = await import('firebase/app');
      
      const functionsInstance = getFunctions(getApp());
      const getOpenAIKey = httpsCallable(functionsInstance, 'getOpenAIKey');
      
      const result = await getOpenAIKey();
      const data = result.data as { apiKey: string };
      
      if (data && data.apiKey) {
        console.log('getApiKey: Successfully retrieved API key via callable function');
        return data.apiKey;
      }
    } catch (error) {
      console.error('getApiKey: Callable function failed, trying HTTP version:', error);
    }
    
    // Fall back to HTTP version if callable function fails
    console.log('getApiKey: Trying HTTP function');
    const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/getOpenAIKeyHttp', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP function failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.apiKey) {
      console.log('getApiKey: Successfully retrieved API key via HTTP function');
      return data.apiKey;
    }
    
    throw new Error('API key not available from any source');
  } catch (error) {
    console.error('getApiKey: Final error:', error);
    
    // Fall back to environment variable if all else fails
    if (typeof window !== 'undefined' && 
        process.env.NEXT_PUBLIC_OPENAI_API_KEY && 
        process.env.NEXT_PUBLIC_OPENAI_AVAILABLE === 'true') {
      console.log('getApiKey: Falling back to environment variable');
      return process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    }
    
    throw error;
  }
}

// Function to get the API key directly from the rewritten URL
async function getApiKeyFromRewrite() {
  console.log('getApiKeyFromRewrite: Starting to fetch API key from rewrite');
  
  try {
    const response = await fetch('/api/openai-key');
    
    if (!response.ok) {
      console.error('getApiKeyFromRewrite: HTTP error', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.apiKey) {
      console.log('getApiKeyFromRewrite: Successfully retrieved API key');
      return data.apiKey;
    }
    
    console.error('getApiKeyFromRewrite: No API key in response', data);
    throw new Error('API key not available in response');
  } catch (error) {
    console.error('getApiKeyFromRewrite: Error fetching API key:', error);
    throw error;
  }
} 