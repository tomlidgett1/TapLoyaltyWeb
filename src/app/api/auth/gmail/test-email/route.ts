import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get the merchant ID from query params
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    
    if (!merchantId) {
      return NextResponse.json(
        { error: 'Missing merchantId parameter' },
        { status: 400 }
      );
    }
    
    console.log('Testing all email fetching methods for merchant:', merchantId);
    
    // Get the access token from Firestore
    const integrationRef = doc(db, 'merchants', merchantId, 'integrations', 'gmail');
    const integrationDoc = await getDoc(integrationRef);
    
    if (!integrationDoc.exists()) {
      return NextResponse.json(
        { error: 'Gmail integration not found for this merchant' },
        { status: 404 }
      );
    }
    
    const integration = integrationDoc.data();
    
    if (!integration.access_token) {
      return NextResponse.json(
        { error: 'No access token found for this integration' },
        { status: 400 }
      );
    }
    
    const accessToken = integration.access_token;
    const results: Record<string, any> = {
      storedEmail: integration.emailAddress || null,
      methods: {}
    };
    
    // Method 1: Try to extract email from ID token if we have one
    if (integration.id_token) {
      try {
        console.log('ID token present, attempting to decode...');
        const parts = integration.id_token.split('.');
        if (parts.length === 3) {
          // Decode the base64url encoded payload
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          // Add padding if needed
          const padding = '='.repeat((4 - base64.length % 4) % 4);
          const paddedBase64 = base64 + padding;
          
          try {
            // Use atob for base64 decoding
            const jsonStr = atob(paddedBase64);
            const payload = JSON.parse(jsonStr);
            
            results.methods.idToken = {
              success: !!payload.email,
              email: payload.email || null,
              payload: payload
            };
          } catch (decodeError) {
            results.methods.idToken = {
              success: false,
              error: `Error decoding base64: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
            };
          }
        } else {
          results.methods.idToken = {
            success: false,
            error: 'ID token does not have three parts'
          };
        }
      } catch (idTokenError) {
        results.methods.idToken = {
          success: false,
          error: `Error processing ID token: ${idTokenError instanceof Error ? idTokenError.message : String(idTokenError)}`
        };
      }
    } else {
      results.methods.idToken = {
        success: false,
        error: 'No ID token available'
      };
    }
    
    // Method 2: OpenID Connect UserInfo endpoint
    try {
      console.log('Trying OpenID Connect UserInfo endpoint');
      const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json();
        results.methods.openIdConnect = {
          success: !!userInfo.email,
          email: userInfo.email || null,
          response: userInfo
        };
      } else {
        const errorText = await userInfoResponse.text();
        results.methods.openIdConnect = {
          success: false,
          status: userInfoResponse.status,
          error: errorText
        };
      }
    } catch (openIdError) {
      results.methods.openIdConnect = {
        success: false,
        error: `Error fetching from OpenID Connect: ${openIdError instanceof Error ? openIdError.message : String(openIdError)}`
      };
    }
    
    // Method 3: Gmail API users.getProfile
    try {
      console.log('Trying Gmail API users.getProfile');
      const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        results.methods.gmailProfile = {
          success: !!profileData.emailAddress,
          email: profileData.emailAddress || null,
          response: profileData
        };
      } else {
        const errorText = await profileResponse.text();
        results.methods.gmailProfile = {
          success: false,
          status: profileResponse.status,
          error: errorText
        };
      }
    } catch (gmailApiError) {
      results.methods.gmailProfile = {
        success: false,
        error: `Error fetching from Gmail API: ${gmailApiError instanceof Error ? gmailApiError.message : String(gmailApiError)}`
      };
    }
    
    // Method 4: Try the JWT token payload if the access token is a JWT
    try {
      console.log('Attempting to extract email from access token if it is a JWT');
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        // It might be a JWT
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        // Add padding if needed
        const padding = '='.repeat((4 - base64.length % 4) % 4);
        const paddedBase64 = base64 + padding;
        
        try {
          // Use atob for base64 decoding
          const jsonStr = atob(paddedBase64);
          const payload = JSON.parse(jsonStr);
          
          results.methods.accessTokenJwt = {
            success: !!payload.email,
            email: payload.email || null,
            payload: payload
          };
        } catch (decodeError) {
          results.methods.accessTokenJwt = {
            success: false,
            error: `Error decoding JWT payload: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
          };
        }
      } else {
        results.methods.accessTokenJwt = {
          success: false,
          error: 'Access token does not appear to be a JWT'
        };
      }
    } catch (jwtError) {
      results.methods.accessTokenJwt = {
        success: false,
        error: `Error extracting email from JWT: ${jwtError instanceof Error ? jwtError.message : String(jwtError)}`
      };
    }
    
    // Determine the best email address from all methods
    const emails = Object.values(results.methods)
      .filter((method: any) => method.success && (method.email || method.emailAddress))
      .map((method: any) => method.email || method.emailAddress);
    
    results.bestEmail = emails.length > 0 ? emails[0] : null;
    results.allEmails = emails;
    results.emailsMatch = emails.length > 1 ? emails.every(email => email === emails[0]) : true;
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error testing email fetching methods:', error);
    return NextResponse.json(
      { error: `Error testing email fetching methods: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 