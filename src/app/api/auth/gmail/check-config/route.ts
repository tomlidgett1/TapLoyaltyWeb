import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const envVars = {
    // Check all relevant Gmail environment variables
    GMAIL_CLIENT_ID: !!process.env.GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET: !!process.env.GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI: !!process.env.GMAIL_REDIRECT_URI,
    NEXT_PUBLIC_GMAIL_CLIENT_ID: !!process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID,
    NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    
    // Include the values used (redacted for security)
    REDIRECT_URI_VALUE: process.env.GMAIL_REDIRECT_URI || 'fallback used',
    CLIENT_ID_PREFIX: process.env.GMAIL_CLIENT_ID ? process.env.GMAIL_CLIENT_ID.substring(0, 8) + '...' : 'not set',
    DEPLOY_ENV: process.env.NODE_ENV || 'unknown',
  };

  // Include which ones are missing
  const missingVars = Object.entries(envVars)
    .filter(([key, value]) => key.startsWith('GMAIL_') || key.startsWith('NEXT_PUBLIC_GMAIL_'))
    .filter(([key, value]) => value === false)
    .map(([key]) => key);
  
  // Don't expose this in production to prevent information leakage
  if (process.env.NODE_ENV === 'production') {
    const isAdmin = false; // In a real app, you'd check if the requester is an admin
    
    if (!isAdmin) {
      return NextResponse.json({
        status: 'error',
        message: 'Configuration check is not available in production for security reasons'
      }, { status: 403 });
    }
  }
  
  return NextResponse.json({
    status: 'success',
    environment: process.env.NODE_ENV,
    configCheck: {
      allConfigured: missingVars.length === 0,
      missingVariables: missingVars,
      variables: envVars
    },
    timestamp: new Date().toISOString()
  });
} 