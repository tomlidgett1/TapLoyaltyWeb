import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    envVars: {
      OPENAI_API_KEY_EXISTS: !!process.env.OPENAI_API_KEY,
      OPENAI_API_KEY_LENGTH: process.env.OPENAI_API_KEY?.length || 0,
      NODE_ENV: process.env.NODE_ENV
    }
  });
} 