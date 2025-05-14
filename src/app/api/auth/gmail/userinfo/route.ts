import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get the merchant ID from query params
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const saveEmail = searchParams.get('save') === 'true';
    
    if (!merchantId) {
      return NextResponse.json(
        { error: 'Missing merchantId parameter' },
        { status: 400 }
      );
    }
    
    console.log('Fetching OpenID UserInfo for merchant:', merchantId);
    
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
    
    // Call the OpenID Connect UserInfo endpoint
    const userInfoResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      return NextResponse.json(
        { error: `Failed to fetch UserInfo: ${userInfoResponse.status} ${errorText}` },
        { status: userInfoResponse.status }
      );
    }
    
    const userInfo = await userInfoResponse.json();
    console.log('OpenID UserInfo data:', JSON.stringify(userInfo));
    
    // If requested, save the email address to the integration document
    if (saveEmail && userInfo.email) {
      console.log(`Saving email address ${userInfo.email} to integration document`);
      
      await updateDoc(integrationRef, {
        emailAddress: userInfo.email
      });
      
      console.log('Email address saved successfully');
    }
    
    return NextResponse.json({
      success: true,
      userInfo,
      emailSaved: saveEmail && !!userInfo.email
    });
  } catch (error) {
    console.error('Error fetching OpenID UserInfo:', error);
    return NextResponse.json(
      { error: `Failed to fetch UserInfo: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 