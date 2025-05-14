import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { merchantId, emailAddress } = body;
    
    if (!merchantId || !emailAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: merchantId and emailAddress' },
        { status: 400 }
      );
    }
    
    console.log(`Updating email address for merchant ${merchantId} to ${emailAddress}`);
    
    // Check if the integration exists
    const integrationRef = doc(db, 'merchants', merchantId, 'integrations', 'gmail');
    const integrationDoc = await getDoc(integrationRef);
    
    if (!integrationDoc.exists()) {
      return NextResponse.json(
        { error: 'Gmail integration not found for this merchant' },
        { status: 404 }
      );
    }
    
    // Update the email address
    await updateDoc(integrationRef, {
      emailAddress
    });
    
    console.log(`Email address updated successfully to ${emailAddress}`);
    
    return NextResponse.json({
      success: true,
      message: 'Email address updated successfully',
      emailAddress
    });
  } catch (error) {
    console.error('Error updating email address:', error);
    return NextResponse.json(
      { error: `Failed to update email address: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 