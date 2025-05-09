import { NextRequest, NextResponse } from 'next/server';

// Use environment variables with fallbacks for credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL 
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/gmail/callback` 
  : 'http://localhost:3000/api/auth/gmail/callback';

export async function GET(request: NextRequest) {
  try {
    // Check for environment variables
    const envVars = {
      GOOGLE_CLIENT_ID: !!GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_BASE_URL: !!process.env.NEXT_PUBLIC_BASE_URL,
      REDIRECT_URI: REDIRECT_URI,
    };
    
    // Only reveal a small part of the credentials for security
    let clientIdSnippet = GOOGLE_CLIENT_ID ? 
      `${GOOGLE_CLIENT_ID.substring(0, 5)}...${GOOGLE_CLIENT_ID.substring(GOOGLE_CLIENT_ID.length - 5)}` :
      'not set';
      
    let clientSecretSnippet = GOOGLE_CLIENT_SECRET ? 
      `${GOOGLE_CLIENT_SECRET.substring(0, 3)}...${GOOGLE_CLIENT_SECRET.substring(GOOGLE_CLIENT_SECRET.length - 3)}` :
      'not set';
    
    // Return diagnostic information
    return NextResponse.json({
      status: 'ok',
      message: 'Gmail API configuration test',
      config: {
        ...envVars,
        clientIdSnippet,
        clientSecretSnippet,
        availableEnvVars: Object.keys(process.env).filter(key => 
          key.includes('GOOGLE') || key.includes('GMAIL') || key.includes('BASE_URL')
        ),
      },
    });
  } catch (error) {
    console.error('Error in Gmail API test:', error);
    return NextResponse.json(
      { error: `Test failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 