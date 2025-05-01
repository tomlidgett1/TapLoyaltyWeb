import { NextRequest, NextResponse } from 'next/server';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Call the Firebase Cloud Function
    const basiqConnect = httpsCallable(functions, 'basiqconnect');
    const result = await basiqConnect(body.data);
    
    // Return the response from the Firebase function
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error calling basiqconnect function:', error);
    return NextResponse.json(
      { error: 'Failed to connect to banking service' },
      { status: 500 }
    );
  }
} 