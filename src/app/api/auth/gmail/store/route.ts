import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface RequestBody {
  merchantId: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  emailAddress?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body: RequestBody = await request.json();
    const { merchantId, access_token, refresh_token, expires_at, emailAddress } = body;
    
    if (!merchantId || !access_token || !refresh_token || !expires_at) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // In production, you should encrypt sensitive tokens before storing them
    // Consider using Firebase KMS or a similar service for encryption
    // For this example, we're storing them as-is
    
    // Store the integration data in Firestore
    await setDoc(doc(db, 'merchants', merchantId, 'integrations', 'gmail'), {
      connected: true,
      access_token,
      refresh_token,  // In production, this should be encrypted
      expires_at,
      connectedAt: serverTimestamp(),
      ...(emailAddress ? { emailAddress } : {}),
    });
    
    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error storing Gmail integration:', error);
    return NextResponse.json(
      { error: 'Failed to store integration data' },
      { status: 500 }
    );
  }
} 