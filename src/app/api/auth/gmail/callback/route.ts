import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

// Google OAuth configuration
// Hardcode the redirect URI to ensure it exactly matches what's configured in Google Cloud Console
const REDIRECT_URI = "https://app.taployalty.com.au/api/auth/gmail/callback";

// Use environment variables with fallbacks for credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;

// Explicitly use the Node.js runtime so we have full API support (Buffer, etc.)
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // If the caller wants raw debug output instead of redirects, they can pass
  // ?debug=1 on the callback URL and we will return JSON diagnostics instead
  const url = new URL(request.url);
  const debugMode = url.searchParams.get('debug') === '1' ||
                    url.searchParams.get('debug') === 'true';
  
  console.log('Gmail OAuth callback received');
  console.log('Request URL:', request.url);
  
  try {
    // Get the authorization code and state from query params
    const { searchParams } = url;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // This contains the merchantId
    const error = searchParams.get('error');
    
    console.log('OAuth callback params - code exists:', !!code, ', state exists:', !!state);
    
    // Handle OAuth errors
    if (error) {
      console.error('OAuth error from Google:', error);
      if (debugMode) {
        return NextResponse.json({
          error: error,
          details: 'Auth denied or other OAuth error',
          request_url: request.url,
          searchParams: Object.fromEntries(searchParams.entries())
        }, { status: 400 });
      }
      return NextResponse.redirect('/store/emails?error=auth_denied&details=' + encodeURIComponent(error));
    }
    
    if (!code || !state) {
      console.error('Missing code or state in callback');
      if (debugMode) {
        return NextResponse.json({
          error: 'missing_params',
          details: 'Missing code or state parameter',
          request_url: request.url,
          searchParams: Object.fromEntries(searchParams.entries())
        }, { status: 400 });
      }
      return NextResponse.redirect('/store/emails?error=missing_params');
    }
    
    // Get client credentials from environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google API credentials');
      if (debugMode) {
        return NextResponse.json({
          error: 'config_error',
          details: 'Google client credentials not configured',
          client_id_exists: !!GOOGLE_CLIENT_ID,
          client_secret_exists: !!GOOGLE_CLIENT_SECRET
        }, { status: 500 });
      }
      return NextResponse.redirect('/store/emails?error=config_error');
    }
    
    console.log('Exchanging authorization code for tokens...');
    
    // Check if the merchant exists before proceeding
    const merchantId = state;
    const merchantDoc = doc(db, 'merchants', merchantId);
    const merchantSnapshot = await getDoc(merchantDoc);
    
    if (!merchantSnapshot.exists()) {
      console.error('Merchant not found:', merchantId);
      if (debugMode) {
        return NextResponse.json({
          error: 'merchant_not_found',
          details: 'The provided merchant ID does not exist',
          merchantId
        }, { status: 404 });
      }
      return NextResponse.redirect('/store/emails?error=merchant_not_found');
    }
    
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      let errorDetails;
      try {
        const errorData = await tokenResponse.json();
        console.error('Token exchange error:', errorData);
        errorDetails = encodeURIComponent(JSON.stringify(errorData));
        
        if (debugMode) {
          return NextResponse.json({
            error: 'token_error',
            details: 'Failed to exchange code for tokens',
            status: tokenResponse.status,
            responseData: errorData
          }, { status: 500 });
        }
      } catch (e) {
        const errorText = await tokenResponse.text();
        console.error('Token exchange error (text):', errorText);
        errorDetails = encodeURIComponent(errorText);
        
        if (debugMode) {
          return NextResponse.json({
            error: 'token_error',
            details: 'Failed to exchange code for tokens',
            status: tokenResponse.status,
            responseText: errorText
          }, { status: 500 });
        }
      }
      return NextResponse.redirect(`/store/emails?error=token_error&details=${errorDetails}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');
    console.log('Token data keys:', Object.keys(tokenData));
    
    const { access_token, refresh_token, expires_in, id_token } = tokenData;
    
    if (!access_token) {
      console.error('Missing access_token in response:', Object.keys(tokenData));
      if (debugMode) {
        return NextResponse.json({
          error: 'invalid_tokens',
          details: 'No access token in response',
          tokenData: {
            keys: Object.keys(tokenData),
            has_access_token: !!access_token,
            has_refresh_token: !!refresh_token,
            has_id_token: !!id_token
          }
        }, { status: 500 });
      }
      return NextResponse.redirect('/store/emails?error=invalid_tokens');
    }
    
    // Try to extract email from ID token if present
    let emailAddress = null;
    if (id_token) {
      try {
        console.log('ID token present, attempting to decode...');
        // Split the JWT and decode the payload (middle part)
        const parts = id_token.split('.');
        if (parts.length === 3) {
          // Decode the base64url encoded payload.  `atob` is not available in
          // the Node.js runtime that powers Next.js API routes, so we fall
          // back to Buffer when `atob` is undefined.
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padding = '='.repeat((4 - base64.length % 4) % 4);
          const paddedBase64 = base64 + padding;

          try {
            const jsonStr = typeof atob === 'function'
              ? atob(paddedBase64)
              : Buffer.from(paddedBase64, 'base64').toString('utf8');

            const payload = JSON.parse(jsonStr);
            console.log('ID token payload:', JSON.stringify(payload));

            if (payload.email) {
              emailAddress = payload.email;
              console.log('Email address extracted from ID token:', emailAddress);
            }
          } catch (decodeError) {
            console.error('Error decoding ID token payload:', decodeError);
          }
        }
      } catch (idTokenError) {
        console.error('Error decoding ID token:', idTokenError);
      }
    }
    
    // If we couldn't get email from ID token, try the API methods
    if (!emailAddress) {
      // Fetch user's email address
      console.log('Fetching user email address...');
      try {
        // Use the OpenID Connect UserInfo endpoint
        const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        });
        
        console.log('OpenID Connect UserInfo response status:', userInfoResponse.status);
        
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          console.log('OpenID Connect UserInfo response:', JSON.stringify(userInfo));
          emailAddress = userInfo.email;
          console.log('User email address fetched from OpenID Connect:', emailAddress);
          
          if (!emailAddress) {
            console.warn('Email address is empty in the OpenID Connect UserInfo response:', JSON.stringify(userInfo));
            
            // 1️⃣ Gmail users.getProfile fallback
            console.log('Trying Gmail API users.getProfile as fallback...');
            const gmailProfileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
              headers: {
                'Authorization': `Bearer ${access_token}`
              }
            });
            
            if (gmailProfileResponse.ok) {
              const profileData = await gmailProfileResponse.json();
              console.log('Gmail profile response:', JSON.stringify(profileData));
              emailAddress = profileData.emailAddress;
              console.log('User email address fetched from Gmail API:', emailAddress);
            } else {
              const profileErrorText = await gmailProfileResponse.text();
              console.warn('Failed to fetch Gmail profile. Status:', gmailProfileResponse.status, 'Response:', profileErrorText);
            }

            // 2️⃣ People API ultimate fallback – covers rare edge-cases where the
            // Gmail profile endpoint is disabled for the account (e.g.
            // delegated inboxes).
            if (!emailAddress) {
              try {
                console.log('Trying Google People API as final fallback…');
                const peopleRes = await fetch('https://people.googleapis.com/v1/people/me?personFields=emailAddresses', {
                  headers: {
                    'Authorization': `Bearer ${access_token}`
                  }
                });

                if (peopleRes.ok) {
                  const peopleData = await peopleRes.json();
                  console.log('People API response:', JSON.stringify(peopleData));

                  const primaryEmailObj = peopleData.emailAddresses?.find((e: any) => e.metadata?.primary) || peopleData.emailAddresses?.[0];
                  if (primaryEmailObj?.value) {
                    emailAddress = primaryEmailObj.value;
                    console.log('User email address fetched from People API:', emailAddress);
                  }
                } else {
                  const peopleErrTxt = await peopleRes.text();
                  console.warn('People API call failed. Status:', peopleRes.status, 'Response:', peopleErrTxt);
                }
              } catch (peopleErr) {
                console.error('Error calling People API:', peopleErr);
              }
            }
          }
        } else {
          const errorText = await userInfoResponse.text();
          console.warn('Failed to fetch user email address from OpenID Connect. Status:', userInfoResponse.status, 'Response:', errorText);
          
          // 1️⃣ Gmail users.getProfile fallback
          console.log('Trying Gmail API users.getProfile as fallback...');
          const gmailProfileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
            headers: {
              'Authorization': `Bearer ${access_token}`
            }
          });
          
          if (gmailProfileResponse.ok) {
            const profileData = await gmailProfileResponse.json();
            console.log('Gmail profile response:', JSON.stringify(profileData));
            emailAddress = profileData.emailAddress;
            console.log('User email address fetched from Gmail API:', emailAddress);
          } else {
            const profileErrorText = await gmailProfileResponse.text();
            console.warn('Failed to fetch Gmail profile. Status:', gmailProfileResponse.status, 'Response:', profileErrorText);
          }

          // 2️⃣ People API ultimate fallback – covers rare edge-cases where the
          // Gmail profile endpoint is disabled for the account (e.g.
          // delegated inboxes).
          if (!emailAddress) {
            try {
              console.log('Trying Google People API as final fallback…');
              const peopleRes = await fetch('https://people.googleapis.com/v1/people/me?personFields=emailAddresses', {
                headers: {
                  'Authorization': `Bearer ${access_token}`
                }
              });

              if (peopleRes.ok) {
                const peopleData = await peopleRes.json();
                console.log('People API response:', JSON.stringify(peopleData));

                const primaryEmailObj = peopleData.emailAddresses?.find((e: any) => e.metadata?.primary) || peopleData.emailAddresses?.[0];
                if (primaryEmailObj?.value) {
                  emailAddress = primaryEmailObj.value;
                  console.log('User email address fetched from People API:', emailAddress);
                }
              } else {
                const peopleErrTxt = await peopleRes.text();
                console.warn('People API call failed. Status:', peopleRes.status, 'Response:', peopleErrTxt);
              }
            } catch (peopleErr) {
              console.error('Error calling People API:', peopleErr);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user email address:', error);
      }
    }
    
    // Calculate expiration time
    const expires_at = Math.floor(Date.now() / 1000) + expires_in;
    
    // Check for existing refresh token if we didn't get a new one
    let existingRefreshToken = null;
    if (!refresh_token) {
      try {
        const existingIntegrationRef = doc(db, 'merchants', merchantId, 'integrations', 'gmail');
        const existingIntegration = await getDoc(existingIntegrationRef);
        
        if (existingIntegration.exists() && existingIntegration.data().refresh_token) {
          console.log('Found existing refresh token to preserve');
          existingRefreshToken = existingIntegration.data().refresh_token;
        }
      } catch (refreshTokenError) {
        console.error('Error checking for existing refresh token:', refreshTokenError);
      }
    }
    
    // Prepare data to store – only include refresh_token if we actually received one.
    console.log('Storing tokens in Firestore for merchant:', merchantId);
    
    const dataToStore: Record<string, any> = {
      connected: true,
      access_token,
      expires_at,
      lastUpdated: serverTimestamp(),
    };
    
    // Always store the ID token if we have it
    if (id_token) {
      dataToStore.id_token = id_token;
    }
    
    // Add email address if we were able to fetch it
    if (emailAddress) {
      dataToStore.emailAddress = emailAddress;
      console.log('Saving email address to Firestore:', emailAddress);
    } else {
      console.warn('Could not retrieve email address from any source');
      
      // Try one more time with a direct request to the Gmail API
      try {
        console.log('Making one final attempt to get email from Gmail API...');
        const finalAttemptResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        });
        
        if (finalAttemptResponse.ok) {
          const profileData = await finalAttemptResponse.json();
          if (profileData.emailAddress) {
            dataToStore.emailAddress = profileData.emailAddress;
            console.log('Final attempt successful, saving email:', profileData.emailAddress);
          }
        }
      } catch (finalError) {
        console.error('Final email retrieval attempt failed:', finalError);
      }
    }
    
    // Use refresh token from the response or the existing one if available
    if (refresh_token) {
      dataToStore.refresh_token = refresh_token;
      dataToStore.connectedAt = serverTimestamp();
    } else if (existingRefreshToken) {
      console.log('Using existing refresh token');
      dataToStore.refresh_token = existingRefreshToken;
    } else {
      console.warn('No refresh_token available - this will require reauthorization sooner');
    }
    
    try {
      // No need to check for existing refresh token here anymore
      
      await setDoc(
        doc(db, 'merchants', merchantId, 'integrations', 'gmail'),
        dataToStore,
        { merge: true }
      );
      console.log('Gmail integration saved/updated successfully with data:', JSON.stringify({
        ...dataToStore,
        access_token: dataToStore.access_token ? `${dataToStore.access_token.substring(0, 10)}...` : null,
        refresh_token: dataToStore.refresh_token ? 'present' : 'missing',
        emailAddress: dataToStore.emailAddress || 'missing'
      }));
      
      // If in debug mode, return JSON response instead of redirecting
      if (debugMode) {
        return NextResponse.json({
          success: true,
          message: 'Gmail integration setup successful',
          redirectTo: '/store/emails?success=true',
          integrationData: {
            connected: dataToStore.connected,
            hasAccessToken: !!dataToStore.access_token,
            hasRefreshToken: !!dataToStore.refresh_token,
            hasEmailAddress: !!dataToStore.emailAddress,
            emailAddress: dataToStore.emailAddress || null,
            expiresIn: expires_in
          }
        });
      }
      
    } catch (dbError) {
      console.error('Error saving to Firestore:', dbError);
      if (debugMode) {
        return NextResponse.json({
          error: 'database_error',
          details: `Failed to save to Firestore: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
        }, { status: 500 });
      }
      return NextResponse.redirect('/store/emails?error=database_error');
    }
    
    // Redirect back to the emails page with success message
    const redirectUrl = '/store/emails?success=true';
    console.log(`Redirecting to: ${redirectUrl}`);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error handling Gmail OAuth callback:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (debugMode) {
      return NextResponse.json({
        error: 'server_error',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 });
    }
    
    const errorRedirectUrl = `/store/emails?error=server_error&details=${encodeURIComponent(errorMessage)}`;
    console.log(`Error occurred. Redirecting to: ${errorRedirectUrl}`);
    return NextResponse.redirect(errorRedirectUrl);
  }
} 