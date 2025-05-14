import { NextRequest, NextResponse } from 'next/server';

// Use environment variables with fallbacks for credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = "https://app.taployalty.com.au/api/auth/gmail/callback";

export async function GET(request: NextRequest) {
  try {
    // Check for access token in query params
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token');
    
    if (accessToken) {
      console.log('Testing userinfo endpoint with provided access token');
      
      // Try both userinfo endpoints
      const endpoints = [
        'https://www.googleapis.com/userinfo/v2/me',
        'https://www.googleapis.com/oauth2/v2/userinfo'
      ];
      
      const results: Record<string, any> = {};
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Fetching from ${endpoint}`);
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            results[endpoint] = {
              status: response.status,
              data
            };
          } else {
            results[endpoint] = {
              status: response.status,
              error: await response.text()
            };
          }
        } catch (error: unknown) {
          results[endpoint] = {
            error: `Error fetching: ${error instanceof Error ? error.message : String(error)}`
          };
        }
      }
      
      return NextResponse.json({
        status: 'ok',
        message: 'Google API userinfo test',
        results
      });
    }
    
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