import { NextRequest, NextResponse } from 'next/server';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('basiqconnect request data:', body.data);
    
    // Call the Firebase Cloud Function
    const basiqConnect = httpsCallable(functions, 'basiqconnect');
    const result = await basiqConnect(body.data);
    
    console.log('basiqconnect result:', result.data);
    
    // Return the response from the Firebase function
    return NextResponse.json(result.data);
  } catch (error: unknown) {
    console.error('Error calling basiqconnect function:', error);
    
    // Extract the actual error message from Firebase
    const firebaseError = error as { code?: string; message?: string; details?: unknown };
    const errorMessage = firebaseError.message || 'Failed to connect to banking service';
    
    // Check if it's a mobile format error
    if (errorMessage.includes('mobile') || errorMessage.includes('format')) {
      return NextResponse.json(
        { error: 'Invalid mobile number format. Please use Australian format (04XX XXX XXX).' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 