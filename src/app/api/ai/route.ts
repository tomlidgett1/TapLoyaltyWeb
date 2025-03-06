import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI only if API key is available
let openai: OpenAI | null = null;

try {
  console.log('Initializing OpenAI client, API key exists:', !!process.env.OPENAI_API_KEY);
  console.log('API key length:', process.env.OPENAI_API_KEY?.length || 0);
  
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    console.log('OpenAI client initialized successfully');
  } else {
    console.error('OpenAI API key not found in environment variables');
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

export async function POST(request: NextRequest) {
  console.log('API route: POST /api/ai called');
  
  try {
    // Check if OpenAI is initialized
    if (!openai) {
      console.error('API route: OpenAI client not initialized');
      return NextResponse.json({ 
        content: "AI services are currently unavailable. Please try again later or contact support." 
      }, { status: 503 });
    }
    
    console.log('API route: Parsing request body');
    const body = await request.json();
    console.log('API route: Request body:', body);
    
    const { message } = body;
    
    if (!message) {
      console.error('API route: No message provided in request');
      return NextResponse.json({ 
        content: "No message provided" 
      }, { status: 400 });
    }
    
    console.log('API route: Calling OpenAI API');
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are TapAI, a helpful assistant for a loyalty program platform called Tap Loyalty. 
          You help merchants:
          1. Create and optimize loyalty programs
          2. Design engaging rewards
          3. Set up points rules
          4. Create marketing campaigns
          5. Engage customers effectively

          When suggesting rewards, ALWAYS format them as a JSON array like this:
          \`\`\`json
          [
            {
              "name": "Reward Name",
              "description": "Reward description",
              "points_required": 100,
              "expiry_days": 30,
              "terms": ["Term 1", "Term 2"]
            }
          ]
          \`\`\`

          Keep responses concise and practical. Always include the JSON data when suggesting rewards.`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: false
    });

    console.log('API route: OpenAI API response received');
    
    return NextResponse.json({ 
      content: completion.choices[0].message.content 
    });
  } catch (error) {
    console.error('API route: OpenAI API error:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('API route: Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return NextResponse.json({ 
      content: "Sorry, I encountered an error processing your request. Please try again." 
    }, { status: 500 });
  }
} 