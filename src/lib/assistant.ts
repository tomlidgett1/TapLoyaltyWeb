import OpenAI from 'openai'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getApp } from 'firebase/app'

let openaiClient: OpenAI | null = null;

// Function to get the OpenAI API key and initialize the client
async function getOpenAIClient() {
  if (openaiClient) return openaiClient;
  
  try {
    // Get the Firebase Functions instance
    const functionsInstance = getFunctions(getApp());
    
    // Call the getOpenAIKey function to get the API key
    const getOpenAIKey = httpsCallable(functionsInstance, 'getOpenAIKey');
    
    console.log('getOpenAIClient: Calling getOpenAIKey function');
    const result = await getOpenAIKey();
    console.log('getOpenAIClient: Got result from getOpenAIKey');
    
    // Extract the API key from the result
    const data = result.data as { apiKey: string };
    
    if (!data || !data.apiKey) {
      console.error('getOpenAIClient: No API key in response', data);
      throw new Error('Failed to retrieve API key');
    }
    
    console.log('getOpenAIClient: Successfully retrieved API key');
    
    // Initialize the OpenAI client with the API key
    openaiClient = new OpenAI({ 
      apiKey: data.apiKey,
      dangerouslyAllowBrowser: true // Add this to allow direct API calls from the browser
    });
    
    return openaiClient;
  } catch (error) {
    console.error('Error initializing OpenAI client:', error);
    throw error;
  }
}

// Get the existing assistant
export async function getOrCreateAssistant() {
  try {
    console.log('getOrCreateAssistant: Retrieving assistant with ID asst_Aymz6DWL61Twlz2XubPu49ur');
    
    const openai = await getOpenAIClient();
    
    // Try to retrieve the specific assistant
    try {
      const assistant = await openai.beta.assistants.retrieve('asst_Aymz6DWL61Twlz2XubPu49ur');
      
      console.log('getOrCreateAssistant: Successfully retrieved assistant:', assistant);
      return assistant;
    } catch (error) {
      console.error('getOrCreateAssistant: Error retrieving assistant:', error);
      throw error;
    }
  } catch (error) {
    console.error('getOrCreateAssistant: Final error:', error);
    throw error;
  }
}

// Create a new thread
export async function createThread() {
  console.log('createThread: Creating new thread');
  
  try {
    const openai = await getOpenAIClient();
    const thread = await openai.beta.threads.create();
    console.log('createThread: Thread created:', thread);
    return thread;
  } catch (error) {
    console.error('Error creating thread:', error);
    throw error;
  }
}

// Add a message to a thread
export async function addMessage(threadId: string, content: string) {
  console.log('addMessage: Adding message to thread', threadId);

  try {
    const openai = await getOpenAIClient();
    
    // Create a message in the thread
    const message = await openai.beta.threads.messages.create(
      threadId,
      {
        role: 'user',
        content: content
      }
    );
    
    console.log('addMessage: Message created in thread:', message);
    
    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(
      threadId,
      {
        assistant_id: 'asst_Aymz6DWL61Twlz2XubPu49ur'
      }
    );
    
    console.log('addMessage: Run created:', run);
    
    // Store the messages in localStorage
    try {
      const storageKey = `thread_${threadId}_messages`;
      const existingMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localStorage.setItem(storageKey, JSON.stringify([
        ...existingMessages, 
        {
          id: message.id,
          object: 'thread.message',
          created_at: Date.now(),
          thread_id: threadId,
          role: 'user',
          content: [{ type: 'text', text: { value: content } }]
        }
      ]));
    } catch (e) {
      console.error('addMessage: Failed to store messages in localStorage', e);
    }
    
    return { message, run };
  } catch (error) {
    console.error('Error adding message to thread:', error);
    throw error;
  }
}

// Check the status of a run
export async function checkRunStatus(threadId: string, runId: string) {
  console.log('checkRunStatus: Checking run status', { threadId, runId });
  
  try {
    const openai = await getOpenAIClient();
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    
    console.log('checkRunStatus: Run status:', run.status);
    return run;
  } catch (error) {
    console.error('Error checking run status:', error);
    throw error;
  }
}

// Get messages from a thread
export async function getMessages(threadId: string) {
  console.log('getMessages: Getting messages from thread', threadId);
  
  try {
    const openai = await getOpenAIClient();
    const messages = await openai.beta.threads.messages.list(threadId);
    
    console.log('getMessages: Retrieved messages:', messages.data.length);
    
    // Store the messages in localStorage
    try {
      const storageKey = `thread_${threadId}_messages`;
      localStorage.setItem(storageKey, JSON.stringify(messages.data));
    } catch (e) {
      console.error('getMessages: Failed to store messages in localStorage', e);
    }
    
    return messages.data;
  } catch (error) {
    console.error('Error getting messages from thread:', error);
    
    // Try to get messages from localStorage as a fallback
    try {
      const storageKey = `thread_${threadId}_messages`;
      const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      if (storedMessages.length > 0) {
        console.log('getMessages: Retrieved messages from localStorage:', storedMessages.length);
        return storedMessages;
      }
    } catch (e) {
      console.error('getMessages: Failed to retrieve messages from localStorage', e);
    }
    
    throw error;
  }
}

// Run the assistant on a thread
export async function runAssistant(threadId: string) {
  console.log('runAssistant: Running assistant on thread', threadId);
  
  try {
    const openai = await getOpenAIClient();
    const run = await openai.beta.threads.runs.create(
      threadId,
      {
        assistant_id: 'asst_Aymz6DWL61Twlz2XubPu49ur'
      }
    );
    
    console.log('runAssistant: Run created:', run);
    return run;
  } catch (error) {
    console.error('Error running assistant on thread:', error);
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

// Check if the assistant exists
export async function checkAssistantExists(assistantId: string) {
  console.log('checkAssistantExists: Checking if assistant exists', assistantId);
  
  try {
    const openai = await getOpenAIClient();
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    
    console.log('checkAssistantExists: Assistant exists:', assistant);
    return true;
  } catch (error) {
    console.error('checkAssistantExists: Assistant does not exist or error:', error);
    return false;
  }
} 