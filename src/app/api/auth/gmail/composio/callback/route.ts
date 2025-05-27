import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { OpenAIToolSet } from 'composio-core';

// Composio configuration
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'smwbexfl2lqlcy3wb0cq3';

// Explicitly use the Node.js runtime for full API support
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  console.log('Gmail Composio callback received');
  
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // From Composio, might contain merchant ID
    const error = searchParams.get('error');
    
    console.log('Callback parameters - code exists:', !!code, 'state exists:', !!state);
    console.log('State parameter:', state);
    
    // Handle errors from Composio OAuth
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(`/dashboard/integrations?error=auth_error&details=${encodeURIComponent(error)}`);
    }
    
    // Redirect to integrations page
    console.log('Callback completed, redirecting to integrations page');
    return NextResponse.redirect('/dashboard/integrations?success=true&source=composio_callback');
  } catch (error) {
    console.error('Error handling Composio callback:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(`/dashboard/integrations?error=server_error&details=${encodeURIComponent(errorMessage)}`);
  }
} 