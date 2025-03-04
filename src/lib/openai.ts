// This file now only contains the client-side function to call the API

export async function getAIResponse(message: string) {
  try {
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