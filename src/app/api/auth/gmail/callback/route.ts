import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Google OAuth client credentials from environment variables with fallbacks
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || "1035054543006-dq2fier1a540dbbfieevph8m6gu74j15.apps.googleusercontent.com";
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "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";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/gmail/callback`;

export async function GET(request: NextRequest) {
  // Check if required environment variables are set
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
    console.error("Missing required environment variables for Gmail OAuth");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/integrations?error=server_configuration`
    );
  }

  // Get code and state from the query params
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  // Get the stored state from localStorage (this will be done client-side via a script)
  // For security, we would compare this with the state from the query params
  
  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/integrations?error=missing_code`
    );
  }
  
  try {
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
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/integrations?error=token_exchange_failed`
      );
    }
    
    const { access_token, refresh_token, expires_in } = await tokenResponse.json();
    
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
              
              if (!merchantId) {
                window.location.href = '/integrations?error=missing_merchant_id';
                return;
              }
              
              // Get URL params from the current URL
              const urlParams = new URLSearchParams(window.location.search);
              const stateParam = urlParams.get('state');
              
              // Verify state parameter for security
              if (state !== stateParam) {
                window.location.href = '/integrations?error=state_mismatch';
                return;
              }
              
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
                if (!response.ok) {
                  throw new Error('Failed to store integration data');
                }
                return response.json();
              })
              .then(data => {
                // Redirect back to the integrations page
                window.location.href = '/integrations?success=gmail_connected';
              })
              .catch(error => {
                console.error('Error storing integration data:', error);
                window.location.href = '/integrations?error=store_failed';
              });
            };
          </script>
        </head>
        <body>
          <h1>Connecting your Gmail account...</h1>
          <p>Please wait while we complete the connection process.</p>
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
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/integrations?error=server_error`
    );
  }
} 