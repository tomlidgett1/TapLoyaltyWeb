import { NextRequest, NextResponse } from 'next/server';
import { getGmailAccountEmail } from '@/lib/gmail-api';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    // Get the merchant ID from query params
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    if (!merchantId) {
      return NextResponse.json(
        { error: 'Missing merchantId parameter' },
        { status: 400 }
      );
    }
    
    console.log('Fetching Gmail account email for merchant:', merchantId);
    
    // Check if we already have the email address stored
    if (!forceRefresh) {
      const integrationRef = doc(db, 'merchants', merchantId, 'integrations', 'gmail');
      const integrationDoc = await getDoc(integrationRef);
      
      if (integrationDoc.exists()) {
        const integration = integrationDoc.data();
        
        if (integration.emailAddress) {
          console.log('Found stored email address:', integration.emailAddress);
          return NextResponse.json({
            success: true,
            emailAddress: integration.emailAddress,
            source: 'stored'
          });
        }
      }
    }
    
    // If we don't have the email stored or force refresh is requested, fetch it
    const emailAddress = await getGmailAccountEmail(merchantId);
    
    if (!emailAddress) {
      return NextResponse.json(
        { error: 'Could not retrieve email address' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      emailAddress,
      source: 'fetched'
    });
  } catch (error) {
    console.error('Error getting Gmail account email:', error);
    return NextResponse.json(
      { error: `Failed to get email address: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 