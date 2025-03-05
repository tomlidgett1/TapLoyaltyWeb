// This is a mock implementation to simulate the Firebase function
export async function mockCallOpenAI(data: any) {
  const { action, payload } = data;
  
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (action === 'createThread') {
    return {
      data: {
        threadId: `thread_${Date.now()}`
      }
    };
  }
  
  if (action === 'sendMessage') {
    const { message } = payload;
    
    // Simple response logic
    let response = "I'm your Magic Assistant! How can I help you today?";
    
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      response = "Hello! Nice to meet you. How can I assist you today?";
    } else if (message.toLowerCase().includes('help')) {
      response = "I'm here to help! What do you need assistance with?";
    } else if (message.toLowerCase().includes('thank')) {
      response = "You're welcome! Is there anything else I can help with?";
    } else if (message.includes('?')) {
      response = "That's a great question. Let me think about that...";
    }
    
    return {
      data: {
        assistantResponse: response
      }
    };
  }
  
  throw new Error(`Unknown action: ${action}`);
} 