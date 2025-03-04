// This file now only contains the client-side function to call the API

export async function getAIResponse(message: string) {
  try {
    // Check if OpenAI is available before making the request
    if (typeof window !== 'undefined' && 
        (!process.env.NEXT_PUBLIC_OPENAI_AVAILABLE || 
         process.env.NEXT_PUBLIC_OPENAI_AVAILABLE !== 'true' ||
         !process.env.NEXT_PUBLIC_OPENAI_API_KEY)) {
      return "AI features are currently unavailable.";
    }
    
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get AI response');
    }

    const data = await response.json();
    return data.content;
  } catch (error: any) {
    console.error('AI request error:', error.message);
    throw new Error(error.message || 'Failed to get AI response. Please try again.');
  }
} 