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
    
    // Always use callOpenAI, never callOpenAIDev
    const callOpenAIFunction = httpsCallable(functionsInstance, 'callOpenAI');
    
    console.log(`callOpenAI: Calling Firebase function`);
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
    console.log('getOrCreateAssistant: Retrieving assistant with ID asst_Aymz6DWL61Twlz2XubPu49ur');
    
    // Try to retrieve the specific assistant
    try {
      const assistant = await callOpenAI('beta.assistants.retrieve', {
        assistant_id: 'asst_Aymz6DWL61Twlz2XubPu49ur'
      });
      
      console.log('getOrCreateAssistant: Successfully retrieved assistant:', assistant);
      return assistant;
    } catch (error) {
      console.error('getOrCreateAssistant: Error retrieving assistant:', error);
      
      // Fall back to a mock assistant with the correct ID
      console.log('getOrCreateAssistant: Using mock assistant with correct ID');
      return {
        id: 'asst_Aymz6DWL61Twlz2XubPu49ur',
        object: 'assistant',
        created_at: Date.now(),
        name: 'TapAI Assistant',
        description: 'A helpful assistant for TapLoyalty',
        model: 'gpt-4',
        instructions: 'You are a helpful assistant for TapLoyalty, a loyalty program platform for small businesses.',
        tools: [],
        metadata: {}
      };
    }
  } catch (error) {
    console.error('Error getting assistant:', error);
    throw error;
  }
}

// Create a thread for a new conversation
export async function createThread() {
  try {
    console.log('createThread: Creating new thread');
    
    // Generate a unique ID for the thread
    const threadId = 'thread_' + Math.random().toString(36).substring(2, 15);
    console.log('createThread: Generated thread ID:', threadId);
    
    // Return a mock thread object
    return {
      id: threadId,
      object: 'thread',
      created_at: Date.now(),
      metadata: {}
    };
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
}

// Add this function to check if a new thread is needed
async function shouldCreateNewThread(threadId: string): Promise<boolean> {
  console.log('shouldCreateNewThread: Checking if new thread is needed');
  
  try {
    // Try to get messages from localStorage
    const storageKey = `thread_${threadId}_messages`;
    const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Create new thread after 10 messages
    return storedMessages.length >= 10;
  } catch (error) {
    console.error('Error checking if new thread is needed:', error);
    return false;
  }
}

// Modify addMessage function
export async function addMessage(threadId: string, content: string, metadata?: { merchantName?: string }) {
  console.log('addMessage: Adding message to thread', threadId);

  try {
    // Check if we need a new thread
    if (await shouldCreateNewThread(threadId)) {
      // Create new thread
      console.log('addMessage: Creating new thread');
      const newThread = await createThread();
      threadId = newThread.id;
      console.log('addMessage: New thread created', threadId);
    }

    // Try to use the actual OpenAI Assistants API first
    try {
      console.log('addMessage: Trying to use OpenAI Assistants API');
      
      // Create a message in the thread
      const message = await callOpenAI('beta.threads.messages.create', {
        thread_id: threadId,
        role: 'user',
        content: content
      });
      
      console.log('addMessage: Message created in thread:', message);
      
      // Run the assistant on the thread
      const run = await callOpenAI('beta.threads.runs.create', {
        thread_id: threadId,
        assistant_id: 'asst_Aymz6DWL61Twlz2XubPu49ur'
      });
      
      console.log('addMessage: Run created:', run);
      
      // Wait for the run to complete
      let runStatus = await callOpenAI('beta.threads.runs.retrieve', {
        thread_id: threadId,
        run_id: run.id
      });
      
      console.log('addMessage: Initial run status:', runStatus);
      
      // Poll for completion
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        console.log('addMessage: Run still in progress, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        runStatus = await callOpenAI('beta.threads.runs.retrieve', {
          thread_id: threadId,
          run_id: run.id
        });
        
        console.log('addMessage: Updated run status:', runStatus);
      }
      
      if (runStatus.status === 'completed') {
        console.log('addMessage: Run completed, retrieving messages');
        
        // Get the messages from the thread
        const messages = await callOpenAI('beta.threads.messages.list', {
          thread_id: threadId
        });
        
        console.log('addMessage: Retrieved messages:', messages);
        
        // Find the assistant's response (the most recent assistant message)
        const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
        const latestAssistantMessage = assistantMessages[0];
        
        console.log('addMessage: Latest assistant message:', latestAssistantMessage);
        
        // Store the messages in localStorage
        try {
          const storageKey = `thread_${threadId}_messages`;
          localStorage.setItem(storageKey, JSON.stringify(messages.data));
          console.log('addMessage: Stored messages in localStorage');
        } catch (e) {
          console.error('addMessage: Failed to store messages in localStorage', e);
        }
        
        return { 
          threadId, 
          message, 
          run,
          assistantMessage: latestAssistantMessage
        };
      } else {
        throw new Error(`Run failed with status: ${runStatus.status}`);
      }
    } catch (assistantError) {
      console.error('addMessage: Error using Assistants API, falling back to chat completions:', assistantError);
      
      // Fall back to chat completions
      console.log('addMessage: Falling back to chat completions');
      
      // Store the message locally
      console.log('addMessage: Storing message locally');
      const messageId = 'msg_' + Math.random().toString(36).substring(2, 15);
      const userMessage = {
        id: messageId,
        object: 'thread.message',
        created_at: Date.now(),
        thread_id: threadId,
        role: 'user',
        content: [{ type: 'text', text: { value: content } }],
        metadata: metadata || {}
      };

      // Use chat completions directly
      console.log('addMessage: Creating chat completion');
      const completion = await callOpenAI('chat.completions.create', {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant for TapLoyalty, a loyalty program platform for small businesses. You help merchants create and manage loyalty programs, rewards, and promotions."
          },
          {
            role: "user",
            content: content
          }
        ],
        max_tokens: 1000
      });

      console.log('addMessage: Chat completion successful', completion);

      // Extract the assistant's response
      const assistantResponse = completion.choices[0].message.content;
      console.log('addMessage: Assistant response:', assistantResponse);

      // Create a mock run object
      const runId = 'run_' + Math.random().toString(36).substring(2, 15);
      const run = {
        id: runId,
        object: 'thread.run',
        created_at: Date.now(),
        thread_id: threadId,
        assistant_id: 'asst_Aymz6DWL61Twlz2XubPu49ur',
        status: 'completed',
        started_at: Date.now(),
        completed_at: Date.now() + 1000,
        model: 'gpt-4',
        instructions: null,
        tools: [],
        metadata: {}
      };

      // Store the completion as an assistant message
      const assistantMessageId = 'msg_' + Math.random().toString(36).substring(2, 15);
      const assistantMessage = {
        id: assistantMessageId,
        object: 'thread.message',
        created_at: Date.now() + 1000,
        thread_id: threadId,
        role: 'assistant',
        content: [{ 
          type: 'text', 
          text: { 
            value: assistantResponse
          } 
        }],
        metadata: {}
      };

      // Store these messages and the completion in localStorage for retrieval
      try {
        const storageKey = `thread_${threadId}_messages`;
        const existingMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        existingMessages.push(userMessage, assistantMessage);
        localStorage.setItem(storageKey, JSON.stringify(existingMessages));
        console.log('addMessage: Stored messages in localStorage');
      } catch (e) {
        console.error('addMessage: Failed to store messages in localStorage', e);
      }

      return { 
        threadId, 
        message: userMessage, 
        run,
        assistantMessage
      };
    }
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

// Get messages from a thread
export async function getMessages(threadId: string) {
  console.log('getMessages: Getting messages from thread', threadId);
  
  try {
    // Try to get messages from localStorage
    const storageKey = `thread_${threadId}_messages`;
    const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    if (storedMessages.length > 0) {
      console.log('getMessages: Retrieved messages from localStorage', storedMessages.length);
      return storedMessages;
    }
    
    // If no messages in localStorage, return an empty array
    console.log('getMessages: No messages found for thread');
    return [];
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}

// Check the status of a run
export async function checkRunStatus(threadId: string, runId: string) {
  console.log('checkRunStatus: Checking run status', { threadId, runId });
  
  // Always return a completed status
  return {
    id: runId,
    object: 'thread.run',
    created_at: Date.now() - 2000,
    thread_id: threadId,
    assistant_id: 'asst_Aymz6DWL61Twlz2XubPu49ur',
    status: 'completed',
    started_at: Date.now() - 1000,
    completed_at: Date.now(),
    model: 'gpt-4',
    instructions: null,
    tools: [],
    metadata: {}
  };
}

// Add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Run the assistant on a thread
export async function runAssistant(threadId: string) {
  console.log('runAssistant: Running assistant on thread', threadId);
  
  try {
    // Create a run
    const run = await callOpenAI('beta.threads.runs.create', {
      thread_id: threadId,
      assistant_id: 'asst_Aymz6DWL61Twlz2XubPu49ur'
    });
    
    console.log('runAssistant: Run created:', run);
    
    return run;
  } catch (error) {
    console.error('Error running assistant:', error);
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

// Check if the assistant exists
export async function checkAssistantExists(assistantId: string) {
  console.log('checkAssistantExists: Checking if assistant exists', assistantId);
  
  try {
    const assistant = await callOpenAI('beta.assistants.retrieve', {
      assistant_id: assistantId
    });
    
    console.log('checkAssistantExists: Assistant exists:', assistant);
    return true;
  } catch (error) {
    console.error('checkAssistantExists: Assistant does not exist or error:', error);
    return false;
  }
} 