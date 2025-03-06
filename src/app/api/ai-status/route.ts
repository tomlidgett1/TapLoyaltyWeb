import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if OpenAI API key is set
    const apiKey = process.env.OPENAI_API_KEY;
    
    return NextResponse.json({
      available: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0,
      keyPrefix: apiKey ? apiKey.substring(0, 4) : null
    });
  } catch (error) {
    console.error('Error checking API status:', error);
    return NextResponse.json({ 
      error: 'Failed to check API status'
    }, { status: 500 });
  }
} 