import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Enhanced debugging
const DEBUG = true;

// Google OAuth client credentials from environment variables with fallbacks
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || "1035054543006-dq2fier1a540dbbfieevph8m6gu74j15.apps.googleusercontent.com";
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "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";
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || "https://app.taployalty.com.au/api/auth/gmail/callback";

export async function GET(request: NextRequest) {
  // Enhanced debugging for environment variables
  if (DEBUG) {
    console.log('Gmail Integration Environment Variables Debug:');
    console.log('- GMAIL_CLIENT_ID exists:', !!process.env.GMAIL_CLIENT_ID);
    console.log('- GMAIL_CLIENT_SECRET exists:', !!process.env.GMAIL_CLIENT_SECRET);
    console.log('- GMAIL_REDIRECT_URI exists:', !!process.env.GMAIL_REDIRECT_URI);
    console.log('- NEXT_PUBLIC_APP_URL exists:', !!process.env.NEXT_PUBLIC_APP_URL);
    console.log('- Fallback CLIENT_ID used:', !process.env.GMAIL_CLIENT_ID);
    console.log('- Fallback CLIENT_SECRET used:', !process.env.GMAIL_CLIENT_SECRET);
    console.log('- REDIRECT_URI value:', REDIRECT_URI);
  }

  // Check if required environment variables (or their fallbacks) are set
  // We rely on the resolved constants here so that a hard-coded fallback counts as "present".
  const missingVars: string[] = [];
  if (!CLIENT_ID) missingVars.push('GMAIL_CLIENT_ID');
  if (!CLIENT_SECRET) missingVars.push('GMAIL_CLIENT_SECRET');
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables for Gmail OAuth: ${missingVars.join(', ')}`;
    console.error(errorMessage);
    
    // Add detailed error information to the redirect URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.taployalty.com.au";
    const encodedError = encodeURIComponent(errorMessage);
    return NextResponse.redirect(
      `${baseUrl}/integrations?error=server_configuration&details=${encodedError}`
    );
  }

  // Get code and state from the query params
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (DEBUG) {
    console.log('OAuth callback parameters:');
    console.log('- code exists:', !!code);
    console.log('- state exists:', !!state);
    console.log('- Request URL:', request.url);
  }
  
  // Get the stored state from localStorage (this will be done client-side via a script)
  // For security, we would compare this with the state from the query params
  
  if (!code) {
    console.error('Missing authorization code in callback');
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://app.taployalty.com.au"}/integrations?error=missing_code`
    );
  }
  
  try {
    if (DEBUG) console.log('Attempting to exchange code for tokens...');
    
    // Exchange the authorization code for access and refresh tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      
      if (DEBUG) {
        console.log('Token exchange request details:');
        console.log('- client_id:', CLIENT_ID);
        console.log('- redirect_uri:', REDIRECT_URI);
        console.log('- Error status:', tokenResponse.status);
        console.log('- Error data:', errorData);
      }
      
      // Include error details in the redirect
      const errorDetails = encodeURIComponent(JSON.stringify(errorData));
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "https://app.taployalty.com.au"}/integrations?error=token_exchange_failed&details=${errorDetails}`
      );
    }
    
    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;
    
    if (DEBUG) {
      console.log('Token exchange successful:');
      console.log('- access_token exists:', !!access_token);
      console.log('- refresh_token exists:', !!refresh_token);
      console.log('- expires_in:', expires_in);
    }
    
    // Include a script to retrieve the merchant ID from localStorage
    // and store the integration data in Firestore
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gmail Integration Callback</title>
          <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
          <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js"></script>
          <script>
            // Enable debug mode for client-side
            const DEBUG = ${DEBUG};
            if (DEBUG) console.log('Gmail Integration callback page loaded');
            
            // Initialize Firebase
            // This would be replaced with your actual Firebase config
            const firebaseConfig = {
              // Your Firebase configuration goes here
              // This should be populated from environment variables in a real app
            };
            
            // Function to run when the page loads
            window.onload = function() {
              // Get merchant ID from localStorage
              const merchantId = localStorage.getItem('gmail_merchant_id');
              const state = localStorage.getItem('gmail_state');
              
              if (DEBUG) {
                console.log('Client-side callback data:');
                console.log('- merchantId from localStorage:', merchantId);
                console.log('- state from localStorage:', state);
              }
              
              if (!merchantId) {
                console.error('Missing merchant ID in localStorage');
                window.location.href = '/integrations?error=missing_merchant_id';
                return;
              }
              
              // Get URL params from the current URL
              const urlParams = new URLSearchParams(window.location.search);
              const stateParam = urlParams.get('state');
              
              if (DEBUG) {
                console.log('- state parameter from URL:', stateParam);
                console.log('- states match:', state === stateParam);
              }
              
              // Verify state parameter for security
              if (state !== stateParam) {
                console.error('State parameter mismatch - potential CSRF attack');
                window.location.href = '/integrations?error=state_mismatch';
                return;
              }
              
              if (DEBUG) console.log('Calling API to store integration data...');
              
              // Create a fetch request to store the integration data
              fetch('/api/auth/gmail/store', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  merchantId,
                  access_token: "${access_token}",
                  refresh_token: "${refresh_token}",
                  expires_at: Date.now() + ${expires_in} * 1000,
                }),
              })
              .then(response => {
                if (DEBUG) console.log('Store API response status:', response.status);
                if (!response.ok) {
                  throw new Error('Failed to store integration data, status: ' + response.status);
                }
                return response.json();
              })
              .then(data => {
                if (DEBUG) console.log('Store operation successful, redirecting to success page');
                // Redirect back to the integrations page
                window.location.href = '/integrations?success=gmail_connected';
              })
              .catch(error => {
                console.error('Error storing integration data:', error);
                window.location.href = '/integrations?error=store_failed&message=' + encodeURIComponent(error.message);
              });
            };
          </script>
        </head>
        <body>
          <h1>Connecting your Gmail account...</h1>
          <p>Please wait while we complete the connection process.</p>
          <div id="debug-info" style="margin-top: 20px; font-family: monospace; font-size: 12px;"></div>
          
          <script>
            // Add visual debug info to the page
            if (${DEBUG}) {
              const debugDiv = document.getElementById('debug-info');
              debugDiv.innerHTML = '<strong>Debug Information:</strong><br>' +
                'Browser: ' + navigator.userAgent + '<br>' +
                'Time: ' + new Date().toISOString() + '<br>' +
                'URL: ' + window.location.href + '<br>' +
                'LocalStorage Available: ' + (typeof localStorage !== 'undefined') + '<br>';
            }
          </script>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Error in Gmail callback handler:', error);
    
    // Include error details in the redirect
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = encodeURIComponent(errorMessage);
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://app.taployalty.com.au"}/integrations?error=server_error&details=${errorDetails}`
    );
  }
} 