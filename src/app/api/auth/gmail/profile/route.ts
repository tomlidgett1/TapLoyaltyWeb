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
    
    console.log('Fetching Gmail profile for merchant:', merchantId);
    
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
    
    // Call the Gmail API to get the user's profile
    const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      return NextResponse.json(
        { error: `Failed to fetch Gmail profile: ${profileResponse.status} ${errorText}` },
        { status: profileResponse.status }
      );
    }
    
    const profileData = await profileResponse.json();
    console.log('Gmail profile data:', JSON.stringify(profileData));
    
    // If requested, save the email address to the integration document
    if (saveEmail && profileData.emailAddress) {
      console.log(`Saving email address ${profileData.emailAddress} to integration document`);
      
      await updateDoc(integrationRef, {
        emailAddress: profileData.emailAddress
      });
      
      console.log('Email address saved successfully');
    }
    
    return NextResponse.json({
      success: true,
      profile: profileData,
      emailSaved: saveEmail && !!profileData.emailAddress
    });
  } catch (error) {
    console.error('Error fetching Gmail profile:', error);
    return NextResponse.json(
      { error: `Failed to fetch Gmail profile: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 