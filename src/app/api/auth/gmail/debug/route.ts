import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

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
    
    // Get all data related to this merchant's Gmail integration
    const results: Record<string, any> = {
      merchantId,
      timestamp: new Date().toISOString(),
    };
    
    // Get the integration document
    const integrationRef = doc(db, 'merchants', merchantId, 'integrations', 'gmail');
    const integrationDoc = await getDoc(integrationRef);
    
    if (integrationDoc.exists()) {
      const integration = integrationDoc.data();
      
      // Safely extract and mask sensitive data
      results.integration = {
        connected: integration.connected,
        hasAccessToken: !!integration.access_token,
        accessTokenPrefix: integration.access_token ? 
          `${integration.access_token.substring(0, 10)}...` : null,
        hasRefreshToken: !!integration.refresh_token,
        hasEmailAddress: !!integration.emailAddress,
        emailAddress: integration.emailAddress || null,
        expires_at: integration.expires_at,
        expiresIn: integration.expires_at ? 
          (integration.expires_at - Math.floor(Date.now() / 1000)) : null,
        connectedAt: integration.connectedAt ? 
          integration.connectedAt.toDate().toISOString() : null,
        lastUpdated: integration.lastUpdated ? 
          integration.lastUpdated.toDate().toISOString() : null,
        allFields: Object.keys(integration),
      };
      
      // If we have an access token, try to use it to get the email
      if (integration.access_token) {
        const emailResults = await testEmailFetching(integration.access_token);
        results.emailTests = emailResults;
      }
    } else {
      results.integration = {
        error: 'No Gmail integration found for this merchant ID'
      };
    }
    
    // Check for emails collection to see if we're successfully fetching emails
    try {
      const emailsRef = collection(db, 'merchants', merchantId, 'emails');
      const emailsQuery = query(emailsRef, where('savedAt', '!=', null), where('savedAt', '<=', new Date()));
      const emailsSnapshot = await getDocs(emailsQuery);
      
      results.emails = {
        count: emailsSnapshot.size,
        sample: emailsSnapshot.size > 0 ? 
          emailsSnapshot.docs.slice(0, 3).map(doc => ({
            id: doc.id,
            subject: doc.data().subject,
            from: doc.data().from,
            savedAt: doc.data().savedAt ? 
              doc.data().savedAt.toDate().toISOString() : null
          })) : []
      };
    } catch (emailsError) {
      results.emails = {
        error: `Failed to fetch emails: ${emailsError instanceof Error ? emailsError.message : String(emailsError)}`
      };
    }
    
    return NextResponse.json({
      status: 'ok',
      message: 'Gmail integration debug data',
      results
    });
  } catch (error) {
    console.error('Error in Gmail debug endpoint:', error);
    return NextResponse.json(
      { error: `Debug failed: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

async function testEmailFetching(accessToken: string): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  
  // Method 1: OpenID Connect UserInfo endpoint
  try {
    console.log('Testing OpenID Connect UserInfo endpoint');
    const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    results.openidConnect = {
      status: userInfoResponse.status
    };
    
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      results.openidConnect.data = userInfo;
      results.openidConnect.hasEmail = !!userInfo.email;
      results.openidConnect.email = userInfo.email || null;
    } else {
      results.openidConnect.error = await userInfoResponse.text();
    }
  } catch (error) {
    results.openidConnect = {
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
  
  // Method 2: Gmail API users.getProfile
  try {
    console.log('Testing Gmail API users.getProfile');
    const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    results.gmailProfile = {
      status: profileResponse.status
    };
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      results.gmailProfile.data = profileData;
      results.gmailProfile.hasEmail = !!profileData.emailAddress;
      results.gmailProfile.email = profileData.emailAddress || null;
    } else {
      results.gmailProfile.error = await profileResponse.text();
    }
  } catch (error) {
    results.gmailProfile = {
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
  
  return results;
} 