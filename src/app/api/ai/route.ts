import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI only if API key is available
let openai: OpenAI | null = null;

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is initialized
    if (!openai) {
      return NextResponse.json({ 
        content: "AI services are currently unavailable. Please try again later or contact support." 
      });
    }
    
    const { message } = await request.json();
    
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

    return NextResponse.json({ 
      content: completion.choices[0].message.content 
    });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
    if (error.code === 'insufficient_quota') {
      return NextResponse.json(
        { error: 'API quota exceeded. Please try again later.' }, 
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get AI response. Please try again.' }, 
      { status: 500 }
    );
  }
} 