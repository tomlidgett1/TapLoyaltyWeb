import OpenAI from 'openai'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getApp } from 'firebase/app'

// Function to call OpenAI API through Firebase Functions
export async function callOpenAI(endpoint: string, params: any) {
  console.log(`callOpenAI: Calling ${endpoint} with params:`, params);
  
  try {
    // Get the Firebase Functions instance
    const { getFunctions } = await import('firebase/functions');
    const { httpsCallable } = await import('firebase/functions');
    const { getApp } = await import('firebase/app');
    
    const functionsInstance = getFunctions(getApp());
    const callOpenAIFunction = httpsCallable(functionsInstance, 'callOpenAI');
    
    console.log('callOpenAI: Calling Firebase function');
    const result = await callOpenAIFunction({
      endpoint,
      params
    });
    
    console.log(`callOpenAI: Received response for ${endpoint}`);
    return result.data;
  } catch (error) {
    console.error(`callOpenAI: Error calling ${endpoint}:`, error);
    throw error;
  }
}

// Get the existing assistant
export async function getOrCreateAssistant() {
  try {
    console.log('getOrCreateAssistant: Retrieving assistant');
    const result = await callOpenAI('beta.assistants.retrieve', {
      assistant_id: 'asst_Aymz6DWL61Twlz2XubPu49ur'
    });
    return result;
  } catch (error) {
    console.error('Error getting assistant:', error);
    throw error;
  }
}

// Create a thread for a new conversation
export async function createThread() {
  try {
    console.log('createThread: Creating new thread');
    const result = await callOpenAI('beta.threads.create', {});
    return result;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
}

// Add this function to create a new thread when needed
async function shouldCreateNewThread(threadId: string): Promise<boolean> {
  console.log('shouldCreateNewThread: Checking if new thread is needed');
  const messages = await callOpenAI('beta.threads.messages.list', {
    thread_id: threadId
  });
  return messages.data.length >= 10; // Create new thread after 10 messages
}

// Modify addMessage function
export async function addMessage(threadId: string, content: string, metadata?: { merchantName?: string }) {
  console.log('addMessage: Adding message to thread', threadId);

  // Check if we need a new thread
  if (await shouldCreateNewThread(threadId)) {
    // Create new thread
    console.log('addMessage: Creating new thread');
    const newThread = await createThread();
    threadId = newThread.id;
    console.log('addMessage: New thread created', threadId);
  }

  // Add the message to the thread
  console.log('addMessage: Creating message');
  const message = await callOpenAI('beta.threads.messages.create', {
    thread_id: threadId,
    role: 'user',
    content: content,
    metadata: metadata || {}
  });

  // Run the assistant on the thread
  console.log('addMessage: Running assistant on thread');
  const run = await callOpenAI('beta.threads.runs.create', {
    thread_id: threadId,
    assistant_id: 'asst_Aymz6DWL61Twlz2XubPu49ur'
  });

  return { threadId, message, run };
}

// Get messages from a thread
export async function getMessages(threadId: string) {
  console.log('getMessages: Getting messages from thread', threadId);
  const messages = await callOpenAI('beta.threads.messages.list', {
    thread_id: threadId
  });
  return messages.data;
}

// Check the status of a run
export async function checkRunStatus(threadId: string, runId: string) {
  console.log('checkRunStatus: Checking run status', { threadId, runId });
  const run = await callOpenAI('beta.threads.runs.retrieve', {
    thread_id: threadId,
    run_id: runId
  });
  return run;
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
    // Try the rewritten URL first (avoids CORS issues)
    try {
      console.log('getApiKey: Trying rewritten URL');
      const apiKey = await getApiKeyFromRewrite();
      console.log('getApiKey: Successfully got API key from rewrite, length:', apiKey?.length || 0);
      return apiKey;
    } catch (error) {
      console.error('getApiKey: Rewritten URL failed, trying other methods:', error);
    }
    
    // Try callable function
    try {
      console.log('getApiKey: Trying callable function');
      const { getFunctions } = await import('firebase/functions');
      const { httpsCallable } = await import('firebase/functions');
      const { getApp } = await import('firebase/app');
      
      console.log('getApiKey: Getting Firebase functions instance');
      const functionsInstance = getFunctions(getApp());
      console.log('getApiKey: Creating callable function reference');
      const getOpenAIKey = httpsCallable(functionsInstance, 'getOpenAIKey');
      
      console.log('getApiKey: Calling getOpenAIKey function');
      const result = await getOpenAIKey();
      console.log('getApiKey: Function call successful, result:', result);
      
      const data = result.data as { apiKey: string };
      console.log('getApiKey: Data received, has apiKey:', !!data?.apiKey);
      
      if (data && data.apiKey) {
        console.log('getApiKey: Successfully retrieved API key via callable function, length:', data.apiKey.length);
        return data.apiKey;
      } else {
        console.error('getApiKey: No API key in callable function response');
      }
    } catch (error) {
      console.error('getApiKey: Callable function failed, trying HTTP version:', error);
    }
    
    // Fall back to HTTP version if callable function fails
    console.log('getApiKey: Trying HTTP function');
    
    // Check if user is authenticated
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    console.log('getApiKey: Current user:', user?.uid || 'No user');
    
    if (!user) {
      console.error('getApiKey: No authenticated user for HTTP function');
      throw new Error('Authentication required for HTTP function');
    }
    
    console.log('getApiKey: Getting ID token');
    const token = await user.getIdToken();
    console.log('getApiKey: Got ID token, length:', token.length);
    
    console.log('getApiKey: Making HTTP request to getOpenAIKeyHttp');
    const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/getOpenAIKeyHttp', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('getApiKey: HTTP response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('getApiKey: HTTP function failed', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`HTTP function failed with status: ${response.status}, body: ${errorText}`);
    }
    
    console.log('getApiKey: Parsing response JSON');
    const data = await response.json();
    console.log('getApiKey: Response data received, has apiKey:', !!data?.apiKey);
    
    if (data && data.apiKey) {
      console.log('getApiKey: Successfully retrieved API key via HTTP function, length:', data.apiKey.length);
      return data.apiKey;
    } else {
      console.error('getApiKey: No API key in HTTP function response', data);
    }
    
    console.error('getApiKey: All methods failed to retrieve API key');
    throw new Error('API key not available from any source');
  } catch (error) {
    console.error('getApiKey: Final error:', error);
    throw error;
  }
}

// Function to get the API key directly from the rewritten URL
async function getApiKeyFromRewrite() {
  console.log('getApiKeyFromRewrite: Starting to fetch API key from rewrite');
  
  try {
    // Get the current user's ID token
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    
    console.log('getApiKeyFromRewrite: Current user:', user?.uid || 'No user');
    
    if (!user) {
      console.error('getApiKeyFromRewrite: No authenticated user');
      throw new Error('Authentication required');
    }
    
    console.log('getApiKeyFromRewrite: Getting ID token');
    const token = await user.getIdToken();
    console.log('getApiKeyFromRewrite: Got ID token, length:', token.length);
    
    // Make the request with the token
    console.log('getApiKeyFromRewrite: Making request to /api/openai-key');
    const response = await fetch('/api/openai-key', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('getApiKeyFromRewrite: Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('getApiKeyFromRewrite: HTTP error', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    console.log('getApiKeyFromRewrite: Parsing response JSON');
    const data = await response.json();
    console.log('getApiKeyFromRewrite: Response data received, has apiKey:', !!data?.apiKey);
    
    if (data && data.apiKey) {
      console.log('getApiKeyFromRewrite: Successfully retrieved API key, length:', data.apiKey.length);
      return data.apiKey;
    }
    
    console.error('getApiKeyFromRewrite: No API key in response', data);
    throw new Error('API key not available in response');
  } catch (error) {
    console.error('getApiKeyFromRewrite: Error fetching API key:', error);
    throw error;
  }
} 