import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

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
    
    console.log('Fixing missing email for Gmail integration:', merchantId);
    
    // Get the integration document
    const integrationRef = doc(db, 'merchants', merchantId, 'integrations', 'gmail');
    const integrationDoc = await getDoc(integrationRef);
    
    if (!integrationDoc.exists()) {
      return NextResponse.json(
        { error: 'Gmail integration not found for this merchant' },
        { status: 404 }
      );
    }
    
    const integration = integrationDoc.data();
    
    // Check if email is already present
    if (integration.emailAddress) {
      return NextResponse.json({
        success: true,
        message: 'Email address already exists',
        emailAddress: integration.emailAddress,
        needsFix: false
      });
    }
    
    // Check if we have an access token
    if (!integration.access_token) {
      return NextResponse.json(
        { error: 'No access token found for this integration' },
        { status: 400 }
      );
    }
    
    // Try all methods to get the email address
    let emailAddress = null;
    const results: Record<string, any> = {};
    
    // Method 1: Try ID token if present
    if (integration.id_token) {
      try {
        console.log('Trying to extract email from ID token');
        const parts = integration.id_token.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padding = '='.repeat((4 - base64.length % 4) % 4);
          const paddedBase64 = base64 + padding;
          
          const jsonStr = atob(paddedBase64);
          const payload = JSON.parse(jsonStr);
          
          if (payload.email) {
            emailAddress = payload.email;
            results.idToken = { success: true, email: emailAddress };
            console.log('Email found in ID token:', emailAddress);
          } else {
            results.idToken = { success: false, reason: 'No email in payload' };
          }
        } else {
          results.idToken = { success: false, reason: 'Invalid token format' };
        }
      } catch (error) {
        results.idToken = { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    } else {
      results.idToken = { success: false, reason: 'No ID token available' };
    }
    
    // Method 2: Try OpenID Connect UserInfo endpoint
    if (!emailAddress) {
      try {
        console.log('Trying OpenID Connect UserInfo endpoint');
        const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`
          }
        });
        
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          if (userInfo.email) {
            emailAddress = userInfo.email;
            results.openIdConnect = { success: true, email: emailAddress };
            console.log('Email found from OpenID Connect:', emailAddress);
          } else {
            results.openIdConnect = { 
              success: false, 
              reason: 'No email in response',
              response: userInfo 
            };
          }
        } else {
          results.openIdConnect = { 
            success: false, 
            status: userInfoResponse.status,
            error: await userInfoResponse.text() 
          };
        }
      } catch (error) {
        results.openIdConnect = { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    }
    
    // Method 3: Try Gmail API Profile
    if (!emailAddress) {
      try {
        console.log('Trying Gmail API Profile');
        const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`
          }
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.emailAddress) {
            emailAddress = profileData.emailAddress;
            results.gmailProfile = { success: true, email: emailAddress };
            console.log('Email found from Gmail API:', emailAddress);
          } else {
            results.gmailProfile = { 
              success: false, 
              reason: 'No email in response',
              response: profileData 
            };
          }
        } else {
          results.gmailProfile = { 
            success: false, 
            status: profileResponse.status,
            error: await profileResponse.text() 
          };
        }
      } catch (error) {
        results.gmailProfile = { 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        };
      }
    }
    
    // If we found an email address, update the integration document
    if (emailAddress) {
      try {
        await updateDoc(integrationRef, {
          emailAddress: emailAddress
        });
        
        console.log('Successfully updated email address in Firestore');
        
        return NextResponse.json({
          success: true,
          message: 'Email address successfully retrieved and saved',
          emailAddress: emailAddress,
          needsFix: true,
          fixed: true,
          methods: results
        });
      } catch (updateError) {
        return NextResponse.json({
          success: false,
          message: 'Found email but failed to update Firestore',
          emailAddress: emailAddress,
          needsFix: true,
          fixed: false,
          error: updateError instanceof Error ? updateError.message : String(updateError),
          methods: results
        }, { status: 500 });
      }
    }
    
    // If we couldn't find an email address
    return NextResponse.json({
      success: false,
      message: 'Could not retrieve email address from any source',
      needsFix: true,
      fixed: false,
      methods: results
    }, { status: 404 });
    
  } catch (error) {
    console.error('Error fixing Gmail email:', error);
    return NextResponse.json(
      { error: `Failed to fix Gmail email: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 